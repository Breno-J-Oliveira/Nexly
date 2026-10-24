import { test, expect } from '../fixtures';
import { PrismaClient } from '@prisma/client';
import { MODULES, MODULE_IDS } from '@nexly/shared';
import { randomUUID } from 'node:crypto';
import argon2 from 'argon2';

const routes = [
  ...new Set([
    '/dashboard',
    ...MODULES.map((m) => m.href),
    '/financeiro',
    '/estoque/pedidos',
    '/estoque/filiais',
    '/produtos',
    '/usuarios',
    '/importar',
    '/historico',
    '/operacao',
    '/meu-nexly',
    '/minha-conta',
    '/assinatura',
    '/configuracoes',
  ]),
];

test('todos os módulos permanecem utilizáveis em 320px com nomes longos e sem erros de execução', async ({
  page,
}) => {
  test.setTimeout(360_000);
  test.skip(
    !['localhost', '127.0.0.1'].includes(
      new URL(process.env.DATABASE_URL || 'http://unavailable').hostname,
    ),
    'Somente fixtures locais',
  );
  const db = new PrismaClient();
  const id = randomUUID(),
    email = `traversal-${id}@example.test`;
  const empresa = await db.empresa.create({
    data: {
      nome: 'Negócio de teste com nome extenso para validar a navegação',
      cnpj: id,
      modulos: MODULE_IDS,
      usuarios: {
        create: {
          nome: 'Administrador com nome extenso para testar navegação',
          email,
          role: 'ADMIN',
          senhaHash: await argon2.hash('TraversalTeste123!'),
        },
      },
    },
  });
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  const failures: string[] = [];
  page.on('response', (response) => {
    if (response.url().includes('/api/') && response.status() >= 500)
      failures.push(`${response.status()} ${new URL(response.url()).pathname}`);
  });
  try {
    const nome = 'NomeExtensoSemEspacos'.repeat(6);
    await db.cliente.create({ data: { empresaId: empresa.id, nome } });
    await db.produto.create({
      data: { empresaId: empresa.id, nome, sku: 'LONG', preco: 15, estoqueAtual: 5 },
    });
    await db.profissional.create({ data: { empresaId: empresa.id, nome } });
    await db.servico.create({ data: { empresaId: empresa.id, nome, preco: 30, duracaoMin: 30 } });
    await page.setViewportSize({ width: 320, height: 740 });
    await page.goto('/login');
    await page.getByLabel('E-mail', { exact: true }).fill(email);
    await page.getByLabel('Senha', { exact: true }).fill('TraversalTeste123!');
    await page.getByRole('button', { name: 'Entrar no painel', exact: true }).click();
    await page.waitForURL('**/dashboard');
    for (const route of routes) {
      await test.step(route, async () => {
        await page.goto(route);
        await expect(
          page.getByRole('navigation', { name: 'Menu principal', exact: true }),
        ).toBeAttached();
        await expect(
          page.locator('main, #page-toolbar').getByRole('heading').first(),
        ).toBeVisible();
        await page.waitForTimeout(1000);
        expect
          .soft(
            await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1),
            `${route}: conteúdo ultrapassa a largura`,
          )
          .toBe(true);
        await page.screenshot({
          path: `test-results/manual/system-${route.slice(1).replaceAll('/', '-')}-320.png`,
          fullPage: true,
        });
        if (route === '/profissionais' || route === '/servicos') {
          await page
            .getByRole('main')
            .getByRole('button', { name: new RegExp(nome) })
            .first()
            .click();
          const dialog = page.getByRole('dialog');
          await expect(dialog).toBeVisible();
          expect(
            await dialog.evaluate((el) => el.scrollWidth <= el.clientWidth + 1),
            `${route}: detalhe com nome longo`,
          ).toBe(true);
          await page.keyboard.press('Escape');
          await expect(dialog).toHaveCount(0);
        }
      });
    }
    expect(errors).toEqual([]);
    expect(failures).toEqual([]);
  } finally {
    await db.empresa.delete({ where: { id: empresa.id } });
    await db.$disconnect();
  }
});
