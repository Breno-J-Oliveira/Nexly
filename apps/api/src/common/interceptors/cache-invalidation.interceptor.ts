import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Request } from 'express';
import { mergeMap, Observable } from 'rxjs';
import { RedisService } from '../../redis/redis.service';

@Injectable()
export class CacheInvalidationInterceptor implements NestInterceptor {
  constructor(private readonly redis: RedisService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = context.switchToHttp().getRequest<Request>();
    const empresaId = req.user?.empresaId;
    if (!empresaId || !['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method))
      return next.handle();
    return next.handle().pipe(
      mergeMap(async (result) => {
        await this.redis.del(`dashboard:${empresaId}`);
        return result;
      }),
    );
  }
}
