import { expect, test } from '../fixtures';

test.beforeEach(async ({ page }) => {
  await page.goto('/login');
  await page
    .getByLabel('E-mail', { exact: true })
    .fill(process.env.E2E_EMAIL || 'admin@nexly.com.br');
  await page.getByLabel('Senha', { exact: true }).fill(process.env.E2E_PASSWORD || 'nexly123');
  await page.getByRole('button', { name: 'Entrar no painel', exact: true }).click();
  await page.waitForURL('**/dashboard');
});

for (const status of [503, 429]) {
  test(`recuperação de sessão preserva acesso após resposta temporária ${status}`, async ({
    page,
    baseURL,
  }) => {
    await page.route('**/api/auth/refresh', (route) =>
      route.fulfill({
        status,
        headers: {
          'Access-Control-Allow-Origin': baseURL!,
          'Access-Control-Allow-Credentials': 'true',
          'Access-Control-Expose-Headers': 'Retry-After',
          'Retry-After': '2',
        },
        json: { message: 'Indisponibilidade temporária' },
      }),
    );
    await page.goto('/clientes');
    const gate = page.getByRole('region', { name: 'Recuperar acesso', exact: true });
    await expect(gate).toBeVisible();
    await expect(page).toHaveURL(/\/clientes$/);
    if (status === 429) await expect(gate.getByRole('button')).toBeDisabled();
    await page.unroute('**/api/auth/refresh');
    const retry = gate.getByRole('button', { name: 'Tentar novamente', exact: true });
    await expect(retry).toBeEnabled();
    await retry.click();
    await expect(
      page.getByRole('navigation', { name: 'Menu principal', exact: true }),
    ).toBeAttached();
    await expect(page.getByRole('heading', { name: 'Clientes', exact: true })).toBeVisible();
    await expect(page).toHaveURL(/\/clientes$/);
  });
}

test('sessão confirmada como inválida retorna ao login', async ({ page, baseURL }) => {
  await page.route('**/api/auth/refresh', (route) =>
    route.fulfill({
      status: 401,
      headers: {
        'Access-Control-Allow-Origin': baseURL!,
        'Access-Control-Allow-Credentials': 'true',
      },
      json: { message: 'Sessão expirada' },
    }),
  );
  await page.goto('/clientes');
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole('button', { name: 'Entrar no painel', exact: true })).toBeVisible();
});
