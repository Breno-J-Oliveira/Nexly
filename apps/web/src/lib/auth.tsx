'use client';

import { UsuarioPublico } from '@nexly/shared';
import { createContext, ReactNode, useContext, useEffect, useState } from 'react';
import { api, setAccessToken } from './api';

interface AuthContextValue {
  user: UsuarioPublico | null;
  loading: boolean;
  login: (email: string, senha: string) => Promise<void>;
  logout: () => Promise<void>;
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

  const login = async (email: string, senha: string): Promise<void> => {
    const res = await api.post<{ accessToken: string; usuario: UsuarioPublico }>('/auth/login', {
      email,
      senha,
    });
    setAccessToken(res.data.accessToken);
    setUser(res.data.usuario);
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

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
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
