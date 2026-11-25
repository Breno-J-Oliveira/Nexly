import { CanActivate, ExecutionContext, Injectable, Type } from '@nestjs/common';
import { GUARDS_METADATA } from '@nestjs/common/constants';
import { Reflector } from '@nestjs/core';
import { PlatformRole } from '@prisma/client';
import { Role } from '@nexly/shared';
import { Request } from 'express';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { hasPermission, permissaoDoRequest } from '../auth/permissions';
import { PlatformAccessGuard } from '../../platform-access/platform-access.guard';
import { PLATFORM_ROLES_KEY } from '../../platform-access/platform-roles.key';

type RequestComUsuario = Request & { user?: { role: Role; empresaId: string; id: string } };

/**
 * Guarda de autorização por permissão (`recurso:acao`).
 *
 * Resolução em ordem:
 * 1. `@Public()` → acesso livre (login, cadastro, booking, health).
 * 2. `@Roles(...)` explícito no handler → verifica o papel (compatibilidade
 *    com controllers administrativos: usuarios, audit, lgpd, whatsapp).
 * 3. Sem `@Roles` → deriva a permissão do path + método HTTP e checa contra
 *    `ROLE_PERMISSIONS` (RBAC granular). Isso fecha a lacuna de autorização
 *    em que qualquer papel autenticado acessava qualquer endpoint.
 * 4. Rotas pessoais de auth são explicitamente permitidas; outras rotas
 *    sem política são negadas, inclusive para ADMIN.
 */
@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest<RequestComUsuario>();
    const user = request.user;
    if (!user) return false;

    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (requiredRoles && requiredRoles.length > 0) {
      return requiredRoles.includes(user.role);
    }

    const targets = [context.getHandler(), context.getClass()];
    const platformRoles = this.reflector.getAllAndOverride<PlatformRole[]>(
      PLATFORM_ROLES_KEY,
      targets,
    );
    if (platformRoles?.length) {
      const routeGuards = this.reflector.getAllAndMerge<Type<CanActivate>[]>(
        GUARDS_METADATA,
        targets,
      );
      return routeGuards.includes(PlatformAccessGuard);
    }

    const permissao = permissaoDoRequest(request.path, request.method);
    if (permissao === null) {
      const pessoais: Record<string, string[]> = {
        GET: ['/api/auth/me', '/api/auth/2fa/status', '/api/experiencia'],
        POST: [
          '/api/auth/2fa/setup',
          '/api/auth/google/2fa/setup',
          '/api/auth/2fa/enable',
          '/api/auth/2fa/disable',
          '/api/usuarios/trocar-senha',
          '/api/experiencia/atividade',
          '/api/experiencia/lembrar',
        ],
        PUT: ['/api/experiencia/recomendacao'],
        DELETE: ['/api/experiencia/recomendacao'],
      };
      return (pessoais[request.method] ?? []).includes(request.path.replace(/\/$/, ''));
    }

    return hasPermission(user.role, permissao);
  }
}
