import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import * as crypto from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CreateApiKeyDto } from './dto/create-api-key.dto';

@Injectable()
export class ApiKeysService {
  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
  ) {}

  async create(userId: string, dto: CreateApiKeyDto) {
    // CRITICAL FIX: Validate input
    if (!dto.name || dto.name.trim().length === 0) {
      throw new BadRequestException({
        code: 'INVALID_NAME',
        message: 'API key name is required',
      });
    }

    const rawKey = `nxs_live_${crypto.randomBytes(32).toString('hex')}`;
    const keyHash = crypto.createHash('sha256').update(rawKey).digest('hex');

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException({
        code: 'USER_NOT_FOUND',
        message: 'User not found',
      });
    }

    // CRITICAL FIX: Limit number of API keys per user to prevent abuse
    const existingKeysCount = await this.prisma.apiKey.count({
      where: { userId, active: true },
    });
    const MAX_API_KEYS = 10;
    if (existingKeysCount >= MAX_API_KEYS) {
      throw new BadRequestException({
        code: 'API_KEY_LIMIT_REACHED',
        message: `Maximum of ${MAX_API_KEYS} active API keys allowed`,
      });
    }

    // A2 fix: filter requested permissions against user's actual permissions
    // CRITICAL FIX: Admin users can have any permission, regular users are restricted
    const userPermissions = user?.permissions ?? [];
    let allowedPermissions: string[];
    
    if (user.role === 'ADMIN') {
      // Admins can create API keys with any permissions
      allowedPermissions = dto.permissions;
    } else {
      // Regular users can only create API keys with permissions they have
      allowedPermissions = dto.permissions.filter((p) => userPermissions.includes(p));
      
      // CRITICAL FIX: Prevent privilege escalation - reject if requesting permissions user doesn't have
      if (allowedPermissions.length !== dto.permissions.length) {
        throw new ForbiddenException({
          code: 'INSUFFICIENT_PERMISSIONS',
          message: 'Cannot create API key with permissions you do not have',
        });
      }
    }

    const apiKey = await this.prisma.apiKey.create({
      data: {
        name: dto.name.trim(),
        key: keyHash,
        userId,
        tenantId: user?.tenantId ?? null,
        permissions: allowedPermissions,
        active: true,
      },
    });

    await this.auditService.log('API_KEY_CREATED', {
      userId,
      metadata: { apiKeyId: apiKey.id, name: dto.name },
    });

    return {
      id: apiKey.id,
      name: apiKey.name,
      key: rawKey,
      permissions: apiKey.permissions,
      active: apiKey.active,
      createdAt: apiKey.createdAt,
    };
  }

  async list(userId: string) {
    const keys = await this.prisma.apiKey.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    return keys.map((k) => ({
      id: k.id,
      name: k.name,
      // C5 FIX: Do not expose any characters of the SHA-256 hash.
      // Even 2 characters allow attackers to correlate keys between listings and logs.
      keyPrefix: 'nxs_live_**********',
      permissions: k.permissions,
      active: k.active,
      lastUsedAt: k.lastUsedAt,
      expiresAt: k.expiresAt,
      createdAt: k.createdAt,
    }));
  }

  async revoke(userId: string, id: string) {
    const apiKey = await this.prisma.apiKey.findUnique({ where: { id } });
    if (!apiKey || apiKey.userId !== userId) {
      throw new NotFoundException({ code: 'API_KEY_NOT_FOUND' });
    }

    await this.prisma.apiKey.update({
      where: { id },
      data: { active: false },
    });

    await this.auditService.log('API_KEY_REVOKED', {
      userId,
      metadata: { apiKeyId: id },
    });

    return { message: 'API key revoked successfully' };
  }

  async validate(rawKey: string) {
    const keyHash = crypto.createHash('sha256').update(rawKey).digest('hex');

    const apiKey = await this.prisma.apiKey.findUnique({
      where: { key: keyHash },
    });

    if (!apiKey || !apiKey.active) {
      return null;
    }

    if (apiKey.expiresAt && apiKey.expiresAt < new Date()) {
      return null;
    }

    await this.prisma.apiKey.update({
      where: { id: apiKey.id },
      data: { lastUsedAt: new Date() },
    });

    return {
      id: apiKey.id,
      userId: apiKey.userId,
      tenantId: apiKey.tenantId,
      permissions: apiKey.permissions,
    };
  }
}
