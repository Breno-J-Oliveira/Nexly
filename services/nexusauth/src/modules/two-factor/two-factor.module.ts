import { Module } from '@nestjs/common';
import { TwoFactorController } from './two-factor.controller';
import { TwoFactorService } from './two-factor.service';
import { JwtService } from '../auth/jwt.service';
import { AuditModule } from '../audit/audit.module';
import { WebhooksModule } from '../webhooks/webhooks.module';

@Module({
  imports: [AuditModule, WebhooksModule],
  controllers: [TwoFactorController],
  providers: [TwoFactorService, JwtService],
  exports: [TwoFactorService],
})
export class TwoFactorModule {}
