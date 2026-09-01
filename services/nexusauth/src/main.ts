import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import * as fs from 'fs';
import { AppModule } from './app.module';
import { configureApp } from './app.config';
import { PrismaService } from './prisma/prisma.service';
import { RedisService } from './redis/redis.service';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Apply the full production stack (Helmet, CORS, validation, filters,
  // interceptors). The same function is used by the E2E test suite so
  // tests exercise the real stack — no more "test app ≠ prod app".
  configureApp(app);

  const configService = app.get(ConfigService);
  const nodeEnv = configService.get<string>('NODE_ENV', 'development');
  const logger = new Logger('Bootstrap');

  // C2 FIX: In production, verify persistent JWT keys exist before accepting traffic.
  // Ephemeral keys in production would break multi-replica JWT verification.
  if (nodeEnv === 'production') {
    const privateKeyPath = configService.get<string>('JWT_PRIVATE_KEY_PATH', './keys/private.pem');
    if (!fs.existsSync(privateKeyPath) || fs.statSync(privateKeyPath).size === 0) {
      logger.error(`FATAL: JWT private key not found at ${privateKeyPath} in production.`);
      logger.error('Mount persistent RSA keys via Docker volume or Kubernetes secret.');
      process.exit(1);
    }
    logger.log(`JWT private key verified at ${privateKeyPath}`);
  }

  // Swagger / OpenAPI — disabled in production
  if (nodeEnv !== 'production') {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('NexusAuth API')
      .setDescription(
        'Microsservico de autenticacao centralizada - JWT RS256, 2FA, OAuth, multi-tenant, webhooks, API keys, LGPD',
      )
      .setVersion('0.1.0')
      .addBearerAuth(
        { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
        'access-token',
      )
      .addApiKey(
        { type: 'apiKey', name: 'x-api-key', in: 'header' },
        'api-key',
      )
      .build();
    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('docs', app, document, {
      swaggerOptions: { persistAuthorization: true },
    });
  }

  // Graceful shutdown handlers
  const prismaService = app.get(PrismaService);
  const redisService = app.get(RedisService);

  const handleShutdown = async (signal: string) => {
    logger.log(`Received ${signal}, closing connections...`);
    try {
      await prismaService.$disconnect();
      await redisService.onModuleDestroy();
      logger.log('All connections closed.');
    } catch (err) {
      logger.error('Error during shutdown', err);
    }
  };

  // SECURITY: Use NestJS enableShutdownHooks() (set in app.config.ts) for graceful shutdown.
  // Do NOT call process.exit() manually — it short-circuits Nest lifecycle hooks.
  process.on('SIGTERM', () => handleShutdown('SIGTERM'));
  process.on('SIGINT', () => handleShutdown('SIGINT'));

  const port = configService.get<number>('PORT', 3000);
  await app.listen(port);

  logger.log(`NexusAuth API running on port ${port}`);
  logger.log(`Environment: ${nodeEnv}`);
}

bootstrap();
