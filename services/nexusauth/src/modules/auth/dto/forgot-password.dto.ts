import { z } from 'zod';

export const forgotPasswordSchema = z.object({
  email: z.string().email().transform((val: string) => val.toLowerCase()), // Fix: normalize to lowercase
});

export type ForgotPasswordDto = z.infer<typeof forgotPasswordSchema>;
