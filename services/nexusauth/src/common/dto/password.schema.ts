import { z } from 'zod';

// SECURITY: Common weak passwords list (160+ words, multilingual).
// M45 + M47 FIX: Expanded from 45 English-only words to 160+ entries
// covering English, Portuguese, Spanish, numeric patterns, seasons,
// sports teams, and common names. Complement with HaveIBeenPwned API.
const COMMON_PASSWORDS = [
  // Top English + universal
  'password', '123456', '12345678', 'qwerty', 'abc123', 'monkey', '1234567',
  'letmein', 'trustno1', 'dragon', 'baseball', 'iloveyou', 'master', 'sunshine',
  'ashley', 'bailey', 'shadow', '123123', '654321', 'superman', 'qazwsx',
  'michael', 'football', 'password1', 'password123', 'welcome', 'jesus',
  'ninja', 'mustang', 'password2', 'jordan', 'harley', 'thomas', 'charlie',
  'andrew', 'summer', 'love', 'soccer', 'hockey', 'killer', 'george',
  'computer', 'secret', 'admin', '1234', '12345', '123456789', '1234567890',
  'access', 'batman', 'donald', 'flower', 'freedom', 'hello',
  'hunter', 'joshua', 'justin', 'lovely', 'maggie', 'matthew', 'pepper',
  'princess', 'rainbow', 'robert', 'starwars', 'tigger', 'william',
  'zaq1zaq1', 'qwerty123', '1q2w3e4r', 'passw0rd', 'p@ssword',
  // Portuguese (common in Brazil)
  'brasil', 'senha', '123mudar', 'mudar123', 'senha123', 'senha1234',
  'flamengo', 'palmeiras', 'corinthians', 'santos', 'gremio', 'vasco',
  'cruzeiro', 'atletico', 'botafogo', 'fluminense', 'internacional',
  'felicidade', 'saudade', 'amor', 'gabriel', 'lucas', 'mateus',
  'pedro', 'joao', 'maria', 'ana', 'beatriz', 'julia', 'rafaela',
  'fernanda', 'laura', 'deus', 'minecraft', 'roblox', 'youtube',
  'facebook', 'instagram', 'whatsapp', 'celular', 'computador',
  'windows', 'linux', 'android', 'iphone', '007', '777',
  // Spanish (common in LATAM)
  'contraseña', 'españa', 'futbol', 'barcelona', 'madrid',
  'teamo', 'amigo', 'carlos', 'alejandro', 'andres', 'camilo',
  'diego', 'fernando', 'jose', 'luis', 'manuel', 'miguel', 'pablo',
  'primavera', 'verano', 'otoño', 'invierno',
  // Numeric patterns (keyboard walks)
  '111111', '222222', '333333', '444444', '555555', '666666',
  '777777', '888888', '999999', '000000', '112233', '121212',
  '123321', '147258', '159357', '987654', '876543', '765432',
  // Keyboard walks
  'qwertyuiop', 'asdfghjkl', 'zxcvbnm', '1qaz2wsx', 'qazwsxedc',
  'poiuytrewq', 'mnbvcxz', 'lkjhgfdsa',
  // Seasons + misc
  'spring', 'autumn', 'winter', 'christmas', 'easter',
];

// NM3 FIX: Shared password validation schema.
// Previously, register.dto.ts, reset-password.dto.ts, and change-password.dto.ts
// each had their own (different) password schemas. The reset/change schemas were
// WEAKER — missing common password checks, sequential character detection, and
// keyboard pattern blocking. This shared schema ensures ALL password changes go
// through the same rigorous validation.
export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(128, 'Password must not exceed 128 characters')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number')
  .regex(/[^a-zA-Z0-9]/, 'Password must contain at least one symbol')
  // SECURITY: Block common weak passwords
  .refine(
    (val) => !COMMON_PASSWORDS.includes(val.toLowerCase()),
    'Password is too common. Please choose a stronger password.',
  )
  // SECURITY: Block sequential characters
  .refine(
    (val) => !/(.)\1{3,}/.test(val),
    'Password must not contain more than 3 consecutive identical characters',
  )
  // SECURITY: Block keyboard patterns
  .refine(
    (val) => !/qwerty|asdf|zxcv|1234|abcd/i.test(val),
    'Password must not contain common keyboard patterns',
  );