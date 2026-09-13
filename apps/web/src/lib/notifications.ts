import { useCallback, useEffect, useState } from 'react';
import { api } from './api';

export interface Notificacao {
  id: string;
  titulo: string;
  mensagem: string;
  link?: string;
  lida: boolean;
  createdAt: string;
}

export function useNotifications(pollingMs = 60_000) {
  const [notificacoes, setNotificacoes] = useState<Notificacao[]>([]);
  const [naoLidas, setNaoLidas] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchNotifications = useCallback(async () => {
    try {
      const [listaRes, countRes] = await Promise.all([
        api.get<Notificacao[]>('/notificacoes'),
        api.get<number>('/notificacoes/count'),
      ]);
      setNotificacoes(listaRes.data);
      setNaoLidas(countRes.data);
    } catch {
      // silencioso: notificações são opcionais
    } finally {
      setLoading(false);
    }
  }, []);

  const marcarLida = useCallback(async (id: string) => {
    try {
      await api.patch(`/notificacoes/${id}/ler`);
      setNotificacoes((prev) =>
        prev.map((n) => (n.id === id ? { ...n, lida: true } : n)),
      );
      setNaoLidas((prev) => Math.max(0, prev - 1));
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
    const id = setInterval(fetchNotifications, pollingMs);
    return () => clearInterval(id);
  }, [fetchNotifications, pollingMs]);

  return { notificacoes, naoLidas, loading, marcarLida, refetch: fetchNotifications };
}
