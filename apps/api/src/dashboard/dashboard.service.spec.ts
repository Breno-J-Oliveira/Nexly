import { DashboardService } from './dashboard.service';
import { PrismaService } from '../database/prisma.service';
import { RedisService } from '../redis/redis.service';

describe('Dashboard: receita semanal', () => {
  it('soma valores das vendas, não quantidade de agendamentos', async () => {
    const hoje = new Date();
    hoje.setHours(12, 0, 0, 0);
    const prisma = {
      client: {
        agendamento: { findMany: jest.fn().mockResolvedValue([]) },
        venda: {
          aggregate: jest.fn().mockResolvedValue({ _sum: { total: 30 } }),
          count: jest.fn().mockResolvedValue(2),
          findMany: jest.fn().mockResolvedValue([
            { createdAt: hoje, total: '10.50' },
            { createdAt: hoje, total: '19.50' },
          ]),
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
    const result = (await service.getDashboard('e1')) as {
      evolucaoVendasSemanal: { total: number }[];
    };
    expect(result.evolucaoVendasSemanal).toHaveLength(7);
    expect(result.evolucaoVendasSemanal.at(-1)?.total).toBe(30);
    expect(result.evolucaoVendasSemanal.reduce((sum, day) => sum + day.total, 0)).toBe(30);
    expect(redis.set).toHaveBeenCalledWith('dashboard:e1', expect.any(String), 300);
  });
});
