import { test, expect } from '../fixtures';

test('uma consulta sem resposta sai do carregamento e permite recuperar a lista', async ({
  page,
}) => {
  test.setTimeout(90_000);
  await page.goto('/login');
  await page
    .getByLabel('E-mail', { exact: true })
    .fill(process.env.E2E_EMAIL || 'admin@nexly.com.br');
  await page.getByLabel('Senha', { exact: true }).fill(process.env.E2E_PASSWORD || 'nexly123');
  await page.getByRole('button', { name: 'Entrar no painel', exact: true }).click();
  await page.waitForURL('**/dashboard');
  let release = () => {};
  let blocked = true;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route('**/api/clientes?*', async (route) => {
    if (!blocked) return route.fallback();
    await gate;
    await route.abort();
  });
  try {
    await page.goto('/clientes');
    await expect(page.getByRole('main').getByRole('alert')).toContainText(
      'Não foi possível carregar os clientes',
      { timeout: 30_000 },
    );
    blocked = false;
    release();
    await page.getByRole('button', { name: 'Tentar novamente', exact: true }).click();
    await expect(page.getByRole('main').getByRole('alert')).toHaveCount(0);
    await expect(page.getByRole('cell', { name: 'Maria Oliveira', exact: true })).toBeVisible();
  } finally {
    release();
    await page.unrouteAll({ behavior: 'wait' });
  }
});
