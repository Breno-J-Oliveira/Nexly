import { PrismaClient } from '@prisma/client';
import argon2 from 'argon2';
import { randomUUID } from 'node:crypto';
import { expect, test } from '../fixtures';

test('comissões preservam valores da conclusão, aceitam configuração e mantêm profissionais inativos no histórico', async ({
  request,
  page,
  baseURL,
}) => {
  test.setTimeout(120000);
  const api = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
  test.skip(
    !['localhost', '127.0.0.1'].includes(
      new URL(process.env.DATABASE_URL || 'http://unavailable').hostname,
    ) || !['localhost', '127.0.0.1'].includes(new URL(api).hostname),
    'Somente API e banco locais',
  );
  const db = new PrismaClient();
  const stamp = randomUUID();
  const email = `commission-${stamp}@example.test`;
  const senha = 'ComissaoLocal123!';
  const company = await db.empresa.create({
    data: {
      nome: 'TESTE valores históricos',
      cnpj: `commission-${stamp}`,
      usuarios: {
        create: {
          nome: 'Administrador teste',
          email,
          senhaHash: await argon2.hash(senha),
          role: 'ADMIN',
        },
      },
    },
  });
  try {
    const client = await db.cliente.create({
      data: { empresaId: company.id, nome: 'Cliente teste' },
    });
    const professional = await db.profissional.create({
      data: { empresaId: company.id, nome: 'Profissional histórico', comissaoPercentual: 25 },
    });
    const service = await db.servico.create({
      data: { empresaId: company.id, nome: 'Serviço histórico', duracaoMin: 30, preco: 120 },
    });
    const date = new Date();
    date.setUTCHours(15, 0, 0, 0);
    const day = date.toISOString().slice(0, 10);
    const appointmentData = {
      empresaId: company.id,
      clienteId: client.id,
      profissionalId: professional.id,
      servicoId: service.id,
      dataHora: date,
      dataHoraFim: new Date(date.getTime() + 1800000),
    };
    const first = await db.agendamento.create({ data: appointmentData });
    const login = await request.post(`${api}/api/auth/login`, {
      headers: { Origin: baseURL! },
      data: { email, senha },
    });
    expect(login.status()).toBe(200);
    const { accessToken } = await login.json();
    const headers = { Authorization: `Bearer ${accessToken}`, Origin: baseURL! };
    expect(
      (
        await request.patch(`${api}/api/agendamentos/${first.id}/status`, {
          headers,
          data: { status: 'CONCLUIDO' },
        })
      ).status(),
    ).toBe(200);
    const stored = await db.agendamento.findUniqueOrThrow({ where: { id: first.id } });
    expect(Number(stored.valorServicoConcluido)).toBe(120);
    expect(Number(stored.comissaoPercentualAplicada)).toBe(25);

    await page.goto('/login?next=%2Fprofissionais');
    await page.getByLabel('E-mail', { exact: true }).fill(email);
    await page.getByLabel('Senha', { exact: true }).fill(senha);
    await page.getByRole('button', { name: 'Entrar no painel', exact: true }).click();
    await expect(page).toHaveURL(/\/profissionais$/);
    await page.getByRole('button', { name: 'Editar', exact: true }).first().click();
    const dialog = page.getByRole('dialog', { name: 'Editar profissional', exact: true });
    await expect(dialog.getByLabel('Comissão sobre serviços (%)', { exact: true })).toHaveValue(
      '25',
    );
    await dialog.getByLabel('Comissão sobre serviços (%)', { exact: true }).fill('30.5');
    await dialog.getByRole('button', { name: 'Salvar', exact: true }).click();
    await expect(dialog).toHaveCount(0);
    expect(
      (await db.profissional.findUniqueOrThrow({ where: { id: professional.id } }))
        .comissaoPercentual,
    ).toBe(30.5);
    await db.servico.update({ where: { id: service.id }, data: { preco: 220 } });
    const second = await db.agendamento.create({
      data: {
        ...appointmentData,
        dataHora: new Date(date.getTime() + 3600000),
        dataHoraFim: new Date(date.getTime() + 5400000),
      },
    });
    expect(
      (
        await request.patch(`${api}/api/agendamentos/${second.id}/status`, {
          headers,
          data: { status: 'CONCLUIDO' },
        })
      ).status(),
    ).toBe(200);
    await db.servico.update({ where: { id: service.id }, data: { preco: 999 } });
    expect(
      (
        await request.put(`${api}/api/profissionais/${professional.id}`, {
          headers,
          data: { comissaoPercentual: 90 },
        })
      ).status(),
    ).toBe(200);
    expect(
      (
        await request.put(`${api}/api/profissionais/${professional.id}`, {
          headers,
          data: { comissaoPercentual: 101 },
        })
      ).status(),
    ).toBe(400);
    expect(
      (
        await request.patch(`${api}/api/agendamentos/${first.id}/status`, {
          headers,
          data: { status: 'CONCLUIDO' },
        })
      ).status(),
    ).toBe(422);
    const params = new URLSearchParams({ dataInicio: day, dataFim: day });
    const summaryURL = `${api}/api/comissao/resumo?${params}`;
    let summary = await request.get(summaryURL, { headers });
    expect(summary.status()).toBe(200);
    expect((await summary.json()).total).toEqual({
      faturamento: 340,
      comissao: 97.1,
      servicos: 2,
      estimados: 0,
    });
    const receptionistEmail = `commission-reception-${stamp}@example.test`;
    await db.usuario.create({
      data: {
        empresaId: company.id,
        email: receptionistEmail,
        nome: 'Recepcionista teste',
        senhaHash: await argon2.hash(senha),
        role: 'RECEPCIONISTA',
      },
    });
    const receptionLogin = await request.post(`${api}/api/auth/login`, {
      headers: { Origin: baseURL! },
      data: { email: receptionistEmail, senha },
    });
    expect(receptionLogin.status()).toBe(200);
    const receptionHeaders = {
      Authorization: `Bearer ${(await receptionLogin.json()).accessToken}`,
    };
    const publicTeam = await request.get(`${api}/api/profissionais`, { headers: receptionHeaders });
    expect(publicTeam.status()).toBe(200);
    expect((await publicTeam.json())[0]).not.toHaveProperty('comissaoPercentual');
    const receptionAppointment = await request.get(`${api}/api/agendamentos/${first.id}`, {
      headers: receptionHeaders,
    });
    expect(receptionAppointment.status()).toBe(200);
    const receptionData = await receptionAppointment.json();
    expect(receptionData).not.toHaveProperty('comissaoPercentualAplicada');
    expect(receptionData.profissional).not.toHaveProperty('comissaoPercentual');
    expect((await request.get(summaryURL, { headers: receptionHeaders })).status()).toBe(403);
    expect(
      (await request.delete(`${api}/api/profissionais/${professional.id}`, { headers })).status(),
    ).toBe(200);
    summary = await request.get(summaryURL, { headers });
    expect((await summary.json()).profissionais[0]).toMatchObject({
      id: professional.id,
      ativo: false,
      faturamento: 340,
      comissao: 97.1,
    });
    const report = await request.get(`${api}/api/relatorios/profissionais?${params}`, { headers });
    expect(report.status()).toBe(200);
    expect((await report.json())[0]).toMatchObject({
      id: professional.id,
      receita: 340,
      comissao: 97.1,
      estimados: 0,
    });

    await db.agendamento.create({ data: { ...appointmentData, status: 'CONCLUIDO' } });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/comissao');
    await page.getByLabel('Data inicial', { exact: true }).fill(day);
    await page.getByLabel('Data final', { exact: true }).fill(day);
    await expect(page.getByRole('status').filter({ hasText: 'como estimativa' })).toBeVisible();
    await expect(page.getByRole('row').filter({ hasText: professional.nome })).toContainText(
      'Inativo',
    );
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await page.screenshot({
      path: 'test-results/manual/comissoes-historico-390.png',
      fullPage: true,
    });
  } finally {
    await db.agendamento.deleteMany({ where: { empresaId: company.id } });
    await db.servico.deleteMany({ where: { empresaId: company.id } });
    await db.profissional.deleteMany({ where: { empresaId: company.id } });
    await db.cliente.deleteMany({ where: { empresaId: company.id } });
    await db.empresa.delete({ where: { id: company.id } });
    await db.$disconnect();
  }
});
