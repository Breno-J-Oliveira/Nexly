/**
 * Matriz de permissões por papel (RBAC granular).
 *
 * `ADMIN` tem acesso total (`'*'`). Os demais papéis recebem permissões
 * no formato `recurso:acao`. O `PermissionsGuard` usa `hasPermission` para
 * autorizar cada request com base no recurso (path) e na ação (método HTTP).
 */
export { ROLE_PERMISSIONS, hasPermission } from '@nexly/shared';

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

/**
 * Deriva a permissão (`recurso:acao`) a partir do path e do método HTTP.
 * Retorna `null` quando o path não está mapeado (ex.: `/auth`, `/health`,
 * `/booking`, `/usuarios`, `/audit`, `/lgpd`, `/whatsapp`) — nesses casos o
 * `PermissionsGuard` exige uma exceção explícita ou nega por padrão.
 */
export function permissaoDoRequest(path: string, method: string): string | null {
  if (path.replace(/\/$/, '') === '/api/export/produtos/vencendo' && method === 'GET')
    return 'estoque:read';
  if (path.replace(/\/$/, '') === '/api/cupons/validar' && method === 'POST') return 'cupons:read';
  const semPrefixo = path.replace(/^\/api\//, '');
  const segmento = semPrefixo.split('/').filter(Boolean)[0] ?? '';
  const recurso = RECURSO_POR_PATH[segmento];
  if (!recurso) return null;
  const acao = ACAO_POR_METODO[method.toUpperCase()];
  if (!acao) return null;
  return `${recurso}:${acao}`;
}
