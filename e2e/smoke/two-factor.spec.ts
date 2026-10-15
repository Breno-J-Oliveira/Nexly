import { expect, test } from '../fixtures';
import { PrismaClient } from '@prisma/client';
import { config } from 'dotenv';
import { authenticator } from '@otplib/preset-default';
import argon2 from 'argon2';
config({ path: 'apps/api/.env', quiet: true });

test('equipe configura 2FA, usa recuperação e bloqueia repetição de desafio', async ({
  page,
  request,
  baseURL,
}) => {
  test.setTimeout(120000);
  test.skip(
    !['localhost', '127.0.0.1'].includes(
      new URL(process.env.DATABASE_URL || 'http://unavailable').hostname,
    ),
    'Fixtures somente locais',
  );
  const p = new PrismaClient(),
    stamp = Date.now(),
    email = `two-factor-${stamp}@example.test`,
    senha = 'SegundoFator123!';
  const empresa = await p.empresa.create({
    data: {
      nome: 'TESTE segundo fator',
      cnpj: `two-factor-${stamp}`,
      usuarios: {
        create: {
          nome: 'Profissional teste',
          email,
          senhaHash: await argon2.hash(senha),
          role: 'PROFISSIONAL',
        },
      },
    },
    include: { usuarios: true },
  });
  const userId = empresa.usuarios[0]!.id;
  const apiURL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
  try {
    const old = await p.authSession.create({
      data: { usuarioId: userId, expiresAt: new Date(Date.now() + 600000) },
    });
    await page.setViewportSize({ width: 390, height: 844 });
    const loginUI = async () => {
      await page.goto('/login');
      await page.getByLabel('E-mail', { exact: true }).fill(email);
      await page.getByLabel('Senha', { exact: true }).fill(senha);
      await page.getByRole('button', { name: 'Entrar no painel', exact: true }).click();
    };
    const loginResponse = page.waitForResponse(
      (r) => r.url().endsWith('/api/auth/login') && r.request().method() === 'POST',
    );
    await loginUI();
    await page.waitForURL('**/dashboard');
    const { accessToken } = await (await loginResponse).json();
    await page.goto('/minha-conta');
    await page.getByRole('button', { name: 'Configurar autenticador', exact: true }).click();
    await expect(
      page.getByRole('img', { name: 'QR code para configurar o autenticador Nexly', exact: true }),
    ).toBeVisible();
    const configured = await p.usuario.findUniqueOrThrow({ where: { id: userId } });
    await page
      .getByLabel('Código do app', { exact: true })
      .fill(authenticator.generate(configured.twoFactorSecret!));
    await page.getByRole('button', { name: 'Ativar 2FA', exact: true }).click();
    const codes = page
      .getByRole('list', { name: 'Códigos de recuperação', exact: true })
      .getByRole('listitem');
    await expect(codes).toHaveCount(10);
    const backupCodes = await codes.allTextContents();
    expect((await p.authSession.findUniqueOrThrow({ where: { id: old.id } })).revogado).toBe(true);
    const reenable = await request.post(`${apiURL}/api/auth/2fa/enable`, {
      headers: { Authorization: `Bearer ${accessToken}`, Origin: baseURL! },
      data: { code: authenticator.generate(configured.twoFactorSecret!) },
    });
    expect(reenable.status()).toBe(400);
    const downloads = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Baixar códigos', exact: true }).click();
    expect((await downloads).suggestedFilename()).toBe('nexly-codigos-recuperacao.txt');
    await page.getByRole('button', { name: 'Já guardei, ocultar códigos', exact: true }).click();
    await expect(codes).toHaveCount(0);
    await page.getByRole('button', { name: 'Sair desta sessão', exact: true }).click();
    await page.waitForURL('**/login');
    await loginUI();
    await expect(
      page.getByLabel('Código de verificação em dois fatores', { exact: true }),
    ).toBeVisible();
    await page.getByRole('button', { name: 'Usar código de backup', exact: true }).click();
    await page
      .getByLabel('Código de verificação em dois fatores', { exact: true })
      .fill(backupCodes[0]!);
    await page.getByRole('button', { name: 'Verificar', exact: true }).click();
    await page.waitForURL('**/dashboard');
    const challenge = await request.post(`${apiURL}/api/auth/login`, {
      headers: { Origin: baseURL! },
      data: { email, senha },
    });
    const { tempToken } = await challenge.json();
    const attempts = await Promise.all(
      [0, 1].map(() =>
        request.post(`${apiURL}/api/auth/2fa/verify`, {
          headers: { Origin: baseURL! },
          data: { tempToken, code: backupCodes[1] },
        }),
      ),
    );
    expect(attempts.map((r) => r.status()).sort()).toEqual([200, 401]);
    const replay = await request.post(`${apiURL}/api/auth/2fa/verify`, {
      headers: { Origin: baseURL! },
      data: { tempToken, code: backupCodes[2] },
    });
    expect(replay.status()).toBe(401);
    await page.goto('/minha-conta');
    await page.getByText('Desativar autenticação de dois fatores', { exact: true }).click();
    await page.getByLabel('Senha atual para desativar', { exact: true }).fill(senha);
    await page.getByLabel('Código do app ou de recuperação', { exact: true }).fill(backupCodes[3]!);
    await page.getByRole('button', { name: 'Desativar 2FA', exact: true }).click();
    await expect(
      page.getByRole('button', { name: 'Configurar autenticador', exact: true }),
    ).toBeVisible();
    const after = await p.usuario.findUniqueOrThrow({ where: { id: userId } });
    expect(after.twoFactorEnabled).toBe(false);
    expect(after.twoFactorSecret).toBeNull();
    expect(after.twoFactorChallengeHash).toBeNull();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
  } finally {
    await p.empresa.delete({ where: { id: empresa.id } });
    await p.$disconnect();
  }
});
