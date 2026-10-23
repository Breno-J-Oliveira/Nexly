import { expect, test } from '../fixtures';
import { PrismaClient } from '@prisma/client';
import { config } from 'dotenv';
import argon2 from 'argon2';
config({ path: 'apps/api/.env' });
test.use({ storageState: { cookies: [], origins: [] } });

test('staff can manage their own password and sessions on mobile', async ({ page }) => {
  test.skip(
    !['localhost', '127.0.0.1'].includes(
      new URL(process.env.DATABASE_URL || 'http://unavailable').hostname,
    ),
    'Fixtures somente locais',
  );
  const p = new PrismaClient();
  const suffix = Date.now();
  const email = `account-${suffix}@example.test`;
  const empresa = await p.empresa.create({
    data: {
      nome: 'TESTE conta pessoal',
      cnpj: `account-${suffix}`,
      usuarios: {
        create: {
          nome: 'TESTE profissional',
          email,
          senhaHash: await argon2.hash('SenhaOriginal123!'),
          role: 'PROFISSIONAL',
        },
      },
    },
  });
  try {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/login');
    await page.getByLabel('E-mail', { exact: true }).fill(email);
    await page.getByLabel('Senha', { exact: true }).fill('SenhaOriginal123!');
    await page.getByRole('button', { name: 'Entrar no painel', exact: true }).click();
    await page.waitForURL('**/dashboard');
    await page
      .getByRole('navigation', { name: 'Navegação mobile' })
      .getByRole('button', { name: 'Buscar páginas' })
      .click();
    const search = page.getByRole('dialog', { name: 'Ir para uma página' });
    await expect(search.getByRole('option', { name: /Painel Geral/ })).toBeVisible();
    await expect(search.getByRole('option', { name: /Usuários|Configurações|PDV/ })).toHaveCount(0);
    await page.keyboard.press('Escape');
    await page.getByRole('button', { name: 'Menu do usuário', exact: true }).click();
    await page.getByRole('link', { name: 'Minha conta', exact: true }).last().click();
    await expect(
      page.getByRole('heading', { name: 'Minha conta', exact: true, level: 2 }),
    ).toBeVisible();
    await expect(page.getByText('Esta sessão', { exact: true })).toBeVisible();
    await expect(
      page.getByRole('button', { name: 'Escolher conta Google', exact: true }),
    ).toBeVisible();
    await page.getByLabel('Senha atual', { exact: true }).fill('SenhaOriginal123!');
    await page.getByLabel('Nova senha', { exact: true }).fill('SenhaNova123!');
    await page.getByLabel('Confirmar nova senha', { exact: true }).fill('Diferente123!');
    await page.getByRole('button', { name: 'Salvar nova senha', exact: true }).click();
    await expect(page.getByRole('alert').filter({ hasText: 'A confirmação deve' })).toBeVisible();
    await page.getByLabel('Confirmar nova senha', { exact: true }).fill('SenhaNova123!');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await page.screenshot({ path: 'test-results/manual/review-conta-mobile.png', fullPage: true });
    await page.getByRole('button', { name: 'Salvar nova senha', exact: true }).click();
    await page.waitForURL('**/login');
    expect(
      await p.authSession.count({ where: { usuario: { empresaId: empresa.id }, revogado: false } }),
    ).toBe(0);
    await page.getByLabel('E-mail', { exact: true }).fill(email);
    await page.getByLabel('Senha', { exact: true }).fill('SenhaNova123!');
    await page.getByRole('button', { name: 'Entrar no painel', exact: true }).click();
    await page.waitForURL('**/dashboard');
  } finally {
    await p.empresa.delete({ where: { id: empresa.id } });
    await p.$disconnect();
  }
});
