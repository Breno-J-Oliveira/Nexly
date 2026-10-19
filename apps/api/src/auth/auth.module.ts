import { Module } from '@nestjs/common';
import { RecuperacaoController } from './recuperacao.controller';
import { GoogleService } from './google.service';
import { RecuperacaoService } from './recuperacao.service';
import { AuditModule } from '../audit/audit.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { LoginThrottleService } from './login-throttle.service';
import { TokenService } from './token.service';
import { NexusAuthBridgeService } from './nexusauth-bridge.service';

@Module({
  imports: [AuditModule],
  controllers: [AuthController, RecuperacaoController],
  providers: [
    AuthService,
    GoogleService,
    TokenService,
    LoginThrottleService,
    NexusAuthBridgeService,
    RecuperacaoService,
  ],
  exports: [TokenService, NexusAuthBridgeService],
})
export class AuthModule {}
