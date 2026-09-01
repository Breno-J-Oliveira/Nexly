import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
  BadRequestException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { Observable, of } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Request, Response } from 'express';
import { createHash } from 'crypto';
import { RedisService } from '../../redis/redis.service';

const IDEMPOTENCY_HEADER = 'idempotency-key';
const IDEMPOTENCY_TTL = 24 * 60 * 60; // 24h
// NA9 FIX: For public/anonymous routes, use a much shorter TTL (5 minutes).
// The 24h TTL for authenticated users is fine (scoped to userId), but for
// public routes like /auth/login, the cache key uses 'public' scope. A long
// TTL combined with token-bearing responses could allow token replay if two
// different users share the same Idempotency-Key within 24h.
const IDEMPOTENCY_TTL_PUBLIC = 5 * 60; // 5 minutes
const SAFE_METHODS = ['GET', 'HEAD', 'OPTIONS'];

/**
 * Idempotency interceptor.
 *
 * Implemented as a NestJS INTERCEPTOR (not Express middleware) so it
 * runs AFTER guards and AFTER the JWT auth guard has populated
 * `req.user`. This is essential because the cache key must be
 * scoped to the authenticated user — otherwise two users who happen
 * to send the same Idempotency-Key would see each other's responses.
 *
 * - Safe methods (GET/HEAD/OPTIONS) are passed through.
 * - Unsafe methods without an Idempotency-Key are passed through
 *   (the key is optional, recommended for state-changing operations).
 * - If the key is present, the response is cached in Redis and
 *   replays are returned with the `Idempotent-Replay: true` header.
 */
@Injectable()
export class IdempotencyInterceptor implements NestInterceptor {
  private readonly logger = new Logger(IdempotencyInterceptor.name);

  constructor(private redisService: RedisService) {}

  private stableStringify(input: unknown, seen: WeakSet<object> = new WeakSet()): string {
    // Deterministic stringify for hashing request bodies.
    // We avoid external deps: recursively sort object keys.
    // SECURITY: Detect circular references to prevent infinite loops (DoS).
    if (input === null || input === undefined) return String(input);

    if (typeof input !== 'object') {
      return JSON.stringify(input);
    }

    // SECURITY: Prevent infinite recursion on circular references
    if (seen.has(input as object)) {
      throw new BadRequestException({
        code: 'INVALID_REQUEST_BODY',
        message: 'Request body contains circular references',
      });
    }
    seen.add(input as object);

    if (Array.isArray(input)) {
      return `[${input.map((v) => this.stableStringify(v, seen)).join(',')}]`;
    }

    const obj = input as Record<string, unknown>;
    const keys = Object.keys(obj).sort();
    const props = keys.map((k) => `${JSON.stringify(k)}:${this.stableStringify(obj[k], seen)}`);
    return `{${props.join(',')}}`;
  }

  private sha256Hex(text: string): string {
    return createHash('sha256').update(text).digest('hex');
  }

  private computeBodyHash(req: Request): string {
    // Body is already parsed by express.json() / urlencoded.
    // We only hash the parsed value to avoid raw stream issues.
    const body = (req as any).body;
    if (body === undefined) return this.sha256Hex('__NO_BODY__');
    return this.sha256Hex(this.stableStringify(body));
  }

  async intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Promise<Observable<any>> {
    const http = context.switchToHttp();
    const req = http.getRequest<Request>();
    const res = http.getResponse<Response>();

    if (SAFE_METHODS.includes(req.method)) {
      return next.handle();
    }

    if (!['POST', 'PUT', 'PATCH'].includes(req.method)) {
      return next.handle();
    }

    const key = req.headers[IDEMPOTENCY_HEADER] as string;
    if (!key) {
      return next.handle();
    }

    if (key.length < 16 || key.length > 255) {
      throw new BadRequestException({
        code: 'INVALID_IDEMPOTENCY_KEY',
        message: 'Idempotency-Key must be between 16 and 255 characters',
      });
    }

    if (!/^[a-zA-Z0-9\-_]+$/.test(key)) {
      throw new BadRequestException({
        code: 'INVALID_IDEMPOTENCY_KEY',
        message: 'Idempotency-Key must be alphanumeric with hyphens/underscores',
      });
    }

    const method = req.method.toUpperCase();

    // Prefer stable route path (route is attached by Nest).
    // Avoid req.originalUrl because it may include volatile querystrings.
    const routePath =
      (req as any).route?.path ??
      // fallback for edge cases (still more stable than originalUrl)
      req.path ??
      'unknown-route';

    const bodyHash = this.computeBodyHash(req);

    // For authenticated requests, scope by userId (req.user.sub).
    // For anonymous/public routes (e.g. /auth/login which is @Public), use a fixed scope
    // (NOT the bodyHash) so that two different clients using the same Idempotency-Key
    // can hit the SAME cache entry and therefore allow bodyHash mismatch detection
    // (replay vs 409 conflict) to work as intended.
    const userScope = (req.user as any)?.sub ?? 'public';
    const ttl = userScope === 'public' ? IDEMPOTENCY_TTL_PUBLIC : IDEMPOTENCY_TTL;
    const cacheKey = `idempotency:${userScope}:${method}:${routePath}:${key}`;

    const cached = await this.redisService.get(cacheKey);

    if (cached) {
      try {
        const parsed = JSON.parse(cached) as {
          status: number;
          body: any;
          bodyHash: string;
        };

        if (parsed.bodyHash !== bodyHash) {
          throw new ConflictException({
            code: 'IDEMPOTENCY_KEY_CONFLICT',
            message:
              'Idempotency-Key conflict: request body does not match the cached request',
          });
        }

        res.setHeader('Idempotent-Replay', 'true');
        res.setHeader('X-Idempotency-Key', key);
        return of(parsed.body);
      } catch (err) {
        if (err instanceof BadRequestException || err instanceof ConflictException) {
          throw err;
        }
        // Corrupted cache / invalid payload: fall through and re-process
        await this.redisService.del(cacheKey);
      }
    }

    // Process the request, then cache the response if it's 2xx
    return next.handle().pipe(
      tap({
        next: (body) => {
          // Only cache successful responses; surface 4xx/5xx to the caller
          // (the request can be retried after fixing the input)
          if (res.statusCode >= 200 && res.statusCode < 300) {
            const data = JSON.stringify({
              status: res.statusCode,
              body,
              bodyHash,
            });
            this.redisService
              .set(cacheKey, data, ttl)
              .catch((err2) => {
                this.logger.error(
                  `Failed to cache idempotency response: ${
                    err2 instanceof Error ? err2.message : 'unknown'
                  }`,
                );
              });
          }
        },
      }),
    );
  }
}
