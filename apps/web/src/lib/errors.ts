/**
 * Helpers para extrair erros estruturados do backend.
 *
 * O backend devolve `{ statusCode, code?, message, errors? }`. Este
 * helper normaliza o acesso para o front-end — o `code` permite
 * tratamento programático (ex: "se code === BUSY_PROFESSIONAL,
 * sugerir outro horário") e o `message` é a versão humana.
 */

import axios, { AxiosError } from 'axios';

export interface ApiErrorBody {
  statusCode?: number;
  code?: string;
  message?: string;
  errors?: string[];
  timestamp?: string;
}

export interface ApiError extends Error {
  statusCode?: number;
  code?: string;
  errors?: string[];
}

/**
 * Extrai `{ code, message, errors }` de um erro do axios. Se o erro
 * não for do backend, devolve `{ message: 'Erro de rede' }`.
 */
export function parseApiError(e: unknown): ApiError {
  if (axios.isAxiosError(e)) {
    const data = e.response?.data as ApiErrorBody | undefined;
    const err = new Error(
      data?.message ?? (e.code === 'ERR_NETWORK' ? 'Erro de rede' : e.message),
    ) as ApiError;
    err.statusCode = e.response?.status;
    err.code = data?.code;
    err.errors = data?.errors;
    return err;
  }
  return { message: e instanceof Error ? e.message : 'Erro desconhecido' } as ApiError;
}

/** Lista de códigos semânticos conhecidos. Útil para `switch (err.code)`. */
export const ErrorCodes = {
  BUSY_PROFESSIONAL: 'BUSY_PROFESSIONAL',
  OUT_OF_STOCK: 'OUT_OF_STOCK',
  EMAIL_TAKEN: 'EMAIL_TAKEN',
  INVALID_DATETIME: 'INVALID_DATETIME',
  DATETIME_IN_PAST: 'DATETIME_IN_PAST',
  LOGIN_TOO_MANY_ATTEMPTS: 'LOGIN_TOO_MANY_ATTEMPTS',
  USER_NOT_FOUND: 'USER_NOT_FOUND',
  TENANT_CONTEXT_MISSING: 'TENANT_CONTEXT_MISSING',
} as const;

export type ErrorCode = (typeof ErrorCodes)[keyof typeof ErrorCodes];

export { AxiosError };

