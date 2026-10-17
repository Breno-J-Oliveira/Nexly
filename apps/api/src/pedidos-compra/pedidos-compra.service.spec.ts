import { PedidosCompraService } from './pedidos-compra.service';
import { PrismaService } from '../database/prisma.service';
import { EstoqueService } from '../estoque/estoque.service';
import { tenantStorage } from '../database/tenant-context';

describe('Recebimento de pedido de compra', () => {
  const pedido = { id: 'order1', status: 'ENVIADO', itens: [{ produtoId: 'p1', quantidade: 2 }] };
  const tx = {
    pedidoCompra: { updateMany: jest.fn(), update: jest.fn() },
    itemPedidoCompra: { deleteMany: jest.fn() },
  };
  const prisma = {
    client: {
      pedidoCompra: { findFirst: jest.fn(), create: jest.fn(), updateMany: jest.fn() },
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
    jest.resetAllMocks();
    prisma.client.pedidoCompra.findFirst.mockResolvedValue(pedido);
    prisma.client.$transaction.mockImplementation((callback) => callback(tx));
    tx.pedidoCompra.updateMany.mockResolvedValue({ count: 1 });
    estoque.registrarEntradaTx.mockResolvedValue(undefined);
  });
  it.each(['INVALIDO', ''])('rejeita filtro de situação inválido: %s', (status) => {
    expect(() => service.listar(status)).toThrow('Situação do pedido inválida');
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
  it('cancelamento concorrente não sobrescreve um pedido já recebido', async () => {
    prisma.client.pedidoCompra.updateMany.mockResolvedValue({ count: 0 });
    await expect(withTenant(() => service.cancelar('order1'))).rejects.toThrow(
      'Pedido já alterado',
    );
    expect(prisma.client.pedidoCompra.updateMany).toHaveBeenCalledWith({
      where: {
        id: 'order1',
        empresaId: 'e1',
        status: { in: ['RASCUNHO', 'ENVIADO', 'CANCELADO'] },
      },
      data: { status: 'CANCELADO' },
    });
  });
  it('envio concorrente não reabre pedido cancelado', async () => {
    prisma.client.pedidoCompra.findFirst.mockResolvedValue({ ...pedido, status: 'RASCUNHO' });
    prisma.client.pedidoCompra.updateMany.mockResolvedValue({ count: 0 });
    await expect(withTenant(() => service.enviar('order1'))).rejects.toThrow('Pedido já alterado');
  });
  it('troca os itens dentro da transação e só enquanto o pedido está em rascunho', async () => {
    prisma.client.pedidoCompra.findFirst.mockResolvedValue({ ...pedido, status: 'RASCUNHO' });
    prisma.client.produto.findMany.mockResolvedValue([{ id: 'p2' }]);
    await withTenant(() =>
      service.atualizar('order1', { itens: [{ produtoId: 'p2', quantidade: 3 }] }),
    );
    expect(tx.itemPedidoCompra.deleteMany).toHaveBeenCalledWith({
      where: { pedidoId: 'order1', pedido: { empresaId: 'e1' } },
    });
    expect(tx.pedidoCompra.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { itens: { create: [{ produtoId: 'p2', quantidade: 3, precoEsperado: null }] } },
      }),
    );
  });
  it('não apaga itens quando outra operação já enviou o pedido', async () => {
    prisma.client.pedidoCompra.findFirst.mockResolvedValue({ ...pedido, status: 'RASCUNHO' });
    prisma.client.produto.findMany.mockResolvedValue([{ id: 'p2' }]);
    tx.pedidoCompra.updateMany.mockResolvedValue({ count: 0 });
    await expect(
      withTenant(() =>
        service.atualizar('order1', { itens: [{ produtoId: 'p2', quantidade: 3 }] }),
      ),
    ).rejects.toThrow('Pedido já alterado');
    expect(tx.itemPedidoCompra.deleteMany).not.toHaveBeenCalled();
  });
});
