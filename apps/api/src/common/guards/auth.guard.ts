import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { JwtPayload } from '@nexly/shared';
import { Request } from 'express';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { PrismaService } from '../../database/prisma.service';
import { Role } from '@nexly/shared';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest<Request>();
    const token = this.extractToken(request);
    if (!token) {
      throw new UnauthorizedException('Token de autenticação não fornecido');
    }

    try {
      const payload = await this.jwtService.verifyAsync<JwtPayload & { scope?: string }>(token, {
        algorithms: ['RS256'],
      });
      // Tokens de desafio 2FA nunca autenticam requisições de negócio.
      if (
        payload.scope ||
        !payload.sub ||
        !payload.empresaId ||
        !Object.values(Role).includes(payload.role)
      ) {
        throw new UnauthorizedException('Token inválido');
      }
      const usuario = await this.prisma.client.usuario.findUnique({
        where: { id: payload.sub },
        select: { id: true, empresaId: true, ativo: true, role: true, email: true, nome: true },
      });
      if (!usuario?.ativo || usuario.empresaId !== payload.empresaId) {
        throw new UnauthorizedException('Sessão inválida');
      }
      request.user = {
        id: usuario.id,
        empresaId: usuario.empresaId,
        role: usuario.role,
        email: usuario.email,
        nome: usuario.nome,
      };
    } catch {
      throw new UnauthorizedException('Token inválido ou expirado');
    }

    return true;
  }

  private extractToken(request: Request): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }
}
