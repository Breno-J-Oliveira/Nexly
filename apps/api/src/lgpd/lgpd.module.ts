import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { LgpdController } from './lgpd.controller';
import { LgpdScheduler } from './lgpd.scheduler';
import { LgpdService } from './lgpd.service';
import { AssinaturasModule } from '../assinaturas/assinaturas.module';
import { ExportLeaseService } from './export-lease.service';

@Module({
  imports: [AuditModule, AssinaturasModule],
  controllers: [LgpdController],
  providers: [LgpdService, LgpdScheduler, ExportLeaseService],
})
export class LgpdModule {}
