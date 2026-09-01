import { z } from 'zod';

export const magicLinkSchema = z.object({
  email: z.string().email().transform((val: string) => val.toLowerCase()), // Fix: normalize to lowercase
});

export type MagicLinkDto = z.infer<typeof magicLinkSchema>;
