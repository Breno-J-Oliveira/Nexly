process.env.NODE_ENV = 'test';
process.env.JWT_PRIVATE_KEY_PATH = process.env.JWT_PRIVATE_KEY_PATH || 'keys/private.pem';
process.env.JWT_PUBLIC_KEY_PATH = process.env.JWT_PUBLIC_KEY_PATH || 'keys/public.pem';

// NC1+NA7 FIX: Never hardcode credentials, even as fallbacks for tests.
// If DATABASE_URL/REDIS_URL are not set, fail fast with a clear error.
// In CI/CD pipelines, these MUST be injected via environment variables.
if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL must be set in test environment');
}
if (!process.env.REDIS_URL) {
  throw new Error('REDIS_URL must be set in test environment');
}
