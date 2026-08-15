import { generateKeyPairSync } from 'crypto';
import { env } from './env';

export interface JwtKeys {
  privateKey: string;
  publicKey: string;
}

function decodeKey(value: string | undefined): string | undefined {
  if (!value) return undefined;
  const trimmed = value.trim();
  // Se já está em formato PEM, retorna direto
  if (trimmed.includes('PRIVATE KEY') || trimmed.includes('PUBLIC KEY')) {
    return trimmed;
  }
  // Tenta decodificar base64
  try {
    const decoded = Buffer.from(trimmed, 'base64').toString('utf8');
    if (decoded.includes('PRIVATE KEY') || decoded.includes('PUBLIC KEY')) {
      return decoded;
    }
  } catch {
    /* ignora */
  }
  return trimmed;
}

let cached: JwtKeys | null = null;

export function getJwtKeys(): JwtKeys {
  if (cached) return cached;

  const privateKey = decodeKey(env.JWT_PRIVATE_KEY);
  const publicKey = decodeKey(env.JWT_PUBLIC_KEY);

  if (privateKey && publicKey) {
    cached = { privateKey, publicKey };
    return cached;
  }

  // Fallback de desenvolvimento: gera par de chaves descartável.
  // Em produção, as chaves DEVEM vir de variáveis de ambiente.
  const { privateKey: priv, publicKey: pub } = generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  });

  cached = { privateKey: priv, publicKey: pub };
  return cached;
}
