import { expect, test } from '../fixtures';
import { PrismaClient } from '@prisma/client';
import { config } from 'dotenv';
import argon2 from 'argon2';
import { readFile } from 'node:fs/promises';
config({ path: 'apps/api/.env', quiet: true });
test.use({ storageState: { cookies: [], origins: [] }, timezoneId: 'America/Sao_Paulo' });

test('sales show complete totals, real product details and local-day CSV filters', async ({
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
  const email = `sales-ui-${stamp}@example.test`;
  const empresa = await p.empresa.create({
    data: {
      nome: 'TESTE vendas UI',
      cnpj: `sales-ui-${stamp}`,
      usuarios: {
        create: {
          nome: 'TESTE admin',
          email,
          senhaHash: await argon2.hash('VendasTeste123!'),
          role: 'ADMIN',
        },
      },
    },
  });
  try {
    const produto = await p.produto.create({
      data: {
        empresaId: empresa.id,
        nome: 'Produto real da venda',
        sku: 'SALE',
        preco: 10,
        estoqueAtual: 500,
      },
    });
    const cliente = await p.cliente.create({
      data: { empresaId: empresa.id, nome: 'Cliente de vendas' },
    });
    const vendas = Array.from({ length: 107 }, (_, index) => ({
      id: crypto.randomUUID(),
      empresaId: empresa.id,
      clienteId: cliente.id,
      total: index === 104 ? 11 : index === 105 ? 20 : index === 106 ? 50 : 10,
      createdAt: new Date(
        index === 104
          ? '2026-10-15T02:59:00Z'
          : index === 105
            ? '2026-10-16T02:59:00Z'
            : index === 106
              ? '2026-10-16T03:01:00Z'
              : '2026-10-15T12:00:00Z',
      ),
    }));
    await p.venda.createMany({ data: vendas });
    await p.itemVenda.createMany({
      data: vendas.map((v) => ({
        vendaId: v.id,
        produtoId: produto.id,
        quantidade: 1,
        precoUnitario: v.total,
      })),
    });
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/login');
    await page.getByLabel('E-mail', { exact: true }).fill(email);
    await page.getByLabel('Senha', { exact: true }).fill('VendasTeste123!');
    await page.getByRole('button', { name: 'Entrar no painel', exact: true }).click();
    await page.waitForURL('**/dashboard');
    await page.goto('/vendas');
    await expect(page.getByText('107 resultados · Página 1 de 5', { exact: true })).toBeVisible();
    await expect(page.getByText('Total em Vendas', { exact: true }).locator('..')).toContainText(
      '1.121,00',
    );
    await page.getByRole('button', { name: 'Próxima', exact: true }).click();
    await expect(page.getByText('107 resultados · Página 2 de 5', { exact: true })).toBeVisible();
    await page
      .getByRole('button', { name: /Cliente de vendas/ })
      .first()
      .click();
    const detail = page.getByRole('dialog', { name: 'Detalhes da Venda', exact: true });
    await expect(detail.getByText('Produto real da venda', { exact: true })).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(detail).toBeHidden();
    await page.getByRole('button', { name: 'Filtros', exact: true }).click();
    await page.getByLabel('De', { exact: true }).fill('2026-10-15');
    await page.getByLabel('Até', { exact: true }).fill('2026-10-15');
    await page.getByRole('button', { name: 'Filtrar', exact: true }).click();
    await expect(page.getByText('105 resultados · Página 1 de 5', { exact: true })).toBeVisible();
    await expect(page.getByText('Total em Vendas', { exact: true }).locator('..')).toContainText(
      '1.060,00',
    );
    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Exportar CSV (até 500 vendas)', exact: true }).click();
    const download = await downloadPromise;
    await download.saveAs('test-results/manual/review-sales-filter.csv');
    const csv = await readFile('test-results/manual/review-sales-filter.csv', 'utf8');
    expect(csv.trim().split('\n')).toHaveLength(106);
    expect(csv).toContain('2026-10-16T02:59:00.000Z');
    expect(csv).not.toContain('2026-10-16T03:01:00.000Z');
    await page.getByRole('button', { name: 'Limpar', exact: true }).click();
    await expect(page.getByText('107 resultados · Página 1 de 5', { exact: true })).toBeVisible();
    expect(errors).toEqual([]);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await page.screenshot({ path: 'test-results/manual/review-vendas-mobile.png', fullPage: true });
  } finally {
    await p.empresa.delete({ where: { id: empresa.id } });
    await p.$disconnect();
  }
});
