/**
 * NexusAuth React Provider
 *
 * C29 FIX: Tokens are stored IN-MEMORY by default, NOT in localStorage.
 * This prevents XSS attacks from stealing tokens via document.localStorage.
 *
 * Trade-off: tokens are lost on page refresh. For persistent sessions:
 *   - Use an httpOnly refresh token cookie + BFF proxy endpoint
 *   - Or use a Service Worker to intercept and attach tokens
 *
 * To re-enable localStorage (INSECURE, dev only):
 *   import { setTokenStoreMode } from '@nexus/auth-sdk';
 *   setTokenStoreMode('localStorage');
 */

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { NexusAuthClient } from '../client';
import { AuthTokens, NexusUser, UserProfile, SessionInfo } from '../types';
import { loadTokens as loadRawTokens, saveTokens as saveRawTokens } from '../tokenStore';

const REFRESH_THRESHOLD_MS = 30 * 1000;

interface AuthState {
  user: UserProfile | null;
  tokens: AuthTokens | null;
  isAuthenticated: boolean;
  loading: boolean;
  error: string | null;
}

interface AuthContextValue extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export interface AuthProviderProps {
  baseUrl: string;
  children: React.ReactNode;
}

export function AuthProvider({ baseUrl, children }: AuthProviderProps) {
  const clientRef = useRef(new NexusAuthClient({ baseUrl }));
  const [state, setState] = useState<AuthState>({
    user: null,
    tokens: null,
    isAuthenticated: false,
    loading: true,
    error: null,
  });

  // C29 FIX: Use secure in-memory token store instead of localStorage
  const loadTokens = useCallback((): AuthTokens | null => {
    try {
      const raw = loadRawTokens();
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }, []);

  const saveTokens = useCallback((tokens: AuthTokens | null) => {
    if (tokens) {
      saveRawTokens(JSON.stringify(tokens));
    } else {
      saveRawTokens(null);
    }
  }, []);

  const clearAuth = useCallback(() => {
    saveTokens(null);
    setState({
      user: null,
      tokens: null,
      isAuthenticated: false,
      loading: false,
      error: null,
    });
  }, [saveTokens]);

  const refreshUser = useCallback(async () => {
    const tokens = loadTokens();
    if (!tokens) return;

    try {
      const user = await clientRef.current.me(tokens.accessToken);
      setState((prev) => ({ ...prev, user, isAuthenticated: true, loading: false }));
    } catch {
      clearAuth();
    }
  }, [loadTokens, clearAuth]);

  const scheduleRefresh = useCallback((tokens: AuthTokens) => {
    try {
      const payload = JSON.parse(
        atob(tokens.accessToken.split('.')[1]),
      );
      const expMs = payload.exp * 1000;
      const delay = expMs - Date.now() - REFRESH_THRESHOLD_MS;

      if (delay <= 0) return;

      setTimeout(async () => {
        try {
          const newTokens = await clientRef.current.refresh(tokens.refreshToken);
          saveTokens(newTokens);
          setState((prev) => ({ ...prev, tokens: newTokens }));
          scheduleRefresh(newTokens);
        } catch {
          clearAuth();
        }
      }, delay);
    } catch {
      // invalid token format
    }
  }, [saveTokens, clearAuth]);

  const login = useCallback(async (email: string, password: string) => {
    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const tokens = await clientRef.current.login(email, password);
      saveTokens(tokens);
      const user = await clientRef.current.me(tokens.accessToken);
      setState({
        user,
        tokens,
        isAuthenticated: true,
        loading: false,
        error: null,
      });
      scheduleRefresh(tokens);
    } catch (err: any) {
      setState({
        user: null,
        tokens: null,
        isAuthenticated: false,
        loading: false,
        error: err.message || 'Login failed',
      });
      throw err;
    }
  }, [saveTokens, scheduleRefresh]);

  const logout = useCallback(async () => {
    const tokens = loadTokens();
    if (tokens) {
      try {
        await clientRef.current.logout(tokens.accessToken, tokens.refreshToken);
      } catch {
        // ignore errors on logout
      }
    }
    clearAuth();
  }, [loadTokens, clearAuth]);

  useEffect(() => {
    const tokens = loadTokens();
    if (!tokens) {
      setState((prev) => ({ ...prev, loading: false }));
      return;
    }

    refreshUser();
    scheduleRefresh(tokens);
  }, [loadTokens, refreshUser, scheduleRefresh]);

  const value: AuthContextValue = {
    ...state,
    login,
    logout,
    refreshUser,
  };

  return React.createElement(AuthContext.Provider, { value }, children);
}

export function useAuthContext(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuthContext must be used within an AuthProvider');
  }
  return ctx;
}