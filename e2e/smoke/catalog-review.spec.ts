import { expect, test, type Page } from '@playwright/test';
import { PrismaClient } from '@prisma/client';
import { config } from 'dotenv';
import argon2 from 'argon2';
config({ path: 'apps/api/.env' });
test.use({ storageState: { cookies: [], origins: [] } });

async function entrar(page: Page, email: string) {
  await page.context().clearCookies();
  await page.goto('/login');
  await page.getByLabel('E-mail', { exact: true }).fill(email);
  await page.getByLabel('Senha', { exact: true }).fill('CatalogoTeste123!');
  const result = page.waitForResponse(
    (response) =>
      response.url().endsWith('/api/auth/login') && response.request().method() === 'POST',
  );
  await page.getByRole('button', { name: 'Entrar no painel', exact: true }).click();
  const { accessToken } = (await (await result).json()) as { accessToken: string };
  await page.waitForURL('**/dashboard');
  return accessToken;
}

test('customer contacts are optional and catalogue actions follow role permissions', async ({
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
  const empresa = await p.empresa.create({
    data: { nome: 'TESTE catálogo', cnpj: `catalog-${suffix}` },
  });
  try {
    const senhaHash = await argon2.hash('CatalogoTeste123!');
    const emails: Record<string, string> = {};
    for (const role of ['ADMIN', 'RECEPCIONISTA', 'CAIXA'] as const) {
      const email = `catalog-${role.toLowerCase()}-${suffix}@example.test`;
      await p.usuario.create({
        data: { empresaId: empresa.id, nome: 'TESTE catálogo ' + role, email, senhaHash, role },
      });
      emails[role] = email;
    }
    const produto = await p.produto.create({
      data: {
        empresaId: empresa.id,
        nome: 'TESTE produto',
        sku: `catalog-${suffix}`,
        preco: 10,
        estoqueAtual: 10,
        estoqueMinimo: 1,
      },
    });
    const servico = await p.servico.create({
      data: {
        empresaId: empresa.id,
        nome: 'TESTE consulta de catálogo',
        preco: 90,
        duracaoMin: 30,
      },
    });
    await p.insumoServico.create({
      data: { servicoId: servico.id, produtoId: produto.id, quantidade: 1 },
    });
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await entrar(page, emails.ADMIN!);
    await page.goto('/clientes');
    await page.getByRole('button', { name: '+ Novo cliente', exact: true }).first().click();
    const modal = page.getByRole('dialog', { name: 'Novo cliente', exact: true });
    await modal.getByLabel('Nome', { exact: true }).fill('TESTE cliente sem contato');
    await modal.getByRole('button', { name: 'Salvar', exact: true }).click();
    await expect(modal).toBeHidden();
    const cliente = await p.cliente.findFirstOrThrow({ where: { empresaId: empresa.id } });
    expect(cliente.email).toBeNull();
    expect(cliente.telefone).toBeNull();

    await entrar(page, emails.CAIXA!);
    await page.goto('/clientes');
    await expect(
      page.getByRole('button', { name: cliente.nome, exact: true }).first(),
    ).toBeVisible();
    await expect(page.getByRole('button', { name: '+ Novo cliente', exact: true })).toHaveCount(0);
    await page.getByRole('button', { name: 'Observações', exact: true }).first().click();
    await expect(page.getByLabel('Observações do cliente').first()).toHaveAttribute('readonly', '');
    await expect(page.getByRole('button', { name: 'Salvar observação', exact: true })).toHaveCount(
      0,
    );
    await expect(
      page.getByRole('button', { name: '+ Novo agendamento para este cliente', exact: true }),
    ).toHaveCount(0);
    await page.goto('/produtos');
    await expect(
      page.getByRole('button', { name: 'Histórico', exact: true }).first(),
    ).toBeVisible();
    await expect(page.getByRole('button', { name: 'Editar', exact: true })).toHaveCount(0);
    await expect(page.getByRole('button', { name: '+ Novo produto', exact: true })).toHaveCount(0);
    await page.goto('/estoque');
    await expect(page.getByRole('heading', { name: 'Estoque', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Registrar Entrada', exact: true })).toHaveCount(
      0,
    );
    await expect(page.getByRole('button', { name: 'Dar entrada', exact: true })).toHaveCount(0);
    await page.goto('/usuarios');
    await expect(
      page.getByRole('heading', { name: 'Seu perfil não tem acesso a esta área', exact: true }),
    ).toBeVisible();

    const token = await entrar(page, emails.RECEPCIONISTA!);
    const denied: string[] = [];
    page.on('response', (response) => {
      if (response.status() === 403) denied.push(response.url());
    });
    await page.goto('/servicos');
    await expect(
      page.getByRole('button', { name: servico.nome, exact: true }).first(),
    ).toBeVisible();
    await expect(page.getByRole('button', { name: '+ Novo serviço', exact: true })).toHaveCount(0);
    await expect(page.getByRole('button', { name: '+ Insumo', exact: true })).toHaveCount(0);
    expect(denied).toEqual([]);
    const headers = { Authorization: `Bearer ${token}` };
    const basic = await page.request.get(`http://localhost:3001/api/servicos/${servico.id}`, {
      headers,
    });
    expect(basic.status()).toBe(200);
    expect(await basic.json()).not.toHaveProperty('insumos');
    const protectedStock = await page.request.get(
      `http://localhost:3001/api/servicos/${servico.id}/insumos`,
      { headers },
    );
    expect(protectedStock.status()).toBe(403);
    await page.setViewportSize({ width: 390, height: 844 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await page.screenshot({ path: 'docs/review-catalogo-mobile.png', fullPage: true });
    expect(errors).toEqual([]);
  } finally {
    await p.insumoServico.deleteMany({ where: { servico: { empresaId: empresa.id } } });
    await p.servico.deleteMany({ where: { empresaId: empresa.id } });
    await p.produto.deleteMany({ where: { empresaId: empresa.id } });
    await p.cliente.deleteMany({ where: { empresaId: empresa.id } });
    await p.empresa.delete({ where: { id: empresa.id } });
    await p.$disconnect();
  }
});
