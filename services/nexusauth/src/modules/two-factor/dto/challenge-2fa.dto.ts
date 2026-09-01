import { z } from 'zod';

export const challenge2faSchema = z.object({
  challengeToken: z.string().min(1).max(2000), // M6 fix: add max length
  code: z.string().min(1).max(64), // M6 fix: add max length
});

export type Challenge2faDto = z.infer<typeof challenge2faSchema>;
