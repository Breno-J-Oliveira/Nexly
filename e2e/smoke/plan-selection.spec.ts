import { expect, test, Page } from '../fixtures';

test.use({ storageState: { cookies: [], origins: [] } });

async function login(page: Page) {
  await page
    .getByLabel('E-mail', { exact: true })
    .fill(process.env.E2E_EMAIL || 'admin@nexly.com.br');
  await page.getByLabel('Senha', { exact: true }).fill(process.env.E2E_PASSWORD || 'nexly123');
  await page.getByRole('button', { name: 'Entrar no painel', exact: true }).click();
}

test.beforeEach(async ({ page, baseURL }) => {
  await page.route('**/api/assinaturas', (route) =>
    route.fulfill({
      headers: {
        'Access-Control-Allow-Origin': baseURL!,
        'Access-Control-Allow-Credentials': 'true',
      },
      json: {
        disponivel: true,
        ambiente: 'test',
        plano: 'FREE',
        status: 'none',
        periodoFim: null,
        cancelarEm: null,
        podeGerenciar: false,
        emAndamento: false,
        planos: [
          { id: 'BASIC', nome: 'Essencial', centavos: 4900 },
          { id: 'PRO', nome: 'Profissional', centavos: 9900 },
          { id: 'ENTERPRISE', nome: 'Empresarial', centavos: 19900 },
        ],
      },
    }),
  );
});

test('visitante escolhe plano, alterna cadastro e login e chega à assinatura sem iniciar cobrança', async ({
  page,
}) => {
  let checkoutRequests = 0;
  await page.route('**/api/assinaturas/checkout', async (route) => {
    checkoutRequests++;
    await route.abort();
  });
  await page.goto('/precos');
  await page.getByRole('link', { name: 'Escolher Profissional', exact: true }).click();
  await expect(page).toHaveURL(/\/login\?next=%2Fassinatura%3Fplano%3DPRO$/);
  await page.getByRole('link', { name: 'Criar conta', exact: true }).click();
  await expect(page).toHaveURL(/\/cadastro\?next=%2Fassinatura%3Fplano%3DPRO$/);
  await page.getByRole('link', { name: 'Entrar', exact: true }).click();
  await expect(page).toHaveURL(/\/login\?next=%2Fassinatura%3Fplano%3DPRO$/);
  await login(page);
  await expect(page).toHaveURL(/\/assinatura\?plano=PRO$/);
  await expect(
    page.getByRole('status').filter({ hasText: 'Você escolheu Profissional' }),
  ).toBeVisible();
  expect(checkoutRequests).toBe(0);
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: 'test-results/manual/plano-escolhido-390.png', fullPage: true });
});

test('cliente autenticado escolhe outro plano sem precisar entrar novamente', async ({ page }) => {
  await page.goto('/login');
  await login(page);
  await page.waitForURL('**/dashboard');
  await page.goto('/precos');
  await page.getByRole('link', { name: 'Escolher Empresarial', exact: true }).click();
  await expect(page).toHaveURL(/\/assinatura\?plano=ENTERPRISE$/);
  await expect(
    page.getByRole('status').filter({ hasText: 'Você escolheu Empresarial' }),
  ).toBeVisible();
});

test('destino externo adulterado não redireciona o cliente após entrar', async ({ page }) => {
  await page.goto('/login?next=https%3A%2F%2Fexample.com');
  await login(page);
  await expect(page).toHaveURL(/\/dashboard$/);
});

test('preços explica contratação e cancelamento e cabe no celular', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/precos');
  await expect(
    page.getByText('a contratação ainda não está habilitada', { exact: false }),
  ).toHaveCount(0);
  await expect(page.getByText('A assinatura é mensal', { exact: false })).toBeVisible();
  await page.getByText('Como cancelo minha assinatura?', { exact: true }).click();
  await expect(page.getByText('O cancelamento é agendado', { exact: false })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
