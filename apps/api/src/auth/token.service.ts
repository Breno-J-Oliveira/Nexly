import { Injectable, ServiceUnavailableException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Prisma, Usuario } from '@prisma/client';
import { createHash, randomBytes, randomUUID } from 'crypto';
import { PrismaService } from '../database/prisma.service';
import { RotationResponse } from './rotation-response';

// Apenas o último token rotacionado pode repetir por 3s; logout/expiração nunca têm tolerância.
// https://auth0.com/docs/secure/tokens/refresh-tokens/configure-refresh-token-rotation
const ROTATION_LEEWAY_MS = 3000;
const REFRESH_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 dias

@Injectable()
export class TokenService {
  private readonly rotationResponse = new RotationResponse();
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
    tx?: Prisma.TransactionClient,
  ): Promise<{ token: string; sessionId: string }> {
    const token = randomBytes(48).toString('hex');
    const tokenHash = this.hashToken(token);
    const expiresAt = new Date(Date.now() + REFRESH_TTL_MS);
    // A sessão tem validade absoluta. Renovar não prolonga uma credencial roubada indefinidamente.
    const client = tx ?? this.prisma.client;
    const stored = await client.refreshToken.create({
      data: {
        usuario: { connect: { id: usuarioId } },
        tokenHash,
        expiresAt,
        sessao: sessionId ? { connect: { id: sessionId } } : { create: { usuarioId, expiresAt } },
      },
    });
    return { token, sessionId: stored.sessionId };
  }

  /** Rotações são serializadas; tokens ficam em hash e a resposta de recuperação fica cifrada. */
  async rotateRefreshToken(
    refreshToken: string,
  ): Promise<{ usuario: Usuario; newToken: string; sessionId: string }> {
    const tokenHash = this.hashToken(refreshToken);
    const candidate = await this.prisma.client.refreshToken.findUnique({
      where: { tokenHash },
      select: { sessionId: true, usuarioId: true },
    });
    if (!candidate) throw new UnauthorizedException('Refresh token inválido');

    const result = await this.prisma.client.$transaction(async (tx) => {
      // O relógio do banco é lido depois do bloqueio; máquinas diferentes não alteram a janela.
      const clock = await tx.$queryRaw<{ now: Date }[]>`
        WITH locked AS MATERIALIZED (
          SELECT id FROM public.sessoes WHERE id=${candidate.sessionId} AND usuario_id=${candidate.usuarioId} FOR UPDATE
        ) SELECT clock_timestamp() AS now FROM locked`;
      const now = clock[0]?.now;
      if (!now) throw new UnauthorizedException('Sessão inválida');
      const stored = await tx.refreshToken.findUnique({
        where: { tokenHash },
        include: { sessao: true },
      });
      if (
        !stored ||
        stored.expiresAt <= now ||
        stored.sessao.revogado ||
        stored.sessao.expiresAt <= now
      )
        throw new UnauthorizedException('Refresh token expirado');
      const usuario = await tx.usuario.findUnique({ where: { id: stored.usuarioId } });
      if (!usuario?.ativo) throw new UnauthorizedException('Usuário inativo');

      if (stored.revogado) {
        const rotationAt = stored.sessao.lastRotationAt;
        const age = rotationAt ? now.getTime() - rotationAt.getTime() : Number.POSITIVE_INFINITY;
        const concorrente =
          stored.sessao.lastRotationTokenId === stored.id && age >= 0 && age <= ROTATION_LEEWAY_MS;
        if (!concorrente) {
          await tx.authSession.updateMany({
            where: { usuarioId: stored.usuarioId, revogado: false },
            data: { revogado: true, lastRotationResponse: null },
          });
          await tx.refreshToken.updateMany({
            where: { usuarioId: stored.usuarioId, revogado: false },
            data: { revogado: true },
          });
          // Retorna para COMMITAR a revogação; lançar dentro da transação a desfaria.
          return { kind: 'reused' as const };
        }
        // Uma repetição recupera o MESMO sucessor, nunca abre outro ramo da sessão.
        let recovered: string;
        try {
          recovered = this.rotationResponse.open(
            stored.sessao.lastRotationResponse ?? '',
            stored.sessionId,
            stored.id,
            rotationAt!,
          );
        } catch {
          throw new ServiceUnavailableException(
            'Não foi possível recuperar a rotação. Tente novamente.',
          );
        }
        const successor = await tx.refreshToken.findUnique({
          where: { tokenHash: this.hashToken(recovered) },
        });
        if (
          !successor ||
          successor.sessionId !== stored.sessionId ||
          successor.usuarioId !== stored.usuarioId ||
          successor.revogado ||
          successor.expiresAt <= now
        ) {
          throw new UnauthorizedException('Refresh token inválido');
        }
        return {
          kind: 'issued' as const,
          usuario,
          newToken: recovered,
          sessionId: stored.sessionId,
        };
      } else {
        const claimed = await tx.refreshToken.updateMany({
          where: { id: stored.id, revogado: false, expiresAt: { gt: now } },
          data: { revogado: true },
        });
        if (claimed.count !== 1) throw new UnauthorizedException('Refresh token já utilizado');
      }
      const issued = await this.issueRefreshToken(
        usuario.id,
        stored.sessionId,
        tx as unknown as Prisma.TransactionClient,
      );
      await tx.authSession.updateMany({
        where: { id: stored.sessionId, usuarioId: stored.usuarioId, revogado: false },
        data: {
          lastRotationTokenId: stored.id,
          lastRotationAt: now,
          lastRotationResponse: this.rotationResponse.seal(
            issued.token,
            stored.sessionId,
            stored.id,
            now,
          ),
        },
      });
      return {
        kind: 'issued' as const,
        usuario,
        newToken: issued.token,
        sessionId: issued.sessionId,
      };
    });
    if (result.kind === 'reused')
      throw new UnauthorizedException('Sessão invalidada por reutilização de token');
    return { usuario: result.usuario, newToken: result.newToken, sessionId: result.sessionId };
  }

  async revokeRefreshToken(refreshToken: string): Promise<void> {
    const tokenHash = this.hashToken(refreshToken);
    const stored = await this.prisma.client.refreshToken.findUnique({ where: { tokenHash } });
    if (!stored) return;
    await this.prisma.client.$transaction([
      this.prisma.client.authSession.updateMany({
        where: { id: stored.sessionId, usuarioId: stored.usuarioId },
        data: { revogado: true, lastRotationResponse: null },
      }),
      this.prisma.client.refreshToken.updateMany({
        where: { sessionId: stored.sessionId, usuarioId: stored.usuarioId, revogado: false },
        data: { revogado: true },
      }),
    ]);
  }

  /** Token temporário de 5 min usado no fluxo de 2FA (scope restrito). */
  async generateTempToken(usuarioId: string): Promise<string> {
    const token = await this.jwtService.signAsync(
      { sub: usuarioId, scope: '2fa', jti: randomUUID() },
      { expiresIn: '5m' },
    );
    const saved = await this.prisma.client.usuario.updateMany({
      where: { id: usuarioId, ativo: true, twoFactorEnabled: true },
      data: {
        twoFactorChallengeHash: this.hashToken(token),
        twoFactorChallengeExpiresAt: new Date(Date.now() + 5 * 60_000),
      },
    });
    if (saved.count !== 1) throw new UnauthorizedException('Usuário inválido');
    return token;
  }

  async verifyTempToken(token: string): Promise<{ sub: string; challengeHash: string }> {
    try {
      const payload = await this.jwtService.verifyAsync<{
        sub: string;
        scope?: string;
        jti?: string;
      }>(token, {
        algorithms: ['RS256'],
      });
      if (payload.scope !== '2fa' || !payload.sub || !payload.jti) {
        throw new UnauthorizedException('Token inválido');
      }
      return { sub: payload.sub, challengeHash: this.hashToken(token) };
    } catch {
      throw new UnauthorizedException('Verificação expirada. Entre novamente.');
    }
  }

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }
}
