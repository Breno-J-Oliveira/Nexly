import { expect, test } from '@playwright/test';
import { NAV_GROUPS, navigationGroups, visibleNavigation } from '../../apps/web/src/lib/navigation';
import {
  canAccessWorkspaceRoute,
  normalizeModules,
  routeModule,
} from '../../packages/shared/src/workspace';

const originalRoutes = [
  '/dashboard',
  '/agenda',
  '/clientes',
  '/profissionais',
  '/servicos',
  '/produtos',
  '/estoque',
  '/estoque/pedidos',
  '/pdv',
  '/vendas',
  '/financeiro',
  '/estoque/filiais',
  '/relatorios',
  '/marketing',
  '/tarefas',
  '/recorrencias',
  '/automacao',
  '/filiais',
  '/documentos',
  '/comissao',
  '/fidelidade',
  '/usuarios',
  '/minha-conta',
  '/meu-nexly',
  '/importar',
  '/historico',
  '/operacao',
  '/configuracoes',
];

test('agrupamento mantém cada destino anterior e adiciona assinatura sem duplicar', () => {
  const routes = NAV_GROUPS.flatMap((group) => group.items.map((item) => item.href));
  expect(routes.slice().sort()).toEqual([...originalRoutes, '/assinatura'].sort());
  expect(new Set(routes).size).toBe(routes.length);
});

test('nomes personalizados não alteram catálogo e são compartilhados por busca e menu', () => {
  const groups = navigationGroups({ nomeCliente: 'Pacientes', nomeServico: 'Consultas' });
  const destinations = groups.flatMap((group) => group.items);
  expect(destinations.find((item) => item.href === '/clientes')?.label).toBe('Pacientes');
  expect(destinations.find((item) => item.href === '/servicos')?.label).toBe('Consultas');
  expect(
    navigationGroups()
      .flatMap((group) => group.items)
      .find((item) => item.href === '/clientes')?.label,
  ).toBe('Clientes');
});

for (const role of ['ADMIN', 'GESTOR', 'PROFISSIONAL', 'RECEPCIONISTA', 'CAIXA']) {
  test(`destinos de ${role} respeitam papel e módulos inclusive rotas de estoque`, () => {
    for (const ids of [
      normalizeModules(['agenda']),
      normalizeModules(['pdv']),
      normalizeModules([]),
    ]) {
      const enabled = (path: string) => {
        const module = routeModule(path);
        return !module || ids.includes(module);
      };
      const groups = visibleNavigation(role, enabled, canAccessWorkspaceRoute);
      expect(groups.every((group) => group.items.length > 0)).toBe(true);
      expect(groups.flatMap((group) => group.items.map((item) => item.href)).sort()).toEqual(
        [...originalRoutes, '/assinatura']
          .filter((path) => canAccessWorkspaceRoute(path, role) && enabled(path))
          .sort(),
      );
    }
  });
}

test('assinatura fica disponível somente para administradores, conforme API', () => {
  for (const role of ['ADMIN', 'GESTOR', 'PROFISSIONAL', 'RECEPCIONISTA', 'CAIXA']) {
    expect(canAccessWorkspaceRoute('/assinatura', role)).toBe(role === 'ADMIN');
    expect(
      visibleNavigation(role, () => true, canAccessWorkspaceRoute)
        .flatMap((group) => group.items)
        .some((item) => item.href === '/assinatura'),
    ).toBe(role === 'ADMIN');
  }
});
