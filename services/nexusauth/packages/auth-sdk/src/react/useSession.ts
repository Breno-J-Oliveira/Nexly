import { useEffect, useState } from 'react';
import { useAuthContext } from './AuthProvider';
import { NexusAuthClient } from '../client';
import { SessionInfo } from '../types';

export function useSession() {
  const { tokens, isAuthenticated } = useAuthContext();
  const [sessions, setSessions] = useState<SessionInfo[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isAuthenticated || !tokens) return;

    const client = new NexusAuthClient({ baseUrl: '' });
    setLoading(true);

    fetch('/sessions', {
      headers: { Authorization: `Bearer ${tokens.accessToken}` },
    })
      .then((res) => res.json())
      .then((data) => setSessions(data))
      .catch(() => setSessions([]))
      .finally(() => setLoading(false));
  }, [isAuthenticated, tokens]);

  return { sessions, loading };
}
