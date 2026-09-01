import { z } from 'zod';
import { passwordSchema } from '../../../common/dto/password.schema';

// SECURITY: Email validation with additional checks
const emailSchema = z
  .string()
  .email('Invalid email format')
  .max(254, 'Email must not exceed 254 characters')
  .transform((val: string) => val.toLowerCase().trim())
  // SECURITY: Block disposable email domains (common ones)
  .refine(
    (val) => {
      const disposableDomains = [
        'tempmail.com', 'throwaway.email', 'guerrillamail.com', 'mailinator.com',
        'yopmail.com', '10minutemail.com', 'trashmail.com', 'fakeinbox.com',
      ];
      const domain = val.split('@')[1];
      return !disposableDomains.includes(domain);
    },
    'Disposable email addresses are not allowed',
  );

// SECURITY: Name validation with sanitization
const nameSchema = z
  .string()
  .min(1, 'Name is required')
  .max(100, 'Name must not exceed 100 characters')
  .transform((val: string) => val.trim())
  // SECURITY: Remove potentially dangerous characters
  .refine(
    (val) => !/[<>{}]/.test(val),
    'Name contains invalid characters',
  );

// C35 FIX: CAPTCHA token is optional in dev, required in production.
// The controller validates it against Cloudflare Turnstile.
const captchaTokenSchema = z.string().min(10, 'Invalid CAPTCHA token').max(2048).optional();

export const registerSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  name: nameSchema,
  captchaToken: captchaTokenSchema,
});

export type RegisterDto = z.infer<typeof registerSchema>;
