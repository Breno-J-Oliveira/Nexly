import { ExecutionContext, ServiceUnavailableException } from '@nestjs/common';
import { HeavyOperationGuard } from './heavy-operation.guard';
import { RedisService } from '../../redis/redis.service';

describe('cotas de operações pesadas', () => {
  const redis = { consumeLimit: jest.fn() };
  const response = { setHeader: jest.fn() };
  const guard = new HeavyOperationGuard(redis as unknown as RedisService);
  const context = (path: string, method = 'GET', user: unknown = { id: 'u1', empresaId: 'e1' }) =>
    ({
      switchToHttp: () => ({
        getRequest: () => ({ path, method, user }),
        getResponse: () => response,
      }),
    }) as ExecutionContext;
  beforeEach(() => {
    jest.clearAllMocks();
    redis.consumeLimit.mockResolvedValue({ allowed: true, remaining: 2, retryAfter: 3600 });
  });
  it.each(['/api/lgpd/status-exclusao', '/api/export/produtos/vencendo', '/api/clientes'])(
    'consulta %s não consome exportações',
    async (path) => {
      expect(await guard.canActivate(context(path))).toBe(true);
      expect(redis.consumeLimit).not.toHaveBeenCalled();
    },
  );
  it('cancelar exclusão continua disponível sem consumir a cota', async () => {
    expect(await guard.canActivate(context('/api/lgpd/cancelar-exclusao', 'DELETE'))).toBe(true);
    expect(redis.consumeLimit).not.toHaveBeenCalled();
  });
  it('usa identidade verificada e não IP compartilhado', async () => {
    await guard.canActivate(context('/api/export/vendas/csv'));
    await guard.canActivate(
      context('/api/export/vendas/csv', 'GET', { id: 'u2', empresaId: 'e1' }),
    );
    expect(redis.consumeLimit.mock.calls.map((c) => c[0])).toEqual([
      'heavy:export:e1:u1',
      'heavy:export:e1:u2',
    ]);
  });
  it('exportação de cliente e empresa compartilham a cota de exportações', async () => {
    await guard.canActivate(context('/api/lgpd/exportar'));
    await guard.canActivate(context('/api/lgpd/exportar/cliente/c1'));
    expect(redis.consumeLimit.mock.calls.every((c) => c[0] === 'heavy:export:e1:u1')).toBe(true);
  });
  it('alteração destrutiva tem uma cota separada', async () => {
    await guard.canActivate(context('/api/lgpd/anonimizar/cliente/c1', 'POST'));
    expect(redis.consumeLimit).toHaveBeenCalledWith('heavy:privacy:e1:u1', 3, 3600);
  });
  it('sem identidade não acessa operações protegidas', async () => {
    expect(await guard.canActivate(context('/api/export/vendas/csv', 'GET', null))).toBe(false);
  });
  it('quota esgotada responde 429 e informa a espera', async () => {
    redis.consumeLimit.mockResolvedValue({ allowed: false, remaining: 0, retryAfter: 120 });
    await expect(guard.canActivate(context('/api/export/vendas/csv'))).rejects.toMatchObject({
      status: 429,
    });
    expect(response.setHeader).toHaveBeenCalledWith('Retry-After', '120');
  });
  it('Redis indisponível não libera exportações sem controle', async () => {
    redis.consumeLimit.mockResolvedValue(null);
    await expect(guard.canActivate(context('/api/export/vendas/csv'))).rejects.toThrow(
      ServiceUnavailableException,
    );
  });
});
