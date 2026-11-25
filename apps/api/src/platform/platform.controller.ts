import {
  Body,
  Controller,
  Get,
  Header,
  Logger,
  Param,
  Patch,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import { Plano } from '@prisma/client';
import {
  Equals,
  IsEnum,
  IsISO8601,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import type { Request } from 'express';
import { PlatformCouponsService } from '../assinaturas/platform-coupons.service';
import { PlatformRoles } from '../platform-access/platform-roles.decorator';
import {
  COMPANY_SORTS,
  COMPANY_SUBSCRIPTIONS,
  PlatformOverviewService,
  type CompanySort,
  type CompanySubscription,
} from './platform-overview.service';

class CompaniesQuery {
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100_000)
  page?: number;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  q?: string;

  @IsOptional()
  @IsEnum(Plano)
  plan?: Plano;

  @IsOptional()
  @IsIn(COMPANY_SUBSCRIPTIONS)
  subscription?: CompanySubscription;

  @IsOptional()
  @IsIn(COMPANY_SORTS)
  sort?: CompanySort;
}

class CouponsQuery {
  @IsOptional()
  @Matches(/^promo_[a-zA-Z0-9]{1,100}$/)
  after?: string;

  @IsOptional()
  @Matches(/^[A-Z0-9]{3,32}$/)
  code?: string;
}

class CreateCampaign {
  @Matches(/^[A-Z0-9]{3,32}$/)
  code!: string;

  @IsInt()
  @Min(1)
  @Max(100)
  percentOff!: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(1_000_000)
  maxRedemptions?: number;

  @IsOptional()
  @IsISO8601({ strict: true, strictSeparator: true })
  @Matches(/(?:Z|[+-]\d\d:\d\d)$/)
  expiresAt?: string;
}

class DisableCampaign {
  @Equals(false)
  active!: false;
}

@Controller('platform')
export class PlatformController {
  private readonly logger = new Logger(PlatformController.name);

  constructor(
    private readonly metrics: PlatformOverviewService,
    private readonly coupons: PlatformCouponsService,
  ) {}

  @Get('overview')
  @PlatformRoles('OWNER', 'OPERATIONS', 'FINANCE', 'VIEWER')
  @Header('Cache-Control', 'no-store')
  overview() {
    return this.metrics.overview();
  }

  @Get('companies')
  @PlatformRoles('OWNER', 'OPERATIONS', 'FINANCE', 'VIEWER')
  @Header('Cache-Control', 'no-store')
  companies(@Query() query: CompaniesQuery) {
    return this.metrics.companies(query);
  }

  @Get('operations')
  @PlatformRoles('OWNER', 'OPERATIONS')
  @Header('Cache-Control', 'no-store')
  operations() {
    return this.metrics.operations();
  }

  @Get('coupons')
  @PlatformRoles('OWNER', 'FINANCE')
  @Header('Cache-Control', 'no-store')
  campaigns(@Query() query: CouponsQuery) {
    return this.coupons.list(query.after, query.code);
  }

  @Post('coupons')
  @PlatformRoles('OWNER', 'FINANCE')
  @Header('Cache-Control', 'no-store')
  async createCampaign(@Req() request: Request, @Body() body: CreateCampaign) {
    const coupon = await this.coupons.create(body);
    this.logger.log({
      event: 'platform.coupon.saved',
      actorId: request.user?.id,
      couponId: coupon.id,
    });
    return coupon;
  }

  @Patch('coupons/:id')
  @PlatformRoles('OWNER', 'FINANCE')
  @Header('Cache-Control', 'no-store')
  async disableCampaign(
    @Req() request: Request,
    @Param('id') id: string,
    @Body() body: DisableCampaign,
  ) {
    const coupon = await this.coupons.disable(id);
    this.logger.log({
      event: 'platform.coupon.disabled',
      actorId: request.user?.id,
      couponId: id,
      active: body.active,
    });
    return coupon;
  }
}
