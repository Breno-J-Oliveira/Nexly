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

  async generateAccessToken(usuario: Usuario): Promise<string> {
    return this.jwtService.signAsync({
      sub: usuario.id,
      empresaId: usuario.empresaId,
      role: usuario.role,
      email: usuario.email,
      nome: usuario.nome,
    });
  }

  async issueRefreshToken(usuarioId: string): Promise<string> {
    const token = randomBytes(48).toString('hex');
    const tokenHash = this.hashToken(token);
    const expiresAt = new Date(Date.now() + REFRESH_TTL_MS);
    await this.prisma.client.refreshToken.create({
      data: { usuarioId, tokenHash, expiresAt },
    });
    return token;
  }

  /**
   * Rotaciona o refresh token com detecção de reuso:
   * - token válido → revoga o antigo e emite um novo.
   * - token já revogado → possível roubo: invalida TODAS as sessões do usuário.
   */
  async rotateRefreshToken(refreshToken: string): Promise<{ usuario: Usuario; newToken: string }> {
    const tokenHash = this.hashToken(refreshToken);
    const stored = await this.prisma.client.refreshToken.findUnique({ where: { tokenHash } });

    if (!stored) {
      throw new UnauthorizedException('Refresh token inválido');
    }

    if (stored.revogado) {
      await this.prisma.client.refreshToken.updateMany({
        where: { usuarioId: stored.usuarioId, revogado: false },
        data: { revogado: true },
      });
      throw new UnauthorizedException('Sessão invalidada por reutilização de token');
    }

    if (stored.expiresAt < new Date()) {
      throw new UnauthorizedException('Refresh token expirado');
    }

    const usuario = await this.prisma.client.usuario.findUnique({
      where: { id: stored.usuarioId },
    });
    if (!usuario || !usuario.ativo) {
      throw new UnauthorizedException('Usuário inativo');
    }

    await this.prisma.client.refreshToken.update({
      where: { id: stored.id },
      data: { revogado: true },
    });

    const newToken = await this.issueRefreshToken(usuario.id);
    return { usuario, newToken };
  }

  async revokeRefreshToken(refreshToken: string): Promise<void> {
    const tokenHash = this.hashToken(refreshToken);
    await this.prisma.client.refreshToken.updateMany({
      where: { tokenHash },
      data: { revogado: true },
    });
  }

  /** Token temporário de 5 min usado no fluxo de 2FA (scope restrito). */
  async generateTempToken(usuarioId: string): Promise<string> {
    return this.jwtService.signAsync({ sub: usuarioId, scope: '2fa' }, { expiresIn: '5m' });
  }

  async verifyTempToken(token: string): Promise<{ sub: string }> {
    const payload = await this.jwtService.verifyAsync<{ sub: string; scope?: string }>(token);
    if (payload.scope !== '2fa') {
      throw new UnauthorizedException('Token inválido');
    }
    return { sub: payload.sub };
  }

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }
}
