import { Role } from '@nexly/shared';

/**
 * Matriz de permissões por papel (RBAC granular).
 *
 * `ADMIN` tem acesso total (`'*'`). Os demais papéis recebem permissões
 * no formato `recurso:acao`. O `PermissionsGuard` usa `hasPermission` para
 * autorizar cada request com base no recurso (path) e na ação (método HTTP).
 */
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
  PROFISSIONAL: ['agenda:read', 'dashboard:read', 'notificacoes:read'],
  RECEPCIONISTA: [
    'agenda:read',
    'agenda:create',
    'agenda:update',
    'clientes:read',
    'clientes:create',
    'clientes:update',
    'dashboard:read',
    'notificacoes:read',
  ],
  CAIXA: ['vendas:create', 'vendas:read', 'estoque:read', 'dashboard:read', 'notificacoes:read'],
};

/**
 * Mapeia o primeiro segmento do path para o nome do recurso usado nas
 * permissões. Produtos/estoque/pedidos de compra são o mesmo recurso `estoque`;
 * `export` pertence a `relatorios`.
 */
const RECURSO_POR_PATH: Record<string, string> = {
  agendamentos: 'agenda',
  clientes: 'clientes',
  profissionais: 'profissionais',
  servicos: 'servicos',
  produtos: 'estoque',
  estoque: 'estoque',
  'pedidos-compra': 'estoque',
  vendas: 'vendas',
  financeiro: 'financeiro',
  relatorios: 'relatorios',
  export: 'relatorios',
  dashboard: 'dashboard',
  configuracoes: 'configuracoes',
  cupons: 'cupons',
  fornecedores: 'fornecedores',
  fidelidade: 'fidelidade',
  comissao: 'comissao',
  avaliacoes: 'avaliacoes',
  notificacoes: 'notificacoes',
};

/** Mapeia o método HTTP para a ação usada nas permissões. */
const ACAO_POR_METODO: Record<string, string> = {
  GET: 'read',
  POST: 'create',
  PUT: 'update',
  PATCH: 'update',
  DELETE: 'delete',
};

/** Verifica se um papel possui uma permissão específica. */
export function hasPermission(role: Role, permission: string): boolean {
  const perms = ROLE_PERMISSIONS[role];
  if (!perms) return false;
  return perms.includes('*') || perms.includes(permission);
}

/**
 * Deriva a permissão (`recurso:acao`) a partir do path e do método HTTP.
 * Retorna `null` quando o path não está mapeado (ex.: `/auth`, `/health`,
 * `/booking`, `/usuarios`, `/audit`, `/lgpd`, `/whatsapp`) — nesses casos o
 * `PermissionsGuard` respeita o `@Roles()` explícito ou nega por padrão.
 */
export function permissaoDoRequest(path: string, method: string): string | null {
  const semPrefixo = path.replace(/^\/api\//, '');
  const segmento = semPrefixo.split('/').filter(Boolean)[0] ?? '';
  const recurso = RECURSO_POR_PATH[segmento];
  if (!recurso) return null;
  const acao = ACAO_POR_METODO[method.toUpperCase()];
  if (!acao) return null;
  return `${recurso}:${acao}`;
}
