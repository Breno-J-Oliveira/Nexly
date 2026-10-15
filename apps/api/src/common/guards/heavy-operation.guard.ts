import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { RedisService } from '../../redis/redis.service';

/** Executado após autenticação e permissões: a cota pertence à conta verificada. */
@Injectable()
export class HeavyOperationGuard implements CanActivate {
  constructor(private readonly redis: RedisService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const http = context.switchToHttp();
    const request = http.getRequest<Request>();
    const path = request.path.replace(/\/$/, '');
    const exportRequest =
      request.method === 'GET' &&
      (path === '/api/export/vendas/csv' ||
        path === '/api/lgpd/exportar' ||
        path.startsWith('/api/lgpd/exportar/cliente/'));
    const privacyRequest =
      (request.method === 'POST' && path.startsWith('/api/lgpd/anonimizar/cliente/')) ||
      (request.method === 'DELETE' && path === '/api/lgpd/excluir-conta');
    if (!exportRequest && !privacyRequest) return true;
    const user = request.user;
    if (!user?.id || !user.empresaId) return false;
    const result = await this.redis.consumeLimit(
      `heavy:${exportRequest ? 'export' : 'privacy'}:${user.empresaId}:${user.id}`,
      3,
      3600,
    );
    if (!result)
      throw new ServiceUnavailableException(
        'Não foi possível validar o limite desta operação. Tente novamente em alguns instantes.',
      );
    const response = http.getResponse<Response>();
    response.setHeader('RateLimit-Limit', '3');
    response.setHeader('RateLimit-Remaining', String(result.remaining));
    response.setHeader('RateLimit-Reset', String(result.retryAfter));
    if (!result.allowed) {
      response.setHeader('Retry-After', String(result.retryAfter));
      throw new HttpException(
        {
          statusCode: 429,
          code: 'HEAVY_OPERATION_LIMIT',
          message: 'Limite desta operação atingido para sua conta. Tente novamente mais tarde.',
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    return true;
  }
}
