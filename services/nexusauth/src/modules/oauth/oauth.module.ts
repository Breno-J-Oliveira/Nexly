import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { OAuthController } from './oauth.controller';
import { OAuthService } from './oauth.service';
import { GoogleStrategy } from './strategies/google.strategy';
import { GithubStrategy } from './strategies/github.strategy';
import { JwtService } from '../auth/jwt.service';
import { AuditModule } from '../audit/audit.module';
import { WebhooksModule } from '../webhooks/webhooks.module';
import { MetricsModule } from '../metrics/metrics.module';

@Module({
  imports: [PassportModule, AuditModule, WebhooksModule, MetricsModule],
  controllers: [OAuthController],
  providers: [OAuthService, GoogleStrategy, GithubStrategy, JwtService],
  exports: [OAuthService],
})
export class OAuthModule {}
