import { DashboardService } from './dashboard.service';
import { PrismaService } from '../database/prisma.service';
import { RedisService } from '../redis/redis.service';

describe('Dashboard: indicadores por fuso da empresa', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  function montarDashboard() {
    const prisma = {
      client: {
        empresa: {
          findFirstOrThrow: jest.fn().mockResolvedValue({ fusoHorario: 'America/Sao_Paulo' }),
        },
        agendamento: { findMany: jest.fn().mockResolvedValue([]) },
        venda: {
          aggregate: jest.fn().mockResolvedValue({ _sum: { total: 30 } }),
          count: jest.fn().mockResolvedValue(2),
          findMany: jest.fn().mockResolvedValue([]),
        },
        profissional: { count: jest.fn().mockResolvedValue(1) },
        movimentacaoEstoque: { findMany: jest.fn().mockResolvedValue([]) },
        produto: { findMany: jest.fn().mockResolvedValue([]) },
      },
    };
    const redis = { get: jest.fn().mockResolvedValue(null), set: jest.fn() };
    const service = new DashboardService(
      prisma as unknown as PrismaService,
      redis as unknown as RedisService,
    );
    return { prisma, redis, service };
  }

  it('agrupa receita e atendimentos pelo dia local antes da meia-noite de Brasília', async () => {
    jest.setSystemTime(new Date('2026-11-01T02:59:30.000Z'));
    const { prisma, service, redis } = montarDashboard();
    const inicioDia = new Date('2026-10-31T03:00:00.000Z');
    const fimDia = new Date('2026-11-01T03:00:00.000Z');
    const vendas = [
      { createdAt: new Date('2026-10-31T02:59:59.999Z'), total: '7.00' },
      { createdAt: inicioDia, total: '10.50' },
      { createdAt: new Date('2026-11-01T02:59:00.000Z'), total: '19.50' },
    ];
    prisma.client.venda.findMany.mockResolvedValue(vendas);
    prisma.client.agendamento.findMany
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce(
        vendas.map(({ createdAt }) => ({ dataHora: createdAt, servico: { nome: 'Teste' } })),
      );

    const result = (await service.getDashboard('e1')) as {
      agendamentosPorDia: { data: string; total: number }[];
      evolucaoVendasSemanal: { dia: string; total: number }[];
    };
    expect(result.evolucaoVendasSemanal).toHaveLength(7);
    expect(result.evolucaoVendasSemanal.slice(-2)).toEqual([
      { dia: 'Sex', total: 7 },
      { dia: 'Sáb', total: 30 },
    ]);
    expect(result.agendamentosPorDia).toEqual([
      { data: '2026-10-30', total: 1 },
      { data: '2026-10-31', total: 2 },
    ]);
    expect(prisma.client.agendamento.findMany).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ where: { dataHora: { gte: inicioDia, lt: fimDia } } }),
    );
    expect(prisma.client.venda.aggregate).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        where: { status: 'CONCLUIDA', createdAt: { gte: inicioDia, lt: fimDia } },
      }),
    );
    expect(prisma.client.venda.aggregate).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        where: { status: 'CONCLUIDA', createdAt: { gte: new Date('2026-10-01T03:00:00.000Z') } },
      }),
    );
    expect(prisma.client.venda.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          status: 'CONCLUIDA',
          createdAt: { gte: new Date('2026-10-25T03:00:00.000Z'), lt: fimDia },
        },
      }),
    );
    expect(redis.set).toHaveBeenCalledWith('dashboard:e1', expect.any(String), 30);
  });

  it('começa o dia local à meia-noite e exclui cancelamentos da ocupação', async () => {
    jest.setSystemTime(new Date('2026-11-01T03:00:00.000Z'));
    const { prisma, service, redis } = montarDashboard();
    prisma.client.agendamento.findMany.mockResolvedValueOnce(
      ['AGENDADO', 'CONFIRMADO', 'CONCLUIDO', 'CANCELADO', 'CANCELADO'].map((status) => ({
        status,
      })),
    );

    const result = await service.getDashboard('e1');
    expect(result).toMatchObject({
      agendamentosHoje: { total: 5, CANCELADO: 2 },
      taxaOcupacao: 38,
    });
    expect(prisma.client.agendamento.findMany).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        where: {
          dataHora: {
            gte: new Date('2026-11-01T03:00:00.000Z'),
            lt: new Date('2026-11-02T03:00:00.000Z'),
          },
        },
      }),
    );
    expect(redis.set).toHaveBeenCalledWith('dashboard:e1', expect.any(String), 300);
  });
});
