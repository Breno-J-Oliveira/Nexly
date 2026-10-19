import { expect, test } from '../fixtures';

test.use({ storageState: { cookies: [], origins: [] } });

test('HTML sem JavaScript não envia credenciais pela URL', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto(`${process.env.BASE_URL || 'http://localhost:3002'}/login`);
  await expect(page.locator('form')).toHaveAttribute('method', 'post');
  await expect(page.getByRole('button', { name: 'Entrar no painel' })).toBeDisabled();
  await context.close();
});

test('login tem campos associados e navegação acessível no mobile', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/login');
  await expect(page.locator('form')).toHaveAttribute('method', 'post');
  await expect(page.getByLabel('E-mail', { exact: true })).toBeVisible();
  await expect(page.getByLabel('Senha', { exact: true })).toBeVisible();
  await expect(page.getByRole('link', { name: '← Voltar para o início' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Apple', exact: true })).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  await page.getByRole('button', { name: 'Entrar no painel' }).click();
  await expect(page.getByText('E-mail inválido')).toBeVisible();
});

test('cadastro chega à revisão sem pedir cartão e exige aceite', async ({ page }) => {
  await page.goto('/cadastro');
  await expect(page.getByRole('button', { name: 'Continuar', exact: true })).toBeEnabled();
  await page.getByLabel('E-mail', { exact: true }).fill('teste@example.test');
  await page.getByLabel('Senha', { exact: true }).fill('SenhaSegura123!');
  await page.getByRole('button', { name: 'Continuar', exact: true }).click();
  await page.getByLabel('Nome da empresa', { exact: true }).fill('Empresa de teste');
  await page.getByLabel('Segmento').selectOption('psicologia');
  await page.getByRole('button', { name: 'Continuar', exact: true }).click();
  await expect(page.getByLabel('Modelo do negócio')).toHaveValue('psicologia');
  await expect(page.getByRole('button', { name: /^PDV/ })).toHaveAttribute('aria-pressed', 'false');
  await expect(page.getByRole('button', { name: /^Agenda/ })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await page.getByRole('button', { name: 'Continuar', exact: true }).click();
  await expect(page.getByText('Acesso gratuito', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Continuar', exact: true }).click();
  await expect(page.getByText('Confira seu cadastro')).toBeVisible();
  await page.getByLabel('Nome do responsável', { exact: true }).fill('Pessoa de teste');
  await page.getByLabel('CNPJ', { exact: true }).fill('11.222.333/0001-81');
  await page.getByLabel('Telefone do negócio').fill('(11) 99999-9999');
  await page.getByLabel('Cidade', { exact: true }).fill('São Paulo');
  await expect(page.getByLabel('Número do cartão')).toHaveCount(0);
  await expect(page.getByLabel('CVV')).toHaveCount(0);
  await page.getByRole('button', { name: 'Criar conta e acessar' }).click();
  await expect(
    page.getByText('Aceite os Termos de Uso e a Política de Privacidade para continuar.'),
  ).toBeVisible();
});

test('recuperação não confirma envio de e-mail indisponível', async ({ page }) => {
  await page.goto('/recuperar-senha');
  await expect(page.getByRole('status')).toContainText('Recuperação por e-mail indisponível');
  await expect(page.getByRole('button', { name: 'Enviar instruções' })).toHaveCount(0);
  await page.getByRole('link', { name: 'Voltar ao login', exact: true }).click();
  await expect(page).toHaveURL(/\/login$/);
});
