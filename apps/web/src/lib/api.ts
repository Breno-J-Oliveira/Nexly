import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { env } from './env';

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

let refreshing: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  try {
    const { data } = await axios.post<{ accessToken: string | null }>(
      `${env.NEXT_PUBLIC_API_URL}/api/auth/refresh`,
      {},
      { withCredentials: true },
    );
    if (data.accessToken) {
      setAccessToken(data.accessToken);
      return data.accessToken;
    }
    return null;
  } catch {
    return null;
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

      if (!refreshing) {
        refreshing = refreshAccessToken();
      }
      const newToken = await refreshing;
      refreshing = null;

      if (newToken) {
        original.headers.Authorization = `Bearer ${newToken}`;
        return api(original);
      }

      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      }
    }

    return Promise.reject(error);
  },
);
