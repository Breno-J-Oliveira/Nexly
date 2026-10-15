'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { isCancel } from 'axios';
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
  const requestRef = useRef<AbortController | null>(null);
  const paramsKey = JSON.stringify(options?.params ?? {});

  const fetchData = useCallback(async () => {
    requestRef.current?.abort();
    const controller = new AbortController();
    requestRef.current = controller;
    setLoading(true);
    setError(null);
    try {
      const res = await api.get<T>(url, {
        params: JSON.parse(paramsKey) as Record<string, unknown>,
        signal: controller.signal,
      });
      if (mountedRef.current && !controller.signal.aborted) {
        setData(res.data);
      }
    } catch (e: unknown) {
      if (isCancel(e)) return;
      if (mountedRef.current && !controller.signal.aborted) {
        const err = e as { response?: { data?: { message?: string } } };
        setError(err?.response?.data?.message ?? 'Erro ao carregar dados');
      }
    } finally {
      if (mountedRef.current && !controller.signal.aborted) setLoading(false);
    }
  }, [url, paramsKey]);

  useEffect(() => {
    mountedRef.current = true;
    if (options?.immediate !== false) {
      void fetchData();
    }
    return () => {
      mountedRef.current = false;
      requestRef.current?.abort();
    };
  }, [fetchData, options?.immediate]);

  return { data, loading, error, refetch: fetchData };
}
