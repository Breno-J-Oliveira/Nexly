import { Role } from './enums';

export const RECOVERY_CODE_BYTES = 10;
export const RECOVERY_CODE_LENGTH = RECOVERY_CODE_BYTES * 2;
export const AUTHENTICATOR_CODE_PATTERN = /^\d{6}$/;
// Códigos legados continuam válidos até serem consumidos ou o 2FA ser reconfigurado.
export const RECOVERY_CODE_PATTERN = /^(?:[a-f0-9]{8}|[a-f0-9]{20})$/;
export const TWO_FACTOR_CODE_PATTERN = /^(?:\d{6}|[a-f0-9]{8}|[a-f0-9]{20})$/;

export interface JwtPayload {
  sub: string;
  /** Identificador da sessão persistida; não contém o refresh token. */
  sid: string;
  empresaId: string;
  role: Role;
  email: string;
  nome: string;
  iat?: number;
  exp?: number;
}

export interface AuthUser {
  sessionId?: string;
  id: string;
  empresaId: string;
  role: Role;
  email: string;
  nome: string;
}
