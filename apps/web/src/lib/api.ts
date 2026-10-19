import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { env } from './env';
import type { UsuarioPublico } from '@nexly/shared';

// Access token em memória (não em localStorage, para evitar XSS).
let accessToken: string | null = null;

export function setAccessToken(token: string | null): void {
  accessToken = token;
}

export function getAccessToken(): string | null {
  return accessToken;
}

export const api = axios.create({
  baseURL: `${env.NEXT_PUBLIC_API_URL}/api`,
  withCredentials: true,
});

api.interceptors.request.use((config) => {
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

interface RefreshResult {
  accessToken: string | null;
  usuario: UsuarioPublico | null;
}
let refreshing: Promise<RefreshResult | null> | null = null;

export class SessionRefreshError extends Error {
  constructor(public readonly retryAfterSeconds = 0) {
    super(
      retryAfterSeconds > 0
        ? 'Muitas solicitações. Aguarde um momento para recuperar seu acesso.'
        : 'Não foi possível conectar ao Nexly. Sua sessão será recuperada ao tentar novamente.',
    );
    this.name = 'SessionRefreshError';
  }
}

/** Aguarda somente uma recuperação já iniciada, antes de substituir a sessão no login. */
export async function waitForSessionRefresh(): Promise<void> {
  await refreshing?.catch(() => undefined);
}

/** O bootstrap e os retries compartilham uma única rotação, inclusive em StrictMode. */
export function refreshSession(): Promise<RefreshResult | null> {
  if (!refreshing) {
    refreshing = requestRefresh().finally(() => {
      refreshing = null;
    });
  }
  return refreshing;
}

async function requestRefresh(): Promise<RefreshResult | null> {
  try {
    const { data } = await axios.post<RefreshResult>(
      `${env.NEXT_PUBLIC_API_URL}/api/auth/refresh`,
      {},
      { withCredentials: true, timeout: 10_000 },
    );
    // A API responde 200 com ambos nulos quando não existe cookie de sessão.
    if (data.accessToken === null && data.usuario === null) {
      setAccessToken(null);
      return null;
    }
    if (data.accessToken) {
      setAccessToken(data.accessToken);
      return data;
    }
    throw new SessionRefreshError();
  } catch (error) {
    if (axios.isAxiosError(error)) {
      if (error.response?.status === 401) return null;
      if (error.response?.status === 429) {
        const seconds = Number(error.response.headers['retry-after']);
        throw new SessionRefreshError(
          Number.isFinite(seconds) && seconds > 0 ? Math.min(Math.ceil(seconds), 900) : 60,
        );
      }
    }
    throw error instanceof SessionRefreshError ? error : new SessionRefreshError();
  }
}

type RetriableConfig = InternalAxiosRequestConfig & { _retry?: boolean };

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const original = error.config as RetriableConfig | undefined;

    if (
      error.response?.status === 401 &&
      original &&
      !original._retry &&
      !original.url?.includes('/auth/')
    ) {
      original._retry = true;

      const session = await refreshSession();
      const newToken = session?.accessToken;

      if (newToken) {
        original.headers.Authorization = `Bearer ${newToken}`;
        return api(original);
      }

      if (typeof window !== 'undefined') {
        setAccessToken(null);
        window.location.href = '/login';
      }
    }

    return Promise.reject(error);
  },
);
