import { Role } from './enums';

export interface JwtPayload {
  sub: string;
  empresaId: string;
  role: Role;
  email: string;
  nome: string;
  iat?: number;
  exp?: number;
}

export interface AuthUser {
  id: string;
  empresaId: string;
  role: Role;
  email: string;
  nome: string;
}
