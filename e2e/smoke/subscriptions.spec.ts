import { expect, test } from '../fixtures';

test.use({ storageState: { cookies: [], origins: [] } });
const subscriptionState = {
  disponivel: false,
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
};
test.beforeEach(async ({ page, baseURL }) => {
  // O estado da cobrança é controlado neste teste de interface; login e API são reais.
  await page.route(/\/api\/assinaturas(?:\/atualizar-status)?$/, (route) =>
    route.fulfill({
      headers: {
        'Access-Control-Allow-Origin': baseURL!,
        'Access-Control-Allow-Credentials': 'true',
      },
      json: subscriptionState,
    }),
  );
  await page.goto('/login');
  await page
    .getByLabel('E-mail', { exact: true })
    .fill(process.env.E2E_EMAIL || 'admin@nexly.com.br');
  await page.getByLabel('Senha', { exact: true }).fill(process.env.E2E_PASSWORD || 'nexly123');
  await page.getByRole('button', { name: 'Entrar no painel', exact: true }).click();
  await page.waitForURL('**/dashboard');
});

test('assinaturas sem credenciais preservam acesso e não oferecem cobrança real', async ({
  page,
}) => {
  await page.goto('/assinatura');
  await expect(
    page.getByRole('main').getByRole('heading', { name: 'Plano e assinatura', exact: true }),
  ).toBeVisible();
  const plans = page.getByRole('region', { name: 'Planos mensais' });
  await expect(page.getByRole('heading', { name: 'Como está sendo usar o Nexly?' })).toHaveCount(0);
  await expect(plans.getByRole('article')).toHaveCount(3);
  for (const name of ['Essencial', 'Profissional', 'Empresarial']) {
    await expect(plans.getByRole('button', { name: `Testar ${name}`, exact: true })).toBeDisabled();
  }
  await expect(page.getByText('A contratação está em preparação.', { exact: false })).toBeVisible();
  await page.getByRole('button', { name: 'Atualizar status', exact: true }).click();
  await expect(page.getByRole('region', { name: 'Sua assinatura' })).toContainText(
    'Sem assinatura',
  );
  await page.goto('/configuracoes');
  await page.getByRole('button', { name: 'Plano e Assinatura', exact: true }).click();
  await page.getByRole('link', { name: 'Gerenciar assinatura →', exact: true }).click();
  await expect(page).toHaveURL(/\/assinatura$/);
});

test('retorno do checkout não anuncia pagamento confirmado', async ({ page }) => {
  await page.goto('/assinatura?retorno=sucesso');
  await expect(
    page.getByRole('status').filter({ hasText: 'Você voltou do checkout' }),
  ).toContainText('só fica ativa após a confirmação');
  await expect(page.getByRole('region', { name: 'Sua assinatura' })).toContainText(
    'Sem assinatura',
  );
});

test('falha de carregamento permite tentar novamente e a tela cabe no celular', async ({
  page,
  baseURL,
}) => {
  let attempts = 0;
  await page.route('**/api/assinaturas', async (route) => {
    attempts += 1;
    if (attempts === 1)
      await route.fulfill({
        status: 503,
        headers: {
          'Access-Control-Allow-Origin': baseURL!,
          'Access-Control-Allow-Credentials': 'true',
        },
        json: { message: 'Unavailable' },
      });
    else await route.fallback();
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/assinatura');
  await expect(
    page.getByRole('alert').filter({ hasText: 'Não foi possível carregar' }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Tentar novamente', exact: true }).click();
  await expect(page.getByRole('region', { name: 'Planos mensais' })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: 'docs/assinatura-390.png', fullPage: true });
});

test('produção mostra contratação real e não apresenta instruções de Sandbox', async ({
  page,
  baseURL,
}) => {
  await page.route('**/api/assinaturas', (route) =>
    route.fulfill({
      headers: {
        'Access-Control-Allow-Origin': baseURL!,
        'Access-Control-Allow-Credentials': 'true',
      },
      json: { ...subscriptionState, ambiente: 'live', disponivel: true },
    }),
  );
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/assinatura');
  await expect(page.getByRole('button', { name: 'Assinar Essencial', exact: true })).toBeEnabled();
  await expect(page.getByText('Ambiente de testes do Stripe.', { exact: true })).toHaveCount(0);
  await expect(page.getByText(/Assinatura mensal com renovação automática/)).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('botão de checkout envia somente o plano e bloqueia redirecionamento fora do Stripe', async ({
  page,
  baseURL,
}) => {
  const headers = {
    'Access-Control-Allow-Origin': baseURL!,
    'Access-Control-Allow-Credentials': 'true',
  };
  await page.route('**/api/assinaturas', (route) =>
    route.fulfill({
      headers,
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
  let body: unknown;
  await page.route('**/api/assinaturas/checkout', async (route) => {
    body = route.request().postDataJSON();
    await route.fulfill({ headers, json: { url: 'https://example.com/unsafe' } });
  });
  await page.goto('/assinatura');
  await page.getByRole('button', { name: 'Testar Profissional', exact: true }).click();
  expect(body).toEqual({ plano: 'PRO' });
  await expect(
    page.getByRole('alert').filter({ hasText: 'Não foi possível abrir o Stripe' }),
  ).toBeVisible();
  await expect(page).toHaveURL(/\/assinatura$/);
});
