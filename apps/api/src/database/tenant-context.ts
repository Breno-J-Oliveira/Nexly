import { AsyncLocalStorage } from 'async_hooks';

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
