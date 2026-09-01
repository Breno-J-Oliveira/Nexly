import {
  INestApplication,
  ValidationPipe,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import session from 'express-session';
import * as express from 'express';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { MetricsInterceptor } from './common/interceptors/metrics.interceptor';
import { MetricsService } from './modules/metrics/metrics.service';
import { SecurityHeadersMiddleware } from './common/middleware/security-headers.middleware';
import { IdempotencyInterceptor } from './common/interceptors/idempotency.interceptor';

/**
 * App configuration shared by main.ts and the E2E test suite.
 *
 * Extracted from bootstrap() so the test harness applies the EXACT
 * same middleware/pipe/filter stack as production. Without this,
 * tests passed against a half-configured app and never exercised
 * Helmet, CORS, CSRF, Idempotency, ValidationPipe, etc.
 */
export function configureApp(app: INestApplication): void {
  const configService = app.get(ConfigService);
  const logger = new Logger('AppConfig');
  const nodeEnv = configService.get<string>('NODE_ENV', 'development');
  const isProd = nodeEnv === 'production';

  // 1. Trust proxy configuration (must be first)
  const proxyHops = configService.get<number>('TRUST_PROXY_HOPS', 1);
  if ((app.getHttpAdapter().getInstance() as any).set) {
    (app.getHttpAdapter().getInstance() as any).set('trust proxy', proxyHops);
  }

  // 2. Helmet — security headers (CSP, HSTS, etc.)
  // V7/V37 (HSTS 2y), CSP tightened where possible
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: isProd
          ? {
              // SECURITY: Strict CSP for production — no unsafe-inline/eval
              defaultSrc: ["'self'"],
              styleSrc: ["'self'"],
              scriptSrc: ["'self'"],
              imgSrc: ["'self'", 'data:', 'https:'],
              connectSrc: ["'self'"],
              fontSrc: ["'self'"],
              objectSrc: ["'none'"],
              mediaSrc: ["'self'"],
              frameSrc: ["'none'"],
              formAction: ["'self'"],
              baseUri: ["'self'"],
              frameAncestors: ["'none'"],
              // SECURITY: Add upgrade-insecure-requests to force HTTPS
              upgradeInsecureRequests: [],
              // M42 FIX: CSP violation reporting — set CSP_REPORT_URI env var
              // to a dedicated endpoint (e.g. https://monitor.teudominio.com/csp-report).
              // Without this, CSP violations are silently ignored.
              ...(process.env.CSP_REPORT_URI && {
                reportUri: process.env.CSP_REPORT_URI,
                reportTo: process.env.CSP_REPORT_URI,
              }),
            }
          : {
              defaultSrc: ["'self'"],
              // Swagger UI in development requires unsafe-inline + unsafe-eval.
              // In production, /docs is disabled (see main.ts).
              styleSrc: ["'self'", "'unsafe-inline'"],
              scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
              imgSrc: ["'self'", 'data:', 'https:'],
              connectSrc: ["'self'"],
              fontSrc: ["'self'"],
              objectSrc: ["'none'"],
              mediaSrc: ["'self'"],
              frameSrc: ["'none'"],
              formAction: ["'self'"],
              baseUri: ["'self'"],
              frameAncestors: ["'none'"],
              // M42 FIX: Same violation reporting in dev.
              ...(process.env.CSP_REPORT_URI && {
                reportUri: process.env.CSP_REPORT_URI,
                reportTo: process.env.CSP_REPORT_URI,
              }),
            },
        reportOnly: process.env.CSP_REPORT_ONLY === 'true',
      },
      crossOriginOpenerPolicy: { policy: 'same-origin' },
      crossOriginResourcePolicy: { policy: 'same-site' },
      dnsPrefetchControl: { allow: false },
      frameguard: { action: 'deny' },
      hsts: {
        maxAge: 63072000, // 2 years
        includeSubDomains: true,
        preload: true,
      },
      ieNoOpen: true,
      noSniff: true,
      permittedCrossDomainPolicies: { permittedPolicies: 'none' },
      referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
      xssFilter: true,
    }),
  );

  // 3. Body parser with size limit
  const bodyLimit = configService.get<string>('REQUEST_BODY_LIMIT', '100kb');
  app.use(express.json({ limit: bodyLimit }));
  app.use(express.urlencoded({ extended: true, limit: bodyLimit }));

  // 4. Cookie parser — kept for future cookie-based flows and for
  //    any future SameSite=Strict + CSRF strategy. This API today
  //    authenticates exclusively via Authorization: Bearer, so cookies
  //    carry NO auth state.
  // B59 FIX: Use a signing secret for cookieParser. Even though cookies
  // carry no auth state today, signed cookies prevent tampering when
  // cookie-based features are added later. The secret is required in
  // production; in dev, a random ephemeral key is used.
  const cookieSecret = configService.get<string>('COOKIE_SECRET');
  if (isProd && !cookieSecret) {
    logger.error('COOKIE_SECRET is required in production. Set a strong random string (64+ chars).');
    logger.error('Generate: node -e "console.log(require(\'crypto\').randomBytes(48).toString(\'hex\'))"');
  }
  app.use(cookieParser(cookieSecret || undefined));

  // 4b. Express session — required for OAuth2 state parameter (passport-oauth2)
  app.use(
    session({
      secret: cookieSecret || 'nexusauth-session-dev-secret',
      resave: false,
      saveUninitialized: false,
      cookie: {
        secure: isProd,
        httpOnly: true,
        maxAge: 15 * 60 * 1000, // 15 minutes (just for OAuth flow)
        sameSite: isProd ? 'strict' : 'lax',
      },
    }),
  );

  // 5. Security headers middleware (Permissions-Policy, Clear-Site-Data)
  const securityHeaders = app.get(SecurityHeadersMiddleware);
  app.use(securityHeaders.use.bind(securityHeaders));

  // NOTE on CSRF: This API is Bearer-token-only. The browser does NOT
  // auto-attach Authorization headers cross-origin, and there are no
  // session cookies that could be replayed via a CSRF-style attack.
  // Therefore classic CSRF (double-submit cookie, synchronizer
  // token) does not apply. If/when a cookie-based flow is added
  // (e.g. a refresh token in an HttpOnly cookie), a CSRF strategy
  // MUST be added at that point.

  // 6. CORS
  const corsOrigins = configService
    .get<string>('CORS_ORIGINS', '')
    .split(',')
    .map((o: string) => o.trim())
    .filter(Boolean);

  // SECURITY: CORS must NEVER reflect Origin. In production, require explicit allowlist.
  // In development, allow localhost only. Never use wildcard `true`.
  const allowedOrigins = corsOrigins.length > 0
    ? corsOrigins
    : (nodeEnv === 'development' ? ['http://localhost:3000', 'http://localhost:4000', 'http://127.0.0.1:3000'] : []);

  app.enableCors({
    origin: (origin, callback) => {
      // If no origins configured in production, block all cross-origin requests
      if (allowedOrigins.length === 0) {
        return callback(null, false);
      }
      // Allow if origin is in the explicit allowlist OR if no origin header (same-origin/server-to-server)
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(null, false);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-API-Key',
      'X-Request-ID',
      'Idempotency-Key',
    ],
    exposedHeaders: ['X-Request-ID', 'Idempotent-Replay'],
    maxAge: 600,
  });

  // 7. Validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  // 8. Global exception filter
  app.useGlobalFilters(new AllExceptionsFilter());

  // 9. Global interceptors
  // Idempotency must run AFTER auth (interceptors execute after guards),
  // so the per-user cache key can include req.user.sub.
  app.useGlobalInterceptors(new LoggingInterceptor());
  const metricsService = app.get(MetricsService);
  app.useGlobalInterceptors(new MetricsInterceptor(metricsService));
  app.useGlobalInterceptors(app.get(IdempotencyInterceptor));

  // 10. Graceful shutdown
  app.enableShutdownHooks();

  logger.log('App configured: Helmet, CORS, ValidationPipe, filters, interceptors');
}
