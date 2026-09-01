import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import * as crypto from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateWebhookDto, ALLOWED_WEBHOOK_EVENTS } from './dto/create-webhook.dto';
import { UpdateWebhookDto } from './dto/update-webhook.dto';
import { validateWebhookUrl } from '../../common/utils/ssrf-guard';

@Injectable()
export class WebhooksService {
  // V13 fix: UUID validation regex
  private readonly UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  constructor(private prisma: PrismaService) {}

  private validateUUID(id: string, fieldName: string = 'id'): void {
    if (!id || typeof id !== 'string' || !this.UUID_REGEX.test(id)) {
      throw new NotFoundException({ code: 'NOT_FOUND', message: `${fieldName} not found` });
    }
  }

  // V46 FIX: validate events against allowlist
  private validateEvents(events: string[]): void {
    if (!Array.isArray(events) || events.length === 0) {
      throw new BadRequestException({
        code: 'INVALID_EVENTS',
        message: 'Events must be a non-empty array',
      });
    }
    const invalid = events.filter((e) => !ALLOWED_WEBHOOK_EVENTS.includes(e as any));
    if (invalid.length > 0) {
      throw new BadRequestException({
        code: 'INVALID_EVENTS',
        message: `Invalid events: ${invalid.join(', ')}. Allowed: ${ALLOWED_WEBHOOK_EVENTS.join(', ')}`,
      });
    }
  }

  async create(userId: string, dto: CreateWebhookDto) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new ForbiddenException({ code: 'USER_NOT_FOUND' });
    }

    await validateWebhookUrl(dto.url);
    this.validateEvents(dto.events); // V46 FIX

    const secret = crypto.randomBytes(32).toString('hex');

    const webhook = await this.prisma.webhook.create({
      data: {
        userId,
        tenantId: user.tenantId,
        url: dto.url,
        events: dto.events,
        secret,
        active: true,
      },
    });

    return {
      id: webhook.id,
      url: webhook.url,
      events: webhook.events,
      secret,
      active: webhook.active,
      createdAt: webhook.createdAt,
    };
  }

  async list(userId: string) {
    const webhooks = await this.prisma.webhook.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    return webhooks.map((w) => ({
      id: w.id,
      url: w.url,
      events: w.events,
      hasSecret: true,
      active: w.active,
      createdAt: w.createdAt,
    }));
  }

  async update(userId: string, id: string, dto: UpdateWebhookDto) {
    this.validateUUID(id, 'webhook');

    const webhook = await this.prisma.webhook.findUnique({ where: { id } });
    if (!webhook || webhook.userId !== userId) {
      throw new NotFoundException({ code: 'WEBHOOK_NOT_FOUND' });
    }

    if (dto.url) {
      await validateWebhookUrl(dto.url);
    }

    if (dto.events) {
      this.validateEvents(dto.events); // V46 FIX
    }

    const updated = await this.prisma.webhook.update({
      where: { id },
      data: {
        ...(dto.active !== undefined && { active: dto.active }),
        ...(dto.events && dto.events.length > 0 && { events: dto.events }),
        ...(dto.url && { url: dto.url }),
      },
    });

    return {
      id: updated.id,
      url: updated.url,
      events: updated.events,
      hasSecret: true,
      active: updated.active,
    };
  }

  async remove(userId: string, id: string) {
    this.validateUUID(id, 'webhook');

    const webhook = await this.prisma.webhook.findUnique({ where: { id } });
    if (!webhook || webhook.userId !== userId) {
      throw new NotFoundException({ code: 'WEBHOOK_NOT_FOUND' });
    }

    await this.prisma.webhook.delete({ where: { id } });
    return { message: 'Webhook deleted successfully' };
  }

  async listDeliveries(userId: string, webhookId: string) {
    this.validateUUID(webhookId, 'webhookId');
    const webhook = await this.prisma.webhook.findUnique({ where: { id: webhookId } });
    if (!webhook || webhook.userId !== userId) {
      throw new NotFoundException({ code: 'WEBHOOK_NOT_FOUND' });
    }

    return this.prisma.webhookDelivery.findMany({
      where: { webhookId },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });
  }
}
