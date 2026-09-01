import {
  CanActivate,
  ExecutionContext,
  Injectable,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { RedisService } from '../../redis/redis.service';

/**
 * Global IP-based rate limiting guard.
 *
 * Applied at the guard level as defense-in-depth, complementing the
 * granular Redis-based rate limiting in controllers/services.
 *
 * Safe methods (GET/HEAD/OPTIONS) are excluded to avoid counting
 * asset requests and health checks. The guard runs early in the
 * request lifecycle, before any expensive DB queries.
 */
@Injectable()
export class ThrottlerGuard implements CanActivate {
  private readonly logger = new Logger(ThrottlerGuard.name);
  private readonly SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);
  private readonly GLOBAL_TTL = 60; // seconds
  private readonly GLOBAL_LIMIT = 100; // requests per IP per TTL

  constructor(private redisService: RedisService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();

    // Skip rate limiting for safe methods
    if (this.SAFE_METHODS.has(request.method)) {
      return true;
    }

    const ip = request.ip || 'unknown';
    const key = `throttler:global:${ip}`;

    try {
      const count = await this.redisService.incr(key);
      if (count === 1) {
        await this.redisService.expire(key, this.GLOBAL_TTL);
      }

      if (count > this.GLOBAL_LIMIT) {
        const ttl = await this.redisService.ttl(key);
        throw new HttpException(
          {
            code: 'RATE_LIMITED',
            message: 'Too many requests. Please try again later.',
            retryAfter: ttl,
          },
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }
    } catch (err) {
      if (err instanceof HttpException) {
        throw err;
      }
      // If Redis is down, allow the request through (fail open for availability).
      // The granular rate limiting in controllers will handle this in memory if needed.
      this.logger.warn(
        `Throttler guard Redis error for IP ${ip}: ${err instanceof Error ? err.message : 'unknown'}`,
      );
    }

    return true;
  }
}