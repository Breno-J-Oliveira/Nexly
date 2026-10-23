import { expect, test } from '../fixtures';
import { PrismaClient } from '@prisma/client';
import { config } from 'dotenv';
import argon2 from 'argon2';
config({ path: 'apps/api/.env' });
test.use({ storageState: { cookies: [], origins: [] } });

test('inventory supports complete search, real alerts, mobile entries and date-only expiry', async ({
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
    stamp = Date.now();
  const email = `stock-ui-${stamp}@example.test`;
  const empresa = await p.empresa.create({
    data: {
      nome: 'TESTE estoque UI',
      cnpj: `stock-ui-${stamp}`,
      usuarios: {
        create: {
          nome: 'TESTE admin',
          email,
          senhaHash: await argon2.hash('EstoqueTeste123!'),
          role: 'ADMIN',
        },
      },
    },
  });
  try {
    await p.produto.createMany({
      data: Array.from({ length: 105 }, (_, i) => ({
        empresaId: empresa.id,
        nome: `Produto ${String(i + 1).padStart(3, '0')}`,
        sku: `SKU-${String(i + 1).padStart(3, '0')}`,
        preco: 10,
        estoqueAtual: 1,
        estoqueMinimo: 1,
        categoria: i === 104 ? 'Especial' : 'Geral',
      })),
    });
    const critical = await p.produto.create({
      data: {
        empresaId: empresa.id,
        nome: 'Reposição crítica',
        sku: 'CRITICAL',
        preco: 10,
        estoqueAtual: 50,
        estoqueMinimo: 100,
        categoria: 'Insumos',
        dataVencimento: new Date('2026-10-15T00:00:00Z'),
      },
    });
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/login');
    await page.getByLabel('E-mail', { exact: true }).fill(email);
    await page.getByLabel('Senha', { exact: true }).fill('EstoqueTeste123!');
    const loginResponse = page.waitForResponse(
      (r) => r.url().endsWith('/api/auth/login') && r.request().method() === 'POST',
    );
    await page.getByRole('button', { name: 'Entrar no painel', exact: true }).click();
    await page.waitForURL('**/dashboard');
    const { accessToken } = await (await loginResponse).json();
    for (const query of ['page=0', 'limit=101', 'vencendoEm=NaN', 'estoqueAbaixoDe=-1']) {
      const response = await page.request.get('http://localhost:3001/api/produtos?' + query, {
        headers: { Authorization: 'Bearer ' + accessToken },
      });
      expect(response.status()).toBe(400);
    }
    const invalidDate = await page.request.put(
      'http://localhost:3001/api/produtos/' + critical.id,
      {
        headers: { Authorization: 'Bearer ' + accessToken },
        data: { dataVencimento: '2026-02-31' },
      },
    );
    expect(invalidDate.status()).toBe(400);
    await page.goto('/estoque');
    await expect(page.getByText('106 resultados · Página 1 de 5', { exact: true })).toBeVisible();
    await expect(page.getByText('1 produto precisa de reposição', { exact: true })).toBeVisible();
    const alerts = page
      .getByRole('alert')
      .filter({ hasText: 'Estoque atual abaixo do mínimo configurado.' });
    await expect(alerts.getByText('Reposição crítica', { exact: true })).toBeVisible();
    await alerts.getByRole('button', { name: 'Dar entrada', exact: true }).click();
    const entry = page.getByRole('dialog', { name: 'Registrar entrada', exact: true });
    await expect(entry).toBeVisible();
    await expect(entry.getByLabel('Produto da entrada')).toHaveValue(critical.id);
    await entry.getByLabel('Quantidade', { exact: true }).fill('60');
    await entry.getByRole('button', { name: 'Registrar Entrada', exact: true }).click();
    await expect(entry).toBeHidden();
    await expect
      .poll(
        async () =>
          (await p.produto.findUniqueOrThrow({ where: { id: critical.id } })).estoqueAtual,
      )
      .toBe(110);
    await expect(alerts).toHaveCount(0);
    await page.getByLabel('Buscar produto', { exact: true }).fill('SKU-105');
    await expect(page.getByText('1 resultado · Página 1 de 1', { exact: true })).toBeVisible();
    await expect(page.getByRole('cell', { name: 'Produto 105', exact: true })).toBeVisible();
    const pattern = '**/api/produtos?*';
    await page.route(pattern, (r) =>
      r.fulfill({
        status: 503,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'Falha temporária de teste' }),
      }),
    );
    await page.getByLabel('Buscar produto', { exact: true }).fill('SKU-104');
    await expect(
      page.getByRole('alert').filter({ hasText: 'Falha temporária de teste' }),
    ).toBeVisible();
    await page.unroute(pattern);
    await page.getByRole('button', { name: 'Tentar novamente', exact: true }).click();
    await expect(page.getByRole('cell', { name: 'Produto 104', exact: true })).toBeVisible();
    await page.goto('/produtos');
    await page.getByLabel('Buscar por nome ou SKU', { exact: true }).fill('CRITICAL');
    const row = page.getByRole('row').filter({ hasText: 'Reposição crítica' });
    await expect(row).toBeVisible();
    await row.getByRole('button', { name: 'Editar', exact: true }).click();
    const edit = page.getByRole('dialog', { name: 'Editar produto', exact: true });
    await expect(edit.getByLabel('Data de vencimento')).toHaveValue('2026-10-15');
    await edit.getByLabel('Data de vencimento').fill('');
    await edit.getByLabel('Categoria', { exact: true }).fill('');
    await edit.getByRole('button', { name: 'Salvar', exact: true }).click();
    await expect(edit).toBeHidden();
    await expect
      .poll(async () => {
        const product = await p.produto.findUniqueOrThrow({ where: { id: critical.id } });
        return product.dataVencimento === null && product.categoria === null;
      })
      .toBe(true);
    await row.getByRole('button', { name: 'Histórico', exact: true }).click();
    const history = page.getByRole('dialog', {
      name: 'Histórico — Reposição crítica',
      exact: true,
    });
    await expect(history.getByText('Entrada manual', { exact: true })).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(history).toBeHidden();
    expect(errors).toEqual([]);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await page.screenshot({
      path: 'test-results/manual/review-estoque-mobile.png',
      fullPage: true,
    });
  } finally {
    await p.empresa.delete({ where: { id: empresa.id } });
    await p.$disconnect();
  }
});
