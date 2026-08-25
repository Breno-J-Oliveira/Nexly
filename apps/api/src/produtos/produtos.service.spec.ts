import { Test } from '@nestjs/testing';
import { PrismaService } from '../database/prisma.service';
import { ProdutosService } from './produtos.service';

interface ProdutoMock {
  id: string;
  nome: string;
  estoqueAtual: number;
  estoqueMinimo: number;
  ativo: boolean;
}

describe('ProdutosService', () => {
  let service: ProdutosService;
  let prisma: {
    client: { produto: { findMany: jest.Mock } };
  };

  beforeEach(async () => {
    prisma = { client: { produto: { findMany: jest.fn() } } };

    const moduleRef = await Test.createTestingModule({
      providers: [
        ProdutosService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = moduleRef.get(ProdutosService);
  });

  describe('listarEmAlerta', () => {
    it('filtra só produtos com estoqueAtual < estoqueMinimo', async () => {
      const produtos: ProdutoMock[] = [
        { id: 'p1', nome: 'Crítico', estoqueAtual: 1, estoqueMinimo: 10, ativo: true },
        { id: 'p2', nome: 'OK', estoqueAtual: 50, estoqueMinimo: 10, ativo: true },
        { id: 'p3', nome: 'Quase', estoqueAtual: 5, estoqueMinimo: 10, ativo: true },
      ];
      prisma.client.produto.findMany.mockResolvedValue(produtos);

      const result = await service.listarEmAlerta();

      expect(result.total).toBe(2);
      expect(result.data.map((p) => p.id)).toEqual(['p1', 'p3']);
    });

    it('respeita o `limit` passado', async () => {
      prisma.client.produto.findMany.mockResolvedValue([]);

      await service.listarEmAlerta(5);

      expect(prisma.client.produto.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 5 }),
      );
    });

    it('filtra produtos inativos e com estoqueMinimo=0 no WHERE', async () => {
      prisma.client.produto.findMany.mockResolvedValue([]);

      await service.listarEmAlerta();

      expect(prisma.client.produto.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            ativo: true,
            estoqueMinimo: { gt: 0 },
          }),
          orderBy: { estoqueAtual: 'asc' },
        }),
      );
    });

    it('retorna lista vazia quando nenhum produto está em alerta', async () => {
      prisma.client.produto.findMany.mockResolvedValue([
        { id: 'p1', nome: 'OK', estoqueAtual: 100, estoqueMinimo: 10, ativo: true },
      ]);

      const result = await service.listarEmAlerta();

      expect(result.total).toBe(0);
      expect(result.data).toEqual([]);
    });
  });
});
