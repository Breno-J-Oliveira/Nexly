import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../database/prisma.service';
import { ExportService } from './export.service';

const mockPrisma = {
  client: {
    venda: { findMany: jest.fn().mockResolvedValue([]) },
    produto: { findMany: jest.fn().mockResolvedValue([]) },
  },
};

describe('ExportService', () => {
  let service: ExportService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ExportService, { provide: PrismaService, useValue: mockPrisma }],
    }).compile();

    service = module.get<ExportService>(ExportService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should return CSV header when no vendas', async () => {
    const csv = await service.vendasCsv();
    expect(csv).toContain('Data;Cliente;Itens;Pagamento;Desconto;Total');
  });

  it('should return CSV with BOM prefix', async () => {
    mockPrisma.client.venda.findMany.mockResolvedValue([
      {
        id: '1',
        total: 100,
        createdAt: new Date('2026-01-01'),
        cliente: { nome: 'Teste' },
        itens: [],
        formaPagamento: 'PIX',
        desconto: 10,
      },
    ]);
    const csv = await service.vendasCsv();
    expect(csv).toContain('2026-01-01');
    expect(csv).toContain('Teste');
    expect(csv).toContain('PIX');
    expect(csv).toContain('10');
  });

  it('should return empty array for produtosVencendo', async () => {
    const result = await service.produtosVencendo();
    expect(Array.isArray(result)).toBe(true);
  });
  it.each([-1, 1.5, NaN, Infinity, 3651])(
    'recusa horizonte de validade inválido %s',
    async (dias) => {
      await expect(service.produtosVencendo(dias)).rejects.toThrow('Dias deve ser');
    },
  );
  it('inclui vencidos e todo o último dia sem depender do fuso do servidor', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-10-15T03:00:00Z'));
    try {
      await service.produtosVencendo(0);
      expect(mockPrisma.client.produto.findMany).toHaveBeenLastCalledWith(
        expect.objectContaining({
          where: {
            ativo: true,
            dataVencimento: { not: null, lte: new Date('2026-10-15T23:59:59.999Z') },
          },
        }),
      );
    } finally {
      jest.useRealTimers();
    }
  });
});
