import { Logger } from '@nestjs/common';
import { AssinaturasService } from '../assinaturas/assinaturas.service';
import { PrismaService } from '../database/prisma.service';
import { LgpdScheduler } from './lgpd.scheduler';

describe('Exclusão definitiva com proteção de cobrança', () => {
  function fixture() {
    const remove = jest.fn().mockResolvedValue({ count: 0 });
    const client = {
      exclusaoConta: {
        findMany: jest.fn().mockResolvedValue([{ id: 'pedido', empresaId: 'e' }]),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      empresa: { delete: jest.fn().mockResolvedValue({}) },
      ...Object.fromEntries(
        [
          'lancamentoFinanceiro',
          'saldoFilial',
          'avaliacao',
          'itemVenda',
          'itemPedidoCompra',
          'insumoServico',
          'movimentacaoEstoque',
          'agendamento',
          'venda',
          'notificacao',
          'cliente',
          'profissional',
          'servico',
          'produto',
        ].map((name) => [name, { deleteMany: remove }]),
      ),
      $transaction: jest.fn(),
    };
    client.$transaction.mockImplementation((cb) => cb(client));
    const billing = { validarEncerramento: jest.fn().mockResolvedValue(undefined) };
    const service = new LgpdScheduler(
      { client } as unknown as PrismaService,
      billing as unknown as AssinaturasService,
    );
    return { client, remove, billing, service };
  }

  it('verifica cobrança na mesma transação antes de qualquer remoção', async () => {
    const { client, billing, remove, service } = fixture();
    await service.executarExclusoes();
    expect(billing.validarEncerramento).toHaveBeenCalledWith('e', client);
    expect(billing.validarEncerramento.mock.invocationCallOrder[0]).toBeLessThan(
      remove.mock.invocationCallOrder[0]!,
    );
    expect(client.empresa.delete).toHaveBeenCalledWith({ where: { id: 'e' } });
  });

  it('preserva dados e não registra segredos quando a cobrança não pode ser encerrada', async () => {
    const { client, billing, remove, service } = fixture();
    const log = jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
    billing.validarEncerramento.mockRejectedValue(new Error('segredo-nao-publicar'));
    await service.executarExclusoes();
    expect(remove).not.toHaveBeenCalled();
    expect(client.empresa.delete).not.toHaveBeenCalled();
    expect(JSON.stringify(log.mock.calls)).not.toContain('segredo-nao-publicar');
    log.mockRestore();
  });

  it('não apaga pedido cancelado pelo titular ou já reservado por outro worker', async () => {
    const { client, billing, remove, service } = fixture();
    client.exclusaoConta.updateMany.mockResolvedValue({ count: 0 });
    await service.executarExclusoes();
    expect(client.exclusaoConta.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id: 'pedido',
          empresaId: 'e',
          executada: false,
          executarEm: { lte: expect.any(Date) },
        },
      }),
    );
    expect(billing.validarEncerramento).not.toHaveBeenCalled();
    expect(remove).not.toHaveBeenCalled();
  });
});
