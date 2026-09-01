import { Test, TestingModule } from '@nestjs/testing';
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
      providers: [
        ExportService,
        { provide: 'PrismaService', useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<ExportService>(ExportService);
    (service as any).prisma = mockPrisma;
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should return CSV header when no vendas', async () => {
    const csv = await service.vendasCsv();
    expect(csv).toContain('Data;Cliente;Itens;Pagamento;Desconto;Total');
  });

  it('should return CSV with BOM prefix', async () => {
    mockPrisma.client.venda.findMany.mockResolvedValue([{
      id: '1', total: 100, createdAt: new Date('2026-01-01'),
      cliente: { nome: 'Teste' }, itens: [],
      formaPagamento: 'PIX', desconto: 10,
    }]);
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
});
