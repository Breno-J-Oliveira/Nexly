import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { AuditAcao } from '@prisma/client';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { Observable, from, switchMap, tap } from 'rxjs';
import { AuditService } from '../../audit/audit.service';
import { sanitizar } from '../../audit/audit-diff';
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

    // Para edição/exclusão o estado anterior precisa ser lido ANTES do handler
    // rodar — depois o registro já foi alterado/removido.
    const precisaDoAntes = acao === 'EDITAR' || acao === 'EXCLUIR';

    return from(
      precisaDoAntes
        ? this.auditService.buscarAntes(recurso, recursoId, empresaId)
        : Promise.resolve(undefined),
    ).pipe(
      switchMap((dadosAntigos) =>
        next.handle().pipe(
          tap(() => {
            this.auditService.registrar({
              empresaId,
              usuarioId: req.user?.id,
              acao,
              recurso,
              recursoId,
              // A senha nunca é gravada: `sanitizar` troca por [REDACTED].
              dadosAntigos,
              dadosNovos:
                acao === 'EXCLUIR'
                  ? undefined
                  : path.includes('/gestao/importacao/')
                    ? {
                        tipo: req.body?.tipo,
                        quantidade: Array.isArray(req.body?.linhas) ? req.body.linhas.length : 0,
                      }
                    : sanitizar(req.body),
              ip,
              userAgent,
            });
          }),
        ),
      ),
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
  if (segments[0] === 'operacoes' || segments[0] === 'gestao') segments.shift();
  const nome = segments[0] ?? 'desconhecido';
  const recurso = nome.charAt(0).toUpperCase() + nome.slice(1);
  const recursoId = segments[1];
  return { recurso, recursoId };
}
