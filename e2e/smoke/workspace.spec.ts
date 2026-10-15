import { expect, test } from '../fixtures';
import { PrismaClient } from '@prisma/client';
import { config } from 'dotenv';
config({ path: 'apps/api/.env' });
test.use({ storageState: { cookies: [], origins: [] } });

function cnpj() {
  const digits = Array.from({ length: 12 }, () => Math.floor(Math.random() * 10));
  for (const weights of [
    [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2],
    [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2],
  ]) {
    const rest = digits.reduce((sum, n, i) => sum + n * weights[i]!, 0) % 11;
    digits.push(rest < 2 ? 0 : 11 - rest);
  }
  return digits.join('');
}

test('preset survives registration and modules can be changed later', async ({ page }) => {
  test.setTimeout(120_000);
  test.skip(
    !['localhost', '127.0.0.1'].includes(
      new URL(process.env.DATABASE_URL || 'http://unavailable').hostname,
    ),
    'Fixtures somente no banco de teste local',
  );
  const prisma = new PrismaClient();
  const email = `workspace-${Date.now()}@example.test`;
  try {
    await page.goto('/cadastro');
    await page.getByLabel('E-mail', { exact: true }).fill(email);
    await page.getByLabel('Senha', { exact: true }).fill('TesteSeguro123!');
    await page.getByRole('button', { name: 'Continuar', exact: true }).click();
    await page.getByLabel('Nome da empresa').fill('TESTE workspace temporário');
    await page.getByLabel('Segmento').selectOption('psicologia');
    await page.getByRole('button', { name: 'Continuar', exact: true }).click();
    await expect(page.getByLabel('Modelo do negócio')).toHaveValue('psicologia');
    await expect(page.getByRole('button', { name: /^PDV/ })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
    await page.getByRole('button', { name: 'Continuar', exact: true }).click();
    await page.getByRole('button', { name: 'Continuar', exact: true }).click();
    await page.getByLabel('Nome do responsável').fill('TESTE pessoa temporária');
    await page.getByLabel('CNPJ', { exact: true }).fill(cnpj());
    await page.getByLabel('Telefone do negócio').fill('11999999999');
    await page.getByLabel('Cidade', { exact: true }).fill('São Paulo');
    await page.getByRole('checkbox').check();
    await page.getByRole('button', { name: 'Criar conta e acessar' }).click();
    await page.waitForURL('**/dashboard');
    await expect(page.getByRole('link', { name: 'Meu Nexly', exact: true })).toBeVisible();
    await expect(page.getByRole('link', { name: 'PDV', exact: true })).toHaveCount(0);
    await expect(
      page.getByRole('heading', { name: 'Alertas Operacionais', exact: true }),
    ).toHaveCount(0);
    await page.goto('/pdv');
    await expect(page.getByText('Esta função está desativada no seu Nexly')).toBeVisible();
    await page.goto('/meu-nexly');
    await page.getByRole('button', { name: /^PDV/ }).click();
    await page.getByRole('button', { name: 'Salvar meus recursos' }).click();
    await expect(page.getByText(/Seu Nexly foi atualizado/)).toBeVisible();
    await page.reload();
    await expect(page.getByRole('link', { name: 'PDV', exact: true })).toBeVisible();
    const user = await prisma.usuario.findUniqueOrThrow({ where: { email } });
    await prisma.usuario.update({
      where: { id: user.id },
      data: { createdAt: new Date(Date.now() - 8 * 86400000), diasDeUso: 3 },
    });
    await page.goto('/dashboard');
    await page.getByRole('button', { name: 'Compartilhar experiência' }).click();
    const dialog = page.getByRole('dialog', { name: 'Sua experiência com o Nexly' });
    await expect(dialog.getByRole('checkbox')).not.toBeChecked();
    await dialog.getByRole('radio').first().check();
    await dialog.getByLabel('Profissão ou tipo de negócio').fill('TESTE temporário');
    await dialog
      .getByLabel('Seu comentário')
      .fill('TESTE AUTOMATIZADO: recomendação privada temporária, removida ao terminar.');
    await dialog.getByRole('button', { name: 'Enviar minha experiência' }).click();
    await expect(dialog).toBeHidden();
    const review = await prisma.depoimento.findUniqueOrThrow({ where: { usuarioId: user.id } });
    expect(review.autorizaPublicacao).toBe(false);
    expect(review.status).toBe('PENDENTE');
    await page.goto('/meu-nexly');
    await page.getByRole('button', { name: /Retirar recomendação/ }).click();
    await expect.poll(() => prisma.depoimento.count({ where: { usuarioId: user.id } })).toBe(0);
  } finally {
    const user = await prisma.usuario.findUnique({ where: { email } });
    if (user) await prisma.empresa.delete({ where: { id: user.empresaId } });
    await prisma.$disconnect();
  }
});

test('landing no longer displays hardcoded recommendations', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Quem usa recomenda' })).toBeVisible();
  await expect(page.getByText(/As primeiras recomendações reais aparecerão/)).toBeVisible();
  await expect(
    page.getByText('Antes eu perdia dinheiro com produtos que sumiam do estoque.', {
      exact: false,
    }),
  ).toHaveCount(0);
});
