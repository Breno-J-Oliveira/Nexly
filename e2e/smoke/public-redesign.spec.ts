import { expect, test } from '../fixtures';

test.use({ storageState: { cookies: [], origins: [] } });

test('erro inesperado da rota preserva o documento e permite recuperar o painel', async ({
  page,
}) => {
  await page.goto('/login');
  await page
    .getByLabel('E-mail', { exact: true })
    .fill(process.env.E2E_EMAIL || 'admin@nexly.com.br');
  await page.getByLabel('Senha', { exact: true }).fill(process.env.E2E_PASSWORD || 'nexly123');
  await page.getByRole('button', { name: 'Entrar no painel', exact: true }).click();
  await page.waitForURL('**/dashboard');
  // Resposta deliberadamente incompatível para exercitar o error boundary real do Next.
  await page.route('**/api/dashboard', (route) =>
    route.fulfill({
      headers: {
        'Access-Control-Allow-Origin': route.request().headers().origin || 'http://localhost:3002',
        'Access-Control-Allow-Credentials': 'true',
      },
      json: { permissoes: null },
    }),
  );
  await page.goto('/dashboard');
  await expect(page.getByRole('heading', { name: 'Algo deu errado', exact: true })).toBeVisible();
  await expect(page.locator('html')).toHaveCount(1);
  await expect(page.locator('body')).toHaveCount(1);
  await expect(page.getByText('Cannot read properties', { exact: false })).toHaveCount(0);
  await page.unroute('**/api/dashboard');
  await page.getByRole('button', { name: 'Tentar de novo', exact: true }).click();
  await expect(
    page.getByRole('navigation', { name: 'Menu principal', exact: true }),
  ).toBeAttached();
  await expect(page.getByRole('heading', { name: 'Algo deu errado', exact: true })).toHaveCount(0);
});

test('endereço inexistente mantém identidade visual e oferece retorno ao início', async ({
  page,
}) => {
  const response = await page.goto('/pagina-inexistente-verificacao');
  expect(response?.status()).toBe(404);
  const main = page.getByRole('main');
  await expect(main.getByRole('heading', { level: 1 })).toContainText('Vamos encontrar');
  await main.getByRole('link', { name: 'Voltar para o início', exact: true }).click();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Seu negócio em ordem.');
});

test('recomendações inválidas não quebram a landing e podem ser recarregadas', async ({ page }) => {
  let payload: unknown = [
    { id: 'bad', nomePublico: 'Teste', ocupacao: 'Teste', texto: 'Teste', nota: 6 },
  ];
  await page.route('**/api/experiencia/recomendacoes', (route) =>
    route.fulfill({ headers: { 'Access-Control-Allow-Origin': '*' }, json: payload }),
  );
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/');
  await expect(
    page
      .getByRole('status')
      .filter({ hasText: 'As recomendações estão temporariamente indisponíveis.' }),
  ).toBeVisible();
  payload = [
    {
      id: 'valid',
      nomePublico: 'Pessoa de teste',
      ocupacao: 'Negócio de teste',
      texto: 'Depoimento fictício exclusivo do teste automatizado.',
      nota: 5,
    },
  ];
  await page.getByRole('button', { name: 'Carregar recomendações novamente', exact: true }).click();
  await expect(page.getByText('Pessoa de teste', { exact: true })).toBeVisible();
  await expect(page.getByLabel('Nota 5 de 5')).toBeVisible();
  expect(errors).toEqual([]);
});

test('prévia demonstra os módulos com clique e teclado sem acionar a operação real', async ({
  page,
}) => {
  const mutations: string[] = [];
  page.on('request', (request) => {
    // O provedor global verifica a sessão ao abrir a página; a demonstração não altera dados.
    if (
      request.url().includes('/api/') &&
      !request.url().endsWith('/api/auth/refresh') &&
      request.method() !== 'GET' &&
      request.method() !== 'OPTIONS'
    )
      mutations.push(request.url());
  });
  await page.goto('/');
  const preview = page.getByRole('tablist', { name: 'Explorar prévia do Nexly' });
  const overview = preview.getByRole('tab', { name: 'Visão geral' });
  await expect(overview).toHaveAttribute('aria-selected', 'true');
  await overview.focus();
  await page.keyboard.press('ArrowRight');
  await expect(preview.getByRole('tab', { name: 'Agenda', exact: true })).toBeFocused();
  await expect(page.getByRole('tabpanel')).toContainText('Marina Souza');
  await page.keyboard.press('End');
  await expect(preview.getByRole('tab', { name: 'Estoque', exact: true })).toBeFocused();
  await expect(page.getByRole('tabpanel')).toContainText('Óleo finalizador');
  await page.keyboard.press('ArrowRight');
  await expect(overview).toBeFocused();
  await preview.getByRole('tab', { name: 'Agenda', exact: true }).click();
  await expect(page.getByRole('tabpanel')).toContainText('Corte e finalização');
  await expect(
    page.getByText('Prévia interativa · dados de exemplo', { exact: true }),
  ).toBeVisible();
  expect(mutations).toEqual([]);
});

for (const width of [390, 1440]) {
  test(`páginas públicas cabem em ${width}px e oferecem navegação de retorno`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    for (const path of [
      '/',
      '/funcionalidades',
      '/precos',
      '/blog',
      '/suporte',
      '/termos',
      '/privacidade',
      '/login',
      '/cadastro',
      '/recuperar-senha',
      '/redefinir-senha',
    ]) {
      const response = await page.goto(path);
      expect(response?.status(), path).toBe(200);
      await expect(page.getByRole('heading', { level: 1 }), path).toHaveCount(1);
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
        path,
      ).toBe(true);
      expect(await page.locator('a[href="/"]:visible').count(), path).toBeGreaterThan(0);
      if (['/', '/login', '/precos', '/privacidade'].includes(path))
        await page.screenshot({
          path: `docs/redesign-${path === '/' ? 'inicio' : path.slice(1)}-${width}.png`,
          fullPage: true,
        });
    }
    expect(errors).toEqual([]);
  });
}
