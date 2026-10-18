import { BadRequestException, ValidationPipe } from '@nestjs/common';
import { validationMessages } from './common/validation/validation-messages';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import compression from 'compression';
import type { NextFunction, Request, Response } from 'express';
import { json, urlencoded } from 'express';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { env } from './config/env';
import { cookieOriginGuard } from './common/middleware/cookie-origin';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, { bodyParser: false });
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
    exposedHeaders: ['X-Request-Id', 'Retry-After'],
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

  app.use(cookieOriginGuard(env.CORS_ORIGIN.split(',')));

  // Limite compatível com múltiplas telas/requisições no dashboard.
  app.use(
    rateLimit({
      windowMs: 60 * 1000,
      max: 300,
      standardHeaders: true,
      legacyHeaders: false,
      message: { statusCode: 429, message: 'Muitas requisições. Tente novamente mais tarde.' },
      skip: (req) => req.path === '/api/health' || req.path.startsWith('/api/docs'),
    }),
  );

  // Restringe tentativas de credenciais sem bloquear /me e refresh durante o uso normal.
  app.use(
    '/api/auth',
    rateLimit({
      windowMs: 15 * 60 * 1000,
      max: 10,
      skip: (req) =>
        req.method !== 'POST' ||
        ![
          '/login',
          '/2fa/verify',
          '/2fa/enable',
          '/2fa/disable',
          '/recuperacao/solicitar',
          '/recuperacao/redefinir',
        ].includes(req.path),
      skipSuccessfulRequests: true,
      standardHeaders: true,
      legacyHeaders: false,
      message: {
        statusCode: 429,
        message: 'Muitas tentativas de autenticação. Tente novamente mais tarde.',
      },
    }),
  );

  // Cadastro continua contando sucessos para limitar criacao automatizada de contas.
  app.use(
    '/api/auth/register',
    rateLimit({
      windowMs: 15 * 60 * 1000,
      max: 10,
      standardHeaders: true,
      legacyHeaders: false,
      skip: (req) => req.method !== 'POST',
      message: { statusCode: 429, message: 'Muitos cadastros. Tente novamente mais tarde.' },
    }),
  );

  // Anti-flood de reservas: leitura do catálogo usa o limite global, sem consumir reservas.
  app.use(
    '/api/booking',
    rateLimit({
      windowMs: 15 * 60 * 1000,
      max: 20,
      skip: (req) => req.method !== 'POST',
      standardHeaders: true,
      legacyHeaders: false,
      message: {
        statusCode: 429,
        message: 'Muitas solicitações de agendamento. Tente novamente mais tarde.',
      },
    }),
  );

  // Operações pesadas são limitadas pelo HeavyOperationGuard após validar a identidade.
  // A importação recebe o teto do formulário; os demais JSONs mantêm 100 KB.
  app.use('/api/gestao/importacao', json({ limit: '2mb' }));
  app.use(json({ limit: '100kb' }));
  app.use(urlencoded({ extended: true, limit: '100kb' }));

  app.setGlobalPrefix('api');

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
      errorHttpStatusCode: 400,
      stopAtFirstError: false,
      exceptionFactory: (errors) => new BadRequestException(validationMessages(errors)),
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

  await app.listen(env.PORT, env.HOST);
}

void bootstrap();
