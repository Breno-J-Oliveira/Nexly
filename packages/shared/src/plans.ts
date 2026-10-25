import { Plano } from './enums';

export const PLAN_NAMES: Record<Plano, string> = {
  FREE: 'Gratuito',
  BASIC: 'Essencial',
  PRO: 'Profissional',
  ENTERPRISE: 'Empresarial',
};

/** null representa ausência de limite comercial de profissionais ativos. */
export const PROFESSIONAL_LIMITS: Record<Plano, number | null> = {
  FREE: 1,
  BASIC: 2,
  PRO: 10,
  ENTERPRISE: 100,
};

export interface ProfessionalQuota {
  plano: Plano;
  ativos: number;
  limite: number | null;
  podeAdicionar: boolean;
}

export function professionalQuota(plano: Plano, ativos: number): ProfessionalQuota {
  const limite = PROFESSIONAL_LIMITS[plano];
  return { plano, ativos, limite, podeAdicionar: limite === null || ativos < limite };
}
