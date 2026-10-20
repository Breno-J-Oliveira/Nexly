import { expect, test } from '@playwright/test';
import {
  authDestinationFromSearch,
  authLink,
  safeAuthDestination,
  subscriptionDestination,
} from '../../apps/web/src/lib/auth-navigation';

test('login retorna somente a destinos internos válidos', () => {
  for (const unsafe of [
    null,
    '',
    'https://example.com',
    '//example.com',
    '/\\example.com',
    'javascript:alert(1)',
    '/%2f%2fexample.com',
    '/%5cexample.com',
    '/login',
    '/login/',
    '/cadastro?next=/login',
    '/clientes\n',
    '/clientes\t',
    '/a/../login',
    '/'.repeat(2050),
  ]) {
    expect(safeAuthDestination(unsafe), String(unsafe)).toBe('/dashboard');
  }
  expect(safeAuthDestination('/assinatura?plano=PRO')).toBe('/assinatura?plano=PRO');
  expect(safeAuthDestination('/estoque/pedidos?pagina=2')).toBe('/estoque/pedidos?pagina=2');
});

test('escolha do plano é preservada entre login e cadastro sem ativar assinatura', () => {
  const destination = subscriptionDestination('ENTERPRISE');
  const login = authLink('/login', destination);
  expect(authDestinationFromSearch(login.slice(login.indexOf('?')))).toBe(
    '/assinatura?plano=ENTERPRISE',
  );
  expect(authLink('/cadastro', destination)).toBe(
    '/cadastro?next=%2Fassinatura%3Fplano%3DENTERPRISE',
  );
  expect(authLink('/login', '//example.com')).toBe('/login');
  expect(subscriptionDestination('price_manipulado')).toBe('/assinatura');
});
