import { Plano } from '@prisma/client';

export const PLANOS = [
  { id: Plano.BASIC, nome: 'Essencial', centavos: 4900, precoId: 'price_1US5NbL7qFzhxMmgEvenuE3m' },
  {
    id: Plano.PRO,
    nome: 'Profissional',
    centavos: 9900,
    precoId: 'price_1US5NhL7qFzhxMmgL9cz9APv',
  },
  {
    id: Plano.ENTERPRISE,
    nome: 'Empresarial',
    centavos: 19900,
    precoId: 'price_1US5NhL7qFzhxMmgg2TvLwZO',
  },
] as const;

export const PORTAL_SANDBOX = 'bpc_1US5P5L7qFzhxMmg1F3XpGni';
export const ESTADOS_EM_ANDAMENTO = new Set([
  'active',
  'trialing',
  'past_due',
  'unpaid',
  'incomplete',
  'paused',
]);
