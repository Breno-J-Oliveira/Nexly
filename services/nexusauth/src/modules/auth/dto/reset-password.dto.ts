import { z } from 'zod';
import { passwordSchema } from '../../../common/dto/password.schema';

// NM3 FIX: Now using the shared passwordSchema (same as register.dto.ts).
// Previously this schema was weaker — missing common password checks,
// sequential character detection, and keyboard pattern blocking.
export const resetPasswordSchema = z.object({
  token: z.string().uuid(),
  newPassword: passwordSchema,
});

export type ResetPasswordDto = z.infer<typeof resetPasswordSchema>;