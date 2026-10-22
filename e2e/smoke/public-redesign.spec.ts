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
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Seu negócio conectado.');
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

test('landing mostra o produto, dez dúvidas e um caminho para falar com a equipe', async ({
  page,
}) => {
  await page.goto('/');
  await expect(page.getByRole('tablist', { name: 'Explorar prévia do Nexly' })).toHaveCount(0);
  const photos = page.locator('main img[src*="-demo.webp"]');
  await expect(photos).toHaveCount(4);
  for (const photo of await photos.all()) {
    await photo.scrollIntoViewIfNeeded();
    await expect
      .poll(() => photo.evaluate((img) => (img as HTMLImageElement).naturalWidth))
      .toBeGreaterThan(0);
  }
  await expect(page.locator('main details')).toHaveCount(10);
  await page.getByText('Meus clientes podem agendar pela internet?', { exact: true }).click();
  await expect(
    page.getByText('Sim. Configure sua página de agendamento', { exact: false }),
  ).toBeVisible();
  await page.getByRole('link', { name: 'Tirar uma dúvida com a equipe' }).click();
  await expect(page).toHaveURL(/suporte#contato-suporte$/);
  await expect(page.getByRole('link', { name: 'Enviar e-mail ao suporte' })).toBeVisible();
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
