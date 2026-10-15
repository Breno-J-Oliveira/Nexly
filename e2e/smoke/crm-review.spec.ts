import { expect, test } from '@playwright/test';
import { PrismaClient } from '@prisma/client';
import { config } from 'dotenv';
import argon2 from 'argon2';
config({ path: 'apps/api/.env' });
test.use({ storageState: { cookies: [], origins: [] } });

test('customers support pagination, notes, keyboard focus and recovery from a network error', async ({
  page,
}) => {
  test.setTimeout(120000);
  test.skip(
    !['localhost', '127.0.0.1'].includes(
      new URL(process.env.DATABASE_URL || 'http://unavailable').hostname,
    ),
    'Fixtures somente locais',
  );
  const p = new PrismaClient(),
    suffix = Date.now();
  const email = `crm-ui-${suffix}@example.test`;
  const empresa = await p.empresa.create({
    data: {
      nome: 'TESTE CRM UI',
      cnpj: `crm-ui-${suffix}`,
      usuarios: {
        create: {
          nome: 'TESTE administrador',
          email,
          senhaHash: await argon2.hash('CRMTeste123!'),
          role: 'ADMIN',
        },
      },
    },
  });
  try {
    await p.cliente.createMany({
      data: Array.from({ length: 105 }, (_, index) => ({
        empresaId: empresa.id,
        nome: `Cliente ${String(index + 1).padStart(3, '0')}`,
      })),
    });
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/login');
    await page.getByLabel('E-mail', { exact: true }).fill(email);
    await page.getByLabel('Senha', { exact: true }).fill('CRMTeste123!');
    await page.getByRole('button', { name: 'Entrar no painel', exact: true }).click();
    await page.waitForURL('**/dashboard');
    await page.goto('/clientes');
    await expect(page.getByText('Página 1 de 5', { exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Próxima', exact: true }).click();
    await expect(page.getByText('Página 2 de 5', { exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: /Cliente 026/ })).toBeVisible();
    await expect(page.getByRole('button', { name: /Cliente 001/ })).toHaveCount(0);
    await page.getByLabel('Buscar cliente', { exact: true }).fill('Cliente 001');
    await expect(page.getByText('Página 1 de 1', { exact: true })).toBeVisible();
    const card = page.getByRole('button', { name: /Cliente 001/ });
    await card.click();
    const detail = page.getByRole('dialog', { name: 'Detalhes do cliente', exact: true });
    await expect(detail).toBeVisible();
    await detail.getByRole('button', { name: 'Observações', exact: true }).click();
    const notas = 'Preferência registrada durante teste local.';
    await detail.getByLabel('Observações do cliente').fill(notas);
    await detail.getByRole('button', { name: 'Salvar observação', exact: true }).click();
    const toast = page.locator('[data-sonner-toast]').filter({ hasText: 'Observações salvas' });
    await expect(toast).toBeVisible();
    await expect
      .poll(async () => {
        const message = await toast.boundingBox();
        const navigation = await page
          .getByRole('navigation', { name: 'Navegação mobile', exact: true })
          .boundingBox();
        return !!message && !!navigation && message.y + message.height <= navigation.y;
      })
      .toBe(true);

    await expect
      .poll(
        async () =>
          (await p.cliente.findFirst({ where: { empresaId: empresa.id, nome: 'Cliente 001' } }))
            ?.observacoes,
      )
      .toBe(notas);
    await expect(detail.getByRole('button', { name: 'Observações', exact: true })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    await expect(
      detail.getByRole('button', { name: 'Salvar observação', exact: true }),
    ).toBeDisabled();
    await page.keyboard.press('Escape');
    await expect(detail).toBeHidden();
    await expect(card).toBeFocused();
    await card.click();
    await detail.getByRole('button', { name: 'Observações', exact: true }).click();
    await expect(detail.getByLabel('Observações do cliente')).toHaveValue(notas);
    await page.keyboard.press('Escape');
    const pattern = '**/api/clientes?*';
    await page.route(pattern, (route) =>
      route.fulfill({
        status: 503,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'Teste indisponível' }),
      }),
    );
    await page.getByLabel('Buscar cliente', { exact: true }).fill('Cliente 002');
    await expect(
      page.getByRole('alert').filter({ hasText: 'Não foi possível carregar os clientes' }),
    ).toBeVisible();
    await page.unroute(pattern);
    await page.getByRole('button', { name: 'Tentar novamente', exact: true }).click();
    await expect(page.getByRole('button', { name: /Cliente 002/ })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await page.screenshot({ path: 'docs/review-clientes-mobile.png', fullPage: false });
    expect(errors).toEqual([]);
  } finally {
    await p.cliente.deleteMany({ where: { empresaId: empresa.id } });
    await p.empresa.delete({ where: { id: empresa.id } });
    await p.$disconnect();
  }
});
