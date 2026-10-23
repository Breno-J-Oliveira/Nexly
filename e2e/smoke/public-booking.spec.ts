import { expect, test } from '../fixtures';
import { PrismaClient } from '@prisma/client';
import { config } from 'dotenv';
import { randomBytes } from 'crypto';
import argon2 from 'argon2';
config({ path: 'apps/api/.env', quiet: true });
test.use({ timezoneId: 'Asia/Tokyo', viewport: { width: 390, height: 844 } });

test('agendamento público respeita profissional e fuso, recupera conflito e confirma sem prometer WhatsApp', async ({
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
    token = randomBytes(16).toString('hex');
  const empresa = await p.empresa.create({
    data: {
      nome: 'Clínica do teste público',
      cnpj: `public-${stamp}`,
      bookingToken: token,
      fusoHorario: 'America/Sao_Paulo',
      horarios: Object.fromEntries(
        ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sab'].map((d) => [
          d,
          { aberto: true, abre: '09:00', fecha: '18:00' },
        ]),
      ),
    },
  });
  const api = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
  try {
    const prof = await p.profissional.create({
      data: { empresaId: empresa.id, nome: 'Profissional escolhido' },
    });
    await p.profissional.create({ data: { empresaId: empresa.id, nome: 'Outro profissional' } });
    const servico = await p.servico.create({
      data: { empresaId: empresa.id, nome: 'Consulta pública', preco: 120, duracaoMin: 60 },
    });
    const cliente = await p.cliente.create({
      data: { empresaId: empresa.id, nome: 'Cliente anterior' },
    });
    const todayParts = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/Sao_Paulo',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(new Date());
    const today = ['year', 'month', 'day']
      .map((t) => todayParts.find((p) => p.type === t)?.value)
      .join('-');
    const tomorrow = new Date(today + 'T12:00:00Z');
    tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
    const day = tomorrow.toISOString().slice(0, 10);
    await p.agendamento.create({
      data: {
        empresaId: empresa.id,
        clienteId: cliente.id,
        profissionalId: prof.id,
        servicoId: servico.id,
        dataHora: new Date(day + 'T13:00:00Z'),
        dataHoraFim: new Date(day + 'T14:00:00Z'),
        status: 'CONFIRMADO',
      },
    });
    const invalid = await request.get(
      `${api}/api/booking/${token}/disponibilidade?data=2026-02-30&servicoId=${servico.id}`,
    );
    expect(invalid.status()).toBe(400);
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto(`/booking/${token}`);
    await page.getByRole('button', { name: /Consulta pública/ }).click();
    await page.getByRole('button', { name: 'Próximo →', exact: true }).click();
    await page.getByRole('button', { name: /Profissional escolhido/ }).click();
    await page.getByRole('button', { name: 'Próximo →', exact: true }).click();
    if (today.slice(0, 7) !== day.slice(0, 7))
      await page.getByRole('button', { name: 'Próximo mês', exact: true }).click();
    const [year, month, date] = day.split('-');
    await page
      .getByRole('button', { name: `Selecionar ${date}/${month}/${year}`, exact: true })
      .click();
    const availableRequest = page.waitForRequest((r) => r.url().includes('/disponibilidade?'));
    await page.getByRole('button', { name: 'Próximo →', exact: true }).click();
    expect(new URL((await availableRequest).url()).searchParams.get('profissionalId')).toBe(
      prof.id,
    );
    await expect(page.getByRole('button', { name: '11:00', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: '10:00', exact: true })).toHaveCount(0);
    await page.getByRole('button', { name: '11:00', exact: true }).click();
    await page.getByRole('button', { name: 'Próximo →', exact: true }).click();
    await page.getByLabel('Seu nome completo', { exact: true }).fill('Cliente de outro fuso');
    await page.getByLabel('WhatsApp', { exact: true }).fill('11999992222');
    await page.screenshot({
      path: 'test-results/manual/redesign-agendamento-390.png',
      fullPage: true,
    });
    await page.setViewportSize({ width: 1440, height: 900 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await page.screenshot({
      path: 'test-results/manual/redesign-agendamento-1440.png',
      fullPage: true,
    });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.route(`**/api/booking/${token}`, (route) =>
      route.request().method() === 'POST'
        ? route.fulfill({
            status: 409,
            headers: { 'Access-Control-Allow-Origin': baseURL! },
            json: { message: 'Horario ja ocupado' },
          })
        : route.fallback(),
    );
    await page.getByRole('button', { name: 'Confirmar agendamento', exact: true }).click();
    await expect(
      page.getByRole('alert').filter({ hasText: 'Esse horário acabou de ser reservado' }),
    ).toBeVisible();
    expect(await p.agendamento.count({ where: { empresaId: empresa.id } })).toBe(1);
    await page.unroute(`**/api/booking/${token}`);
    await page.getByRole('button', { name: 'Escolher outro horário', exact: true }).click();
    await page.getByRole('button', { name: '11:00', exact: true }).click();
    await page.getByRole('button', { name: 'Próximo →', exact: true }).click();
    await page.getByRole('button', { name: 'Confirmar agendamento', exact: true }).click();
    await expect(
      page.getByRole('heading', { name: 'Agendamento confirmado!', exact: true }),
    ).toBeVisible();
    const created = await p.agendamento.findFirstOrThrow({
      where: { empresaId: empresa.id, status: 'AGENDADO' },
    });
    expect(created.profissionalId).toBe(prof.id);
    expect(created.dataHora.toISOString()).toBe(day + 'T14:00:00.000Z');
    await expect(
      page.getByText('Você receberá uma confirmação no WhatsApp.', { exact: true }),
    ).toHaveCount(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    expect(errors).toEqual([]);
  } finally {
    await p.agendamento.deleteMany({ where: { empresaId: empresa.id } });
    await p.servico.deleteMany({ where: { empresaId: empresa.id } });
    await p.profissional.deleteMany({ where: { empresaId: empresa.id } });
    await p.cliente.deleteMany({ where: { empresaId: empresa.id } });
    await p.empresa.delete({ where: { id: empresa.id } });
    await p.$disconnect();
  }
});

test('falha de conexão permite recuperar o link e catálogo vazio não fica carregando', async ({
  page,
}) => {
  test.skip(
    !['localhost', '127.0.0.1'].includes(
      new URL(process.env.DATABASE_URL || 'http://unavailable').hostname,
    ),
    'Fixtures somente locais',
  );
  const p = new PrismaClient(),
    stamp = Date.now(),
    token = randomBytes(16).toString('hex');
  const empresa = await p.empresa.create({
    data: {
      nome: 'TESTE catálogo público vazio',
      cnpj: `empty-booking-${stamp}`,
      bookingToken: token,
    },
  });
  try {
    await page.route(`**/api/booking/${token}`, (route) => route.abort());
    await page.goto(`/booking/${token}`);
    await expect(
      page.getByRole('heading', {
        name: 'Não foi possível conectar. Verifique sua conexão e tente novamente.',
        exact: true,
      }),
    ).toBeVisible();
    await page.unroute(`**/api/booking/${token}`);
    await page.getByRole('button', { name: 'Tentar novamente', exact: true }).click();
    await expect(page.getByRole('status')).toContainText('ainda não disponibilizou serviços');
    await expect(page.getByRole('button', { name: 'Próximo →', exact: true })).toBeDisabled();
  } finally {
    await p.empresa.delete({ where: { id: empresa.id } });
    await p.$disconnect();
  }
});

test('configuração de horários no celular valida intervalos e persiste o fuso', async ({
  page,
}) => {
  test.setTimeout(90000);
  test.skip(
    !['localhost', '127.0.0.1'].includes(
      new URL(process.env.DATABASE_URL || 'http://unavailable').hostname,
    ),
    'Fixtures somente locais',
  );
  const p = new PrismaClient(),
    stamp = Date.now(),
    email = `booking-settings-${stamp}@example.test`,
    senha = 'ConfigurarHoras123!';
  const empresa = await p.empresa.create({
    data: {
      nome: 'TESTE horário mobile',
      cnpj: `booking-settings-${stamp}`,
      usuarios: {
        create: { nome: 'TESTE gestor', email, senhaHash: await argon2.hash(senha), role: 'ADMIN' },
      },
    },
  });
  try {
    await page.goto('/login');
    await page.getByLabel('E-mail', { exact: true }).fill(email);
    await page.getByLabel('Senha', { exact: true }).fill(senha);
    await page.getByRole('button', { name: 'Entrar no painel', exact: true }).click();
    await page.waitForURL('**/dashboard');
    await page.goto('/configuracoes');
    await page.getByRole('button', { name: 'Horário de Funcionamento', exact: true }).click();
    const toggle = page.getByRole('switch', { name: 'Atendimento: Segunda', exact: true });
    await expect(toggle).toBeVisible();
    expect((await toggle.boundingBox())!.height).toBeGreaterThanOrEqual(44);
    await page
      .getByLabel('Fuso horário do estabelecimento', { exact: true })
      .selectOption('America/Manaus');
    await page.getByLabel('Abertura: Segunda', { exact: true }).fill('18:00');
    await page.getByLabel('Fechamento: Segunda', { exact: true }).fill('09:00');
    await page.getByRole('button', { name: 'Salvar horários', exact: true }).click();
    await expect(
      page.getByText('Não foi possível salvar os horários. Verifique os dados e tente novamente.', {
        exact: true,
      }),
    ).toBeVisible();
    expect((await p.empresa.findUniqueOrThrow({ where: { id: empresa.id } })).fusoHorario).toBe(
      'America/Sao_Paulo',
    );
    await page.getByLabel('Abertura: Segunda', { exact: true }).fill('09:00');
    await page.getByLabel('Fechamento: Segunda', { exact: true }).fill('18:00');
    await page.getByRole('button', { name: 'Salvar horários', exact: true }).click();
    await expect
      .poll(
        async () => (await p.empresa.findUniqueOrThrow({ where: { id: empresa.id } })).fusoHorario,
      )
      .toBe('America/Manaus');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await page.screenshot({
      path: 'test-results/manual/review-config-horarios-mobile.png',
      fullPage: true,
    });
  } finally {
    await p.empresa.delete({ where: { id: empresa.id } });
    await p.$disconnect();
  }
});
