import { LoginThrottleService } from './login-throttle.service';
import { RedisService } from '../redis/redis.service';

/**
 * Redis em memória para os testes: implementa apenas o subconjunto usado pelo
 * LoginThrottleService (incr/set/ttl/del) com expiração real.
 */
function fakeRedis() {
  const store = new Map<string, { value: string; expiresAt: number | null }>();
  const purge = (key: string): void => {
    const entry = store.get(key);
    if (entry?.expiresAt != null && entry.expiresAt <= Date.now()) store.delete(key);
  };
  return {
    incr(key: string, ttlSeconds: number): Promise<number> {
      purge(key);
      const next = Number(store.get(key)?.value ?? 0) + 1;
      store.set(key, { value: String(next), expiresAt: Date.now() + ttlSeconds * 1000 });
      return Promise.resolve(next);
    },
    set(key: string, value: string, ttlSeconds: number): Promise<void> {
      store.set(key, { value, expiresAt: Date.now() + ttlSeconds * 1000 });
      return Promise.resolve();
    },
    get(key: string): Promise<string | null> {
      purge(key);
      return Promise.resolve(store.get(key)?.value ?? null);
    },
    ttl(key: string): Promise<number> {
      purge(key);
      const entry = store.get(key);
      if (!entry) return Promise.resolve(-2);
      if (entry.expiresAt == null) return Promise.resolve(-1);
      return Promise.resolve(Math.max(0, Math.ceil((entry.expiresAt - Date.now()) / 1000)));
    },
    del(key: string): Promise<void> {
      store.delete(key);
      return Promise.resolve();
    },
  };
}

/** Redis indisponível: tudo retorna null (mesmo caminho do NODE_ENV=test). */
const offlineRedis = {
  incr: jest.fn().mockResolvedValue(null),
  set: jest.fn().mockResolvedValue(undefined),
  get: jest.fn().mockResolvedValue(null),
  ttl: jest.fn().mockResolvedValue(null),
  del: jest.fn().mockResolvedValue(undefined),
} as unknown as RedisService;

const KEY = 'user@x.com|127.0.0.1';

describe('LoginThrottleService', () => {
  describe('com Redis disponível (bloqueio progressivo)', () => {
    let service: LoginThrottleService;
    let redis: ReturnType<typeof fakeRedis>;

    beforeEach(() => {
      redis = fakeRedis();
      service = new LoginThrottleService(redis as unknown as RedisService);
    });

    const fail = async (key: string, times: number): Promise<void> => {
      for (let i = 0; i < times; i++) await service.registerFailure(key);
    };

    it('não bloqueia para chave nunca vista', async () => {
      await expect(service.isBlocked(KEY)).resolves.toBe(false);
      await expect(service.retryAfterSeconds(KEY)).resolves.toBe(0);
    });

    it('não bloqueia com 4 falhas (abaixo do limite)', async () => {
      await fail(KEY, 4);
      await expect(service.isBlocked(KEY)).resolves.toBe(false);
    });

    it('bloqueia após 5 falhas, pelo primeiro nível (60s)', async () => {
      await fail(KEY, 5);
      await expect(service.isBlocked(KEY)).resolves.toBe(true);
      const retry = await service.retryAfterSeconds(KEY);
      expect(retry).toBeGreaterThan(0);
      expect(retry).toBeLessThanOrEqual(60);
    });

    it('escala o bloqueio no segundo ciclo (5min) e terceiro (15min)', async () => {
      await fail(KEY, 5);
      expect(await service.retryAfterSeconds(KEY)).toBeLessThanOrEqual(60);

      await fail(KEY, 5); // segundo ciclo → nível 2
      expect(await service.retryAfterSeconds(KEY)).toBeGreaterThan(60);

      await fail(KEY, 5); // terceiro ciclo → nível 3
      expect(await service.retryAfterSeconds(KEY)).toBeGreaterThan(300);
    });

    it('registerSuccess limpa o bloqueio', async () => {
      await fail(KEY, 5);
      await expect(service.isBlocked(KEY)).resolves.toBe(true);

      await service.registerSuccess(KEY);
      await expect(service.isBlocked(KEY)).resolves.toBe(false);
      await expect(service.retryAfterSeconds(KEY)).resolves.toBe(0);
    });

    it('chaves diferentes têm contadores independentes', async () => {
      const outra = 'b@x.com|1.1.1.1';
      await fail(KEY, 5);
      await expect(service.isBlocked(KEY)).resolves.toBe(true);
      await expect(service.isBlocked(outra)).resolves.toBe(false);
    });

    it('o contador de falhas sobrevive entre instâncias (compartilhado)', async () => {
      const outraInstancia = new LoginThrottleService(redis as unknown as RedisService);
      await fail(KEY, 2);
      await fail(KEY, 3); // completa as 5 em outra instância
      await expect(outraInstancia.isBlocked(KEY)).resolves.toBe(true);
    });
  });

  describe('sem Redis (fallback em memória)', () => {
    let service: LoginThrottleService;

    beforeEach(() => {
      service = new LoginThrottleService(offlineRedis);
    });

    it('mantém a mesma regra de bloqueio (5 falhas → bloqueado)', async () => {
      await expect(service.isBlocked(KEY)).resolves.toBe(false);
      for (let i = 0; i < 5; i++) await service.registerFailure(KEY);
      await expect(service.isBlocked(KEY)).resolves.toBe(true);
      expect(await service.retryAfterSeconds(KEY)).toBeGreaterThan(0);
    });

    it('não bloqueia com 4 falhas e limpa no sucesso', async () => {
      for (let i = 0; i < 4; i++) await service.registerFailure(KEY);
      await expect(service.isBlocked(KEY)).resolves.toBe(false);

      for (let i = 0; i < 5; i++) await service.registerFailure(KEY);
      await expect(service.isBlocked(KEY)).resolves.toBe(true);

      await service.registerSuccess(KEY);
      await expect(service.isBlocked(KEY)).resolves.toBe(false);
    });
  });
});
