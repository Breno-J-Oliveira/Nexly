import { FinanceiroService } from './financeiro.service';
import { PrismaService } from '../database/prisma.service';
import { RedisService } from '../redis/redis.service';
describe('DRE confiavel', () => {
  const create = (total: number, desconto: number, count: number) => {
    const prisma = {
      client: {
        itemVenda: {
          findMany: jest
            .fn()
            .mockResolvedValue(count ? [{ quantidade: 1, custoUnitario: null }] : []),
        },
        venda: {
          aggregate: jest
            .fn()
            .mockResolvedValue({ _sum: { total, desconto }, _count: { _all: count } }),
        },
      },
    };
    const redis = { get: jest.fn().mockResolvedValue(null), set: jest.fn() };
    return {
      service: new FinanceiroService(
        prisma as unknown as PrismaService,
        redis as unknown as RedisService,
      ),
      prisma,
      redis,
    };
  };
  it('nao subtrai desconto duas vezes e conta vendas corretamente', async () => {
    const { service, prisma, redis } = create(180, 20, 2);
    const result = await service.dre('e1', '2026-10-01', '2026-10-31');
    expect(result).toMatchObject({
      receitaBruta: 200,
      receitaLiquida: 180,
      descontos: 20,
      qtdVendas: 2,
      ticketMedio: 90,
      cmv: null,
      margemBruta: null,
      margemPercentual: null,
      custosDisponiveis: false,
    });
    expect(prisma.client.venda.aggregate).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ empresaId: 'e1' }) }),
    );
    expect(redis.set).toHaveBeenCalledWith(
      'dre:e1:v3:2026-10-01:2026-10-31',
      expect.any(String),
      300,
    );
  });
  it('periodo sem vendas mantem valores finitos', async () => {
    const { service } = create(0, 0, 0);
    const result = await service.dre('e1', '2026-10-01', '2026-10-31');
    expect(result.qtdVendas).toBe(0);
    expect(result.ticketMedio).toBe(0);
  });
  it('valida periodo antes de consultar cache ou banco', async () => {
    const { service, redis, prisma } = create(0, 0, 0);
    await expect(service.dre('e1', '2026-10-31', '2026-10-01')).rejects.toThrow();
    expect(redis.get).not.toHaveBeenCalled();
    expect(prisma.client.venda.aggregate).not.toHaveBeenCalled();
  });
});
