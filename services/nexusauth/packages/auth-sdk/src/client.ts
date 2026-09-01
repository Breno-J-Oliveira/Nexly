import { AuthTokens, NexusUser, SessionInfo, UserProfile } from './types';

export interface NexusAuthClientOptions {
  baseUrl: string;
  timeout?: number;
}

export class NexusAuthClient {
  private baseUrl: string;
  private timeout: number;

  constructor(opts: NexusAuthClientOptions) {
    this.baseUrl = opts.baseUrl.replace(/\/$/, '');
    this.timeout = opts.timeout ?? 10000;
  }

  async login(email: string, password: string, userAgent?: string): Promise<AuthTokens> {
    const res = await this.request('POST', '/auth/login', {
      email,
      password,
    }, { 'User-Agent': userAgent || 'nexus-auth-sdk' });

    return {
      accessToken: res.accessToken,
      refreshToken: res.refreshToken,
      sessionId: res.sessionId,
    };
  }

  async register(email: string, password: string, name: string): Promise<{ id: string; email: string; name: string }> {
    return this.request('POST', '/auth/register', { email, password, name });
  }

  async refresh(refreshToken: string): Promise<AuthTokens> {
    const res = await this.request('POST', '/auth/refresh', { refreshToken });
    return {
      accessToken: res.accessToken,
      refreshToken: res.refreshToken,
      sessionId: res.sessionId,
    };
  }

  async logout(accessToken: string, refreshToken: string): Promise<void> {
    await this.request('POST', '/auth/logout', { refreshToken }, {
      Authorization: `Bearer ${accessToken}`,
    });
  }

  async me(accessToken: string): Promise<UserProfile> {
    return this.request('GET', '/auth/me', undefined, {
      Authorization: `Bearer ${accessToken}`,
    });
  }

  async getSessions(accessToken: string): Promise<SessionInfo[]> {
    return this.request('GET', '/sessions', undefined, {
      Authorization: `Bearer ${accessToken}`,
    });
  }

  async verifyEmail(token: string): Promise<void> {
    await this.request('POST', '/auth/verify-email', { token });
  }

  async requestMagicLink(email: string): Promise<void> {
    await this.request('POST', '/auth/magic-link', { email });
  }

  async verifyMagicLink(token: string): Promise<AuthTokens> {
    const res = await this.request('POST', '/auth/magic-link/verify', { token });
    return {
      accessToken: res.accessToken,
      refreshToken: res.refreshToken,
    };
  }

  private async request(
    method: string,
    path: string,
    body?: any,
    headers?: Record<string, string>,
  ): Promise<any> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeout);

    try {
      const res = await fetch(`${this.baseUrl}${path}`, {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...headers,
        },
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (!res.ok) {
        const error = await res.json().catch(() => ({ message: 'Request failed' }));
        const err = new Error(error.message || `HTTP ${res.status}`) as any;
        err.status = res.status;
        err.code = error.code;
        err.response = error;
        throw err;
      }

      const text = await res.text();
      return text ? JSON.parse(text) : undefined;
    } catch (err: any) {
      clearTimeout(timeout);
      throw err;
    }
  }
}
