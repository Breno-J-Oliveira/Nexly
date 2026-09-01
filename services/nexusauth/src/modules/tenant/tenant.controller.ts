import {
  Controller,
  Post,
  Get,
  Body,
  Req,
  UseGuards,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Request } from 'express';
import { TenantService } from './tenant.service';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { InviteTenantDto } from './dto/invite-tenant.dto';
import { AcceptInvitationDto } from './dto/accept-invitation.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionGuard } from '../../common/guards/permission.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { RedisService } from '../../redis/redis.service';

@ApiTags('Tenant')
@Controller('tenant')
@UseGuards(JwtAuthGuard)
export class TenantController {
  constructor(
    private tenantService: TenantService,
    private redisService: RedisService,
  ) {}

  @Post()
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Criar novo tenant' })
  async create(
    @CurrentUser() user: any,
    @Body() dto: CreateTenantDto,
    @Req() req: Request,
  ) {
    const ipAddress = req.ip || 'unknown';
    const key = `ratelimit:tenant:${ipAddress}`;
    const count = await this.redisService.incr(key);
    if (count === 1) await this.redisService.expire(key, 300);
    if (count > 3) {
      throw new HttpException(
        { code: 'RATE_LIMITED', message: 'Too many requests. Please try again later.' },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    return this.tenantService.createTenant(user.sub, dto);
  }

  @Post('invite')
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Convidar usuário para o tenant (requer permissão tenant:manage)' })
  @UseGuards(PermissionGuard)
  @RequirePermission('tenant:manage')
  async invite(
    @CurrentUser() user: any,
    @Body() dto: InviteTenantDto,
    @Req() req: Request,
  ) {
    // V11 fix: rate limit tenant invites
    const ipAddress = req.ip || 'unknown';
    const key = `ratelimit:tenant-invite:${ipAddress}`;
    const count = await this.redisService.incr(key);
    if (count === 1) await this.redisService.expire(key, 300);
    if (count > 10) {
      throw new HttpException(
        { code: 'RATE_LIMITED', message: 'Too many requests. Please try again later.' },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    return this.tenantService.invite(user.sub, dto);
  }

  @Post('invite/accept')
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Aceitar convite para tenant' })
  async acceptInvitation(
    @CurrentUser() user: any,
    @Body() dto: AcceptInvitationDto,
    @Req() req: Request,
  ) {
    // Rate limit invitation accept per IP to prevent brute force
    const ipAddress = req.ip || 'unknown';
    const key = `ratelimit:tenant-accept:${ipAddress}`;
    const count = await this.redisService.incr(key);
    if (count === 1) await this.redisService.expire(key, 60);
    if (count > 10) {
      throw new HttpException(
        { code: 'RATE_LIMITED', message: 'Too many requests. Please try again later.' },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    return this.tenantService.acceptInvitation(user.sub, dto);
  }

  @Get('members')
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Listar membros do tenant (requer permissão users:read)' })
  @UseGuards(PermissionGuard)
  @RequirePermission('users:read')
  async listMembers(@CurrentUser() user: any) {
    return this.tenantService.listMembers(user.sub);
  }
}
