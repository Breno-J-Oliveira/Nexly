'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from './api';

interface UseApiOptions {
  params?: Record<string, unknown>;
  immediate?: boolean;
}

interface UseApiResult<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useApi<T>(url: string, options?: UseApiOptions): UseApiResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(options?.immediate !== false);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get<T>(url, { params: options?.params });
      if (mountedRef.current) {
        setData(res.data);
      }
    } catch (e: unknown) {
      if (mountedRef.current) {
        const err = e as { response?: { data?: { message?: string } } };
        setError(err?.response?.data?.message ?? 'Erro ao carregar dados');
      }
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [url, JSON.stringify(options?.params)]);

  useEffect(() => {
    mountedRef.current = true;
    if (options?.immediate !== false) {
      void fetchData();
    }
    return () => { mountedRef.current = false; };
  }, [fetchData, options?.immediate]);

  return { data, loading, error, refetch: fetchData };
}
