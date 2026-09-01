import { z } from 'zod';

export const disable2faSchema = z.object({
  password: z.string().min(1).max(128), // M6 fix: add max length
  code: z.string().min(1).max(64), // M6 fix: add max length
});

export type Disable2faDto = z.infer<typeof disable2faSchema>;
