import * as crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16; // GCM auth tag is 16 bytes

function getKey(): Buffer {
  const keyHex = process.env.ENCRYPTION_KEY;
  if (!keyHex || keyHex.length !== 64) {
    throw new Error('ENCRYPTION_KEY must be a 32-byte hex string (64 chars)');
  }
  // CRITICAL FIX: Validate hex format
  if (!/^[0-9a-fA-F]{64}$/.test(keyHex)) {
    throw new Error('ENCRYPTION_KEY must be a valid 64-character hex string');
  }
  return Buffer.from(keyHex, 'hex');
}

export function encrypt(plaintext: string): string {
  // CRITICAL FIX: Validate input
  if (!plaintext || typeof plaintext !== 'string') {
    throw new Error('Plaintext must be a non-empty string');
  }
  
  // CRITICAL FIX: Limit plaintext size to prevent memory attacks
  if (plaintext.length > 10000) {
    throw new Error('Plaintext exceeds maximum allowed length');
  }

  const key = getKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted.toString('hex')}`;
}

export function decrypt(ciphertext: string): string {
  // CRITICAL FIX: Validate input
  if (!ciphertext || typeof ciphertext !== 'string') {
    throw new Error('Ciphertext must be a non-empty string');
  }
  
  // CRITICAL FIX: Limit ciphertext size to prevent memory attacks
  if (ciphertext.length > 50000) {
    throw new Error('Ciphertext exceeds maximum allowed length');
  }

  const key = getKey();
  const parts = ciphertext.split(':');
  
  // CRITICAL FIX: Validate format - must have exactly 3 parts
  if (parts.length !== 3) {
    throw new Error('Invalid ciphertext format: expected 3 parts');
  }
  
  const [ivHex, authTagHex, encryptedHex] = parts;
  
  // CRITICAL FIX: Validate each component
  if (!ivHex || !authTagHex || !encryptedHex) {
    throw new Error('Invalid ciphertext format: empty component');
  }
  
  // CRITICAL FIX: Validate hex format and lengths
  if (!/^[0-9a-fA-F]+$/.test(ivHex) || ivHex.length !== IV_LENGTH * 2) {
    throw new Error('Invalid IV format');
  }
  if (!/^[0-9a-fA-F]+$/.test(authTagHex) || authTagHex.length !== AUTH_TAG_LENGTH * 2) {
    throw new Error('Invalid auth tag format');
  }
  if (!/^[0-9a-fA-F]+$/.test(encryptedHex) || encryptedHex.length === 0) {
    throw new Error('Invalid encrypted data format');
  }
  
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');
  const encrypted = Buffer.from(encryptedHex, 'hex');
  
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  
  try {
    const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
    return decrypted.toString('utf8');
  } catch (err) {
    // CRITICAL FIX: Don't leak error details (could indicate tampering)
    throw new Error('Decryption failed: invalid ciphertext or tampered data');
  }
}

export function hashToken(token: string): string {
  // CRITICAL FIX: Validate input
  if (!token || typeof token !== 'string') {
    throw new Error('Token must be a non-empty string');
  }
  
  // CRITICAL FIX: Limit token size
  if (token.length > 10000) {
    throw new Error('Token exceeds maximum allowed length');
  }
  
  return crypto.createHash('sha256').update(token).digest('hex');
}

// CRITICAL FIX: Add constant-time comparison to prevent timing attacks
export function timingSafeEqual(a: string, b: string): boolean {
  if (typeof a !== 'string' || typeof b !== 'string') {
    return false;
  }
  
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  
  if (bufA.length !== bufB.length) {
    // Still do a comparison to prevent length-based timing attacks
    crypto.timingSafeEqual(bufA, Buffer.alloc(bufA.length));
    return false;
  }
  
  return crypto.timingSafeEqual(bufA, bufB);
}
