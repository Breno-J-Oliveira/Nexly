import { expect, test } from '../fixtures';

const protectedRoutes = [
  'dashboard',
  'agenda',
  'clientes',
  'profissionais',
  'servicos',
  'estoque',
  'pdv',
  'vendas',
  'relatorios',
  'configuracoes',
  'produtos',
  'usuarios',
  'comissao',
  'fidelidade',
  'estoque/pedidos',
  'meu-nexly',
];
const publicRoutes = [
  '',
  'funcionalidades',
  'precos',
  'termos',
  'privacidade',
  'blog',
  'cadastro',
  'login',
  'recuperar-senha',
  'aceitar-convite',
];

// Refresh tokens rotate once: each browser context needs its own fresh session.
test.use({ storageState: { cookies: [], origins: [] } });
test.beforeEach(async ({ page }) => {
  await page.goto('/login');
  await expect(page.getByRole('button', { name: 'Entrar no painel' })).toBeEnabled();
  await page
    .getByLabel('E-mail', { exact: true })
    .fill(process.env.E2E_EMAIL || 'admin@nexly.com.br');
  await page.getByLabel('Senha', { exact: true }).fill(process.env.E2E_PASSWORD || 'nexly123');
  await page.getByRole('button', { name: 'Entrar no painel' }).click();
  await page.waitForURL('**/dashboard');
});

for (const width of [1440, 390]) {
  test(`all pages fit the viewport at ${width}px`, async ({ page }) => {
    test.setTimeout(360_000);
    await page.setViewportSize({ width, height: width === 390 ? 844 : 900 });
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    for (const route of [...protectedRoutes, ...publicRoutes]) {
      const response = await page.goto(`/${route}`);
      expect(response?.status(), route).toBeLessThan(400);
      if (protectedRoutes.includes(route)) {
        // A bateria percorre dezenas de rotas: respeita o limite real do servidor.
        const menu = page.getByRole('navigation', { name: 'Menu principal', exact: true });
        const recovery = page.getByRole('region', { name: 'Recuperar acesso', exact: true });
        await expect(menu.or(recovery)).toBeAttached();
        if (await recovery.isVisible()) {
          const retry = recovery.getByRole('button', { name: 'Tentar novamente', exact: true });
          await expect(retry).toBeEnabled({ timeout: 70_000 });
          await retry.click();
        }
        await expect(menu).toBeAttached();
      }
      await expect(page.locator('body')).not.toBeEmpty();
      await page.evaluate(() => document.fonts.ready);
      // Wait for hydration/route-owned controls, then check document-level overflow.
      await page.waitForTimeout(500);
      if (protectedRoutes.includes(route)) await expect(page).toHaveURL(new RegExp(`/${route}$`));
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1),
        `/${route} overflows at ${width}px`,
      ).toBe(true);
    }
    expect(errors).toEqual([]);
  });
}

test('catalogue and service detail remain interactive', async ({ page }) => {
  await page.goto('/pdv');
  const catalogue = page.locator('main button').filter({ hasText: 'Estoque:' });
  await expect(catalogue.first()).toBeVisible();
  await catalogue.first().click();
  await expect(page.getByRole('button', { name: 'Finalizar Venda', exact: true })).toBeEnabled();
  await page.goto('/servicos');
  await expect(page.getByText('Detalhes do Serviço', { exact: true })).toBeVisible();
  await page.getByLabel('Buscar serviço').fill('no-matching-service');
  await expect(page.locator('main tbody tr')).toHaveCount(0);
});

test('mobile toolbar and inspectors support touch and keyboard', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/servicos');
  const title = page.getByRole('heading', { name: 'Serviços', exact: true });
  const create = page.getByRole('button', { name: '+ Novo serviço', exact: true }).first();
  await expect(create).toBeVisible();
  const headingBox = await title.boundingBox();
  const buttonBox = await create.boundingBox();
  expect(Math.abs(headingBox!.y - buttonBox!.y)).toBeLessThan(20);
  const searchBox = await page.getByLabel('Buscar serviço').boundingBox();
  expect(searchBox!.y).toBeGreaterThan(buttonBox!.y + buttonBox!.height);

  const card = page.getByRole('button', { name: /Barba/ }).first();
  await card.click();
  const details = page.getByRole('dialog', { name: 'Detalhes do Serviço', exact: true });
  await expect(details).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(details).toBeHidden();
  await expect(card).toBeFocused();

  await create.click();
  const form = page.getByRole('dialog', { name: 'Novo serviço', exact: true });
  await expect(form).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(form).toBeHidden();
  await expect(create).toBeFocused();
});
