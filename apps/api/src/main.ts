import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import compression from 'compression';
import type { NextFunction, Request, Response } from 'express';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { env } from './config/env';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  const server = app.getHttpAdapter().getInstance();

  // Confia nos proxies para extrair IP real (necessário para rate limit e logs).
  server.set('trust proxy', 1);

  // Não expõe a stack na resposta (X-Powered-By: Express).
  server.disable('x-powered-by');

  // CORS deve vir ANTES do rate limit: assim até respostas de erro (429)
  // carregam os headers CORS, e o navegador não bloqueia o preflight.
  app.enableCors({
    origin: env.CORS_ORIGIN.split(',').map((o) => o.trim()),
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  // Headers de segurança HTTP.
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", 'data:', 'https:'],
          connectSrc: ["'self'"],
          fontSrc: ["'self'"],
          objectSrc: ["'none'"],
          frameAncestors: ["'none'"],
          upgradeInsecureRequests: [],
        },
      },
      crossOriginEmbedderPolicy: false,
      // A API só serve JSON — nada de embutir em frame.
      frameguard: { action: 'deny' },
      referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
      hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true,
      },
    }),
  );

  // Permissions-Policy + remoção do header que revela a stack.
  server.use((_req: Request, res: Response, next: NextFunction) => {
    res.setHeader('Permissions-Policy', 'camera=(), geolocation=(), microphone=()');
    res.removeHeader('X-Powered-By');
    next();
  });

  // Compressão das respostas JSON (corte de ~75% nos bytes na rede).
  // Depois do helmet e antes do rate limit: não interfere no CORS.
  app.use(
    compression({
      threshold: 1024,
      level: 6,
      filter: (req, res) => !res.getHeader('Content-Encoding') && compression.filter(req, res),
    }),
  );

  // Rate limit global: 100 req / 15min por IP.
  app.use(
    rateLimit({
      windowMs: 15 * 60 * 1000,
      max: 100,
      standardHeaders: true,
      legacyHeaders: false,
      message: { statusCode: 429, message: 'Muitas requisições. Tente novamente mais tarde.' },
      skip: (req) => req.path === '/api/health' || req.path.startsWith('/api/docs'),
    }),
  );

  // Rate limit extra restrito para autenticação: 10 req / 15min por IP.
  app.use(
    '/api/auth',
    rateLimit({
      windowMs: 15 * 60 * 1000,
      max: 10,
      standardHeaders: true,
      legacyHeaders: false,
      message: {
        statusCode: 429,
        message: 'Muitas tentativas de autenticação. Tente novamente mais tarde.',
      },
    }),
  );

  // Rate limit para agendamento público: 20 req / 15min por IP (anti-flood de agenda).
  app.use(
    '/api/booking',
    rateLimit({
      windowMs: 15 * 60 * 1000,
      max: 20,
      standardHeaders: true,
      legacyHeaders: false,
      message: {
        statusCode: 429,
        message: 'Muitas solicitações de agendamento. Tente novamente mais tarde.',
      },
    }),
  );

  // Rate limit para operações pesadas (exportação de dados / LGPD): 3 req / hora por IP.
  app.use(
    ['/api/export', '/api/lgpd'],
    rateLimit({
      windowMs: 60 * 60 * 1000,
      max: 3,
      standardHeaders: true,
      legacyHeaders: false,
      message: {
        statusCode: 429,
        message: 'Limite de exportações atingido. Tente novamente em 1 hora.',
      },
    }),
  );

  app.setGlobalPrefix('api');

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
      errorHttpStatusCode: 400,
      stopAtFirstError: false,
    }),
  );
  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalInterceptors(new TransformInterceptor());

  // Swagger apenas em desenvolvimento.
  if (env.NODE_ENV !== 'production') {
    const config = new DocumentBuilder()
      .setTitle('Nexly API')
      .setDescription('API da plataforma Nexly — agenda + estoque/PDV multi-tenant')
      .setVersion('0.1.0')
      .addBearerAuth()
      .build();
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document);
  }

  await app.listen(env.PORT);
}

void bootstrap();
