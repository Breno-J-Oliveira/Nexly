import {
  Controller,
  Get,
  Query,
  BadRequestException,
  UseGuards,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('audit-log')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AuditController {
  constructor(private prisma: PrismaService) {}

  @Get()
  @Roles('ADMIN')
  async list(
    @CurrentUser() user: any,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('userId') userId?: string,
    @Query('action') action?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const pageNum = parseInt(page ?? '1', 10);
    const limitNum = Math.min(parseInt(limit ?? '20', 10), 100);
    const skip = (pageNum - 1) * limitNum;

    const where: any = {};

    // C1 fix + V38 fix: filter by tenantId to prevent cross-tenant data leakage.
    // When user has a tenantId, restrict to logs whose user belongs to that tenant.
    // Anonymous logs (userId null) are not shown to tenant-scoped admins.
    if (user.tenantId) {
      where.user = { tenantId: user.tenantId };
    }

    if (userId) {
      // V52 fix: validate UUID format
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(userId)) {
        throw new BadRequestException({
          code: 'INVALID_USER_ID',
          message: 'userId must be a valid UUID',
        });
      }
      where.userId = userId;
    }
    if (action) where.action = action;

    // V52 FIX: validate date filter inputs to prevent DoS via Invalid Date
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        const sd = new Date(startDate);
        if (isNaN(sd.getTime())) {
          throw new BadRequestException({
            code: 'INVALID_DATE',
            message: 'startDate is not a valid date',
          });
        }
        where.createdAt.gte = sd;
      }
      if (endDate) {
        const ed = new Date(endDate);
        if (isNaN(ed.getTime())) {
          throw new BadRequestException({
            code: 'INVALID_DATE',
            message: 'endDate is not a valid date',
          });
        }
        where.createdAt.lte = ed;
      }
    }

    const [items, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limitNum,
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return {
      items,
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum),
    };
  }
}
