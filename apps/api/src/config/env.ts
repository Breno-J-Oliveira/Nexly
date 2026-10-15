import { config as dotenvConfig } from 'dotenv';
import { z } from 'zod';

// Garante que as variáveis de ambiente estejam carregadas antes da validação.
// Necessário porque o `env` é importado em muitos lugares (incluindo testes).
if (process.env.NODE_ENV !== 'test') dotenvConfig({ quiet: true });

const envSchema = z.object({
  NODE_ENV: z.preprocess(
    (val) => (val === '' || val === undefined || val === null ? 'production' : val),
    z.enum(['development', 'production', 'test']),
  ),
  PORT: z.coerce.number().default(3001),
  HOST: z.string().default('0.0.0.0'),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL é obrigatória'),
  REDIS_URL: z.string().min(1, 'REDIS_URL é obrigatória'),
  JWT_PRIVATE_KEY: z.string().optional(),
  JWT_PUBLIC_KEY: z.string().optional(),
  JWT_ACCESS_TTL: z
    .string()
    .regex(/^[1-9]\d*(s|m|h|d)$/)
    .default('15m')
    .transform((value) => {
      const unit = { s: 1, m: 60, h: 3600, d: 86400 }[value.slice(-1)] ?? 60;
      return parseInt(value, 10) * unit;
    }),
  JWT_REFRESH_TTL: z.string().default('7d'),
  CORS_ORIGIN: z.string().default('http://localhost:3000'),
  COOKIE_DOMAIN: z.string().optional(),
});

export type Env = z.infer<typeof envSchema>;

export const env: Env = envSchema.parse(process.env);
