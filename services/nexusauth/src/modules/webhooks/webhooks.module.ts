import { Module } from '@nestjs/common';
import { WebhooksController } from './webhooks.controller';
import { WebhooksService } from './webhooks.service';
import { WebhooksDispatcher } from './webhooks.dispatcher';
import { JwtService } from '../auth/jwt.service';

@Module({
  controllers: [WebhooksController],
  providers: [WebhooksService, WebhooksDispatcher, JwtService],
  exports: [WebhooksDispatcher],
})
export class WebhooksModule {}
