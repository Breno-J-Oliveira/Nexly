export interface NexusUser {
  sub: string;
  email: string;
  name?: string;
  role: string;
  tenantId?: string;
  permissions?: string[];
  type?: 'access' | 'impersonation';
  impersonatedBy?: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  sessionId?: string;
}

export interface SessionInfo {
  sessionId: string;
  createdAt: string;
  device?: string;
  ipAddress?: string;
  active: boolean;
}

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  role: string;
}

export interface JwkKey {
  kty: string;
  kid: string;
  use: string;
  alg: string;
  n: string;
  e: string;
}

export interface JwksResponse {
  keys: JwkKey[];
}
