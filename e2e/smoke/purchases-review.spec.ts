import { expect, test } from '../fixtures';
import { PrismaClient } from '@prisma/client';
import { config } from 'dotenv';
import argon2 from 'argon2';
config({ path: 'apps/api/.env', quiet: true });

test.use({ storageState: { cookies: [], origins: [] }, timezoneId: 'America/Sao_Paulo' });

test('compras persistem fornecedor, reposição e estoque; comissões incluem atendimento no fim do dia', async ({
  page,
}) => {
  test.setTimeout(180000);
  test.skip(
    !['localhost', '127.0.0.1'].includes(
      new URL(process.env.DATABASE_URL || 'http://unavailable').hostname,
    ),
    'Fixtures somente locais',
  );
  const prisma = new PrismaClient();
  const stamp = Date.now();
  const email = `purchases-review-${stamp}@example.test`;
  const company = await prisma.empresa.create({
    data: {
      nome: 'TESTE compras e comissões',
      cnpj: `purchases-review-${stamp}`,
      usuarios: {
        create: {
          nome: 'TESTE admin',
          email,
          senhaHash: await argon2.hash('ComprasTeste123!'),
          role: 'ADMIN',
        },
      },
    },
  });
  try {
    const product = await prisma.produto.create({
      data: {
        empresaId: company.id,
        nome: 'Reposição de teste',
        sku: 'REVIEW',
        preco: 20,
        estoqueAtual: 1,
        estoqueMinimo: 3,
      },
    });
    const client = await prisma.cliente.create({
      data: { empresaId: company.id, nome: 'Cliente teste' },
    });
    const professional = await prisma.profissional.create({
      data: { empresaId: company.id, nome: 'Profissional teste', comissaoPercentual: 25 },
    });
    const service = await prisma.servico.create({
      data: { empresaId: company.id, nome: 'Consulta teste', preco: 120, duracaoMin: 30 },
    });
    await prisma.agendamento.createMany({
      data: [
        {
          empresaId: company.id,
          clienteId: client.id,
          profissionalId: professional.id,
          servicoId: service.id,
          status: 'CONCLUIDO',
          dataHora: new Date('2026-01-03T02:30:00Z'),
          dataHoraFim: new Date('2026-01-03T03:00:00Z'),
        },
        {
          empresaId: company.id,
          clienteId: client.id,
          profissionalId: professional.id,
          servicoId: service.id,
          status: 'CONCLUIDO',
          dataHora: new Date('2026-01-03T03:30:00Z'),
          dataHoraFim: new Date('2026-01-03T04:00:00Z'),
        },
      ],
    });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/login');
    await page.getByLabel('E-mail', { exact: true }).fill(email);
    await page.getByLabel('Senha', { exact: true }).fill('ComprasTeste123!');
    const loginResponse = page.waitForResponse(
      (r) => r.url().endsWith('/api/auth/login') && r.request().method() === 'POST',
    );
    await page.getByRole('button', { name: 'Entrar no painel', exact: true }).click();
    const login = await loginResponse;
    const { accessToken } = await login.json();
    const apiOrigin = new URL(login.url()).origin;
    const headers = { Authorization: `Bearer ${accessToken}` };
    await page.waitForURL('**/dashboard');
    await page.goto('/estoque/pedidos');
    await page.getByRole('button', { name: 'Fornecedores', exact: true }).click();
    await page.getByRole('button', { name: '+ Novo fornecedor', exact: true }).click();
    const supplierDialog = page.getByRole('dialog', { name: 'Novo fornecedor', exact: true });
    await supplierDialog.getByLabel('Nome', { exact: true }).fill('Fornecedor de teste');
    await supplierDialog.getByRole('button', { name: 'Salvar', exact: true }).click();
    await expect(supplierDialog).toHaveCount(0);
    const supplier = await prisma.fornecedor.findFirstOrThrow({ where: { empresaId: company.id } });
    await page.getByRole('button', { name: 'Pedidos', exact: true }).click();
    await page.getByRole('button', { name: 'Sugestão automática', exact: true }).click();
    const dialog = page.getByRole('dialog', { name: 'Novo pedido', exact: true });
    await dialog.getByLabel('Fornecedor (opcional)', { exact: true }).selectOption(supplier.id);
    await expect(dialog.getByLabel('Quantidade de Reposição de teste')).toHaveValue('7');
    await dialog.getByRole('button', { name: 'Criar pedido', exact: true }).click();
    await expect(dialog).toHaveCount(0);
    await page.getByRole('button', { name: 'Enviar', exact: true }).click();
    await page.getByRole('button', { name: 'Receber', exact: true }).click();
    await expect(
      page.getByText('Pedido recebido — estoque atualizado!', { exact: true }),
    ).toBeVisible();
    await expect(page.getByRole('cell', { name: 'Recebido', exact: true })).toBeVisible();
    await expect
      .poll(
        async () =>
          (await prisma.produto.findUniqueOrThrow({ where: { id: product.id } })).estoqueAtual,
      )
      .toBe(8);
    const order = await prisma.pedidoCompra.findFirstOrThrow({ where: { empresaId: company.id } });
    expect(order.status).toBe('RECEBIDO');
    expect(
      (
        await page.request.patch(`${apiOrigin}/api/pedidos-compra/${order.id}/receber`, { headers })
      ).status(),
    ).toBe(422);
    expect(
      (
        await page.request.patch(`${apiOrigin}/api/pedidos-compra/${order.id}/cancelar`, {
          headers,
        })
      ).status(),
    ).toBe(422);
    expect(
      (await prisma.produto.findUniqueOrThrow({ where: { id: product.id } })).estoqueAtual,
    ).toBe(8);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await page.screenshot({
      path: 'test-results/manual/revisao-compras-mobile.png',
      fullPage: true,
    });
    await page.goto('/comissao');
    await page.getByLabel('Data inicial', { exact: true }).fill('2026-01-02');
    await page.getByLabel('Data final', { exact: true }).fill('2026-01-02');
    const row = page.getByRole('row').filter({ hasText: 'Profissional teste' });
    await expect(row).toContainText('120,00');
    await expect(row).toContainText('30,00');
    await expect(row.getByRole('cell').nth(2)).toHaveText('1');
    expect(
      (
        await page.request.get(
          `${apiOrigin}/api/comissao/resumo?dataInicio=2026-02-30&dataFim=2026-03-01`,
          { headers },
        )
      ).status(),
    ).toBe(400);
    await page.screenshot({
      path: 'test-results/manual/revisao-comissoes-mobile.png',
      fullPage: true,
    });
  } finally {
    await prisma.agendamento.deleteMany({ where: { empresaId: company.id } });
    await prisma.pedidoCompra.deleteMany({ where: { empresaId: company.id } });
    await prisma.movimentacaoEstoque.deleteMany({ where: { empresaId: company.id } });
    await prisma.produto.deleteMany({ where: { empresaId: company.id } });
    await prisma.servico.deleteMany({ where: { empresaId: company.id } });
    await prisma.profissional.deleteMany({ where: { empresaId: company.id } });
    await prisma.cliente.deleteMany({ where: { empresaId: company.id } });
    await prisma.empresa.delete({ where: { id: company.id } });
    await prisma.$disconnect();
  }
});
