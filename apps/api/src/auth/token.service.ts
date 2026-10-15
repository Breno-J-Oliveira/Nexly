import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Usuario } from '@prisma/client';
import { createHash, randomBytes } from 'crypto';
import { PrismaService } from '../database/prisma.service';

const REFRESH_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 dias

@Injectable()
export class TokenService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async generateAccessToken(usuario: Usuario, sessionId: string): Promise<string> {
    return this.jwtService.signAsync({
      sub: usuario.id,
      sid: sessionId,
      empresaId: usuario.empresaId,
      role: usuario.role,
      email: usuario.email,
      nome: usuario.nome,
    });
  }

  async issueRefreshToken(
    usuarioId: string,
    sessionId?: string,
  ): Promise<{ token: string; sessionId: string }> {
    const token = randomBytes(48).toString('hex');
    const tokenHash = this.hashToken(token);
    const expiresAt = new Date(Date.now() + REFRESH_TTL_MS);
    // A sessão tem validade absoluta. Renovar não prolonga uma credencial roubada indefinidamente.
    const stored = await this.prisma.client.refreshToken.create({
      data: {
        usuario: { connect: { id: usuarioId } },
        tokenHash,
        expiresAt,
        sessao: sessionId ? { connect: { id: sessionId } } : { create: { usuarioId, expiresAt } },
      },
    });
    return { token, sessionId: stored.sessionId };
  }

  /**
   * Rotaciona o refresh token com detecção de reuso:
   * - token válido → revoga o antigo e emite um novo.
   * - token já revogado → possível roubo: invalida TODAS as sessões do usuário.
   */
  async rotateRefreshToken(
    refreshToken: string,
  ): Promise<{ usuario: Usuario; newToken: string; sessionId: string }> {
    const tokenHash = this.hashToken(refreshToken);
    const stored = await this.prisma.client.refreshToken.findUnique({
      where: { tokenHash },
      include: { sessao: true },
    });

    if (!stored) {
      throw new UnauthorizedException('Refresh token inválido');
    }

    if (
      stored.expiresAt <= new Date() ||
      stored.sessao.revogado ||
      stored.sessao.expiresAt <= new Date()
    ) {
      throw new UnauthorizedException('Refresh token expirado');
    }

    if (stored.revogado) {
      await this.prisma.client.$transaction([
        this.prisma.client.authSession.updateMany({
          where: { usuarioId: stored.usuarioId, revogado: false },
          data: { revogado: true },
        }),
        this.prisma.client.refreshToken.updateMany({
          where: { usuarioId: stored.usuarioId, revogado: false },
          data: { revogado: true },
        }),
      ]);
      throw new UnauthorizedException('Sessão invalidada por reutilização de token');
    }

    const usuario = await this.prisma.client.usuario.findUnique({
      where: { id: stored.usuarioId },
    });
    if (!usuario || !usuario.ativo) {
      throw new UnauthorizedException('Usuário inativo');
    }

    const claimed = await this.prisma.client.refreshToken.updateMany({
      where: { id: stored.id, revogado: false, expiresAt: { gt: new Date() } },
      data: { revogado: true },
    });
    if (claimed.count !== 1) {
      throw new UnauthorizedException('Refresh token já utilizado');
    }

    const issued = await this.issueRefreshToken(usuario.id, stored.sessionId);
    return { usuario, newToken: issued.token, sessionId: issued.sessionId };
  }

  async revokeRefreshToken(refreshToken: string): Promise<void> {
    const tokenHash = this.hashToken(refreshToken);
    const stored = await this.prisma.client.refreshToken.findUnique({ where: { tokenHash } });
    if (!stored) return;
    await this.prisma.client.$transaction([
      this.prisma.client.authSession.updateMany({
        where: { id: stored.sessionId, usuarioId: stored.usuarioId },
        data: { revogado: true },
      }),
      this.prisma.client.refreshToken.updateMany({
        where: { sessionId: stored.sessionId, usuarioId: stored.usuarioId, revogado: false },
        data: { revogado: true },
      }),
    ]);
  }

  /** Token temporário de 5 min usado no fluxo de 2FA (scope restrito). */
  async generateTempToken(usuarioId: string): Promise<string> {
    return this.jwtService.signAsync({ sub: usuarioId, scope: '2fa' }, { expiresIn: '5m' });
  }

  async verifyTempToken(token: string): Promise<{ sub: string }> {
    const payload = await this.jwtService.verifyAsync<{ sub: string; scope?: string }>(token, {
      algorithms: ['RS256'],
    });
    if (payload.scope !== '2fa' || !payload.sub) {
      throw new UnauthorizedException('Token inválido');
    }
    return { sub: payload.sub };
  }

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }
}
