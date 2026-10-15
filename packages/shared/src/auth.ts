import { Role } from './enums';

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
