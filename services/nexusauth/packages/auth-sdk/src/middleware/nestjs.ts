import {
  CanActivate,
  ExecutionContext,
  Injectable,
  SetMetadata,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwksClient } from '../jwks';
import { NexusUser } from '../types';

export const NEXUS_JWKS_URI = 'NEXUS_JWKS_URI';
export const NEXUS_PERMISSIONS = 'NEXUS_PERMISSIONS';

export function RequireNexusPermissions(...permissions: string[]) {
  return SetMetadata(NEXUS_PERMISSIONS, permissions);
}

@Injectable()
export class NexusAuthGuard implements CanActivate {
  private jwksClient: JwksClient | null = null;
  private jwksUri: string = '';

  constructor(private reflector: Reflector) {}

  setJwksUri(uri: string) {
    this.jwksUri = uri;
    this.jwksClient = new JwksClient(uri);
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    if (!this.jwksClient) {
      throw new Error('NexusAuthGuard: JWKS URI not configured. Call setJwksUri() first.');
    }

    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException({
        code: 'MISSING_AUTH_HEADER',
        message: 'Missing or invalid authorization header',
      });
    }

    const token = authHeader.substring(7);

    try {
      const user: NexusUser = await this.jwksClient.verifyToken(token);

      const requiredPermissions = this.reflector.getAllAndOverride<string[]>(NEXUS_PERMISSIONS, [
        context.getHandler(),
        context.getClass(),
      ]);

      if (requiredPermissions && requiredPermissions.length > 0) {
        const userPerms = user.permissions || [];
        const hasAll = requiredPermissions.every((p) => userPerms.includes(p));
        if (!hasAll) {
          throw new ForbiddenException({
            code: 'INSUFFICIENT_PERMISSIONS',
            message: 'Missing required permissions',
            required: requiredPermissions,
          });
        }
      }

      request.user = user;
      return true;
    } catch (err: any) {
      if (err instanceof ForbiddenException) throw err;
      throw new UnauthorizedException({
        code: 'TOKEN_INVALID',
        message: err.message || 'Invalid or expired token',
      });
    }
  }
}
