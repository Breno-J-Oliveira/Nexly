import { z } from 'zod';

export const verify2faSchema = z.object({
  code: z.string().min(6).max(6),
});

export type Verify2faDto = z.infer<typeof verify2faSchema>;
