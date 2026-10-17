import { expect, test } from '../fixtures';
import { PrismaClient } from '@prisma/client';
import { config } from 'dotenv';
import argon2 from 'argon2';
config({ path: 'apps/api/.env', quiet: true });

test.use({ storageState: { cookies: [], origins: [] } });

test('administrador gerencia acesso e convite cria usuário com a função correta uma única vez', async ({
  page,
  browser,
  baseURL,
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
  const adminEmail = `users-admin-${stamp}@example.test`;
  const staffEmail = `users-staff-${stamp}@example.test`;
  const guestEmail = `users-invite-${stamp}@example.test`;
  const password = 'UsuariosTeste123!';
  const company = await prisma.empresa.create({
    data: {
      nome: 'TESTE gestão de usuários',
      cnpj: `users-review-${stamp}`,
      usuarios: {
        create: {
          nome: 'TESTE administrador',
          email: adminEmail,
          senhaHash: await argon2.hash(password),
          role: 'ADMIN',
        },
      },
    },
  });
  const guestContext = await browser.newContext({
    baseURL,
    storageState: { cookies: [], origins: [] },
  });
  try {
    await page.goto('/login');
    await page.getByLabel('E-mail', { exact: true }).fill(adminEmail);
    await page.getByLabel('Senha', { exact: true }).fill(password);
    await page.getByRole('button', { name: 'Entrar no painel', exact: true }).click();
    await page.waitForURL('**/dashboard');
    await page.goto('/usuarios');
    await page.getByRole('button', { name: '+ Novo usuário', exact: true }).click();
    const dialog = page.getByRole('dialog');
    await dialog.getByLabel('Nome', { exact: true }).fill('Colaborador teste');
    await dialog.getByLabel('E-mail', { exact: true }).fill(staffEmail);
    await dialog.getByLabel('Senha', { exact: true }).fill(password);
    await dialog.getByLabel('Função', { exact: true }).selectOption('CAIXA');
    await dialog.getByRole('button', { name: 'Salvar', exact: true }).click();
    await expect(dialog).toHaveCount(0);
    const row = page.getByRole('row').filter({ hasText: staffEmail });
    await row.getByRole('button', { name: 'Editar', exact: true }).click();
    await dialog.getByLabel('Função', { exact: true }).selectOption('RECEPCIONISTA');
    await dialog.getByRole('button', { name: 'Salvar', exact: true }).click();
    await expect(dialog).toHaveCount(0);
    await expect(row).toContainText('Recepcionista');
    await row.getByRole('button', { name: 'Desativar', exact: true }).click();
    await expect(row.getByRole('button', { name: 'Ativar', exact: true })).toBeVisible();
    expect((await prisma.usuario.findUniqueOrThrow({ where: { email: staffEmail } })).ativo).toBe(
      false,
    );
    await row.getByRole('button', { name: 'Ativar', exact: true }).click();
    await expect(row.getByRole('button', { name: 'Desativar', exact: true })).toBeVisible();
    await page.getByRole('button', { name: '+ Convidar usuário', exact: true }).click();
    await dialog.getByLabel('E-mail', { exact: true }).fill(guestEmail);
    await dialog.getByLabel('Função', { exact: true }).selectOption('CAIXA');
    const response = page.waitForResponse(
      (r) => r.url().endsWith('/api/usuarios/convidar') && r.request().method() === 'POST',
    );
    await dialog.getByRole('button', { name: 'Gerar convite', exact: true }).click();
    const { link } = (await (await response).json()) as { link: string };
    await expect(dialog.getByText('Link de convite gerado:')).toBeVisible();
    const token = new URL(link).searchParams.get('token');
    expect(token).toBeTruthy();
    const guest = await guestContext.newPage();
    await guest.goto(`/aceitar-convite?token=${encodeURIComponent(token!)}`);
    await guest.getByLabel('Nome completo', { exact: true }).fill('Convidado teste');
    await guest.getByLabel('Senha', { exact: true }).fill(password);
    await guest.getByLabel('Confirmar senha', { exact: true }).fill(password);
    await guest.getByRole('button', { name: 'Criar conta', exact: true }).click();
    await guest.waitForURL('**/login');
    const invited = await prisma.usuario.findUniqueOrThrow({ where: { email: guestEmail } });
    expect(invited.empresaId).toBe(company.id);
    expect(invited.role).toBe('CAIXA');
    await guest.goto(`/aceitar-convite?token=${encodeURIComponent(token!)}`);
    await expect(guest.getByText(/Convite.*(inválido|utilizado|expirado|usado)/i)).toBeVisible();
    await expect(guest.getByRole('button', { name: 'Criar conta', exact: true })).toHaveCount(0);
    expect(await prisma.usuario.count({ where: { email: guestEmail } })).toBe(1);
  } finally {
    await guestContext.close();
    await prisma.empresa.delete({ where: { id: company.id } });
    await prisma.$disconnect();
  }
});
