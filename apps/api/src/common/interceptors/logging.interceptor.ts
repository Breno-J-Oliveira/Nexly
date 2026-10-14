import { CallHandler, ExecutionContext, Injectable, Logger, NestInterceptor } from '@nestjs/common';
import { Request, Response } from 'express';
import { Observable, tap } from 'rxjs';
import { randomUUID } from 'crypto';

/**
 * Logging estruturado de requests.
 *
 * Adiciona um `X-Request-Id` em toda resposta (gerado no servidor ou
 * herdado do header `X-Request-Id` do cliente, se existir) e loga o
 * resultado de cada handler com método, path, status e duração em ms.
 *
 * O `Request-Id` é útil para correlacionar logs do backend com logs
 * do frontend (que pode ver o header no devtools).
 */
@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const http = context.switchToHttp();
    const req = http.getRequest<Request & { id?: string }>();
    const res = http.getResponse<Response>();

    const providedId = req.headers['x-request-id'];
    const requestId =
      typeof providedId === 'string' && /^[A-Za-z0-9_-]{1,128}$/.test(providedId)
        ? providedId
        : randomUUID();
    req.id = requestId;
    res.setHeader('X-Request-Id', requestId);

    const start = Date.now();
    const { method } = req;
    const originalUrl = (req.originalUrl.split('?')[0] ?? req.path).replace(
      /^\/api\/booking\/[^/]+/,
      '/api/booking/[token]',
    );
    const isProd = process.env.NODE_ENV === 'production';

    return next.handle().pipe(
      tap({
        next: () => {
          const ms = Date.now() - start;
          if (isProd) {
            this.logger.log(
              JSON.stringify({
                level: 'info',
                kind: 'http',
                requestId,
                method,
                path: originalUrl,
                status: res.statusCode,
                durationMs: ms,
              }),
            );
          } else {
            this.logger.log(`${method} ${originalUrl} ${res.statusCode} ${ms}ms [${requestId}]`);
          }
        },
        error: (error) => {
          const ms = Date.now() - start;
          const status = res.statusCode || 500;
          if (isProd) {
            this.logger.error(
              JSON.stringify({
                level: 'error',
                kind: 'http',
                requestId,
                method,
                path: originalUrl,
                status,
                durationMs: ms,
                message: error?.message ?? 'unknown',
              }),
            );
          } else {
            this.logger.error(
              `${method} ${originalUrl} ${status} ${ms}ms [${requestId}] ${error?.message ?? ''}`,
            );
          }
        },
      }),
    );
  }
}
