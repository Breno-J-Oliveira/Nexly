import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { AuditAcao } from '@prisma/client';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { Observable, tap } from 'rxjs';
import { AuditService } from '../../audit/audit.service';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

const IGNORADOS = ['/auth/refresh', '/health'];

type RequestComUsuario = Request & { user?: { id: string; empresaId: string } };

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(
    private readonly reflector: Reflector,
    private readonly auditService: AuditService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const http = context.switchToHttp();
    const req = http.getRequest<RequestComUsuario>();

    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return next.handle();

    const acao = acaoDoMetodo(req.method);
    if (!acao) return next.handle();

    const path = req.originalUrl || req.url;
    if (IGNORADOS.some((p) => path.startsWith(p))) return next.handle();

    const empresaId = req.user?.empresaId;
    if (!empresaId) return next.handle();

    const { recurso, recursoId } = extrairRecurso(path);
    const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ?? req.ip;
    const userAgent = req.headers['user-agent'];

    return next.handle().pipe(
      tap(() => {
        this.auditService.registrar({
          empresaId,
          usuarioId: req.user?.id,
          acao,
          recurso,
          recursoId,
          ip,
          userAgent,
        });
      }),
    );
  }
}

function acaoDoMetodo(method: string): AuditAcao | null {
  switch (method.toUpperCase()) {
    case 'POST':
      return 'CRIAR';
    case 'PUT':
    case 'PATCH':
      return 'EDITAR';
    case 'DELETE':
      return 'EXCLUIR';
    default:
      return null;
  }
}

function extrairRecurso(path: string): { recurso: string; recursoId?: string } {
  const segments = path
    .replace(/^\/api\//, '')
    .split('/')
    .filter(Boolean);
  const nome = segments[0] ?? 'desconhecido';
  const recurso = nome.charAt(0).toUpperCase() + nome.slice(1);
  const recursoId = segments[1];
  return { recurso, recursoId };
}
