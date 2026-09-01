import { z } from 'zod';

export const refreshSchema = z.object({
  refreshToken: z.string().uuid(),
});

export type RefreshDto = z.infer<typeof refreshSchema>;
