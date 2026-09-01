import { Injectable, OnModuleDestroy, Logger } from '@nestjs/common';
import Redis from 'ioredis';
import { CircuitBreaker, CircuitBreakerOpenError } from '../common/utils/circuit-breaker.util';

@Injectable()
export class RedisService implements OnModuleDestroy {
  private client: Redis;
  private readonly logger = new Logger(RedisService.name);

  // RESILIENCE: Circuit breaker to prevent cascading failures when Redis is unavailable
  private readonly circuitBreaker = new CircuitBreaker('RedisService', {
    failureThreshold: 5,
    resetTimeoutMs: 30_000, // 30s
    halfOpenMaxRequests: 3,
  });

  // C8 FIX: In-memory fallback for incr() when circuit breaker prevents Redis access.
  // Ensures rate limiting continues to function even when Redis is unavailable.
  // Entries auto-expire after 60 seconds via setTimeout cleanup.
  private readonly incrFallback = new Map<string, number>();
  private readonly incrFallbackTimeouts = new Map<string, NodeJS.Timeout>();
  private static readonly INCR_FALLBACK_TTL_MS = 60_000;

  // SECURITY: Maximum key length to prevent memory attacks
  private readonly MAX_KEY_LENGTH = 1024;
  // SECURITY: Maximum value length to prevent memory attacks
  private readonly MAX_VALUE_LENGTH = 1024 * 1024; // 1MB

  constructor() {
    const redisUrl = process.env.REDIS_URL ?? 'redis://localhost:6379';
    this.client = new Redis(redisUrl, {
      maxRetriesPerRequest: 3,
      retryStrategy: (times) => {
        if (times > 5) return null; // Stop retrying after 5 attempts
        return Math.min(times * 200, 2000); // Exponential backoff capped at 2s
      },
    });
    
    // SECURITY: Log connection errors
    this.client.on('error', (err) => {
      this.logger.error(`Redis connection error: ${err.message}`);
    });
  }

  /**
   * Execute an operation with circuit breaker protection.
   * If Redis is in circuit-breaker OPEN state, the operation fails immediately
   * instead of hanging on a dead connection.
   */
  private async withCircuitBreaker<T>(
    operation: () => Promise<T>,
    fallback?: () => T | Promise<T>,
  ): Promise<T> {
    try {
      return await this.circuitBreaker.execute(operation, fallback);
    } catch (err) {
      if (err instanceof CircuitBreakerOpenError) {
        this.logger.warn(`Redis operation rejected by circuit breaker`);
      }
      throw err;
    }
  }

  /**
   * Get the circuit breaker state for health checks / metrics.
   */
  getCircuitState(): string {
    return this.circuitBreaker.currentState;
  }

  isCircuitOpen(): boolean {
    return this.circuitBreaker.isOpen;
  }

  forceCloseCircuit(): void {
    this.circuitBreaker.forceClose();
  }

  async onModuleDestroy() {
    await this.client.quit();
  }

  // SECURITY: Validate key format
  private validateKey(key: string): void {
    if (!key || typeof key !== 'string') {
      throw new Error('Redis key must be a non-empty string');
    }
    if (key.length > this.MAX_KEY_LENGTH) {
      throw new Error(`Redis key exceeds maximum length of ${this.MAX_KEY_LENGTH}`);
    }
    // SECURITY: Prevent null bytes in keys
    if (key.includes('\0')) {
      throw new Error('Redis key contains invalid characters');
    }
  }

  // SECURITY: Validate value format
  private validateValue(value: string): void {
    if (value === undefined || value === null) {
      throw new Error('Redis value cannot be null or undefined');
    }
    if (typeof value !== 'string') {
      throw new Error('Redis value must be a string');
    }
    if (value.length > this.MAX_VALUE_LENGTH) {
      throw new Error(`Redis value exceeds maximum length of ${this.MAX_VALUE_LENGTH}`);
    }
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    this.validateKey(key);
    this.validateValue(value);
    
    // SECURITY: Validate TTL
    if (ttlSeconds !== undefined && (typeof ttlSeconds !== 'number' || ttlSeconds < 0)) {
      throw new Error('TTL must be a non-negative number');
    }
    
    await this.withCircuitBreaker(async () => {
      if (ttlSeconds && ttlSeconds > 0) {
        await this.client.set(key, value, 'EX', ttlSeconds);
      } else {
        await this.client.set(key, value);
      }
    });
  }

  async setNX(key: string, value: string, ttlSeconds?: number): Promise<boolean> {
    this.validateKey(key);
    this.validateValue(value);
    
    if (ttlSeconds !== undefined && (typeof ttlSeconds !== 'number' || ttlSeconds < 0)) {
      throw new Error('TTL must be a non-negative number');
    }
    
    return this.withCircuitBreaker(async () => {
      if (ttlSeconds && ttlSeconds > 0) {
        const result = await this.client.set(key, value, 'EX', ttlSeconds, 'NX');
        return result === 'OK';
      } else {
        const result = await this.client.set(key, value, 'NX');
        return result === 'OK';
      }
    });
  }

  async get(key: string): Promise<string | null> {
    this.validateKey(key);
    return this.withCircuitBreaker(
      () => this.client.get(key),
      () => null, // Fallback: return null as if key doesn't exist (degraded mode)
    );
  }

  async del(key: string): Promise<void> {
    this.validateKey(key);
    await this.withCircuitBreaker(() => this.client.del(key));
  }

  async exists(key: string): Promise<boolean> {
    this.validateKey(key);
    return this.withCircuitBreaker(
      async () => {
        const result = await this.client.exists(key);
        return result === 1;
      },
      () => false, // Fallback: assume key doesn't exist (degraded mode)
    );
  }

  async ping(): Promise<string> {
    return this.client.ping();
  }

  async incr(key: string): Promise<number> {
    this.validateKey(key);
    try {
      return await this.withCircuitBreaker(
        () => this.client.incr(key),
      );
    } catch (err) {
      if (err instanceof CircuitBreakerOpenError) {
        // C8 FIX: Use in-memory fallback when circuit breaker is open.
        // This prevents rate limiting from being completely bypassed when Redis is down.
        const existing = this.incrFallback.get(key);
        const newCount = (existing ?? 0) + 1;
        this.incrFallback.set(key, newCount);

        // Clear existing timeout and set new one for auto-expiry
        const existingTimeout = this.incrFallbackTimeouts.get(key);
        if (existingTimeout) clearTimeout(existingTimeout);

        this.incrFallbackTimeouts.set(key, setTimeout(() => {
          this.incrFallback.delete(key);
          this.incrFallbackTimeouts.delete(key);
        }, RedisService.INCR_FALLBACK_TTL_MS));

        this.logger.warn(`In-memory incr fallback used for key: ${key} (count: ${newCount})`);
        return newCount;
      }
      throw err;
    }
  }

  async expire(key: string, ttlSeconds: number): Promise<void> {
    this.validateKey(key);
    
    // SECURITY: Validate TTL
    if (typeof ttlSeconds !== 'number' || ttlSeconds < 0) {
      throw new Error('TTL must be a non-negative number');
    }
    
    await this.withCircuitBreaker(() => this.client.expire(key, ttlSeconds));
  }

  async ttl(key: string): Promise<number> {
    this.validateKey(key);
    return this.withCircuitBreaker(
      () => this.client.ttl(key),
      () => -2, // Fallback: -2 means key doesn't exist
    );
  }

  // SECURITY: flushall is extremely dangerous - require explicit confirmation
  // This method should NEVER be called in production without explicit admin action
  async flushall(confirmationToken?: string): Promise<void> {
    const nodeEnv = process.env.NODE_ENV;

    // A11 FIX: Rate limit flushall attempts — max 3 per 60 seconds
    const flushKey = `ratelimit:flushall:attempts`;
    try {
      const attempts = await this.client.incr(flushKey);
      if (attempts === 1) await this.client.expire(flushKey, 60);
      if (attempts > 3) {
        this.logger.warn(`FLUSHALL rate limited — ${attempts} attempts in 60s`);
        throw new Error('Too many FLUSHALL attempts. Wait 60 seconds before retrying.');
      }
    } catch (err) {
      // If Redis is down, still fail safe — don't allow flushall
      if (err instanceof Error && err.message.includes('Too many')) throw err;
      this.logger.warn('FLUSHALL blocked — cannot verify rate limit (Redis unavailable)');
      throw new Error('FLUSHALL blocked — Redis unavailable. Try again later.');
    }
    
    // SECURITY: Block flushall in production unless explicitly confirmed
    if (nodeEnv === 'production') {
      const expectedToken = process.env.REDIS_FLUSH_TOKEN;
      if (!expectedToken) {
        throw new Error('FLUSHALL is disabled in production. Set REDIS_FLUSH_TOKEN to enable.');
      }
      if (confirmationToken !== expectedToken) {
        this.logger.warn('Unauthorized FLUSHALL attempt blocked in production');
        throw new Error('Invalid flushall confirmation token');
      }
    }
    
    this.logger.warn(`FLUSHALL executed in ${nodeEnv} environment - ALL DATA DELETED`);
    await this.client.flushall();
  }
}
