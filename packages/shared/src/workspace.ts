export const MODULES = [
  {
    id: 'agenda',
    nome: 'Agenda',
    descricao: 'Organize horários, confirme consultas e acompanhe atendimentos.',
    href: '/agenda',
    icon: 'calendar-days',
    depende: ['clientes', 'profissionais', 'servicos'],
  },
  {
    id: 'clientes',
    nome: 'Clientes',
    descricao: 'Centralize contatos, histórico e observações de quem você atende.',
    href: '/clientes',
    icon: 'users',
    depende: [],
  },
  {
    id: 'profissionais',
    nome: 'Profissionais',
    descricao: 'Cadastre sua equipe e especialidades. Também serve para quem atende sozinho.',
    href: '/profissionais',
    icon: 'user-tie',
    depende: [],
  },
  {
    id: 'servicos',
    nome: 'Serviços',
    descricao: 'Defina consultas e serviços, com duração e preço.',
    href: '/servicos',
    icon: 'scissors',
    depende: [],
  },
  {
    id: 'estoque',
    nome: 'Estoque',
    descricao: 'Controle produtos, insumos, entradas e alertas de reposição.',
    href: '/estoque',
    icon: 'boxes-stacked',
    depende: [],
  },
  {
    id: 'pdv',
    nome: 'PDV',
    descricao: 'Registre a venda de produtos e as formas de pagamento.',
    href: '/pdv',
    icon: 'cash-register',
    depende: ['estoque', 'vendas', 'clientes'],
  },
  {
    id: 'vendas',
    nome: 'Vendas',
    descricao: 'Consulte transações, itens vendidos e recebimentos.',
    href: '/vendas',
    icon: 'receipt',
    depende: [],
  },
  {
    id: 'relatorios',
    nome: 'Relatórios',
    descricao: 'Acompanhe faturamento, produtividade e indicadores do seu negócio.',
    href: '/relatorios',
    icon: 'chart-column',
    depende: [],
  },
  {
    id: 'comissao',
    nome: 'Comissões',
    descricao: 'Acompanhe os valores de comissão da equipe.',
    href: '/comissao',
    icon: 'money-bill-wave',
    depende: ['profissionais'],
  },
  {
    id: 'fidelidade',
    nome: 'Fidelidade',
    descricao: 'Acompanhe pontos e o relacionamento com seus clientes.',
    href: '/fidelidade',
    icon: 'star',
    depende: ['clientes'],
  },
] as const;
export type ModuleId = (typeof MODULES)[number]['id'];
export const MODULE_IDS: ModuleId[] = MODULES.map((m) => m.id);
export const PRESETS = [
  {
    id: 'veterinaria',
    nome: 'Veterinária',
    descricao: 'Consultas, equipe e insumos da clínica.',
    modulos: ['agenda', 'clientes', 'profissionais', 'servicos', 'estoque', 'relatorios'],
  },
  {
    id: 'psicologia',
    nome: 'Psicologia',
    descricao: 'Uma rotina focada em consultas e acompanhamento de contatos.',
    modulos: ['agenda', 'clientes', 'profissionais', 'servicos', 'relatorios'],
  },
  {
    id: 'salao',
    nome: 'Salão / Barbearia',
    descricao: 'Atendimentos, produtos, vendas e comissões.',
    modulos: MODULE_IDS,
  },
  {
    id: 'petshop',
    nome: 'Petshop',
    descricao: 'Serviços, produtos, vendas e fidelização.',
    modulos: [
      'agenda',
      'clientes',
      'profissionais',
      'servicos',
      'estoque',
      'pdv',
      'vendas',
      'fidelidade',
      'relatorios',
    ],
  },
  {
    id: 'estetica',
    nome: 'Clínica de estética',
    descricao: 'Agenda de procedimentos e controle de insumos.',
    modulos: [
      'agenda',
      'clientes',
      'profissionais',
      'servicos',
      'estoque',
      'relatorios',
      'comissao',
    ],
  },
  {
    id: 'personalizado',
    nome: 'Personalizado',
    descricao: 'Escolha as funções que fazem sentido para você.',
    modulos: ['clientes', 'servicos'],
  },
] as const;

export function normalizeModules(ids: readonly string[]): ModuleId[] {
  const selected = new Set(ids.filter((id) => MODULE_IDS.includes(id as ModuleId)));
  let size = -1;
  while (size !== selected.size) {
    size = selected.size;
    MODULES.filter((m) => selected.has(m.id)).forEach((m) =>
      m.depende.forEach((id) => selected.add(id)),
    );
  }
  return MODULE_IDS.filter((id) => selected.has(id));
}

export function toggleModule(current: readonly string[], id: ModuleId): ModuleId[] {
  if (!current.includes(id)) return normalizeModules([...current, id]);
  const selected = new Set(current);
  selected.delete(id);
  let size = -1;
  while (size !== selected.size) {
    size = selected.size;
    MODULES.forEach((m) => {
      if (m.depende.some((dep) => !selected.has(dep))) selected.delete(m.id);
    });
  }
  return MODULE_IDS.filter((key) => selected.has(key));
}

export function routeModule(path: string): ModuleId | undefined {
  if (path === '/produtos' || path.startsWith('/estoque/')) return 'estoque';
  return MODULES.find((m) => path === m.href || path.startsWith(`${m.href}/`))?.id;
}

export function canAccessWorkspaceRoute(path: string, role: string): boolean {
  if (path === '/meu-nexly') return true;
  if (role === 'ADMIN') return true;
  if (role === 'GESTOR') return path !== '/usuarios';
  const allowed: Record<string, string[]> = {
    PROFISSIONAL: ['/dashboard', '/agenda'],
    RECEPCIONISTA: ['/dashboard', '/agenda', '/clientes', '/profissionais', '/servicos'],
    CAIXA: ['/dashboard', '/clientes', '/produtos', '/estoque', '/pdv', '/vendas'],
  };
  return (allowed[role] || []).includes(path);
}
