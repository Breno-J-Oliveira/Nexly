import { expect, test, Page } from '../fixtures';

test.use({ storageState: { cookies: [], origins: [] } });

// Dublê apenas da UI do provedor: não representa autenticação real no Google.
async function googleUi(page: Page) {
  await page.route('https://accounts.google.com/gsi/client', (route) =>
    route.fulfill({
      contentType: 'application/javascript',
      body: `window.google = { accounts: { id: {
      initialize(options) { this.options = options; },
      renderButton(element) {
        const button = document.createElement('button');
        button.textContent = 'Entrar com Google';
        button.onclick = () => this.options.callback({ credential: 'frontend-test-credential' });
        element.append(button);
      }
    } } };`,
    }),
  );
}

test('Google mantém o segundo fator antes de abrir o painel', async ({ page }) => {
  await googleUi(page);
  await page.route('**/api/auth/google/login', (route) =>
    route.fulfill({ json: { requiresTwoFactor: true, tempToken: 'challenge-only' } }),
  );
  await page.goto('/login');
  await page.getByRole('button', { name: 'Entrar com Google', exact: true }).click();
  await expect(page.getByLabel('Código de verificação em dois fatores')).toBeVisible();
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole('button', { name: 'Verificar', exact: true })).toBeDisabled();
});

test('novo usuário Google continua cadastro com e-mail confirmado e senha alternativa', async ({
  page,
}) => {
  await googleUi(page);
  await page.route('**/api/auth/google/login', (route) =>
    route.fulfill({
      json: {
        requiresRegistration: true,
        registrationToken: 'a'.repeat(64),
        email: 'novo@gmail.com',
        nome: 'Pessoa Google',
      },
    }),
  );
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/login');
  await page.getByRole('button', { name: 'Entrar com Google', exact: true }).click();
  await expect(page).toHaveURL(/\/cadastro$/);
  await expect(page.getByLabel('E-mail', { exact: true })).toHaveValue('novo@gmail.com');
  await expect(page.getByLabel('E-mail', { exact: true })).toHaveAttribute('readonly', '');
  await expect(page.getByRole('status')).toContainText('senha alternativa');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  const storage = await page.evaluate(
    () => `${JSON.stringify(localStorage)} ${JSON.stringify(sessionStorage)}`,
  );
  expect(storage).not.toContain('a'.repeat(64));
  expect(storage).not.toContain('frontend-test-credential');
  await page.getByRole('button', { name: 'Usar outro acesso' }).click();
  await expect(page.getByLabel('E-mail', { exact: true })).not.toHaveAttribute('readonly', '');
});

test('cadastro com Google de usuário existente leva ao segundo fator', async ({ page }) => {
  await googleUi(page);
  await page.route('**/api/auth/google/login', (route) =>
    route.fulfill({ json: { requiresTwoFactor: true, tempToken: 'challenge-only' } }),
  );
  await page.goto('/cadastro');
  await page.getByRole('button', { name: 'Entrar com Google', exact: true }).click();
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByLabel('Código de verificação em dois fatores')).toBeVisible();
});

test('plano escolhido é preservado quando Google pede segundo fator', async ({ page }) => {
  await googleUi(page);
  await page.route('**/api/auth/google/login', (route) =>
    route.fulfill({
      json: { requiresTwoFactor: true, tempToken: 'challenge-only' },
    }),
  );
  await page.goto('/login?next=%2Fassinatura%3Fplano%3DPRO');
  await page.getByRole('button', { name: 'Entrar com Google', exact: true }).click();
  await expect(page.getByLabel('Código de verificação em dois fatores')).toBeVisible();
  await expect(page).toHaveURL(/\/login\?next=%2Fassinatura%3Fplano%3DPRO$/);
});

test('novo usuário Google mantém plano ao continuar o cadastro', async ({ page }) => {
  await googleUi(page);
  await page.route('**/api/auth/google/login', (route) =>
    route.fulfill({
      json: {
        requiresRegistration: true,
        registrationToken: 'a'.repeat(64),
        email: 'novo@gmail.com',
        nome: 'Pessoa Google',
      },
    }),
  );
  await page.goto('/login?next=%2Fassinatura%3Fplano%3DENTERPRISE');
  await page.getByRole('button', { name: 'Entrar com Google', exact: true }).click();
  await expect(page).toHaveURL(/\/cadastro\?next=%2Fassinatura%3Fplano%3DENTERPRISE$/);
  await expect(page.getByLabel('E-mail', { exact: true })).toHaveValue('novo@gmail.com');
});

test('erro de vinculação explica a ação e permite reiniciar Google', async ({ page }) => {
  await googleUi(page);
  await page.route('**/api/auth/google/login', (route) =>
    route.fulfill({
      status: 409,
      json: { message: 'Entre com e-mail e senha e vincule o Google em Minha conta.' },
    }),
  );
  await page.goto('/login');
  await page.getByRole('button', { name: 'Entrar com Google', exact: true }).click();
  await expect(page.getByRole('alert').filter({ hasText: 'Minha conta' })).toBeVisible();
  await page.getByRole('button', { name: 'Tentar novamente', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Entrar com Google', exact: true })).toBeEnabled();
});

test('API real exige origem e cookie e rejeita credencial inválida sem criar sessão', async ({
  request,
}) => {
  const base = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
  test.skip(!['localhost', '127.0.0.1'].includes(new URL(base).hostname), 'Somente API local');
  const origin = process.env.BASE_URL || 'http://localhost:3002';
  const denied = await request.post(`${base}/api/auth/google/challenge`, { data: {} });
  expect(denied.status()).toBe(403);
  const challenge = await request.post(`${base}/api/auth/google/challenge`, {
    headers: { Origin: origin },
    data: {},
  });
  expect(challenge.ok()).toBe(true);
  expect(challenge.headers()['set-cookie']).toContain('HttpOnly');
  const result = await request.post(`${base}/api/auth/google/login`, {
    headers: { Origin: origin },
    data: { credential: 'invalid'.repeat(30) },
  });
  expect(result.status()).toBe(401);
  expect(await result.json()).not.toHaveProperty('accessToken');
  expect(result.headers()['set-cookie']).not.toContain('refreshToken=');
});
