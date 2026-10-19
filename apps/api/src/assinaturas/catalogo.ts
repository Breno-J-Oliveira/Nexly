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
// Identificadores públicos do catálogo aprovado na conta de produção Nexly.
const PRECOS_LIVE = {
  BASIC: 'price_1USMi3LaaHKTv1WnMwtEzzth',
  PRO: 'price_1USMiFLaaHKTv1Wny3a15dTA',
  ENTERPRISE: 'price_1USMiGLaaHKTv1WnElswXTIZ',
} as const;
export const PLANOS_LIVE = PLANOS.map((plano) => ({
  ...plano,
  precoId: PRECOS_LIVE[plano.id],
}));
export const PORTAL_LIVE = 'bpc_1USMijLaaHKTv1Wnog3jNvm3';
export const ESTADOS_EM_ANDAMENTO = new Set([
  'active',
  'trialing',
  'past_due',
  'unpaid',
  'incomplete',
  'paused',
]);
