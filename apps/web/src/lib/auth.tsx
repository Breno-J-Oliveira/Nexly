'use client';

import { UsuarioPublico } from '@nexly/shared';
import axios from 'axios';
import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import {
  api,
  refreshSession,
  SessionRefreshError,
  setAccessToken,
  waitForSessionRefresh,
} from './api';

/**
 * Helper para buscar os dados do usuário autenticado a partir do JWT
 * (não precisa de cookie — usa o `Authorization: Bearer ...` do accessToken).
 * Retorna `null` se o token for inválido ou o usuário não existir mais.
 */
export async function fetchMe(): Promise<UsuarioPublico | null> {
  try {
    const { data } = await api.get<UsuarioPublico>('/auth/me');
    return data;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 401) return null;
    throw error;
  }
}

export interface LoginResponse {
  accessToken?: string;
  usuario?: UsuarioPublico | null;
  requiresTwoFactor?: boolean;
  tempToken?: string;
}

export interface GoogleRegistration {
  registrationToken: string;
  email: string;
  nome: string;
}

interface AuthContextValue {
  user: UsuarioPublico | null;
  loading: boolean;
  sessionError: string | null;
  retryAt: number;
  retrySession: () => Promise<void>;
  login: (email: string, senha: string) => Promise<LoginResponse>;
  completeLogin: (accessToken: string, usuario: UsuarioPublico) => void;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  googleRegistration: GoogleRegistration | null;
  setGoogleRegistration: (value: GoogleRegistration | null) => void;
  googleTwoFactorToken: string | null;
  setGoogleTwoFactorToken: (value: string | null) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [googleRegistration, setGoogleRegistration] = useState<GoogleRegistration | null>(null);
  const [googleTwoFactorToken, setGoogleTwoFactorToken] = useState<string | null>(null);
  const [user, setUser] = useState<UsuarioPublico | null>(null);
  const [loading, setLoading] = useState(true);
  const [sessionError, setSessionError] = useState<string | null>(null);
  const [retryAt, setRetryAt] = useState(0);
  const attempt = useRef(0);

  const retrySession = useCallback(async (): Promise<void> => {
    const current = ++attempt.current;
    setLoading(true);
    setSessionError(null);
    try {
      const session = await refreshSession();
      if (current !== attempt.current) return;
      if (session?.accessToken && session.usuario) {
        setUser(session.usuario);
      } else if (session === null) {
        setAccessToken(null);
        setUser(null);
      } else {
        throw new SessionRefreshError();
      }
      setRetryAt(0);
    } catch (error) {
      if (current !== attempt.current) return;
      const failure = error instanceof SessionRefreshError ? error : new SessionRefreshError();
      setSessionError(failure.message);
      setRetryAt(Date.now() + failure.retryAfterSeconds * 1000);
    } finally {
      if (current === attempt.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void retrySession();
    return () => {
      attempt.current += 1;
    };
  }, [retrySession]);

  const login = async (email: string, senha: string): Promise<LoginResponse> => {
    await waitForSessionRefresh();
    const res = await api.post<LoginResponse>('/auth/login', { email, senha });
    if (res.data.accessToken && res.data.usuario) {
      completeLogin(res.data.accessToken, res.data.usuario);
    }
    return res.data;
  };

  const completeLogin = (accessToken: string, usuario: UsuarioPublico): void => {
    setGoogleRegistration(null);
    setGoogleTwoFactorToken(null);
    attempt.current += 1;
    setAccessToken(accessToken);
    setUser(usuario);
    setSessionError(null);
    setRetryAt(0);
    setLoading(false);
  };

  const logout = async (): Promise<void> => {
    try {
      await api.post('/auth/logout', {});
    } finally {
      setAccessToken(null);
      setGoogleRegistration(null);
      setGoogleTwoFactorToken(null);
      setUser(null);
      window.location.href = '/login';
    }
  };

  /**
   * Recarrega os dados do usuário a partir do JWT. Útil após o próprio
   * usuário editar o próprio perfil — o estado do AuthProvider é atualizado
   * sem precisar de novo login.
   */
  const refreshUser = async (): Promise<void> => {
    const u = await fetchMe();
    setUser(u);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        sessionError,
        retryAt,
        retrySession,
        login,
        completeLogin,
        logout,
        refreshUser,
        googleRegistration,
        setGoogleRegistration,
        googleTwoFactorToken,
        setGoogleTwoFactorToken,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth deve ser usado dentro de AuthProvider');
  }
  return ctx;
}
