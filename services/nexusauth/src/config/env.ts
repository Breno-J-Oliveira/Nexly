import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(3000),

  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url(),

  // HIGH FIX: Trust proxy hops - set to 0 for direct exposure, 1 for nginx/ALB/Cloudflare
  TRUST_PROXY_HOPS: z.coerce.number().default(0),

  JWT_PRIVATE_KEY_PATH: z.string().default('./keys/private.pem'),
  JWT_PUBLIC_KEY_PATH: z.string().default('./keys/public.pem'),
  JWT_ACCESS_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),
  JWT_ISSUER: z.string().default('nexusauth'),

  CORS_ORIGINS: z.string().default(''),

  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  SMTP_FROM: z.string().optional(),

  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  GOOGLE_CALLBACK_URL: z.string().optional(),

  GITHUB_CLIENT_ID: z.string().optional(),
  GITHUB_CLIENT_SECRET: z.string().optional(),
  GITHUB_CALLBACK_URL: z.string().optional(),

  AUDIT_LOG_RETENTION_DAYS: z.coerce.number().default(90),

  // A1 fix: encryption key for TOTP secrets at rest (AES-256-GCM)
  ENCRYPTION_KEY: z.string().length(64).optional(),

  // SECURITY: Maximum login attempts before lockout
  MAX_LOGIN_ATTEMPTS: z.coerce.number().default(5),
  // SECURITY: Lockout duration in minutes
  LOCKOUT_DURATION_MINUTES: z.coerce.number().default(15),
  // SECURITY: Session timeout in hours
  SESSION_TIMEOUT_HOURS: z.coerce.number().default(168), // 7 days
  // SECURITY: Enable request body size limit
  REQUEST_BODY_LIMIT: z.string().default('100kb'),
  // V37 FIX: require email verification before allowing login
  REQUIRE_EMAIL_VERIFIED: z.enum(['true', 'false']).default('true'),
  // V50 FIX: session inactivity timeout in hours
  SESSION_INACTIVITY_HOURS: z.coerce.number().default(24),
});

export type EnvConfig = z.infer<typeof envSchema>;

export function validateEnv(config: Record<string, unknown>) {
  const parsed = envSchema.safeParse(config);
  if (!parsed.success) {
    const errors = parsed.error.flatten();
    console.error('❌ Invalid environment variables:');
    console.error(JSON.stringify(errors, null, 2));
    throw new Error('Invalid environment variables');
  }

  const data = parsed.data;

  // SECURITY: Critical validation - ENCRYPTION_KEY must be set in production
  if (data.NODE_ENV === 'production' && !data.ENCRYPTION_KEY) {
    console.error('❌ CRITICAL: ENCRYPTION_KEY is required in production!');
    console.error('   Generate with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"');
    throw new Error('ENCRYPTION_KEY is required in production for 2FA secret encryption');
  }

  // SECURITY: Warn about weak CORS configuration
  if (data.NODE_ENV === 'production' && data.CORS_ORIGINS === '') {
    console.warn('⚠️  WARNING: CORS_ORIGINS is empty in production. CORS will be disabled.');
  }

  return data;
}
