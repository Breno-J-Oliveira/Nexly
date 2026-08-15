export const Role = {
  ADMIN: 'ADMIN',
  PROFISSIONAL: 'PROFISSIONAL',
  CAIXA: 'CAIXA',
} as const;

export type Role = (typeof Role)[keyof typeof Role];

export const StatusAgendamento = {
  AGENDADO: 'AGENDADO',
  CONFIRMADO: 'CONFIRMADO',
  CONCLUIDO: 'CONCLUIDO',
  CANCELADO: 'CANCELADO',
} as const;

export type StatusAgendamento = (typeof StatusAgendamento)[keyof typeof StatusAgendamento];

export const TipoMovimentacao = {
  ENTRADA: 'ENTRADA',
  SAIDA: 'SAIDA',
} as const;

export type TipoMovimentacao = (typeof TipoMovimentacao)[keyof typeof TipoMovimentacao];

export const Plano = {
  FREE: 'FREE',
  PRO: 'PRO',
} as const;

export type Plano = (typeof Plano)[keyof typeof Plano];
