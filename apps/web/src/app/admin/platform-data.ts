'use client';

import axios from 'axios';
import { useEffect, useReducer, useState } from 'react';
import { api } from '@/lib/api';
import { PLAN_NAMES, type Plano } from '@nexly/shared';

export type Plan = Plano;
export type PlatformRole = 'OWNER' | 'OPERATIONS' | 'FINANCE' | 'VIEWER';
export type EmployeeRole = Exclude<PlatformRole, 'OWNER'>;

export interface PlatformMember {
  id: string;
  usuarioId: string;
  nome: string;
  email: string;
  papel: PlatformRole;
}

export interface TeamMember extends PlatformMember {
  ativo: boolean;
  criadoEm: string;
  atualizadoEm: string;
}

export const roleNames: Record<PlatformRole, string> = {
  OWNER: 'Proprietário',
  OPERATIONS: 'Operações',
  FINANCE: 'Financeiro',
  VIEWER: 'Leitura',
};

export interface CompanySummary {
  id: string;
  name: string;
  segment: string | null;
  plan: Plan;
  createdAt: string;
  subscriptionStatus: string | null;
}

export interface CompanyList {
  items: CompanySummary[];
  total: number;
  page: number;
  pageSize: number;
}

export interface PlatformOverview {
  periodDays: number;
  totals: {
    companies: number;
    newCompanies: number;
    activeSubscriptions: number;
    managedUsers: number;
    appointments: number;
    nonHealthySubscriptions: number;
  };
  signups: Array<{ date: string; count: number }>;
  plans: Array<{ plan: Plan; companies: number }>;
  billing: { mode: 'test' | 'live'; available: boolean };
  recentCompanies: CompanySummary[];
}

export interface Coupon {
  id: string;
  code: string;
  percentOff: number;
  active: boolean;
  maxRedemptions: number | null;
  timesRedeemed: number;
  expiresAt: string | null;
  createdAt: string;
}

export interface CouponList {
  available: boolean;
  mode: 'test' | 'live';
  linkBase: string | null;
  items: Coupon[];
  nextCursor: string | null;
  plans?: { id: Exclude<Plan, 'FREE'>; name: string; cents: number }[];
}

type LoadResult<T> =
  { status: 'loading' } | { status: 'error'; error: unknown } | { status: 'ready'; data: T };

export function usePlatformData<T>(path: string) {
  const [revision, reload] = useReducer((value: number) => value + 1, 0);
  const [result, setResult] = useState<(LoadResult<T> & { key: string }) | null>(null);
  const key = `${revision} ${path}`;

  useEffect(() => {
    const controller = new AbortController();
    void api
      .get<T>(path, { signal: controller.signal })
      .then(({ data }) => {
        if (!controller.signal.aborted) setResult({ key, status: 'ready', data });
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted) setResult({ key, status: 'error', error });
      });
    return () => controller.abort();
  }, [key, path]);

  const state: LoadResult<T> = result?.key === key ? result : { status: 'loading' };
  return { state, reload };
}

export function httpStatus(error: unknown): number | undefined {
  return axios.isAxiosError(error) ? error.response?.status : undefined;
}

export function appErrorCode(error: unknown): string | undefined {
  if (!axios.isAxiosError(error)) return undefined;
  const code: unknown = error.response?.data?.code;
  return typeof code === 'string' ? code : undefined;
}

export function apiError(error: unknown, fallback: string): string {
  if (!axios.isAxiosError(error)) return fallback;
  switch (error.response?.status) {
    case 401:
      return 'Sua sessão expirou. Entre novamente no Nexly.';
    case 403:
      return 'Sua conta não tem permissão para esta operação.';
    case 429:
      return 'Muitas solicitações seguidas. Aguarde um momento e tente novamente.';
    case 503:
      return 'Este serviço está temporariamente indisponível. Tente novamente em instantes.';
  }
  const status = error.response?.status;
  const message: unknown = error.response?.data?.message;
  if (status && status >= 400 && status < 500 && typeof message === 'string') return message;
  if (
    status === 400 &&
    Array.isArray(message) &&
    message.every((item) => typeof item === 'string')
  ) {
    return message.join(' ');
  }
  return fallback;
}

export const planNames = PLAN_NAMES;

export const formatNumber = new Intl.NumberFormat('pt-BR');

export function formatDate(value: string, timeZone = 'America/Sao_Paulo'): string {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone,
  }).format(new Date(value));
}
