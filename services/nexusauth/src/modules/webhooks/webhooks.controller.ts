import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  Req,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Request } from 'express';
import { WebhooksService } from './webhooks.service';
import { CreateWebhookDto } from './dto/create-webhook.dto';
import { UpdateWebhookDto } from './dto/update-webhook.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RedisService } from '../../redis/redis.service';

@ApiTags('Webhooks')
@Controller('webhooks')
@UseGuards(JwtAuthGuard)
export class WebhooksController {
  constructor(
    private webhooksService: WebhooksService,
    private redisService: RedisService,
  ) {}

  @Post()
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Registrar webhook (retorna secret uma única vez)' })
  async create(@CurrentUser() user: any, @Body() dto: CreateWebhookDto, @Req() req: Request) {
    // V11 fix: rate limit webhook creation
    const ipAddress = req.ip || 'unknown';
    const key = `ratelimit:webhook:${ipAddress}`;
    const count = await this.redisService.incr(key);
    if (count === 1) await this.redisService.expire(key, 60);
    if (count > 10) {
      throw new HttpException(
        { code: 'RATE_LIMITED', message: 'Too many requests. Please try again later.' },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    return this.webhooksService.create(user.sub, dto);
  }

  @Get()
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Listar webhooks (sem secret)' })
  async list(@CurrentUser() user: any) {
    return this.webhooksService.list(user.sub);
  }

  @Patch(':id')
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Atualizar webhook (ativar/desativar, eventos, URL)' })
  async update(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() dto: UpdateWebhookDto,
    @Req() req: Request,
  ) {
    // V3 fix: rate limit webhook update
    const ipAddress = req.ip || 'unknown';
    const key = `ratelimit:webhook:${ipAddress}`;
    const count = await this.redisService.incr(key);
    if (count === 1) await this.redisService.expire(key, 60);
    if (count > 20) {
      throw new HttpException(
        { code: 'RATE_LIMITED', message: 'Too many requests. Please try again later.' },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    return this.webhooksService.update(user.sub, id, dto);
  }

  @Delete(':id')
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Remover webhook' })
  async remove(@CurrentUser() user: any, @Param('id') id: string, @Req() req: Request) {
    // V3 fix: rate limit webhook delete
    const ipAddress = req.ip || 'unknown';
    const key = `ratelimit:webhook:${ipAddress}`;
    const count = await this.redisService.incr(key);
    if (count === 1) await this.redisService.expire(key, 60);
    if (count > 20) {
      throw new HttpException(
        { code: 'RATE_LIMITED', message: 'Too many requests. Please try again later.' },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    return this.webhooksService.remove(user.sub, id);
  }

  @Get(':id/deliveries')
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Listar tentativas de entrega do webhook' })
  async deliveries(@CurrentUser() user: any, @Param('id') id: string) {
    return this.webhooksService.listDeliveries(user.sub, id);
  }
}
