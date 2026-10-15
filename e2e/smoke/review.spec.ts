import { test, expect } from '@playwright/test';
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
    await download.saveAs('docs/review-export.csv');
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
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/dashboard');
    await expect(page.getByText('ATENDIMENTOS HOJE', { exact: true })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
  } finally {
    await p.venda.deleteMany({ where: { empresaId: empresa.id } });
    await p.empresa.delete({ where: { id: empresa.id } });
    await p.$disconnect();
  }
});
