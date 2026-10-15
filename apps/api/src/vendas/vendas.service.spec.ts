import { Test } from '@nestjs/testing';
import { PrismaService } from '../database/prisma.service';
import { EstoqueService } from '../estoque/estoque.service';
import { VendasService } from './vendas.service';
import { tenantStorage } from '../database/tenant-context';
import { Prisma } from '@prisma/client';

describe('VendasService', () => {
  let service: VendasService;
  let prisma: {
    client: {
      produto: { findMany: jest.Mock };
      $transaction: jest.Mock;
      venda: { findFirst: jest.Mock; findMany: jest.Mock; aggregate: jest.Mock };
      itemVenda: { aggregate: jest.Mock };
      cliente: { findFirst: jest.Mock };
    };
  };
  let estoque: { registrarSaidaTx: jest.Mock };

  beforeEach(async () => {
    prisma = {
      client: {
        produto: { findMany: jest.fn() },
        $transaction: jest.fn(),
        venda: { findFirst: jest.fn(), findMany: jest.fn(), aggregate: jest.fn() },
        itemVenda: { aggregate: jest.fn() },
        cliente: { findFirst: jest.fn().mockResolvedValue({ id: 'c1' }) },
      },
    };
    estoque = { registrarSaidaTx: jest.fn().mockResolvedValue(undefined) };

    const moduleRef = await Test.createTestingModule({
      providers: [
        VendasService,
        { provide: PrismaService, useValue: prisma },
        { provide: EstoqueService, useValue: estoque },
      ],
    }).compile();

    service = moduleRef.get(VendasService);
  });

  describe('criar', () => {
    const criar = (...args: Parameters<VendasService['criar']>) =>
      tenantStorage.run({ tenantId: 'e1', userId: 'u1', role: 'ADMIN', email: 'u@x.com' }, () =>
        service.criar(...args),
      );
    it('rejeita lista de itens vazia', async () => {
      await expect(criar(undefined, [])).rejects.toThrow(/ao menos um item/);
    });

    it('lança NotFoundException se algum produto não existe', async () => {
      prisma.client.produto.findMany.mockResolvedValue([
        { id: 'p1', nome: 'Shampoo', preco: 20, estoqueAtual: 100, ativo: true },
      ]);

      await expect(
        criar(undefined, [
          { produtoId: 'p1', quantidade: 1 },
          { produtoId: 'fantasma', quantidade: 1 },
        ]),
      ).rejects.toThrow(/Produto não encontrado/);
    });

    it('lança ConflictException se saldo for insuficiente', async () => {
      prisma.client.produto.findMany.mockResolvedValue([
        { id: 'p1', nome: 'Shampoo', preco: 20, estoqueAtual: 1, ativo: true },
      ]);

      await expect(criar(undefined, [{ produtoId: 'p1', quantidade: 10 }])).rejects.toThrow(
        /Saldo insuficiente/,
      );
    });

    it('cria a venda, os itens e baixa estoque em uma transação', async () => {
      prisma.client.produto.findMany.mockResolvedValue([
        { id: 'p1', nome: 'Shampoo', preco: 25, estoqueAtual: 10, ativo: true },
        { id: 'p2', nome: 'Condicionador', preco: 30, estoqueAtual: 5, ativo: true },
      ]);

      const txVenda = { id: 'v1', createdAt: new Date('2026-10-15T12:00Z') };
      let receivedData: { clienteId?: string; total: number; desconto?: number } | null = null;
      prisma.client.$transaction.mockImplementation((cb) => {
        const fakeTx = {
          venda: {
            create: jest.fn().mockImplementation(({ data }) => {
              receivedData = data;
              return txVenda;
            }),
          },
          itemVenda: { create: jest.fn().mockResolvedValue({}) },
          cliente: { updateMany: jest.fn().mockResolvedValue({ count: 1 }) },
        };
        return cb(fakeTx);
      });
      // Mock do `obter()` chamado no final do `criar`
      prisma.client.venda.findFirst.mockResolvedValue({ id: 'v1', itens: [] });

      const result = await criar('c1', [
        { produtoId: 'p1', quantidade: 2 },
        { produtoId: 'p2', quantidade: 1 },
      ]);

      // total: 2*25 + 1*30 = 80
      expect(receivedData).toEqual({
        empresaId: 'e1',
        clienteId: 'c1',
        cupomId: null,
        total: new Prisma.Decimal(80),
        desconto: new Prisma.Decimal(0),
        formaPagamento: undefined,
      });
      expect(result.id).toBe('v1');
      // registrarSaidaTx chamado para cada item
      expect(estoque.registrarSaidaTx).toHaveBeenCalledTimes(2);
    });

    it('soma linhas repetidas antes de verificar saldo', async () => {
      prisma.client.produto.findMany.mockResolvedValue([
        { id: 'p1', nome: 'Shampoo', preco: 20, estoqueAtual: 3 },
      ]);
      await expect(
        criar(undefined, [
          { produtoId: 'p1', quantidade: 2 },
          { produtoId: 'p1', quantidade: 2 },
        ]),
      ).rejects.toThrow(/Saldo insuficiente/);
      expect(prisma.client.$transaction).not.toHaveBeenCalled();
    });

    it('não associa cliente de outra empresa', async () => {
      prisma.client.cliente.findFirst.mockResolvedValue(null);
      await expect(criar('foreign', [{ produtoId: 'p1', quantidade: 1 }])).rejects.toThrow(
        /Cliente não encontrado/,
      );
      expect(prisma.client.cliente.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'foreign', empresaId: 'e1', ativo: true } }),
      );
    });
  });
  it('lista produtos relacionados e totais globais sem limitar o resumo a pagina', async () => {
    prisma.client.venda.findMany.mockResolvedValue([
      { id: 'v1', itens: [{ produto: { id: 'p1', nome: 'Produto real' } }] },
    ]);
    prisma.client.venda.aggregate.mockResolvedValue({
      _count: { _all: 106 },
      _sum: { total: 1060 },
    });
    prisma.client.itemVenda.aggregate.mockResolvedValue({ _sum: { quantidade: 212 } });
    const result = await tenantStorage.run(
      { tenantId: 'e1', userId: 'u1', role: 'ADMIN', email: 'u@x.com' },
      () => service.listar(2, 25, { dataInicio: '2026-10-15', dataFim: '2026-10-15' }),
    );
    expect(result.total).toBe(106);
    expect(result.resumo).toEqual({ totalVendido: 1060, totalItens: 212 });
    expect(prisma.client.venda.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        skip: 25,
        take: 25,
        include: expect.objectContaining({
          itens: { include: { produto: { select: { id: true, nome: true } } } },
        }),
      }),
    );
    expect(prisma.client.venda.aggregate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          empresaId: 'e1',
          createdAt: {
            gte: new Date('2026-10-15T00:00:00Z'),
            lte: new Date('2026-10-15T23:59:59.999Z'),
          },
        },
      }),
    );
  });
});
