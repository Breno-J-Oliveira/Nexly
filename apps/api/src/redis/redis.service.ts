import { Injectable, OnModuleDestroy } from '@nestjs/common';
import Redis from 'ioredis';
import { env } from '../config/env';

/**
 * Wrapper do Redis com inicialização lazy e tolerância a falhas.
 * Em ambiente de teste, o cache é desabilitado (retorna null).
 */
@Injectable()
export class RedisService implements OnModuleDestroy {
  private readonly client: Redis | null;

  constructor() {
    this.client =
      env.NODE_ENV === 'test'
        ? null
        : new Redis(env.REDIS_URL, { lazyConnect: true, maxRetriesPerRequest: 1 });
  }

  async get(key: string): Promise<string | null> {
    if (!this.client) return null;
    try {
      return await this.client.get(key);
    } catch {
      return null;
    }
  }

  async set(key: string, value: string, ttlSeconds: number): Promise<void> {
    if (!this.client) return;
    try {
      await this.client.set(key, value, 'EX', ttlSeconds);
    } catch {
      /* cache é best-effort */
    }
  }

  async del(key: string): Promise<void> {
    if (!this.client) return;
    try {
      await this.client.del(key);
    } catch {
      /* ignore */
    }
  }

  /**
   * Incrementa o contador e garante o TTL (renovado a cada incremento).
   * Retorna `null` quando o Redis está indisponível — quem chama decide o fallback.
   */
  async incr(key: string, ttlSeconds: number): Promise<number | null> {
    if (!this.client) return null;
    try {
      const value = await this.client.incr(key);
      await this.client.expire(key, ttlSeconds);
      return value;
    } catch {
      return null;
    }
  }

  /** TTL restante em segundos (-1 sem TTL, -2 inexistente, null se indisponível). */
  async ttl(key: string): Promise<number | null> {
    if (!this.client) return null;
    try {
      return await this.client.ttl(key);
    } catch {
      return null;
    }
  }

  async ping(): Promise<boolean> {
    if (!this.client) return false;
    try {
      return (await this.client.ping()) === 'PONG';
    } catch {
      return false;
    }
  }

  async onModuleDestroy(): Promise<void> {
    if (this.client) {
      await this.client.quit().catch(() => undefined);
    }
  }
}
