import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { LoginThrottleService } from './login-throttle.service';
import { TokenService } from './token.service';
import { NexusAuthBridgeService } from './nexusauth-bridge.service';

@Module({
  imports: [AuditModule],
  controllers: [AuthController],
  providers: [AuthService, TokenService, LoginThrottleService, NexusAuthBridgeService],
  exports: [TokenService, NexusAuthBridgeService],
})
export class AuthModule {}
