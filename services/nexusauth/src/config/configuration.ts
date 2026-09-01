export const configuration = () => ({
  NODE_ENV: process.env.NODE_ENV ?? 'development',
  PORT: parseInt(process.env.PORT ?? '3000', 10),

  DATABASE_URL: process.env.DATABASE_URL,
  REDIS_URL: process.env.REDIS_URL,

  JWT: {
    PRIVATE_KEY_PATH: process.env.JWT_PRIVATE_KEY_PATH ?? './keys/private.pem',
    PUBLIC_KEY_PATH: process.env.JWT_PUBLIC_KEY_PATH ?? './keys/public.pem',
    ACCESS_EXPIRES_IN: process.env.JWT_ACCESS_EXPIRES_IN ?? '15m',
    REFRESH_EXPIRES_IN: process.env.JWT_REFRESH_EXPIRES_IN ?? '7d',
    ISSUER: process.env.JWT_ISSUER ?? 'nexusauth',
  },

  CORS_ORIGINS: process.env.CORS_ORIGINS ?? '',

  SMTP: {
    HOST: process.env.SMTP_HOST,
    PORT: parseInt(process.env.SMTP_PORT ?? '587', 10),
    USER: process.env.SMTP_USER,
    PASS: process.env.SMTP_PASS,
    FROM: process.env.SMTP_FROM,
  },

  OAUTH2: {
    GOOGLE: {
      CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
      CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
      CALLBACK_URL: process.env.GOOGLE_CALLBACK_URL,
    },
    GITHUB: {
      CLIENT_ID: process.env.GITHUB_CLIENT_ID,
      CLIENT_SECRET: process.env.GITHUB_CLIENT_SECRET,
      CALLBACK_URL: process.env.GITHUB_CALLBACK_URL,
    },
  },

  AUDIT_LOG_RETENTION_DAYS: parseInt(
    process.env.AUDIT_LOG_RETENTION_DAYS ?? '90',
    10,
  ),

  ENCRYPTION_KEY: process.env.ENCRYPTION_KEY,

  // V37 FIX: require email verification before allowing login
  REQUIRE_EMAIL_VERIFIED: process.env.REQUIRE_EMAIL_VERIFIED ?? 'true',
  // V50 FIX: session inactivity timeout
  SESSION_INACTIVITY_HOURS: parseInt(
    process.env.SESSION_INACTIVITY_HOURS ?? '24',
    10,
  ),
});
