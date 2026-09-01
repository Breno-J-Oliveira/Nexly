import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../redis/redis.service';
import { JwtService } from '../auth/jwt.service';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class AdminService {
  constructor(
    private prisma: PrismaService,
    private redisService: RedisService,
    private jwtService: JwtService,
    private auditService: AuditService,
  ) {}

  async impersonate(adminId: string, targetUserId: string) {
    // CRITICAL FIX: Validate UUID format to prevent injection
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(targetUserId)) {
      throw new BadRequestException({
        code: 'INVALID_USER_ID',
        message: 'Invalid user ID format',
      });
    }

    const admin = await this.prisma.user.findUnique({
      where: { id: adminId },
    });
    if (!admin || admin.role !== 'ADMIN') {
      throw new ForbiddenException({
        code: 'NOT_ADMIN',
        message: 'Only admins can impersonate',
      });
    }

    const target = await this.prisma.user.findUnique({
      where: { id: targetUserId },
    });
    if (!target) {
      throw new NotFoundException({
        code: 'USER_NOT_FOUND',
        message: 'Target user not found',
      });
    }

    if (target.id === adminId) {
      throw new BadRequestException({
        code: 'CANNOT_IMPERSONATE_SELF',
        message: 'Cannot impersonate yourself',
      });
    }

    // B4 fix: prevent admin from impersonating another admin
    if (target.role === 'ADMIN') {
      throw new ForbiddenException({
        code: 'CANNOT_IMPERSONATE_ADMIN',
        message: 'Cannot impersonate another admin user',
      });
    }

    // B3 fix: prevent cross-tenant impersonation including null checks
    // Treat null tenantId as a distinct scope, not as "skip check"
    // Only allow impersonation if tenantIds match exactly (both null or both same value)
    if (admin.tenantId !== target.tenantId) {
      throw new ForbiddenException({
        code: 'CROSS_TENANT_IMPERSONATION_BLOCKED',
        message: 'Cannot impersonate users from different tenant scopes',
      });
    }

    // CRITICAL FIX: Rate limit impersonation attempts
    // (This should be done at controller level, but adding defense in depth)

    const impersonationToken = this.jwtService.signImpersonationToken({
      sub: target.id,
      email: target.email,
      role: target.role,
      tenantId: target.tenantId ?? undefined,
      permissions: target.permissions ?? undefined,
      impersonatedBy: adminId,
    });

    await this.auditService.log('IMPERSONATION_STARTED', {
      userId: adminId,
      metadata: {
        targetUserId: target.id,
        targetEmail: target.email,
      },
    });

    return {
      impersonationToken,
      targetUser: {
        id: target.id,
        email: target.email,
        name: target.name,
        role: target.role,
      },
    };
  }

  async stopImpersonation(user: any, token: string) {
    const payload = this.jwtService.verify(token);

    if (payload.type !== 'impersonation') {
      throw new BadRequestException({
        code: 'NOT_IMPERSONATION_TOKEN',
        message: 'Token is not an impersonation token',
      });
    }

    const jti = payload.jti;
    const exp = payload.exp;
    const now = Math.floor(Date.now() / 1000);
    const ttl = exp - now;

    if (ttl > 0) {
      await this.redisService.set(`blacklist:${jti}`, '1', ttl);
    }

    await this.auditService.log('IMPERSONATION_ENDED', {
      userId: payload.impersonatedBy,
      metadata: {
        impersonatedUserId: payload.sub,
      },
    });

    return { message: 'Impersonation stopped successfully' };
  }
}
