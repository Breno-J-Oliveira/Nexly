'use client';

import { UsuarioPublico } from '@nexly/shared';
import { createContext, ReactNode, useContext, useEffect, useState } from 'react';
import { api, setAccessToken } from './api';

/**
 * Helper para buscar os dados do usuário autenticado a partir do JWT
 * (não precisa de cookie — usa o `Authorization: Bearer ...` do accessToken).
 * Retorna `null` se o token for inválido ou o usuário não existir mais.
 */
export async function fetchMe(): Promise<UsuarioPublico | null> {
  try {
    const { data } = await api.get<UsuarioPublico>('/auth/me');
    return data;
  } catch {
    return null;
  }
}

export interface LoginResponse {
  accessToken?: string;
  usuario?: UsuarioPublico | null;
  requiresTwoFactor?: boolean;
  tempToken?: string;
}

interface AuthContextValue {
  user: UsuarioPublico | null;
  loading: boolean;
  login: (email: string, senha: string) => Promise<LoginResponse>;
  completeLogin: (accessToken: string, usuario: UsuarioPublico) => void;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UsuarioPublico | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .post<{ accessToken: string | null; usuario: UsuarioPublico | null }>('/auth/refresh', {})
      .then((res) => {
        if (res.data.accessToken && res.data.usuario) {
          setAccessToken(res.data.accessToken);
          setUser(res.data.usuario);
        }
      })
      .catch(() => {
        setAccessToken(null);
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, []);

  const login = async (email: string, senha: string): Promise<LoginResponse> => {
    const res = await api.post<LoginResponse>('/auth/login', { email, senha });
    if (res.data.accessToken && res.data.usuario) {
      setAccessToken(res.data.accessToken);
      setUser(res.data.usuario);
    }
    return res.data;
  };

  const completeLogin = (accessToken: string, usuario: UsuarioPublico): void => {
    setAccessToken(accessToken);
    setUser(usuario);
  };

  const logout = async (): Promise<void> => {
    try {
      await api.post('/auth/logout', {});
    } finally {
      setAccessToken(null);
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
    <AuthContext.Provider value={{ user, loading, login, completeLogin, logout, refreshUser }}>
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
