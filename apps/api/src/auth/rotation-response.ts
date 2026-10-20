import { createCipheriv, createDecipheriv, hkdfSync, randomBytes } from 'node:crypto';
import { getJwtKeys } from '../config/jwt-keys';

/** Cache de resposta cifrado, vinculado à sessão e consultado só na janela de rotação. */
export class RotationResponse {
  private key() {
    return Buffer.from(
      hkdfSync('sha256', getJwtKeys().privateKey, 'nexly-auth', 'refresh-response-v1', 32),
    );
  }

  private context(sessionId: string, parentId: string, rotatedAt: Date) {
    return Buffer.from(JSON.stringify([sessionId, parentId, rotatedAt.toISOString()]));
  }

  seal(token: string, sessionId: string, parentId: string, rotatedAt: Date): string {
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', this.key(), iv);
    cipher.setAAD(this.context(sessionId, parentId, rotatedAt));
    const encrypted = Buffer.concat([cipher.update(token, 'utf8'), cipher.final()]);
    return [
      'v1',
      iv.toString('base64url'),
      cipher.getAuthTag().toString('base64url'),
      encrypted.toString('base64url'),
    ].join('.');
  }

  open(value: string, sessionId: string, parentId: string, rotatedAt: Date): string {
    if (value.length > 512 || !/^v1\.[\w-]+\.[\w-]+\.[\w-]+$/.test(value))
      throw new Error('Invalid rotation response');
    const [, encodedIv, encodedTag, encrypted] = value.split('.');
    const iv = Buffer.from(encodedIv!, 'base64url');
    const tag = Buffer.from(encodedTag!, 'base64url');
    if (iv.length !== 12 || tag.length !== 16) throw new Error('Invalid rotation response');
    const decipher = createDecipheriv('aes-256-gcm', this.key(), iv);
    decipher.setAAD(this.context(sessionId, parentId, rotatedAt));
    decipher.setAuthTag(tag);
    return Buffer.concat([
      decipher.update(Buffer.from(encrypted!, 'base64url')),
      decipher.final(),
    ]).toString('utf8');
  }
}
