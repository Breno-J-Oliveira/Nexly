import { Role } from './enums';

/** Política compartilhada. A API continua sendo a autoridade de autorização. */
export const ROLE_PERMISSIONS: Record<Role, string[]> = {
  ADMIN: ['*'],
  GESTOR: [
    'agenda:read',
    'agenda:create',
    'agenda:update',
    'clientes:read',
    'clientes:create',
    'clientes:update',
    'estoque:read',
    'estoque:create',
    'estoque:update',
    'relatorios:read',
    'financeiro:read',
    'profissionais:read',
    'profissionais:create',
    'profissionais:update',
    'servicos:read',
    'servicos:create',
    'servicos:update',
    'vendas:read',
    'vendas:create',
    'dashboard:read',
    'configuracoes:read',
    'configuracoes:update',
    'cupons:read',
    'cupons:create',
    'cupons:update',
    'cupons:delete',
    'fornecedores:read',
    'fornecedores:create',
    'fornecedores:update',
    'fornecedores:delete',
    'fidelidade:read',
    'fidelidade:update',
    'comissao:read',
    'avaliacoes:read',
    'notificacoes:read',
    'notificacoes:update',
  ],
  PROFISSIONAL: ['agenda:read', 'dashboard:read', 'notificacoes:read', 'notificacoes:update'],
  RECEPCIONISTA: [
    'agenda:read',
    'agenda:create',
    'agenda:update',
    'clientes:read',
    'clientes:create',
    'clientes:update',
    'dashboard:read',
    'profissionais:read',
    'servicos:read',
    'notificacoes:read',
    'notificacoes:update',
  ],
  CAIXA: [
    'vendas:create',
    'vendas:read',
    'estoque:read',
    'dashboard:read',
    'notificacoes:read',
    'notificacoes:update',
    'cupons:read',
    'clientes:read',
  ],
};

/** Verifica se um papel possui uma permissão específica. */
export function hasPermission(role: Role | undefined, permission: string): boolean {
  if (!role) return false;
  const perms = ROLE_PERMISSIONS[role];
  if (!perms) return false;
  return perms.includes('*') || perms.includes(permission);
}
