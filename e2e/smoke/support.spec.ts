import { expect, test } from '../fixtures';

test.use({ storageState: { cookies: [], origins: [] } });

test('suporte público mostra contato autorizado e navegação acessível no celular', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/precos');
  await page.getByRole('link', { name: 'Ajuda e suporte', exact: true }).click();
  await expect(page).toHaveURL(/\/suporte$/);
  await expect(
    page.getByRole('heading', { name: 'Como podemos ajudar?', exact: true }),
  ).toBeVisible();
  await expect(page.getByText('breno.emailsenai@gmail.com', { exact: true })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Enviar e-mail ao suporte' })).toHaveAttribute(
    'href',
    'mailto:breno.emailsenai@gmail.com?subject=Ajuda%20com%20o%20Nexly',
  );
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: 'docs/suporte-390.png', fullPage: true });
  await page.getByRole('link', { name: '← Voltar para o início', exact: true }).click();
  await expect(page).toHaveURL(/\/$/);
});

test('suporte fica disponível dentro do painel e no caminho de privacidade', async ({ page }) => {
  await page.goto('/login');
  await page
    .getByLabel('E-mail', { exact: true })
    .fill(process.env.E2E_EMAIL || 'admin@nexly.com.br');
  await page.getByLabel('Senha', { exact: true }).fill(process.env.E2E_PASSWORD || 'nexly123');
  await page.getByRole('button', { name: 'Entrar no painel', exact: true }).click();
  await page.waitForURL('**/dashboard');
  await page.getByRole('button', { name: 'Menu do usuário', exact: true }).click();
  await page.getByRole('link', { name: 'Ajuda e suporte', exact: true }).click();
  await expect(page).toHaveURL(/\/suporte$/);
  await page.goto('/privacidade');
  await page.getByRole('link', { name: 'página de suporte', exact: true }).click();
  await expect(page).toHaveURL(/\/suporte$/);
});
