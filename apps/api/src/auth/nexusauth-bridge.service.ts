import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/* ------------------------------------------------------------------ */
/*  NexusAuth Bridge — thin HTTP client that delegates auth to the     */
/*  NexusAuth microservice.                                            */
/*                                                                     */
/*  Endpoints used:                                                    */
/*   POST /auth/register   POST /auth/login     POST /auth/refresh     */
/*   GET  /auth/me         POST /auth/logout                          */
/*   POST /auth/forgot-password  POST /auth/reset-password             */
/*   POST /auth/magic-link  POST /auth/verify-email                    */
/*                                                                     */
/*  When NexusAuth is down, the bridge falls back to the LOCAL auth    */
/*  service (email + password + JWT RS256 via Prisma).                 */
/* ------------------------------------------------------------------ */

interface NexusTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

interface NexusUser {
  id: string;
  email: string;
  nome: string;
  emailVerified: boolean;
  twoFactorEnabled: boolean;
  tenantId?: string;
}

@Injectable()
export class NexusAuthBridgeService {
  private readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly logger = new Logger(NexusAuthBridgeService.name);
  private healthy = false;
  private lastHealthCheck = 0;

  constructor(private readonly config: ConfigService) {
    this.baseUrl = this.config.get<string>('NEXUSAUTH_URL', '');
    this.apiKey = this.config.get<string>('NEXUSAUTH_API_KEY', '');
    if (!this.baseUrl) {
      this.logger.warn('NEXUSAUTH_URL not configured — NexusAuth bridge DISABLED, using local auth');
    }
  }

  isAvailable(): boolean {
    return !!this.baseUrl;
  }

  /* -- health check (lazy, cached 30s) -- */
  async ping(): Promise<boolean> {
    if (!this.baseUrl) return false;
    if (Date.now() - this.lastHealthCheck < 30_000) return this.healthy;
    try {
      const res = await fetch(`${this.baseUrl}/health`, { signal: AbortSignal.timeout(3000) });
      this.healthy = res.ok;
    } catch {
      this.healthy = false;
    }
    this.lastHealthCheck = Date.now();
    return this.healthy;
  }

  /* -- POST /auth/register -- */
  async register(dto: {
    email: string;
    password: string;
    nome: string;
    tenantId?: string;
  }): Promise<{ tokens: NexusTokens; user: NexusUser }> {
    await this.ensureAvailable();
    const res = await this.post('/auth/register', dto);
    return res as { tokens: NexusTokens; user: NexusUser };
  }

  /* -- POST /auth/login -- */
  async login(dto: { email: string; password: string }): Promise<{ tokens: NexusTokens; user: NexusUser }> {
    await this.ensureAvailable();
    const res = await this.post('/auth/login', dto);
    return res as { tokens: NexusTokens; user: NexusUser };
  }

  /* -- POST /auth/refresh -- */
  async refresh(refreshToken: string): Promise<{ tokens: NexusTokens }> {
    await this.ensureAvailable();
    const res = await this.post('/auth/refresh', { refreshToken });
    return res as { tokens: NexusTokens };
  }

  /* -- POST /auth/logout -- */
  async logout(accessToken: string, refreshToken?: string): Promise<void> {
    if (!this.baseUrl) return;
    try {
      await this.post('/auth/logout', { refreshToken }, accessToken);
    } catch { /* best effort */ }
  }

  /* -- GET /auth/me -- */
  async me(accessToken: string): Promise<NexusUser> {
    await this.ensureAvailable();
    const res = await this.get('/auth/me', accessToken);
    return res as NexusUser;
  }

  /* -- helpers -- */
  private async ensureAvailable(): Promise<void> {
    if (!this.baseUrl) throw new UnauthorizedException('Auth service unavailable (NEXUSAUTH_URL not set)');
  }

  private async post(path: string, body: unknown, token?: string): Promise<unknown> {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    if (this.apiKey) headers['X-Api-Key'] = this.apiKey;

    const res = await fetch(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: res.statusText }));
      const msg = (err as any).message ?? (err as any).error ?? 'NexusAuth error';
      this.logger.warn(`NexusAuth ${path} returned ${res.status}: ${msg}`);
      throw new UnauthorizedException(msg);
    }

    return res.json();
  }

  private async get(path: string, token: string): Promise<unknown> {
    const headers: Record<string, string> = { Authorization: `Bearer ${token}` };
    if (this.apiKey) headers['X-Api-Key'] = this.apiKey;

    const res = await fetch(`${this.baseUrl}${path}`, {
      headers,
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) {
      throw new UnauthorizedException('Invalid token');
    }
    return res.json();
  }
}
