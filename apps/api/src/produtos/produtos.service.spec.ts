import { Test } from '@nestjs/testing';
import { PrismaService } from '../database/prisma.service';
import { ProdutosService } from './produtos.service';

describe('ProdutosService', () => {
  let service: ProdutosService;
  let prisma: {
    client: {
      produto: { findMany: jest.Mock; count: jest.Mock; fields: { estoqueMinimo: string } };
    };
  };

  beforeEach(async () => {
    prisma = {
      client: {
        produto: {
          findMany: jest.fn(),
          count: jest.fn().mockResolvedValue(7),
          fields: { estoqueMinimo: 'field-ref' },
        },
      },
    };

    const moduleRef = await Test.createTestingModule({
      providers: [ProdutosService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = moduleRef.get(ProdutosService);
  });

  describe('listarEmAlerta', () => {
    it('filtra abaixo do mínimo no banco antes de limitar e conta todos os alertas', async () => {
      prisma.client.produto.findMany.mockResolvedValue([
        { id: 'critical', estoqueAtual: 50, estoqueMinimo: 100 },
      ]);
      const result = await service.listarEmAlerta(1);
      expect(result.total).toBe(7);
      expect(result.data).toHaveLength(1);
      expect(prisma.client.produto.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ estoqueAtual: { lt: 'field-ref' } }),
          take: 1,
        }),
      );
      expect(prisma.client.produto.count).toHaveBeenCalledWith({
        where: expect.objectContaining({ estoqueAtual: { lt: 'field-ref' } }),
      });
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
          orderBy: [{ estoqueAtual: 'asc' }, { id: 'asc' }],
        }),
      );
    });

    it('retorna lista vazia quando nenhum produto está em alerta', async () => {
      prisma.client.produto.findMany.mockResolvedValue([]);
      prisma.client.produto.count.mockResolvedValue(0);

      const result = await service.listarEmAlerta();

      expect(result.total).toBe(0);
      expect(result.data).toEqual([]);
    });
  });
});
