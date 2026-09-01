import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { AuditModule } from '../audit/audit.module';
import { JwtService } from '../auth/jwt.service';

@Module({
  imports: [AuditModule],
  controllers: [AdminController],
  providers: [AdminService, JwtService],
})
export class AdminModule {}
