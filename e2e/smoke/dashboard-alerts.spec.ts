import { test, expect } from '../fixtures';
import { PrismaClient } from '@prisma/client';
import { MODULE_IDS } from '@nexly/shared';
import { randomUUID } from 'node:crypto';
import argon2 from 'argon2';

test.use({ storageState: { cookies: [], origins: [] } });

test('alertas reais isolam empresas, excluem contas pagas e abrem o período correto', async ({
  page,
  request,
}) => {
  test.setTimeout(120000);
  test.skip(
    !['localhost', '127.0.0.1'].includes(
      new URL(process.env.DATABASE_URL ?? 'http://indisponivel').hostname,
    ),
    'Somente banco local',
  );
  const prisma = new PrismaClient();
  const id = randomUUID(),
    email = `alertas-${id}@example.test`,
    senha = 'AlertasTeste123!';
  const senhaHash = await argon2.hash(senha);
  const empresas: string[] = [];
  try {
    const a = await prisma.empresa.create({
      data: {
        nome: 'TESTE alertas',
        cnpj: id,
        modulos: MODULE_IDS,
        fusoHorario: 'America/Sao_Paulo',
        usuarios: {
          create: [
            { nome: 'TESTE admin', email, senhaHash, role: 'ADMIN' },
            {
              nome: 'TESTE recepção',
              email: `recepcao-${email}`,
              senhaHash,
              role: 'RECEPCIONISTA',
            },
          ],
        },
      },
    });
    empresas.push(a.id);
    const b = await prisma.empresa.create({
      data: { nome: 'TESTE outra empresa', cnpj: randomUUID() },
    });
    empresas.push(b.id);
    const hoje = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/Sao_Paulo',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date());
    const ontem = new Date(new Date(`${hoje}T00:00:00Z`).getTime() - 86400000)
      .toISOString()
      .slice(0, 10);
    await prisma.lancamentoFinanceiro.createMany({
      data: [
        {
          empresaId: a.id,
          descricao: 'Conta atrasada visível',
          tipo: 'DESPESA',
          valor: 100,
          valorPago: 30,
          status: 'PARCIAL',
          vencimento: new Date('2026-01-03T00:00:00Z'),
        },
        {
          empresaId: a.id,
          descricao: 'Recebimento de hoje',
          tipo: 'RECEITA',
          valor: 150,
          vencimento: new Date(`${hoje}T00:00:00Z`),
        },
        {
          empresaId: a.id,
          descricao: 'Conta paga',
          tipo: 'DESPESA',
          valor: 100,
          valorPago: 100,
          status: 'PAGO',
          vencimento: new Date('2026-01-01T00:00:00Z'),
        },
        {
          empresaId: a.id,
          descricao: 'Conta cancelada',
          tipo: 'DESPESA',
          valor: 100,
          status: 'CANCELADO',
          vencimento: new Date('2026-01-01T00:00:00Z'),
        },
        {
          empresaId: b.id,
          descricao: 'Conta de outra empresa',
          tipo: 'DESPESA',
          valor: 999,
          vencimento: new Date('2025-01-01T00:00:00Z'),
        },
      ],
    });
    await page.goto('/login');
    await page.getByLabel('E-mail', { exact: true }).fill(email);
    await page.getByLabel('Senha', { exact: true }).fill(senha);
    const responsePromise = page.waitForResponse(
      (r) => r.url().endsWith('/api/dashboard/alertas') && r.request().method() === 'GET',
    );
    await page.getByRole('button', { name: 'Entrar no painel', exact: true }).click();
    const response = await responsePromise;
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.alertas).toHaveLength(2);
    expect(body.alertas.find((a: { id: string }) => a.id === 'atrasadas-DESPESA')).toMatchObject({
      quantidade: 1,
      href: `/financeiro?inicio=2026-01-03&fim=${ontem}`,
    });
    const alerts = page.getByRole('region', { name: 'Precisa da sua atenção', exact: true });
    await alerts.getByRole('link', { name: /Contas a pagar atrasadas/ }).click();
    await expect(page.getByLabel('De', { exact: true })).toHaveValue('2026-01-03');
    await expect(page.getByLabel('Até', { exact: true })).toHaveValue(ontem);
    await expect(page.getByText('Conta atrasada visível', { exact: true })).toBeVisible();
    await expect(page.getByText('Conta de outra empresa', { exact: true })).toHaveCount(0);
    const api = new URL(response.url()).origin;
    const login = await request.post(`${api}/api/auth/login`, {
      data: { email: `recepcao-${email}`, senha },
    });
    expect(login.status()).toBeLessThan(300);
    const token = (await login.json()).accessToken;
    const restricted = await request.get(`${api}/api/dashboard/alertas`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(restricted.status()).toBe(200);
    expect((await restricted.json()).alertas).toEqual([]);
  } finally {
    await prisma.lancamentoFinanceiro.deleteMany({ where: { empresaId: { in: empresas } } });
    await prisma.empresa.deleteMany({ where: { id: { in: empresas } } });
    await prisma.$disconnect();
  }
});

test('falha ao consultar alertas oferece nova tentativa sem esconder o painel', async ({
  page,
  baseURL,
}) => {
  let fail = true;
  await page.route('**/api/dashboard/alertas', (route) =>
    route.fulfill({
      status: fail ? 503 : 200,
      headers: {
        'Access-Control-Allow-Origin': baseURL!,
        'Access-Control-Allow-Credentials': 'true',
      },
      json: fail ? { message: 'Indisponível no teste' } : { alertas: [] },
    }),
  );
  await page.goto('/login');
  await page
    .getByLabel('E-mail', { exact: true })
    .fill(process.env.E2E_EMAIL || 'admin@nexly.com.br');
  await page.getByLabel('Senha', { exact: true }).fill(process.env.E2E_PASSWORD || 'nexly123');
  await page.getByRole('button', { name: 'Entrar no painel', exact: true }).click();
  const alerts = page.getByRole('region', { name: 'Precisa da sua atenção', exact: true });
  await expect(alerts).toContainText('Não foi possível consultar');
  await expect(page.getByRole('heading', { name: 'Movimento do negócio' })).toBeVisible();
  fail = false;
  await alerts.getByRole('button', { name: 'Atualizar alertas' }).click();
  await expect(alerts).not.toContainText('Não foi possível consultar');
});
