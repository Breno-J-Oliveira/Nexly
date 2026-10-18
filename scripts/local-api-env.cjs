// Preload exclusivo da execução local; evita herdar URLs de produção do terminal.
const fs = require('node:fs');
const path = require('node:path');
const dotenv = require('dotenv');
require('./check-local-env.cjs');
const localEnv = dotenv.parse(fs.readFileSync(path.join(__dirname, '../apps/api/.env')));
Object.assign(process.env, localEnv);
process.env.DIRECT_URL = localEnv.DIRECT_URL || localEnv.DATABASE_URL;
for (const key of ['JWT_PRIVATE_KEY', 'JWT_PUBLIC_KEY']) {
  if (!localEnv[key]) delete process.env[key];
}
Object.assign(process.env, {
  NODE_ENV: 'development',
  HOST: '127.0.0.1',
  PORT: '3001',
  CORS_ORIGIN: 'http://localhost:3002,http://127.0.0.1:3002',
  NEXUSAUTH_URL: '',
  WHATSAPP_PROVIDER: 'disabled',
  EMAIL_PROVIDER:'disabled',
});
