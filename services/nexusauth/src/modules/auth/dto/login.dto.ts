import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email().max(254).transform((val) => val.toLowerCase()), // Fix: normalize to lowercase
  password: z.string().min(8).max(128),
});

export type LoginDto = z.infer<typeof loginSchema>;
