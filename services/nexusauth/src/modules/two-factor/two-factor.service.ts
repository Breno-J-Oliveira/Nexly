import {
  Injectable,
  BadRequestException,
  UnauthorizedException,
  NotFoundException,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { authenticator } from 'otplib';
import * as QRCode from 'qrcode';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../redis/redis.service';
import { JwtService } from '../auth/jwt.service';
import { Verify2faDto } from './dto/verify-2fa.dto';
import { Disable2faDto } from './dto/disable-2fa.dto';
import { Challenge2faDto } from './dto/challenge-2fa.dto';
import { AuditService } from '../audit/audit.service';
import { WebhooksDispatcher } from '../webhooks/webhooks.dispatcher';
import { MetricsService } from '../metrics/metrics.service';
import { encrypt, decrypt, hashToken } from '../../common/utils/crypto.util';

@Injectable()
export class TwoFactorService {
  constructor(
    private prisma: PrismaService,
    private redisService: RedisService,
    private jwtService: JwtService,
    private auditService: AuditService,
    private webhooksDispatcher: WebhooksDispatcher,
    private metricsService: MetricsService,
  ) {}

  async setup(userId: string) {
    await this.checkRateLimit(`2fa:setup:${userId}`, 5, 60);
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });
    if (!user) {
      throw new NotFoundException({
        code: 'USER_NOT_FOUND',
        message: 'User not found',
      });
    }

    if (user.twoFactorEnabled) {
      throw new BadRequestException({
        code: 'TWO_FACTOR_ALREADY_ENABLED',
        message: '2FA is already enabled for this account',
      });
    }

    const secret = authenticator.generateSecret();
    const otpauthUrl = authenticator.keyuri(user.email, 'NexusAuth', secret);

    // SECURITY: Encrypt the pending TOTP secret in Redis (at-rest encryption)
    // The secret is only stored temporarily but should never be in plaintext
    await this.redisService.set(`2fa:pending:${userId}`, encrypt(secret), 300);

    const qrCodeUrl = await QRCode.toDataURL(otpauthUrl);

    return { qrCodeUrl, secret };
  }

  async verify(userId: string, dto: Verify2faDto) {
    await this.checkRateLimit(`2fa:verify:${userId}`, 5, 60);
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });
    if (!user) {
      throw new NotFoundException({
        code: 'USER_NOT_FOUND',
        message: 'User not found',
      });
    }

    if (user.twoFactorEnabled) {
      throw new BadRequestException({
        code: 'TWO_FACTOR_ALREADY_ENABLED',
        message: '2FA is already enabled for this account',
      });
    }

    const encryptedSecret = await this.redisService.get(`2fa:pending:${userId}`);
    if (!encryptedSecret) {
      throw new BadRequestException({
        code: 'TWO_FACTOR_SETUP_EXPIRED',
        message: '2FA setup has expired. Please call /2fa/setup again.',
      });
    }

    // SECURITY: Decrypt the pending TOTP secret from Redis
    const pendingSecret = decrypt(encryptedSecret);

    const isValid = authenticator.verify({
      token: dto.code,
      secret: pendingSecret,
    });

    if (!isValid) {
      throw new UnauthorizedException({
        code: 'INVALID_2FA_CODE',
        message: 'Invalid 2FA code',
      });
    }

    const backupCodes = this.generateBackupCodes();
    const hashedBackupCodes = await Promise.all(
      backupCodes.map((code) => bcrypt.hash(code, 12)),
    );

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        twoFactorEnabled: true,
        twoFactorSecret: encrypt(pendingSecret),
        backupCodes: hashedBackupCodes,
      },
    });

    await this.redisService.del(`2fa:pending:${userId}`);

    await this.auditService.log('TWO_FACTOR_ENABLED', { userId });
    this.metricsService.auth2faEnabledTotal.inc();

    await this.webhooksDispatcher.dispatch('user.2fa_enabled', {
      userId,
    });

    return {
      message: '2FA enabled successfully',
      backupCodes,
    };
  }

  async disable(userId: string, dto: Disable2faDto) {
    await this.checkRateLimit(`2fa:disable:${userId}`, 5, 60);
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });
    if (!user) {
      throw new NotFoundException({
        code: 'USER_NOT_FOUND',
        message: 'User not found',
      });
    }

    if (!user.twoFactorEnabled) {
      throw new BadRequestException({
        code: 'TWO_FACTOR_NOT_ENABLED',
        message: '2FA is not enabled for this account',
      });
    }

    if (!user.password) {
      throw new BadRequestException({
        code: 'NO_PASSWORD_SET',
        message: 'Account has no password set',
      });
    }

    const validPassword = await bcrypt.compare(dto.password, user.password);
    if (!validPassword) {
      throw new UnauthorizedException({
        code: 'INVALID_CREDENTIALS',
        message: 'Current password is incorrect',
      });
    }

    const isBackupCode = await this.consumeBackupCode(user.id, user.backupCodes, dto.code);
    if (!isBackupCode) {
      const isValid = authenticator.verify({
        token: dto.code,
        secret: decrypt(user.twoFactorSecret!),
      });
      if (!isValid) {
        throw new UnauthorizedException({
          code: 'INVALID_2FA_CODE',
          message: 'Invalid 2FA code',
        });
      }
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        twoFactorEnabled: false,
        twoFactorSecret: null,
        backupCodes: [],
      },
    });

    await this.auditService.log('TWO_FACTOR_DISABLED', { userId });

    await this.webhooksDispatcher.dispatch('user.2fa_disabled', {
      userId,
    });

    return { message: '2FA disabled successfully' };
  }

  async challenge(dto: Challenge2faDto, ipAddress?: string, userAgent?: string) {
    // CRITICAL FIX: Rate limit by challenge token hash to prevent brute force
    const challengeKey = crypto.createHash('sha256').update(dto.challengeToken).digest('hex').slice(0, 16);
    await this.checkRateLimit(`2fa:challenge:${challengeKey}`, 5, 60);
    
    // CRITICAL FIX: Per-IP rate limiting with stricter limits
    if (ipAddress) {
      await this.checkRateLimit(`2fa:challenge:ip:${ipAddress}`, 10, 60);
    }

    let payload;
    try {
      payload = this.jwtService.verifyChallenge(dto.challengeToken);
    } catch {
      throw new UnauthorizedException({
        code: 'TOKEN_INVALID',
        message: 'Invalid or expired challenge token',
      });
    }
    
    // CRITICAL FIX: Check if challenge token has already been used (blacklisted)
    const isBlacklisted = await this.redisService.exists(`blacklist:${payload.jti}`);
    if (isBlacklisted) {
      throw new UnauthorizedException({
        code: 'TOKEN_ALREADY_USED',
        message: 'Challenge token has already been used',
      });
    }

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
    });
    if (!user) {
      throw new NotFoundException({
        code: 'USER_NOT_FOUND',
        message: 'User not found',
      });
    }

    if (!user.twoFactorEnabled) {
      throw new BadRequestException({
        code: 'TWO_FACTOR_NOT_ENABLED',
        message: '2FA is not enabled for this account',
      });
    }

    const isBackupCode = await this.consumeBackupCode(user.id, user.backupCodes, dto.code);
    if (!isBackupCode) {
      // CRITICAL FIX: Prevent TOTP replay by checking last used code
      const lastCodeKey = `2fa:lastcode:${user.id}`;
      const lastCode = await this.redisService.get(lastCodeKey);
      if (lastCode === dto.code) {
        throw new UnauthorizedException({
          code: 'CODE_ALREADY_USED',
          message: 'This code has already been used',
        });
      }

      const isValid = authenticator.verify({
        token: dto.code,
        secret: decrypt(user.twoFactorSecret!),
      });
      if (!isValid) {
        throw new UnauthorizedException({
          code: 'INVALID_2FA_CODE',
          message: 'Invalid 2FA code',
        });
      }

      // Store last used code with 60s TTL (TOTP window)
      await this.redisService.set(lastCodeKey, dto.code, 60);
    }

    // CRITICAL FIX: Blacklist challenge token jti IMMEDIATELY to prevent reuse
    // This must happen BEFORE creating the session to prevent race conditions
    if (payload.jti) {
      const ttl = 300; // 5 minutes (same as challenge token expiry)
      await this.redisService.set(`blacklist:${payload.jti}`, '1', ttl);
    }

    const session = await this.prisma.session.create({
      data: {
        userId: user.id,
        device: '2FA Challenge',
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
        userId: user.id,
        sessionId: session.id,
        expiresAt,
      },
    });

    const accessToken = this.jwtService.signAccessToken({
      sub: user.id,
      email: user.email,
      role: user.role,
      tenantId: user.tenantId ?? undefined,
      permissions: user.permissions ?? undefined,
      sessionId: session.id,
    });

    const response: any = { accessToken, refreshToken: rawRefreshToken };

    if (user.backupCodes.length <= 2 && user.backupCodes.length > 0) {
      response.warning = `Only ${user.backupCodes.length} backup codes remaining. Please regenerate new ones.`;
    }

    return response;
  }

  private async checkRateLimit(key: string, max: number, ttlSeconds: number): Promise<void> {
    const count = await this.redisService.incr(key);
    if (count === 1) {
      await this.redisService.expire(key, ttlSeconds);
    }
    if (count > max) {
      const retryAfter = await this.redisService.ttl(key);
      throw new HttpException(
        {
          code: 'RATE_LIMITED',
          message: 'Too many 2FA attempts. Please try again later.',
          retryAfter,
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
  }

  private generateBackupCodes(): string[] {
    const codes: string[] = [];
    for (let i = 0; i < 10; i++) {
      const bytes = crypto.randomBytes(4);
      const code = bytes.toString('hex').toUpperCase();
      codes.push(`${code.slice(0, 4)}-${code.slice(4)}`);
    }
    return codes;
  }

  private async consumeBackupCode(
    userId: string,
    backupCodes: string[],
    code: string,
  ): Promise<boolean> {
    // A6 FIX: Progressive lockout for backup codes.
    // Prevent brute force of 2FA backup codes through rate limiting.
    const lockKey = `2fa:backup:attempts:${userId}`;
    const attempts = await this.redisService.incr(lockKey);
    if (attempts === 1) await this.redisService.expire(lockKey, 60);
    if (attempts > 5) {
      throw new HttpException(
        { code: 'RATE_LIMITED', message: 'Too many backup code attempts. Please try again later.' },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    for (let i = 0; i < backupCodes.length; i++) {
      const matches = await bcrypt.compare(code, backupCodes[i]);
      if (matches) {
        // A6 FIX: Reset counter on successful backup code consumption
        await this.redisService.del(lockKey);

        // C4 fix: atomic update — only remove the code if it's still present (prevents race condition)
        const result = await this.prisma.user.updateMany({
          where: {
            id: userId,
            backupCodes: { has: backupCodes[i] },
          },
          data: {
            backupCodes: { set: backupCodes.filter((_, idx) => idx !== i) },
          },
        });
        if (result.count === 0) {
          return false;
        }
        return true;
      }
    }
    return false;
  }
}
