import { expect, test } from '@playwright/test';
import { PrismaClient } from '@prisma/client';
import { config } from 'dotenv';
import argon2 from 'argon2';
config({ path: 'apps/api/.env', quiet: true });
test.use({ timezoneId: 'America/Sao_Paulo' });

test('concluir agendamento baixa o estoque uma única vez', async ({ page }) => {
  test.setTimeout(120000);
  test.skip(
    !['localhost', '127.0.0.1'].includes(
      new URL(process.env.DATABASE_URL || 'http://unavailable').hostname,
    ),
    'Fixtures somente locais',
  );
  const p = new PrismaClient();
  const suffix = Date.now(),
    email = `deduction-${suffix}@example.test`;
  const empresa = await p.empresa.create({
    data: {
      nome: 'TESTE baixa de estoque',
      cnpj: `deduction-${suffix}`,
      usuarios: {
        create: {
          nome: 'TESTE gestor',
          email,
          senhaHash: await argon2.hash('EstoqueTeste123!'),
          role: 'ADMIN',
        },
      },
    },
  });
  try {
    const produto = await p.produto.create({
      data: {
        empresaId: empresa.id,
        nome: 'Insumo de teste',
        sku: 'INSUMO',
        preco: 10,
        estoqueAtual: 30,
      },
    });
    const cliente = await p.cliente.create({
      data: { empresaId: empresa.id, nome: 'Cliente de teste' },
    });
    const profissional = await p.profissional.create({
      data: { empresaId: empresa.id, nome: 'Profissional de teste' },
    });
    const servico = await p.servico.create({
      data: {
        empresaId: empresa.id,
        nome: 'Serviço com insumo',
        preco: 90,
        duracaoMin: 30,
        insumos: { create: { produtoId: produto.id, quantidade: 1 } },
      },
    });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/login');
    await page.getByLabel('E-mail', { exact: true }).fill(email);
    await page.getByLabel('Senha', { exact: true }).fill('EstoqueTeste123!');
    await page.getByRole('button', { name: 'Entrar no painel', exact: true }).click();
    await page.waitForURL('**/dashboard');
    await page.goto('/agenda');
    await page.getByRole('button', { name: '+ Novo agendamento', exact: true }).first().click();
    const modal = page.getByRole('dialog', { name: 'Novo agendamento', exact: true });
    await modal.getByRole('button', { name: cliente.nome, exact: true }).click();
    await modal.getByRole('button', { name: 'Próximo', exact: true }).click();
    await modal.getByLabel('Profissional', { exact: true }).selectOption(profissional.id);
    await modal.getByLabel('Serviço', { exact: true }).selectOption(servico.id);
    await modal.getByRole('button', { name: 'Próximo', exact: true }).click();
    const local = await page.evaluate(() => {
      const d = new Date();
      d.setDate(d.getDate() + 1);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}T10:00`;
    });
    await modal.getByLabel('Data e hora', { exact: true }).fill(local);
    await modal.getByRole('button', { name: 'Salvar', exact: true }).click();
    await expect(modal).toBeHidden();
    await page.getByRole('button', { name: 'Lista', exact: true }).click();
    await page.getByRole('button', { name: 'Confirmar', exact: true }).click();
    await page.getByRole('button', { name: 'Concluir', exact: true }).click();
    await expect
      .poll(
        async () => (await p.produto.findUniqueOrThrow({ where: { id: produto.id } })).estoqueAtual,
      )
      .toBe(29);
    const agendamento = await p.agendamento.findFirstOrThrow({ where: { empresaId: empresa.id } });
    expect(agendamento.status).toBe('CONCLUIDO');
    expect(
      await p.movimentacaoEstoque.count({
        where: { produtoId: produto.id, agendamentoId: agendamento.id, tipo: 'SAIDA' },
      }),
    ).toBe(1);
    await page.reload();
    await expect(page.getByRole('button', { name: 'Concluir', exact: true })).toHaveCount(0);
    expect((await p.produto.findUniqueOrThrow({ where: { id: produto.id } })).estoqueAtual).toBe(
      29,
    );
  } finally {
    await p.movimentacaoEstoque.deleteMany({ where: { empresaId: empresa.id } });
    await p.agendamento.deleteMany({ where: { empresaId: empresa.id } });
    await p.servico.deleteMany({ where: { empresaId: empresa.id } });
    await p.produto.deleteMany({ where: { empresaId: empresa.id } });
    await p.profissional.deleteMany({ where: { empresaId: empresa.id } });
    await p.cliente.deleteMany({ where: { empresaId: empresa.id } });
    await p.empresa.delete({ where: { id: empresa.id } });
    await p.$disconnect();
  }
});
