import {
  Injectable,
  ConflictException,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import * as crypto from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { WebhooksDispatcher } from '../webhooks/webhooks.dispatcher';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { InviteTenantDto } from './dto/invite-tenant.dto';
import { AcceptInvitationDto } from './dto/accept-invitation.dto';
import { hashToken } from '../../common/utils/crypto.util';

@Injectable()
export class TenantService {
  private readonly logger = new Logger(TenantService.name);

  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
    private webhooksDispatcher: WebhooksDispatcher,
  ) {}

  async createTenant(userId: string, dto: CreateTenantDto) {
    // V6 fix: explicit slug collision check for user-friendly error message
    const existing = await this.prisma.tenant.findUnique({
      where: { slug: dto.slug },
    });
    if (existing) {
      throw new ConflictException({
        code: 'SLUG_ALREADY_TAKEN',
        message: 'This slug is already taken. Please choose another.',
      });
    }

    // M3 fix: use upsert pattern to avoid race condition on slug
    try {
      const tenant = await this.prisma.tenant.create({
        data: {
          name: dto.name,
          slug: dto.slug,
        },
      });

      await this.prisma.user.update({
        where: { id: userId },
        data: {
          tenantId: tenant.id,
          role: 'ADMIN',
          permissions: ['tenant:manage', 'users:read', 'users:write', 'billing:manage'],
        },
      });

      await this.auditService.log('TENANT_USER_INVITED', {
        userId,
        metadata: { tenantId: tenant.id, action: 'tenant_created' },
      });

      return {
        id: tenant.id,
        name: tenant.name,
        slug: tenant.slug,
        plan: tenant.plan,
      };
    } catch (err: any) {
      // M3 fix: catch P2002 (unique constraint violation) and return clean ConflictException
      if (err.code === 'P2002') {
        throw new ConflictException({
          code: 'SLUG_ALREADY_EXISTS',
          message: 'Tenant slug already exists',
        });
      }
      throw err;
    }
  }

  async invite(userId: string, dto: InviteTenantDto) {
    const admin = await this.prisma.user.findUnique({
      where: { id: userId },
    });
    if (!admin || !admin.tenantId) {
      throw new ForbiddenException({
        code: 'NO_TENANT',
        message: 'You must belong to a tenant to invite users',
      });
    }
    
    // CRITICAL FIX: Verify admin has tenant:manage permission
    if (!admin.permissions.includes('tenant:manage') && admin.role !== 'ADMIN') {
      throw new ForbiddenException({
        code: 'INSUFFICIENT_PERMISSIONS',
        message: 'You do not have permission to invite users',
      });
    }

    // CRITICAL FIX: Prevent inviting users who are already in this tenant
    const existingUser = await this.prisma.user.findFirst({
      where: {
        email: dto.email,
        tenantId: admin.tenantId,
      },
    });
    if (existingUser) {
      throw new ConflictException({
        code: 'USER_ALREADY_IN_TENANT',
        message: 'This user is already a member of this tenant',
      });
    }

    const existingInvite = await this.prisma.tenantInvitation.findFirst({
      where: {
        tenantId: admin.tenantId,
        email: dto.email,
        accepted: false,
        expiresAt: { gt: new Date() },
      },
    });
    if (existingInvite) {
      throw new ConflictException({
        code: 'INVITE_ALREADY_EXISTS',
        message: 'An active invitation already exists for this email',
      });
    }

    // CRITICAL FIX: Validate role - prevent privilege escalation
    const validRoles = ['USER', 'MANAGER'];
    const requestedRole = dto.role ?? 'USER';
    if (!validRoles.includes(requestedRole)) {
      throw new BadRequestException({
        code: 'INVALID_ROLE',
        message: 'Cannot invite user with ADMIN role',
      });
    }

    const rawToken = crypto.randomUUID();
    const hashedToken = hashToken(rawToken);
    await this.prisma.tenantInvitation.create({
      data: {
        tenantId: admin.tenantId,
        email: dto.email,
        role: requestedRole as any,
        token: hashedToken,
        invitedBy: userId,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    // SECURITY: Never log real tokens — even in development (C6 fix).
    // Tokens logged to centralised systems (CloudWatch, Datadog, ELK) become permanent exposure.
    this.logger.debug(`Tenant invitation created for ${dto.email} to tenant ${admin.tenantId}`);

    await this.auditService.log('TENANT_USER_INVITED', {
      userId,
      metadata: { tenantId: admin.tenantId, invitedEmail: dto.email, role: dto.role ?? 'USER' },
    });

    await this.webhooksDispatcher.dispatch('tenant.user_invited', {
      tenantId: admin.tenantId,
      invitedEmail: dto.email,
      role: dto.role ?? 'USER',
      invitedBy: userId,
    }, admin.tenantId);

    return { message: 'Invitation sent successfully' };
  }

  async acceptInvitation(userId: string, dto: AcceptInvitationDto) {
    const hashedToken = hashToken(dto.token);
    // V6 fix: atomic update — only set accepted=true if not already accepted and not expired
    const result = await this.prisma.tenantInvitation.updateMany({
      where: {
        token: hashedToken,
        accepted: false,
        expiresAt: { gt: new Date() },
      },
      data: { accepted: true },
    });

    if (result.count === 0) {
      const invitation = await this.prisma.tenantInvitation.findUnique({
        where: { token: hashedToken },
      });
      if (!invitation) {
        throw new NotFoundException({
          code: 'INVITATION_NOT_FOUND',
          message: 'Invitation not found',
        });
      }
      if (invitation.accepted) {
        throw new BadRequestException({
          code: 'INVITATION_ALREADY_ACCEPTED',
          message: 'Invitation already accepted',
        });
      }
      throw new BadRequestException({
        code: 'INVITATION_EXPIRED',
        message: 'Invitation has expired',
      });
    }

    const invitation = await this.prisma.tenantInvitation.findUnique({
      where: { token: hashedToken },
    });

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });
    if (!user) {
      throw new NotFoundException({
        code: 'USER_NOT_FOUND',
        message: 'User not found',
      });
    }

    if (user.email !== invitation!.email) {
      throw new ForbiddenException({
        code: 'EMAIL_MISMATCH',
        message: 'This invitation is for a different email',
      });
    }

    // HIGH FIX: Require email verification to prevent hijacking via pre-registration
    if (!user.emailVerified) {
      throw new ForbiddenException({
        code: 'EMAIL_NOT_VERIFIED',
        message: 'You must verify your email before accepting an invitation',
      });
    }

    // CRITICAL FIX: Reset permissions based on new role to prevent privilege escalation
    const rolePermissions: Record<string, string[]> = {
      ADMIN: ['tenant:manage', 'users:read', 'users:write', 'billing:manage'],
      MANAGER: ['users:read', 'users:write'],
      USER: [],
    };

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        tenantId: invitation!.tenantId,
        role: invitation!.role,
        permissions: rolePermissions[invitation!.role] || [],
      },
    });

    await this.auditService.log('TENANT_USER_INVITED', {
      userId,
      metadata: { tenantId: invitation!.tenantId, action: 'invitation_accepted' },
    });

    return { message: 'Invitation accepted successfully' };
  }

  async listMembers(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });
    if (!user || !user.tenantId) {
      throw new ForbiddenException({
        code: 'NO_TENANT',
        message: 'You must belong to a tenant',
      });
    }

    const members = await this.prisma.user.findMany({
      where: { tenantId: user.tenantId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        permissions: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    return members;
  }
}
