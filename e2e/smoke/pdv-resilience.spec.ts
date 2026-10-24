import { expect, test } from '../fixtures';
import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import argon2 from 'argon2';

test.use({ storageState: { cookies: [], origins: [] } });

test('PDV valida descontos, congela a venda em envio e recupera resposta perdida sem duplicar', async ({
  page,
}) => {
  test.setTimeout(180_000);
  test.skip(
    !['localhost', '127.0.0.1'].includes(
      new URL(process.env.DATABASE_URL || 'http://unavailable').hostname,
    ),
    'Somente banco local',
  );
  const db = new PrismaClient();
  const id = randomUUID();
  const email = `pdv-resilience-${id}@example.test`;
  const empresa = await db.empresa.create({
    data: {
      nome: 'TESTE resiliência PDV',
      cnpj: id,
      usuarios: {
        create: {
          nome: 'Operador de teste',
          email,
          role: 'ADMIN',
          senhaHash: await argon2.hash('PdvTeste123!'),
        },
      },
    },
  });
  let release = () => {};
  try {
    const produto = await db.produto.create({
      data: {
        empresaId: empresa.id,
        nome: 'Produto de teste',
        sku: 'PDV',
        preco: 10,
        estoqueAtual: 5,
      },
    });
    await db.produto.createMany({
      data: [
        {
          empresaId: empresa.id,
          nome: 'Item dez centavos',
          sku: 'C10',
          preco: 0.1,
          estoqueAtual: 1,
        },
        {
          empresaId: empresa.id,
          nome: 'Item setenta centavos',
          sku: 'C70',
          preco: 0.7,
          estoqueAtual: 1,
        },
      ],
    });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/login');
    await page.getByLabel('E-mail', { exact: true }).fill(email);
    await page.getByLabel('Senha', { exact: true }).fill('PdvTeste123!');
    await page.getByRole('button', { name: 'Entrar no painel', exact: true }).click();
    await page.waitForURL('**/dashboard');
    await page.goto('/pdv');
    await page.getByRole('button', { name: /Produto de teste Estoque/ }).click();
    await page.getByRole('button', { name: 'Finalizar Venda', exact: true }).click();
    await page.getByLabel('Desconto', { exact: true }).fill('-5');
    await expect(page.getByRole('alert').filter({ hasText: 'desconto' })).toBeVisible();
    await expect(page.getByRole('button', { name: /^Finalizar —/ })).toBeDisabled();
    await page.getByLabel('Desconto', { exact: true }).fill('5');
    await expect(page.getByRole('button', { name: /^Finalizar —/ })).toContainText('5,00');
    await expect(page.getByRole('button', { name: /Pix/, exact: false })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    let sent = 0;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    await page.route('**/api/vendas', async (route) => {
      if (route.request().method() !== 'POST') return route.fallback();
      sent++;
      if (sent !== 1) return route.continue();
      const response = await route.fetch();
      expect(response.ok()).toBe(true);
      await gate;
      await route.abort('failed');
    });
    await page.getByRole('button', { name: /^Finalizar —/ }).click();
    await expect.poll(() => db.venda.count({ where: { empresaId: empresa.id } })).toBe(1);
    await expect(page.getByRole('button', { name: 'Remover', exact: true })).toBeDisabled();
    await expect(page.getByLabel('Desconto', { exact: true })).toBeDisabled();
    await expect(page.getByLabel('Já recebi o valor total', { exact: false })).toBeDisabled();
    release();
    await expect(page.getByRole('main').getByRole('alert')).toContainText('conexão');
    await expect(page.getByRole('button', { name: /^Finalizar —/ })).toBeEnabled();
    await page.getByRole('button', { name: /^Finalizar —/ }).click();
    await expect(page.getByText('Nenhum produto no carrinho')).toBeVisible();
    const vendas = await db.venda.findMany({
      where: { empresaId: empresa.id },
      include: { itens: true },
    });
    expect(sent).toBe(2);
    expect(vendas).toHaveLength(1);
    expect(Number(vendas[0].total)).toBe(5);
    expect(vendas[0].itens[0].quantidade).toBe(1);
    expect((await db.produto.findUniqueOrThrow({ where: { id: produto.id } })).estoqueAtual).toBe(
      4,
    );
    await page.getByRole('button', { name: /Item dez centavos Estoque/ }).click();
    await page.getByRole('button', { name: /Item setenta centavos Estoque/ }).click();
    await page.getByRole('button', { name: 'Finalizar Venda', exact: true }).click();
    await page.getByLabel('Desconto', { exact: true }).fill('0.80');
    await expect(page.getByLabel('Desconto', { exact: true })).toHaveAttribute(
      'aria-invalid',
      'false',
    );
    await expect(page.getByRole('button', { name: /^Finalizar —/ })).toBeEnabled();
    await expect(page.getByRole('button', { name: /^Finalizar —/ })).toContainText('0,00');
    await page.getByLabel('Desconto', { exact: true }).fill('0.81');
    await expect(page.getByRole('button', { name: /^Finalizar —/ })).toBeDisabled();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(
      true,
    );
    await page.screenshot({
      path: 'test-results/manual/pdv-resilience-mobile.png',
      fullPage: true,
    });
  } finally {
    release();
    await page.unrouteAll({ behavior: 'wait' });
    await db.empresa.delete({ where: { id: empresa.id } });
    await db.$disconnect();
  }
});

test('PDV distingue busca indisponível e encontra clientes além da primeira página', async ({
  page,
}) => {
  test.setTimeout(180_000);
  test.skip(
    !['localhost', '127.0.0.1'].includes(
      new URL(process.env.DATABASE_URL || 'http://unavailable').hostname,
    ),
    'Somente banco local',
  );
  const db = new PrismaClient();
  const id = randomUUID();
  const email = `pdv-search-${id}@example.test`;
  const empresa = await db.empresa.create({
    data: {
      nome: 'TESTE busca PDV',
      cnpj: id,
      usuarios: {
        create: {
          nome: 'Operador de teste',
          email,
          role: 'ADMIN',
          senhaHash: await argon2.hash('PdvTeste123!'),
        },
      },
    },
  });
  try {
    await db.cliente.createMany({
      data: Array.from({ length: 110 }, (_, i) => ({
        empresaId: empresa.id,
        nome: `Cliente ${String(i).padStart(3, '0')}`,
      })),
    });
    await db.produto.create({
      data: {
        empresaId: empresa.id,
        nome: 'Produto buscável',
        sku: 'SEARCH',
        preco: 10,
        estoqueAtual: 5,
      },
    });
    await page.goto('/login');
    await page.getByLabel('E-mail', { exact: true }).fill(email);
    await page.getByLabel('Senha', { exact: true }).fill('PdvTeste123!');
    await page.getByRole('button', { name: 'Entrar no painel', exact: true }).click();
    await page.waitForURL('**/dashboard');
    await page.goto('/pdv');
    await expect(page.getByRole('button', { name: /Produto buscável Estoque/ })).toBeVisible();
    let failing = true;
    await page.route('**/api/produtos?*', (route) => {
      if (!new URL(route.request().url()).searchParams.has('search') || !failing)
        return route.fallback();
      return route.fulfill({
        status: 503,
        json: { message: 'Indisponível' },
        headers: {
          'Access-Control-Allow-Origin': 'http://localhost:3002',
          'Access-Control-Allow-Credentials': 'true',
        },
      });
    });
    await page.getByPlaceholder('Buscar por nome ou SKU... (pressione /)').fill('Produto');
    await expect(page.getByRole('alert').filter({ hasText: 'buscar os produtos' })).toBeVisible();
    await expect(page.getByText(/Nenhum produto encontrado/)).toHaveCount(0);
    failing = false;
    await page.getByRole('button', { name: 'Tentar busca novamente', exact: true }).click();
    await page.getByRole('button', { name: /Produto buscável Estoque/ }).click();
    await page.getByLabel('Buscar cliente', { exact: true }).fill('Cliente 109');
    await expect(
      page
        .getByLabel('Cliente (opcional)', { exact: true })
        .getByRole('option', { name: 'Cliente 109', exact: true }),
    ).toHaveCount(1);
    await page
      .getByLabel('Cliente (opcional)', { exact: true })
      .selectOption({ label: 'Cliente 109' });
    await page.getByLabel('Buscar cliente', { exact: true }).fill('Cliente 000');
    await expect(
      page
        .getByLabel('Cliente (opcional)', { exact: true })
        .getByRole('option', { name: 'Cliente 000', exact: true }),
    ).toHaveCount(1);
    await expect(
      page.getByLabel('Cliente (opcional)', { exact: true }).locator('option:checked'),
    ).toHaveText('Cliente 109');
  } finally {
    await db.empresa.delete({ where: { id: empresa.id } });
    await db.$disconnect();
  }
});
