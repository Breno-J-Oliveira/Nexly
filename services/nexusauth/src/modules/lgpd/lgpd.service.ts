import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { WebhooksDispatcher } from '../webhooks/webhooks.dispatcher';
import { AuditService } from '../audit/audit.service';
import * as crypto from 'crypto';

/**
 * LGPD/GDPR compliance service.
 *
 * Implements the data subject rights mandated by LGPD Art. 18 and
 * GDPR Art. 15-22:
 *  - Right of access (export)
 *  - Right to erasure (delete)
 *  - Right to data portability
 *  - Right to be informed (audit trail)
 */
@Injectable()
export class LgpdService {
  private readonly logger = new Logger(LgpdService.name);

  constructor(
    private prisma: PrismaService,
    private webhooksDispatcher: WebhooksDispatcher,
    private auditService: AuditService,
  ) {}

  /**
   * Export all data related to a user in a portable JSON format.
   * This includes profile, sessions, audit logs (sanitized), and
   * any other PII stored in the system.
   */
  async exportUserData(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        sessions: {
          select: {
            id: true,
            device: true,
            ipAddress: true,
            location: true,
            userAgent: true,
            active: true,
            createdAt: true,
            lastActiveAt: true,
          },
        },
        refreshTokens: {
          select: {
            id: true,
            expiresAt: true,
            revoked: true,
            createdAt: true,
          },
        },
        apiKeys: {
          select: {
            id: true,
            name: true,
            permissions: true,
            active: true,
            lastUsedAt: true,
            createdAt: true,
            expiresAt: true,
          },
        },
        webhooks: {
          select: {
            id: true,
            url: true,
            events: true,
            active: true,
            createdAt: true,
          },
        },
        passwordResets: {
          select: {
            id: true,
            expiresAt: true,
            used: true,
            createdAt: true,
          },
        },
        emailVerifications: {
          select: {
            id: true,
            expiresAt: true,
            used: true,
            createdAt: true,
          },
        },
        magicLinks: {
          select: {
            id: true,
            email: true,
            expiresAt: true,
            used: true,
            createdAt: true,
          },
        },
        auditLogs: {
          select: {
            id: true,
            action: true,
            ipAddress: true,
            userAgent: true,
            location: true,
            metadata: true,
            success: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'desc' },
        },
        tenant: {
          select: {
            id: true,
            name: true,
            slug: true,
            plan: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException({
        code: 'USER_NOT_FOUND',
        message: 'User not found',
      });
    }

    // Sanitize sensitive fields from the export
    const sanitized = {
      exportedAt: new Date().toISOString(),
      exportedBy: userId,
      dataSubject: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        emailVerified: user.emailVerified,
        twoFactorEnabled: user.twoFactorEnabled,
        tenantId: user.tenantId,
        tenant: user.tenant,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
      sessions: user.sessions,
      refreshTokens: user.refreshTokens,
      apiKeys: user.apiKeys,
      webhooks: user.webhooks,
      passwordResets: user.passwordResets,
      emailVerifications: user.emailVerifications,
      magicLinks: user.magicLinks,
      auditLogs: user.auditLogs,
      // NEVER include password, TOTP secret, backup codes, OAuth provider IDs
      _redacted: ['password', 'twoFactorSecret', 'backupCodes', 'googleId', 'githubId'],
    };

    // Generate checksum of the export for integrity
    const checksum = crypto
      .createHash('sha256')
      .update(JSON.stringify(sanitized))
      .digest('hex');

    await this.auditService.log('DATA_EXPORT', {
      userId,
      metadata: { checksum, recordCount: user.auditLogs.length },
    });

    return {
      ...sanitized,
      _checksum: checksum,
      _checksumAlgorithm: 'sha256',
    };
  }

  /**
   * Soft-delete a user account and all associated PII.
   *
   * This is a soft delete: records are anonymized rather than hard-deleted
   * to preserve audit trail integrity. After anonymization, the user
   * cannot log in (no password, no OAuth link, no valid email).
   *
   * If `hardDelete` is true (admin override), performs irreversible
   * deletion of all PII.
   */
  async deleteUserData(
    userId: string,
    options: { hardDelete?: boolean; legalHold?: boolean } = {},
  ) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException({
        code: 'USER_NOT_FOUND',
        message: 'User not found',
      });
    }

    if (options.hardDelete && options.legalHold) {
      throw new Error('Cannot hard-delete and legal-hold at the same time');
    }

    if (options.hardDelete) {
      // HARD DELETE — completely remove all PII
      await this.prisma.$transaction([
        this.prisma.refreshToken.deleteMany({ where: { userId } }),
        this.prisma.passwordReset.deleteMany({ where: { userId } }),
        this.prisma.emailVerification.deleteMany({ where: { userId } }),
        this.prisma.magicLink.deleteMany({ where: { userId } }),
        this.prisma.apiKey.deleteMany({ where: { userId } }),
        this.prisma.webhook.deleteMany({ where: { userId } }),
        this.prisma.session.deleteMany({ where: { userId } }),
        this.prisma.user.delete({ where: { id: userId } }),
      ]);

      await this.webhooksDispatcher.dispatch('user.deleted', {
        userId,
        method: 'hard_delete',
      });

      this.logger.warn(`User ${userId} hard-deleted (LGPD Art. 18)`);
    } else {
      // SOFT DELETE — anonymize PII but keep record for audit/legal
      const anonymizedEmail = `deleted-${userId}@anonymized.local`;
      await this.prisma.$transaction([
        this.prisma.user.update({
          where: { id: userId },
          data: {
            email: anonymizedEmail,
            name: 'Deleted User',
            password: null,
            twoFactorEnabled: false,
            twoFactorSecret: null,
            backupCodes: [],
            googleId: null,
            githubId: null,
            emailVerified: false,
            tenantId: null,
            permissions: [],
          },
        }),
        this.prisma.refreshToken.deleteMany({ where: { userId } }),
        this.prisma.session.deleteMany({ where: { userId } }),
        this.prisma.apiKey.updateMany({
          where: { userId },
          data: { active: false },
        }),
        this.prisma.webhook.updateMany({
          where: { userId },
          data: { active: false },
        }),
      ]);

      await this.webhooksDispatcher.dispatch('user.deleted', {
        userId,
        method: 'soft_delete',
      });

      this.logger.log(`User ${userId} anonymized (LGPD Art. 18)`);
    }

    await this.auditService.log('DATA_DELETION', {
      userId,
      metadata: {
        method: options.hardDelete ? 'hard_delete' : 'soft_delete',
        legalHold: options.legalHold || false,
      },
    });

    return {
      message: 'User data deleted per LGPD Art. 18 / GDPR Art. 17',
      method: options.hardDelete ? 'hard_delete' : 'soft_delete',
      deletedAt: new Date().toISOString(),
    };
  }

  /**
   * Record user consent for various data processing activities.
   * Required for LGPD Art. 7 and 8.
   */
  async recordConsent(
    userId: string,
    consents: {
      marketing?: boolean;
      analytics?: boolean;
      thirdPartySharing?: boolean;
      ipGeolocation?: boolean;
      dataRetention?: boolean;
    },
  ) {
    // Store consent in a separate table or as metadata on user
    // For simplicity, we use audit log as the consent record
    await this.auditService.log('CONSENT_RECORDED', {
      userId,
      metadata: { consents, timestamp: new Date().toISOString() },
    });

    return { message: 'Consent recorded', consents };
  }
}
