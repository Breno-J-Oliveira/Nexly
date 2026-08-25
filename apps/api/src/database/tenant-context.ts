import { AsyncLocalStorage } from 'async_hooks';
import { InternalServerErrorException } from '@nestjs/common';

export interface TenantContextData {
  tenantId: string;
  userId: string;
  role: string;
  email: string;
}

export const tenantStorage = new AsyncLocalStorage<TenantContextData>();

export function getTenantContext(): TenantContextData | undefined {
  return tenantStorage.getStore();
}

/**
 * Retorna o `tenantId` do contexto atual ou lança 500.
 *
 * Use em services que precisam do `empresaId` explícito no `data` (ex: a
 * baixa de estoque que faz um `updateMany` com `where: { empresaId, ... }`).
 * Em requests normais, o `TenantInterceptor` já popula o contexto antes de
 * chegar ao controller — se chegar aqui vazio é bug.
 */
export function getTenantIdOrFail(): string {
  const ctx = getTenantContext();
  if (!ctx?.tenantId) {
    throw new InternalServerErrorException({
      code: 'TENANT_CONTEXT_MISSING',
      message: 'Contexto de tenant ausente. Verifique a ordem dos interceptors.',
    });
  }
  return ctx.tenantId;
}
