import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as jwt from 'jsonwebtoken';
import * as fs from 'fs';
import * as crypto from 'crypto';

@Injectable()
export class JwtService {
  private privateKey: string;
  private publicKey: string;
  private accessExpiresIn: string;
  private issuer: string;
  private readonly logger = new Logger(JwtService.name);

  constructor(private configService: ConfigService) {
    const privateKeyPath = this.configService.get<string>(
      'JWT_PRIVATE_KEY_PATH',
      './keys/private.pem',
    );
    const publicKeyPath = this.configService.get<string>(
      'JWT_PUBLIC_KEY_PATH',
      './keys/public.pem',
    );
    this.accessExpiresIn = this.configService.get<string>(
      'JWT_ACCESS_EXPIRES_IN',
      '15m',
    );
    this.issuer = this.configService.get<string>('JWT_ISSUER', 'nexusauth');

    // V48 FIX: load keys with graceful failure
    try {
      this.privateKey = fs.readFileSync(privateKeyPath, 'utf8');
      this.publicKey = fs.readFileSync(publicKeyPath, 'utf8');

      if (!this.privateKey.includes('BEGIN') || !this.publicKey.includes('BEGIN')) {
        throw new Error(`Invalid PEM key file at ${privateKeyPath} or ${publicKeyPath}`);
      }
    } catch (err: any) {
      this.logger.error(`Failed to load JWT keys: ${err.message}`);
      this.logger.error('In production, RS256 keys MUST be mounted via secret/volume.');
      if (process.env.NODE_ENV === 'production') {
        throw new Error(
          `JWT keys missing or invalid. Mount persistent keys at ${privateKeyPath} and ${publicKeyPath}. ` +
          `Do NOT use ephemeral key generation in production.`,
        );
      }
      // In dev/test, generate ephemeral keys to keep startup alive
      this.logger.warn('Generating ephemeral RSA key pair for development. This must NEVER happen in production.');
      const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', {
        modulusLength: 2048,
        publicKeyEncoding: { type: 'spki', format: 'pem' },
        privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
      });
      this.privateKey = privateKey;
      this.publicKey = publicKey;
    }
  }

  signAccessToken(payload: {
    sub: string;
    email: string;
    role: string;
    tenantId?: string;
    permissions?: string[];
    sessionId?: string;
  }): string {
    const jti = crypto.randomUUID();
    const iat = Math.floor(Date.now() / 1000);

    return jwt.sign(
      { ...payload, jti, type: 'access', iat },
      this.privateKey,
      {
        algorithm: 'RS256',
        expiresIn: this.accessExpiresIn as any,
        issuer: this.issuer,
        // C15 FIX: Dynamic key ID. In production, use a configuration value
        // or derive from the key fingerprint (SHA-256 of public key).
        // Key rotation: set JWT_KID env var when rotating keys.
        keyid: this.configService.get<string>('JWT_KID', 'nexusauth-1'),
        notBefore: 0,
      },
    );
  }

  signImpersonationToken(payload: {
    sub: string;
    email: string;
    role: string;
    tenantId?: string;
    permissions?: string[];
    impersonatedBy: string;
  }): string {
    const jti = crypto.randomUUID();
    const iat = Math.floor(Date.now() / 1000);

    return jwt.sign(
      { ...payload, jti, type: 'impersonation', iat },
      this.privateKey,
      {
        algorithm: 'RS256',
        expiresIn: this.accessExpiresIn as any,
        issuer: this.issuer,
        keyid: 'nexusauth-1',
        notBefore: 0,
      },
    );
  }

  signChallengeToken(payload: {
    sub: string;
    email: string;
    role: string;
  }): string {
    const jti = crypto.randomUUID();
    const iat = Math.floor(Date.now() / 1000);

    return jwt.sign(
      { ...payload, jti, type: '2fa-challenge', iat },
      this.privateKey,
      {
        algorithm: 'RS256',
        expiresIn: '5m',
        issuer: this.issuer,
        keyid: 'nexusauth-1',
        notBefore: 0,
      },
    );
  }

  verify(token: string): {
    sub: string;
    email: string;
    role: string;
    jti: string;
    type: string;
    tenantId?: string;
    permissions?: string[];
    impersonatedBy?: string;
    sessionId?: string;
    exp: number;
    iat: number;
    iss: string;
  } {
    if (!token || typeof token !== 'string') {
      throw new jwt.JsonWebTokenError('Token must be a non-empty string');
    }
    if (token.includes('\n') || token.includes('\r') || token.includes('\0')) {
      throw new jwt.JsonWebTokenError('Invalid token format');
    }

    const decoded = jwt.verify(token, this.publicKey, {
      algorithms: ['RS256'],
      issuer: this.issuer,
      ignoreExpiration: false,
    }) as any;

    if (!decoded.sub || !decoded.jti || !decoded.type) {
      throw new jwt.JsonWebTokenError('Missing required token claims');
    }

    return decoded;
  }

  verifyChallenge(token: string): {
    sub: string;
    email: string;
    role: string;
    jti: string;
    type: string;
    exp: number;
    iat: number;
    iss: string;
  } {
    const payload = this.verify(token);
    if (payload.type !== '2fa-challenge') {
      throw new jwt.JsonWebTokenError('Invalid token type');
    }
    return payload;
  }

  getJwks() {
    const pubKeyObject = crypto.createPublicKey(this.publicKey);
    const jwk = pubKeyObject.export({ format: 'jwk' });
    return {
      keys: [
        {
          ...jwk,
          // C15 FIX: Use same dynamic kid as signAccessToken for key rotation support.
          kid: this.configService.get<string>('JWT_KID', 'nexusauth-1'),
          use: 'sig',
          alg: 'RS256',
        },
      ],
    };
  }
}
