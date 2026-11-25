import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PlatformRole } from '@prisma/client';
import { Request } from 'express';
import { PrismaService } from '../database/prisma.service';
import { PLATFORM_ROLES_KEY } from './platform-roles.key';

export interface PlatformRequest extends Request {
  platformMember?: {
    id: string;
    usuarioId: string;
    nome: string;
    email: string;
    papel: PlatformRole;
  };
}

@Injectable()
export class PlatformAccessGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const papeis = this.reflector.getAllAndOverride<PlatformRole[]>(PLATFORM_ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    const request = context.switchToHttp().getRequest<PlatformRequest>();
    if (!request.user?.id || !request.user.sessionId || !papeis?.length) return false;

    const membro = await this.prisma.client.platformMember
      .findUnique({
        where: { usuarioId: request.user.id },
        select: {
          id: true,
          usuarioId: true,
          papel: true,
          ativo: true,
          usuario: { select: { nome: true, email: true, ativo: true, twoFactorEnabled: true } },
        },
      })
      .catch(() => {
        throw new ServiceUnavailableException(
          'Não foi possível verificar o acesso ao painel Nexly.',
        );
      });

    if (!membro?.ativo || !membro.usuario.ativo || !papeis.includes(membro.papel)) return false;
    if (!membro.usuario.twoFactorEnabled) {
      throw new ForbiddenException({
        code: 'PLATFORM_2FA_REQUIRED',
        message: 'Ative a verificação em duas etapas na sua conta para acessar o painel Nexly.',
      });
    }

    request.platformMember = {
      id: membro.id,
      usuarioId: membro.usuarioId,
      nome: membro.usuario.nome,
      email: membro.usuario.email,
      papel: membro.papel,
    };
    return true;
  }
}
