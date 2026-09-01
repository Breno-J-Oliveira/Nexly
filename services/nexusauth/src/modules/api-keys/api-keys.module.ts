import { Module } from '@nestjs/common';
import { ApiKeysController } from './api-keys.controller';
import { ApiKeysService } from './api-keys.service';
import { AuditModule } from '../audit/audit.module';
import { JwtService } from '../auth/jwt.service';

@Module({
  imports: [AuditModule],
  controllers: [ApiKeysController],
  providers: [ApiKeysService, JwtService],
  exports: [ApiKeysService],
})
export class ApiKeysModule {}
