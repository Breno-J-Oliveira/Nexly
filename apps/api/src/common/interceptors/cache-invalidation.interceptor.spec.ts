import { lastValueFrom, of, throwError } from 'rxjs';
import { RedisService } from '../../redis/redis.service';
import { CacheInvalidationInterceptor } from './cache-invalidation.interceptor';

describe('Cache por empresa após escrita', () => {
  const redis = { del: jest.fn().mockResolvedValue(undefined) };
  const interceptor = new CacheInvalidationInterceptor(redis as unknown as RedisService);
  const context = (method: string) =>
    ({
      switchToHttp: () => ({ getRequest: () => ({ method, user: { empresaId: 'e1' } }) }),
    }) as never;
  beforeEach(() => redis.del.mockClear());

  it('invalida somente a empresa atual antes de retornar a escrita', async () => {
    await expect(
      lastValueFrom(interceptor.intercept(context('POST'), { handle: () => of({ id: 'v1' }) })),
    ).resolves.toEqual({ id: 'v1' });
    expect(redis.del).toHaveBeenCalledWith('dashboard:e1');
  });

  it('preserva cache em leitura e em escrita que falhou', async () => {
    await lastValueFrom(interceptor.intercept(context('GET'), { handle: () => of({}) }));
    await expect(
      lastValueFrom(
        interceptor.intercept(context('POST'), {
          handle: () => throwError(() => new Error('rollback')),
        }),
      ),
    ).rejects.toThrow('rollback');
    expect(redis.del).not.toHaveBeenCalled();
  });
});
