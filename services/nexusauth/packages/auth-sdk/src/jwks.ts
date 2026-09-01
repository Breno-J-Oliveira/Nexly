import * as jwt from 'jsonwebtoken';
import * as crypto from 'crypto';
import { JwkKey, JwksResponse, NexusUser } from './types';

interface CachedKey {
  key: JwkKey;
  pem: string;
  fetchedAt: number;
}

const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

/**
 * C30 FIX: JWKS client with HTTPS enforcement.
 *
 * In production (NODE_ENV=production or when running on an HTTPS origin),
 * JWKS URIs MUST use HTTPS. This prevents MITM attacks that could
 * substitute the public key and forge JWT tokens.
 *
 * Development (localhost / 127.0.0.1 / ::1) is exempt.
 */
function enforceHttps(uri: string): void {
  if (typeof window === 'undefined') return; // server-side — caller's responsibility

  const isLocalhost =
    window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1' ||
    window.location.hostname === '::1';

  if (isLocalhost) return;

  const url = new URL(uri);
  if (url.protocol !== 'https:') {
    throw new Error(
      `[NexusAuth SDK] JWKS URI must use HTTPS in production. Got: ${uri}. ` +
      'HTTP JWKS endpoints allow MITM attackers to replace the public key and forge JWT tokens.',
    );
  }
}

export class JwksClient {
  private cache: Map<string, CachedKey> = new Map();
  private lastFetch = 0;
  private jwksUri: string;

  constructor(jwksUri: string) {
    // C30 FIX: Reject HTTP JWKS URIs in production
    enforceHttps(jwksUri);
    this.jwksUri = jwksUri;
  }

  async getSigningKey(kid: string): Promise<string> {
    await this.ensureFreshCache();

    const cached = this.cache.get(kid);
    if (cached) {
      return cached.pem;
    }

    throw new Error(`JWKS: key not found for kid=${kid}`);
  }

  async verifyToken(token: string): Promise<NexusUser> {
    const decoded = jwt.decode(token, { complete: true }) as any;
    if (!decoded || !decoded.header.kid) {
      throw new Error('JWT missing kid header');
    }

    const pem = await this.getSigningKey(decoded.header.kid);

    return new Promise((resolve, reject) => {
      jwt.verify(token, pem, { algorithms: ['RS256'] }, (err, payload: any) => {
        if (err) {
          reject(err);
          return;
        }
        // V2 fix: reject tokens that are not access or impersonation type
        if (payload.type !== 'access' && payload.type !== 'impersonation') {
          reject(new Error('Invalid token type'));
          return;
        }
        resolve({
          sub: payload.sub,
          email: payload.email,
          name: payload.name,
          role: payload.role,
          tenantId: payload.tenantId,
          permissions: payload.permissions,
          type: payload.type,
          impersonatedBy: payload.impersonatedBy,
        });
      });
    });
  }

  private async ensureFreshCache(): Promise<void> {
    const now = Date.now();
    if (this.cache.size > 0 && now - this.lastFetch < CACHE_TTL_MS) {
      return;
    }

    const res = await fetch(this.jwksUri);
    if (!res.ok) {
      throw new Error(`JWKS fetch failed: HTTP ${res.status}`);
    }

    const jwks: JwksResponse = await res.json();
    this.cache.clear();

    for (const key of jwks.keys) {
      const pem = this.jwkToPem(key);
      this.cache.set(key.kid, { key, pem, fetchedAt: now });
    }

    this.lastFetch = now;
  }

  private jwkToPem(key: JwkKey): string {
    const pubKeyObject = crypto.createPublicKey({ key, format: 'jwk' });
    return pubKeyObject.export({ type: 'spki', format: 'pem' }) as string;
  }
}