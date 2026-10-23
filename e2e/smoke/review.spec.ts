import { test, expect } from '../fixtures';
import { PrismaClient } from '@prisma/client';
import { config } from 'dotenv';
import argon2 from 'argon2';
config({ path: 'apps/api/.env' });
test.use({ storageState: { cookies: [], origins: [] } });
test('reports export uses authentication and staff dashboard respects permissions', async ({
  page,
}) => {
  test.skip(
    !['localhost', '127.0.0.1'].includes(
      new URL(process.env.DATABASE_URL || 'http://unavailable').hostname,
    ),
    'Fixtures somente locais',
  );
  const p = new PrismaClient();
  const suffix = Date.now();
  const senha = 'TesteSeguro123!';
  const empresa = await p.empresa.create({
    data: {
      nome: 'TESTE revisao UI',
      cnpj: `review-ui-${suffix}`,
      usuarios: {
        create: {
          nome: 'TESTE gestor',
          email: `review-ui-${suffix}@example.test`,
          senhaHash: await argon2.hash(senha),
          role: 'ADMIN',
        },
      },
    },
    include: { usuarios: true },
  });
  try {
    await p.venda.create({
      data: {
        empresaId: empresa.id,
        total: 180,
        desconto: 20,
        createdAt: new Date('2026-10-14T18:00:00Z'),
      },
    });
    await page.goto('/login');
    await page.getByLabel('E-mail', { exact: true }).fill(empresa.usuarios[0]!.email);
    await page.getByLabel('Senha', { exact: true }).fill(senha);
    await page.getByRole('button', { name: 'Entrar no painel', exact: true }).click();
    await page.waitForURL('**/dashboard');
    await page.goto('/relatorios');
    await page.getByLabel('Data inicial', { exact: true }).fill('2026-10-14');
    await page.getByLabel('Data final', { exact: true }).fill('2026-10-14');
    await expect(page.getByText('Indisponível', { exact: true }).first()).toBeVisible();
    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Exportar CSV (até 500 vendas)', exact: true }).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toBe('vendas-2026-10-14-2026-10-14.csv');
    await download.saveAs('test-results/manual/review-export.csv');
    await page.getByLabel('Data inicial', { exact: true }).fill('2026-10-15');
    await expect(
      page.getByRole('alert').filter({ hasText: 'Informe um período válido' }),
    ).toContainText('período válido');
    await expect(
      page.getByRole('button', { name: 'Exportar CSV (até 500 vendas)', exact: true }),
    ).toBeDisabled();
    await p.usuario.update({
      where: { id: empresa.usuarios[0]!.id },
      data: { role: 'RECEPCIONISTA' },
    });
    await page.goto('/dashboard');
    await expect(page.getByRole('link', { name: 'Agenda', exact: true }).first()).toBeVisible();
    await expect(page.getByText('FATURAMENTO HOJE', { exact: true })).toHaveCount(0);
    await expect(page.getByText('TICKET MÉDIO', { exact: true })).toHaveCount(0);
    const cliente = await p.cliente.create({
      data: { empresaId: empresa.id, nome: 'TESTE atendimento mobile' },
    });
    const profissional = await p.profissional.create({
      data: { empresaId: empresa.id, nome: 'TESTE profissional mobile' },
    });
    const servico = await p.servico.create({
      data: { empresaId: empresa.id, nome: 'Consulta teste', preco: 100, duracaoMin: 60 },
    });
    const horario = new Date();
    horario.setHours(10, 0, 0, 0);
    const agendamento = await p.agendamento.create({
      data: {
        empresaId: empresa.id,
        clienteId: cliente.id,
        profissionalId: profissional.id,
        servicoId: servico.id,
        status: 'CONFIRMADO',
        dataHora: horario,
        dataHoraFim: new Date(horario.getTime() + 3600000),
      },
    });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/dashboard');
    await expect(page.getByText('ATENDIMENTOS HOJE', { exact: true })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await page.goto('/agenda');
    await page.getByRole('button', { name: 'Semana', exact: true }).click();
    const concluir = page.getByRole('button', {
      name: 'Concluir atendimento de TESTE atendimento mobile',
      exact: true,
    });
    await expect(concluir).toBeVisible();
    await concluir.scrollIntoViewIfNeeded();
    await page.screenshot({ path: 'test-results/manual/review-agenda-mobile.png', fullPage: true });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await concluir.click();
    await expect
      .poll(async () => (await p.agendamento.findUnique({ where: { id: agendamento.id } }))?.status)
      .toBe('CONCLUIDO');
  } finally {
    await p.lancamentoFinanceiro.deleteMany({ where: { empresaId: empresa.id } });
    await p.venda.deleteMany({ where: { empresaId: empresa.id } });
    await p.agendamento.deleteMany({ where: { empresaId: empresa.id } });
    await p.servico.deleteMany({ where: { empresaId: empresa.id } });
    await p.profissional.deleteMany({ where: { empresaId: empresa.id } });
    await p.cliente.deleteMany({ where: { empresaId: empresa.id } });
    await p.empresa.delete({ where: { id: empresa.id } });
    await p.$disconnect();
  }
});
