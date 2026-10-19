import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  Post,
  Req,
} from '@nestjs/common';
import type { Request } from 'express';
import { IsIn } from 'class-validator';
import { Role } from '@nexly/shared';
import { Public } from '../common/decorators/public.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { getTenantIdOrFail } from '../database/tenant-context';
import { AssinaturasService } from './assinaturas.service';

export class CheckoutDto {
  @IsIn(['BASIC', 'PRO', 'ENTERPRISE'])
  plano!: 'BASIC' | 'PRO' | 'ENTERPRISE';
}

@Controller('assinaturas')
@Roles(Role.ADMIN)
export class AssinaturasController {
  constructor(private readonly service: AssinaturasService) {}

  @Get()
  status() {
    return this.service.status(getTenantIdOrFail());
  }

  @Post('checkout')
  @HttpCode(200)
  checkout(@Body() body: CheckoutDto) {
    return this.service.checkout(getTenantIdOrFail(), body.plano);
  }

  @Post('portal')
  @HttpCode(200)
  portal() {
    return this.service.portal(getTenantIdOrFail());
  }

  @Post('atualizar-status')
  @HttpCode(200)
  atualizar() {
    return this.service.atualizar(getTenantIdOrFail());
  }

  @Public()
  @Post('webhook')
  @HttpCode(200)
  webhook(@Req() req: Request, @Headers('stripe-signature') signature?: string) {
    if (!signature || !Buffer.isBuffer(req.body))
      throw new BadRequestException('Webhook inválido.');
    return this.service.webhook(req.body, signature);
  }
}
