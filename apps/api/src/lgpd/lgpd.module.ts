import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { LgpdController } from './lgpd.controller';
import { LgpdScheduler } from './lgpd.scheduler';
import { LgpdService } from './lgpd.service';

@Module({
  imports: [AuditModule],
  controllers: [LgpdController],
  providers: [LgpdService, LgpdScheduler],
})
export class LgpdModule {}
