import {
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Injectable,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { Request, Response } from 'express';
import * as crypto from 'crypto';
import pino from 'pino';

const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
});

// V44 FIX: list of sensitive query parameter names that must NEVER be logged
const SENSITIVE_PARAMS = [
  'token',
  'access_token',
  'refresh_token',
  'id_token',
  'code',
  'magic',
  'key',
  'api_key',
  'apikey',
  'password',
  'pwd',
  'secret',
  'authorization',
];

// A9 FIX: Sensitive body fields that must be redacted before logging.
// These carry authentication tokens and secrets in request bodies.
const SENSITIVE_BODY_FIELDS = new Set([
  'password', 'currentPassword', 'newPassword', 'confirmPassword',
  'refreshToken', 'challengeToken', 'token',
  'secret', 'code', 'key', 'apiKey', 'api_key',
  'authorization', 'accessToken', 'access_token',
]);

function sanitizeBody(body: unknown): unknown {
  if (!body || typeof body !== 'object') return body;
  if (Array.isArray(body)) return body.map(sanitizeBody);

  const sanitized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(body as Record<string, unknown>)) {
    if (SENSITIVE_BODY_FIELDS.has(key)) {
      sanitized[key] = '[REDACTED]';
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeBody(value);
    } else {
      sanitized[key] = value;
    }
  }
  return sanitized;
}

function sanitizeUrl(rawUrl: string): string {
  try {
    const url = new URL(rawUrl, 'http://placeholder.local');
    const params = url.searchParams;
    let redacted = false;
    for (const key of Array.from(params.keys())) {
      if (SENSITIVE_PARAMS.includes(key.toLowerCase())) {
        params.set(key, '[REDACTED]');
        redacted = true;
      }
    }
    const qs = params.toString();
    const path = url.pathname;
    return redacted ? `${path}?${qs}` : path;
  } catch {
    // If URL parsing fails, return only the pathname-like part up to '?'
    const qIdx = rawUrl.indexOf('?');
    return qIdx >= 0 ? rawUrl.substring(0, qIdx) + '?[REDACTED]' : rawUrl;
  }
}

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const ctx = context.switchToHttp();
    const req = ctx.getRequest<Request>();
    const res = ctx.getResponse<Response>();

    let correlationId = (req.headers['x-request-id'] as string) || crypto.randomUUID();
    req.headers['x-request-id'] = correlationId;
    res.setHeader('x-request-id', correlationId);

    const startTime = Date.now();
    // V44 FIX: never log raw URL with sensitive query parameters
    const safePath = sanitizeUrl(req.originalUrl || req.url || '');
    // A9 FIX: sanitize request body to redact sensitive fields (passwords, tokens, secrets)
    const safeBody = sanitizeBody((req as any).body);

    return next.handle().pipe(
      tap({
        next: () => {
          const duration = Date.now() - startTime;
          logger.info({
            correlationId,
            method: req.method,
            path: safePath,
            statusCode: res.statusCode,
            durationMs: duration,
            body: safeBody,
          });
        },
        error: (err) => {
          const duration = Date.now() - startTime;
          logger.error({
            correlationId,
            method: req.method,
            path: safePath,
            statusCode: err.status || 500,
            durationMs: duration,
            error: err.message,
            body: safeBody,
          });
        },
      }),
    );
  }
}
