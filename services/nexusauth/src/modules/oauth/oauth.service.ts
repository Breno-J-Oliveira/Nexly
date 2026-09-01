import { Injectable, UnauthorizedException } from '@nestjs/common';
import * as crypto from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { JwtService } from '../auth/jwt.service';
import { AuditService } from '../audit/audit.service';
import { WebhooksDispatcher } from '../webhooks/webhooks.dispatcher';
import { MetricsService } from '../metrics/metrics.service';
import { hashToken } from '../../common/utils/crypto.util';

export interface OAuthProfile {
  provider: 'google' | 'github';
  providerId: string;
  email: string;
  name: string;
  emailVerified: boolean;
}

@Injectable()
export class OAuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private auditService: AuditService,
    private webhooksDispatcher: WebhooksDispatcher,
    private metricsService: MetricsService,
  ) {}

  async handleOAuthLogin(profile: OAuthProfile, ipAddress?: string, userAgent?: string) {
    const providerIdField =
      profile.provider === 'google' ? 'googleId' : 'githubId';

    let user = await this.prisma.user.findFirst({
      where: { [providerIdField]: profile.providerId },
    });

    if (!user) {
      user = await this.prisma.user.findUnique({
        where: { email: profile.email },
      });

      if (user) {
        // V9 fix: don't auto-link OAuth account to existing email without proof of ownership
        if (!profile.emailVerified) {
          throw new UnauthorizedException({
            code: 'EMAIL_NOT_VERIFIED_BY_PROVIDER',
            message: 'Email is not verified by the OAuth provider. Cannot link to existing account.',
          });
        }
        // V9 fix: if user already has a password set, don't auto-link — require re-authentication
        if (user.password) {
          throw new UnauthorizedException({
            code: 'OAUTH_LINK_REQUIRES_REAUTH',
            message: 'An account with this email already exists. Please log in with your password and link your OAuth account from settings.',
          });
        }
        user = await this.prisma.user.update({
          where: { id: user.id },
          data: { [providerIdField]: profile.providerId },
        });
      } else {
        user = await this.prisma.user.create({
          data: {
            email: profile.email,
            name: profile.name,
            password: null,
            passwordHistory: [],
            [providerIdField]: profile.providerId,
          },
        });
      }
    }

    // SECURITY: Validate that the user was properly resolved before proceeding
    if (!user || !user.id) {
      throw new UnauthorizedException({
        code: 'OAUTH_USER_RESOLUTION_FAILED',
        message: 'Failed to resolve user from OAuth profile',
      });
    }

    if (user.twoFactorEnabled) {
      const challengeToken = this.jwtService.signChallengeToken({
        sub: user.id,
        email: user.email,
        role: user.role,
      });
      await this.auditService.log('TWO_FACTOR_CHALLENGE', {
        userId: user.id,
        ipAddress,
        userAgent,
        metadata: { method: `oauth_${profile.provider}` },
      });
      return { requiresTwoFactor: true, challengeToken };
    }

    return this.generateTokens(user.id, user.email, user.role, profile.provider, user.tenantId, user.permissions, ipAddress, userAgent);
  }

  private async generateTokens(userId: string, email: string, role: string, provider: string, tenantId?: string | null, permissions?: string[], ipAddress?: string, userAgent?: string) {
    const session = await this.prisma.session.create({
      data: {
        userId,
        device: `OAuth2 (${provider})`,
        ipAddress: ipAddress || 'Unknown',
        userAgent: userAgent || 'Unknown',
      },
    });

    const rawRefreshToken = crypto.randomUUID();
    const hashedRefreshToken = hashToken(rawRefreshToken);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await this.prisma.refreshToken.create({
      data: {
        token: hashedRefreshToken,
        userId,
        sessionId: session.id,
        expiresAt,
      },
    });

    const accessToken = this.jwtService.signAccessToken({
      sub: userId,
      email,
      role,
      tenantId: tenantId ?? undefined,
      permissions: permissions ?? undefined,
      sessionId: session.id,
    });

    await this.auditService.log('LOGIN', {
      userId,
      ipAddress,
      userAgent,
      metadata: { method: `oauth_${provider}` },
    });

    await this.webhooksDispatcher.dispatch('user.login', {
      userId,
      email,
      method: `oauth_${provider}`,
    });

    this.metricsService.authLoginsTotal.inc({ status: 'success' });

    return { accessToken, refreshToken: rawRefreshToken };
  }
}
