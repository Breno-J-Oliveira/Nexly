import { ComissaoService } from './comissao.service';
import { PrismaService } from '../database/prisma.service';

describe('Comissões por período', () => {
  const client = {
    profissional: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
    },
    agendamento: { findMany: jest.fn() },
  };
  const service = new ComissaoService({ client } as unknown as PrismaService);

  beforeEach(() => {
    jest.resetAllMocks();
    client.profissional.findFirst.mockResolvedValue({ nome: 'Teste', comissaoPercentual: 25 });
    client.profissional.findMany.mockResolvedValue([]);
    client.agendamento.findMany.mockResolvedValue([{ servico: { preco: 120 } }]);
  });

  it('inclui o último dia inteiro para clientes que enviam somente datas', async () => {
    await expect(
      service.calcular('profissional', '2026-10-16', '2026-10-16'),
    ).resolves.toMatchObject({ faturamento: 120, comissao: 30, totalServicos: 1 });
    expect(client.agendamento.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          status: 'CONCLUIDO',
          dataHora: {
            gte: new Date('2026-10-16T00:00:00Z'),
            lte: new Date('2026-10-16T23:59:59.999Z'),
          },
        }),
      }),
    );
  });

  it('preserva limites explícitos no fuso do navegador', async () => {
    await service.calcular(
      'profissional',
      '2026-10-16T00:00:00-03:00',
      '2026-10-16T23:59:59.999-03:00',
    );
    expect(client.agendamento.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          dataHora: {
            gte: new Date('2026-10-16T03:00:00Z'),
            lte: new Date('2026-10-17T02:59:59.999Z'),
          },
        }),
      }),
    );
  });

  it('resume a equipe com uma consulta e preserva centavos entre profissionais', async () => {
    client.profissional.findMany.mockResolvedValue(
      [0.1, 0.2].map((value, index) => ({
        id: `p${index}`,
        nome: `Pessoa ${index}`,
        ativo: index === 0,
        comissaoPercentual: 100,
        agendamentos: [
          {
            servico: { preco: 999 },
            valorServicoConcluido: value,
            comissaoPercentualAplicada: 100,
          },
        ],
      })),
    );
    const result = await service.resumoGeral('2026-10-20', '2026-10-20');
    expect(result.total).toEqual({ faturamento: 0.3, comissao: 0.3, servicos: 2, estimados: 0 });
    expect(result.profissionais[1]).toMatchObject({ ativo: false, comissao: 0.2 });
    expect(client.profissional.findMany).toHaveBeenCalledTimes(1);
    expect(client.profissional.findFirst).not.toHaveBeenCalled();
    expect(client.agendamento.findMany).not.toHaveBeenCalled();
  });

  it.each([
    ['', '2026-10-16'],
    ['2026-02-30', '2026-03-01'],
    ['2026-10-17', '2026-10-16'],
    ['2026-10-16T10:00:00', '2026-10-16T12:00:00'],
  ])('rejeita período inválido antes de consultar o banco: %s / %s', async (inicio, fim) => {
    await expect(service.calcular('profissional', inicio, fim)).rejects.toThrow();
    await expect(service.resumoGeral(inicio, fim)).rejects.toThrow();
    expect(client.profissional.findFirst).not.toHaveBeenCalled();
    expect(client.profissional.findMany).not.toHaveBeenCalled();
  });
});
