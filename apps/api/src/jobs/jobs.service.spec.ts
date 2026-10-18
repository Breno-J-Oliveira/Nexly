import { PrismaService } from '../database/prisma.service';
import { JobsService } from './jobs.service';
describe('Fila persistente', () => {
  function fixture(tentativas = 1) {
    const record = {
      id: 'job',
      empresaId: 'e',
      tipo: 'TESTE',
      payload: { id: 'registro' },
      tentativas,
    };
    const client = {
      $queryRaw: jest
        .fn()
        .mockResolvedValueOnce([{ id: 'job' }])
        .mockResolvedValue([]),
      jobDuravel: {
        update: jest.fn().mockResolvedValue(record),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        deleteMany: jest.fn(),
      },
      usuario: { findMany: jest.fn().mockResolvedValue([{ id: 'admin' }]) },
      notificacao: { createMany: jest.fn() },
      $transaction: jest.fn(),
    };
    client.$transaction.mockImplementation((cb) => cb(client));
    return { client, service: new JobsService({ client } as unknown as PrismaService) };
  }
  it('reserva com SKIP LOCKED, limpa payload concluído e evita duas execuções no mesmo processo', async () => {
    const { service, client } = fixture();
    const handler = jest.fn().mockResolvedValue(undefined);
    service.register('TESTE', handler);
    await Promise.all([service.processar(), service.processar()]);
    expect(handler).toHaveBeenCalledTimes(1);
    expect(client.$queryRaw.mock.calls[0]?.[0].join('')).toContain('SKIP LOCKED');
    expect(client.jobDuravel.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: 'CONCLUIDO', payload: expect.anything() }),
      }),
    );
  });
  it('falha temporária agenda retry sem expor detalhes sensíveis', async () => {
    const { service, client } = fixture();
    service.register('TESTE', () => Promise.reject(new Error('senha=nao-vazar')));
    await service.processar();
    expect(client.jobDuravel.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: 'PENDENTE',
          erro: 'Não foi possível concluir a rotina',
          executarEm: expect.any(Date),
        }),
      }),
    );
    expect(client.notificacao.createMany).not.toHaveBeenCalled();
  });
  it('quinta falha gera alerta interno apenas para administradores da empresa', async () => {
    const { service, client } = fixture(5);
    service.register('TESTE', () => Promise.reject(new Error('falha')));
    await service.processar();
    expect(client.usuario.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { empresaId: 'e', ativo: true, role: 'ADMIN' } }),
    );
    expect(client.notificacao.createMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: [expect.objectContaining({ empresaId: 'e', usuarioId: 'admin', link: '/operacao' })],
      }),
    );
  });
});
