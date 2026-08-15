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

  async onModuleDestroy(): Promise<void> {
    if (this.client) {
      await this.client.quit().catch(() => undefined);
    }
  }
}
