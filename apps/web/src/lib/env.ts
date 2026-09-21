import { z } from 'zod';

const envSchema = z.object({
  NEXT_PUBLIC_API_URL: z.string().url().default('http://localhost:3001'),
});

const parsed = envSchema.parse({
  NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
});

// Remove trailing slash para não gerar URLs como "http://localhost:3001//api".
export const env = {
  ...parsed,
  NEXT_PUBLIC_API_URL: parsed.NEXT_PUBLIC_API_URL.replace(/\/+$/, ''),
};
