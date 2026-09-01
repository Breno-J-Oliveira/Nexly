import { useAuthContext } from './AuthProvider';

export function useAuth() {
  const ctx = useAuthContext();
  return {
    user: ctx.user,
    isAuthenticated: ctx.isAuthenticated,
    loading: ctx.loading,
    error: ctx.error,
    login: ctx.login,
    logout: ctx.logout,
  };
}
