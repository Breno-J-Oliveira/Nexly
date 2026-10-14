import { PedidosCompraService } from './pedidos-compra.service';
import { PrismaService } from '../database/prisma.service';
import { EstoqueService } from '../estoque/estoque.service';
import { tenantStorage } from '../database/tenant-context';

describe('Recebimento de pedido de compra', () => {
  const pedido = { id: 'order1', status: 'ENVIADO', itens: [{ produtoId: 'p1', quantidade: 2 }] };
  const tx = { pedidoCompra: { updateMany: jest.fn() } };
  const prisma = {
    client: {
      pedidoCompra: { findFirst: jest.fn(), create: jest.fn() },
      produto: { findMany: jest.fn() },
      $transaction: jest.fn(),
    },
  };
  const estoque = { registrarEntradaTx: jest.fn() };
  const service = new PedidosCompraService(
    prisma as unknown as PrismaService,
    estoque as unknown as EstoqueService,
  );
  const withTenant = <T>(fn: () => T) =>
    tenantStorage.run({ tenantId: 'e1', userId: 'u1', role: 'ADMIN', email: 'u@x.com' }, fn);
  beforeEach(() => {
    jest.clearAllMocks();
    prisma.client.pedidoCompra.findFirst.mockResolvedValue(pedido);
    prisma.client.$transaction.mockImplementation((callback) => callback(tx));
    tx.pedidoCompra.updateMany.mockResolvedValue({ count: 1 });
    estoque.registrarEntradaTx.mockResolvedValue(undefined);
  });
  it('status e entrada de estoque usam a mesma transação', async () => {
    await withTenant(() => service.receber('order1'));
    expect(tx.pedidoCompra.updateMany).toHaveBeenCalledWith({
      where: { id: 'order1', empresaId: 'e1', status: 'ENVIADO' },
      data: { status: 'RECEBIDO' },
    });
    expect(estoque.registrarEntradaTx).toHaveBeenCalledWith(tx, 'p1', 2, 'Pedido #order1');
  });
  it('segunda requisição não recebe os produtos novamente', async () => {
    tx.pedidoCompra.updateMany.mockResolvedValue({ count: 0 });
    await expect(withTenant(() => service.receber('order1'))).rejects.toThrow('Pedido já alterado');
    expect(estoque.registrarEntradaTx).not.toHaveBeenCalled();
  });
  it('não cria pedido com produto externo', async () => {
    prisma.client.produto.findMany.mockResolvedValue([]);
    await expect(
      service.criar({ itens: [{ produtoId: 'foreign', quantidade: 1 }] }),
    ).rejects.toThrow('Produto não encontrado');
    expect(prisma.client.pedidoCompra.create).not.toHaveBeenCalled();
  });
});
