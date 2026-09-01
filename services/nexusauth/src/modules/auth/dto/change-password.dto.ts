import { z } from 'zod';
import { passwordSchema } from '../../../common/dto/password.schema';

// NM3 FIX: Now using the shared passwordSchema (same as register.dto.ts).
// Previously this schema was weaker — missing common password checks,
// sequential character detection, and keyboard pattern blocking.
export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1).max(128),
  newPassword: passwordSchema,
});

export type ChangePasswordDto = z.infer<typeof changePasswordSchema>;