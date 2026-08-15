import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { Observable } from 'rxjs';
import { TenantContextData, tenantStorage } from '../../database/tenant-context';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

/**
 * Envolve o handler da requisição no AsyncLocalStorage, definindo o
 * contexto de tenant. Isso garante que o Prisma Extension injete o
 * `empresaId` correto em todas as queries do request.
 *
 * Nota sobre RLS: o `seed-rls.sql` ativa Row-Level Security no banco.
 * Para o RLS ser efetivo com o pool de conexões do Prisma, o
 * `set_config('app.current_tenant', ...)` deve rodar na mesma conexão
 * da query (idealmente via transação interativa). A camada primária de
 * isolamento no MVP é o Prisma Extension; o RLS é defesa em profundidade.
 */
@Injectable()
export class TenantInterceptor implements NestInterceptor {
  constructor(private readonly reflector: Reflector) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return next.handle();

    const request = context.switchToHttp().getRequest<Request>();
    const user = request.user;
    if (!user?.empresaId) return next.handle();

    const ctx: TenantContextData = {
      tenantId: user.empresaId,
      userId: user.id,
      role: user.role,
      email: user.email,
    };

    return new Observable((subscriber) => {
      tenantStorage.run(ctx, () => {
        next.handle().subscribe(subscriber);
      });
    });
  }
}
