import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from '@nexly/shared';
import { Request } from 'express';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { hasPermission, permissaoDoRequest } from '../auth/permissions';

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
 * 4. Path não mapeado (ex.: `/auth/me`, `/auth/2fa`) → exige apenas
 *    autenticação válida.
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

    const permissao = permissaoDoRequest(request.path, request.method);
    if (permissao === null) {
      // Rotas não mapeadas (ex.: /auth/me, /auth/2fa) — apenas autenticação.
      return true;
    }

    return hasPermission(user.role, permissao);
  }
}
