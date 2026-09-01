import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import * as geoip from 'geoip-lite';

export interface AuditContext {
  userId?: string;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, any>;
  success?: boolean;
}

@Injectable()
export class AuditService {
  constructor(private prisma: PrismaService) {}

  async log(action: string, ctx: AuditContext = {}) {
    const location = ctx.ipAddress ? this.getLocation(ctx.ipAddress) : null;

    return this.prisma.auditLog.create({
      data: {
        userId: ctx.userId ?? null,
        action: action as any,
        ipAddress: ctx.ipAddress ?? null,
        userAgent: ctx.userAgent ?? null,
        location,
        metadata: ctx.metadata ?? undefined,
        success: ctx.success ?? true,
      },
    });
  }

  getLocation(ipAddress: string): string {
    const geo = geoip.lookup(ipAddress);
    if (!geo) return 'Unknown';
    return `${geo.city}, ${geo.country}`;
  }
}
