import { Module } from '@nestjs/common';
import { AuditController } from './audit.controller';
import { AuditService } from './audit.service';
import { JwtService } from '../auth/jwt.service';

@Module({
  controllers: [AuditController],
  providers: [AuditService, JwtService],
  exports: [AuditService],
})
export class AuditModule {}
