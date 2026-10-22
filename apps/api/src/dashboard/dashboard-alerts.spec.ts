import { AuthUser, Role } from '@nexly/shared';
import { DashboardService } from './dashboard.service';
import { PrismaService } from '../database/prisma.service';
import { RedisService } from '../redis/redis.service';

describe('Alertas operacionais do painel', () => {
  const groupBy = jest.fn();
  const count = jest.fn();
  const empresa = jest.fn();
  const service = new DashboardService(
    {
      client: {
        empresa: { findFirstOrThrow: empresa },
        lancamentoFinanceiro: { groupBy },
        agendamento: { count },
      },
    } as unknown as PrismaService,
    {} as RedisService,
  );
  const user = (role: Role) => ({ id: 'u1', empresaId: 'e1', role }) as AuthUser;
  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(new Date('2026-10-22T01:00:00.000Z'));
    jest.clearAllMocks();
    empresa.mockResolvedValue({ fusoHorario: 'America/Sao_Paulo' });
    groupBy.mockResolvedValue([]);
    count.mockResolvedValue(0);
  });
  afterEach(() => jest.useRealTimers());

  it('separa vencidas de próximas, inclui parciais e usa a data civil da empresa', async () => {
    groupBy.mockResolvedValueOnce([
      { tipo: 'DESPESA', _count: 2, _min: { vencimento: new Date('2026-09-20T00:00:00Z') } },
    ]);
    groupBy.mockResolvedValueOnce([
      { tipo: 'RECEITA', _count: 1, _min: { vencimento: new Date('2026-10-21T00:00:00Z') } },
    ]);
    count.mockResolvedValue(3);
    const result = await service.getAlertas(user(Role.ADMIN));
    expect(groupBy.mock.calls[0][0].where).toEqual({
      empresaId: 'e1',
      status: { in: ['ABERTO', 'PARCIAL'] },
      vencimento: { lt: new Date('2026-10-21T00:00:00Z') },
    });
    expect(groupBy.mock.calls[1][0].where.vencimento).toEqual({
      gte: new Date('2026-10-21T00:00:00Z'),
      lt: new Date('2026-10-28T00:00:00Z'),
    });
    expect(count.mock.calls[0][0].where).toEqual({
      empresaId: 'e1',
      status: 'AGENDADO',
      dataHora: { gte: new Date('2026-10-22T01:00:00Z'), lt: new Date('2026-10-22T03:00:00Z') },
    });
    expect(result.alertas).toHaveLength(3);
    expect(result.alertas[0]).toMatchObject({
      quantidade: 2,
      href: '/financeiro?inicio=2026-09-20&fim=2026-10-20',
    });
    expect(result.alertas[1]).toMatchObject({
      quantidade: 1,
      href: '/financeiro?inicio=2026-10-21&fim=2026-10-27',
    });
  });
  it.each([Role.RECEPCIONISTA, Role.PROFISSIONAL, Role.CAIXA])(
    '%s não consulta nem recebe dados financeiros',
    async (role) => {
      const result = await service.getAlertas(user(role));
      expect(groupBy).not.toHaveBeenCalled();
      expect(result.alertas.some((a) => a.modulo === 'relatorios')).toBe(false);
    },
  );
  it('retorna lista vazia sem inventar pendências', async () => {
    expect(await service.getAlertas(user(Role.GESTOR))).toEqual({ alertas: [] });
  });
});
