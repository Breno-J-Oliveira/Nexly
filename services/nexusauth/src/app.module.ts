import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { configuration } from './config/configuration';
import { validateEnv } from './config/env';
import { PrismaModule } from './prisma/prisma.module';
import { RedisModule } from './redis/redis.module';
import { HealthModule } from './modules/health/health.module';
import { AuthModule } from './modules/auth/auth.module';
import { JwksModule } from './modules/jwks/jwks.module';
import { TwoFactorModule } from './modules/two-factor/two-factor.module';
import { OAuthModule } from './modules/oauth/oauth.module';
import { AuditModule } from './modules/audit/audit.module';
import { SessionsModule } from './modules/sessions/sessions.module';
import { TenantModule } from './modules/tenant/tenant.module';
import { AdminModule } from './modules/admin/admin.module';
import { WebhooksModule } from './modules/webhooks/webhooks.module';
import { ApiKeysModule } from './modules/api-keys/api-keys.module';
import { MetricsModule } from './modules/metrics/metrics.module';
import { LgpdModule } from './modules/lgpd/lgpd.module';
import { ThreatIntelModule } from './modules/threat-intel/threat-intel.module';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { ThrottlerGuard } from './common/guards/throttler.guard';
import { JwtService } from './modules/auth/jwt.service';
import { RedisService } from './redis/redis.service';
import { PrismaService } from './prisma/prisma.service';
import { IdempotencyInterceptor } from './common/interceptors/idempotency.interceptor';
import { SecurityHeadersMiddleware } from './common/middleware/security-headers.middleware';
import { Reflector } from '@nestjs/core';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      validate: validateEnv,
    }),
    PrismaModule,
    RedisModule,
    ThreatIntelModule,
    HealthModule,
    AuthModule,
    JwksModule,
    TwoFactorModule,
    OAuthModule,
    AuditModule,
    SessionsModule,
    TenantModule,
    AdminModule,
    WebhooksModule,
    ApiKeysModule,
    MetricsModule,
    LgpdModule,
  ],
  providers: [
    IdempotencyInterceptor,
    SecurityHeadersMiddleware,
    {
      provide: APP_GUARD,
      useFactory: (reflector: Reflector, jwtService: JwtService, redisService: RedisService, prismaService: PrismaService) =>
        new JwtAuthGuard(reflector, jwtService, redisService, prismaService),
      inject: [Reflector, JwtService, RedisService, PrismaService],
    },
    {
      provide: APP_GUARD,
      useFactory: (redisService: RedisService) => new ThrottlerGuard(redisService),
      inject: [RedisService],
    },
  ],
})
export class AppModule {}
