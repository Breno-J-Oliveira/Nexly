import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../redis/redis.service';

@Injectable()
export class HealthService {
  private readonly logger = new Logger(HealthService.name);

  // Readiness probe cache to prevent DB overload from Kubernetes health checks
  private cachedReadiness: {
    status: string;
    timestamp: string;
    services: any;
  } | null = null;
  private cacheExpiresAt = 0;
  private readonly CACHE_TTL_MS = 5_000; // 5 seconds

  constructor(
    private prisma: PrismaService,
    private redisService: RedisService,
  ) {}

  liveness() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
    };
  }

  async readiness() {
    // Return cached result if still valid (prevents DB overload from health probes)
    if (this.cachedReadiness && Date.now() < this.cacheExpiresAt) {
      return this.cachedReadiness;
    }

    const [db, redis] = await Promise.allSettled([
      this.checkDatabase(),
      this.checkRedis(),
    ]);

    const dbOk = db.status === 'fulfilled';
    const redisOk = redis.status === 'fulfilled';
    const allOk = dbOk && redisOk;

    const result = {
      status: allOk ? 'ok' : 'not_ready',
      timestamp: new Date().toISOString(),
      services: {
        database: {
          status: dbOk ? 'ok' : 'error',
          // SECURITY: Don't leak internal error messages to public endpoints
          ...(db.status === 'rejected' && { error: 'Database connection failed' }),
        },
        redis: {
          status: redisOk ? 'ok' : 'error',
          // SECURITY: Don't leak internal error messages to public endpoints
          ...(redis.status === 'rejected' && { error: 'Redis connection failed' }),
        },
        // C7 FIX: Do not expose internal circuit breaker state on public health endpoint.
        // Exposing it allows attackers to monitor when Redis is under stress and coordinate attacks.
      },
    };

    // Cache the result to protect DB from health check storms
    if (allOk) {
      this.cachedReadiness = result;
      this.cacheExpiresAt = Date.now() + this.CACHE_TTL_MS;
    } else {
      // Don't cache unhealthy results — allow immediate retry
      this.cachedReadiness = null;
    }

    return result;
  }

  async checkAll() {
    const [db, redis] = await Promise.allSettled([
      this.checkDatabase(),
      this.checkRedis(),
    ]);

    return {
      status:
        db.status === 'fulfilled' && redis.status === 'fulfilled'
          ? 'ok'
          : 'degraded',
      timestamp: new Date().toISOString(),
      services: {
        database: {
          status: db.status === 'fulfilled' ? 'ok' : 'error',
          // SECURITY: Don't leak internal error messages to public endpoints
          ...(db.status === 'rejected' && { error: 'Database connection failed' }),
        },
        redis: {
          status: redis.status === 'fulfilled' ? 'ok' : 'error',
          // SECURITY: Don't leak internal error messages to public endpoints
          ...(redis.status === 'rejected' && { error: 'Redis connection failed' }),
        },
      },
    };
  }

  private async checkDatabase(): Promise<void> {
    await this.prisma.$queryRaw`SELECT 1`;
  }

  private async checkRedis(): Promise<void> {
    const pong = await this.redisService.ping();
    if (pong !== 'PONG') {
      throw new Error(`Redis returned: ${pong}`);
    }
  }
}
