import { Module } from '@nestjs/common';
import { SessionsController } from './sessions.controller';
import { SessionsService } from './sessions.service';
import { AuditModule } from '../audit/audit.module';
import { JwtService } from '../auth/jwt.service';

@Module({
  imports: [AuditModule],
  controllers: [SessionsController],
  providers: [SessionsService, JwtService],
})
export class SessionsModule {}
