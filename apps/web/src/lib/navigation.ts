export type NavItem = { label: string; href: string; icon: string };
export type NavGroup = { label: string; items: NavItem[] };

export const NAV_GROUPS: NavGroup[] = [
  {
    label: 'Hoje',
    items: [
      { label: 'Painel Geral', href: '/dashboard', icon: 'gauge-high' },
      { label: 'Agenda', href: '/agenda', icon: 'calendar-days' },
      { label: 'PDV', href: '/pdv', icon: 'cash-register' },
    ],
  },
  {
    label: 'Clientes e retorno',
    items: [
      { label: 'Clientes', href: '/clientes', icon: 'users' },
      { label: 'Recorrências', href: '/recorrencias', icon: 'repeat' },
      { label: 'Fidelidade', href: '/fidelidade', icon: 'star' },
      { label: 'Marketing', href: '/marketing', icon: 'bullhorn' },
    ],
  },
  {
    label: 'Produtos e reposição',
    items: [
      { label: 'Produtos', href: '/produtos', icon: 'box-open' },
      { label: 'Estoque', href: '/estoque', icon: 'boxes-stacked' },
      { label: 'Pedidos de compra', href: '/estoque/pedidos', icon: 'truck' },
      { label: 'Estoque por unidade', href: '/estoque/filiais', icon: 'building' },
    ],
  },
  {
    label: 'Resultados',
    items: [
      { label: 'Vendas', href: '/vendas', icon: 'receipt' },
      { label: 'Financeiro', href: '/financeiro', icon: 'wallet' },
      { label: 'Relatórios', href: '/relatorios', icon: 'chart-column' },
      { label: 'Comissões', href: '/comissao', icon: 'money-bill-wave' },
    ],
  },
  {
    label: 'Organização',
    items: [
      { label: 'Profissionais', href: '/profissionais', icon: 'user-tie' },
      { label: 'Serviços', href: '/servicos', icon: 'scissors' },
      { label: 'Tarefas', href: '/tarefas', icon: 'list-check' },
      { label: 'Automação', href: '/automacao', icon: 'bolt' },
      { label: 'Documentos', href: '/documentos', icon: 'file-lines' },
      { label: 'Filiais', href: '/filiais', icon: 'building' },
    ],
  },
  {
    label: 'Administração',
    items: [
      { label: 'Usuários e acessos', href: '/usuarios', icon: 'user-group' },
      { label: 'Importar cadastros', href: '/importar', icon: 'file-import' },
      { label: 'Histórico de alterações', href: '/historico', icon: 'clock-rotate-left' },
      { label: 'Saúde e rotinas', href: '/operacao', icon: 'heart-pulse' },
      { label: 'Configurações', href: '/configuracoes', icon: 'gear' },
    ],
  },
  {
    label: 'Conta e preferências',
    items: [
      { label: 'Minha conta', href: '/minha-conta', icon: 'user' },
      { label: 'Meu Nexly', href: '/meu-nexly', icon: 'wand-magic-sparkles' },
      { label: 'Plano e assinatura', href: '/assinatura', icon: 'receipt' },
    ],
  },
];

export function navigationGroups(preferences?: {
  nomeCliente?: string;
  nomeServico?: string;
}): NavGroup[] {
  return NAV_GROUPS.map((group) => ({
    ...group,
    items: group.items.map((item) => ({
      ...item,
      label:
        item.href === '/clientes'
          ? (preferences?.nomeCliente ?? item.label)
          : item.href === '/servicos'
            ? (preferences?.nomeServico ?? item.label)
            : item.label,
    })),
  }));
}

export function visibleNavigation(
  role: string,
  enabled: (path: string) => boolean,
  access: (path: string, role: string) => boolean,
  preferences?: { nomeCliente?: string; nomeServico?: string },
): NavGroup[] {
  return navigationGroups(preferences)
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => access(item.href, role) && enabled(item.href)),
    }))
    .filter((group) => group.items.length > 0);
}
