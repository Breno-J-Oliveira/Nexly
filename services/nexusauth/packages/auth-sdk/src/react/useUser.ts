import { useAuthContext } from './AuthProvider';

export function useUser() {
  const { user, refreshUser, loading } = useAuthContext();
  return { user, refreshUser, loading };
}
