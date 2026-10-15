import { expect, test } from '@playwright/test';
import { PrismaClient } from '@prisma/client';
import { config } from 'dotenv';
import argon2 from 'argon2';
config({ path: 'apps/api/.env' });
test.use({ storageState: { cookies: [], origins: [] }, timezoneId: 'America/Sao_Paulo' });

test('calendar filters, late appointments, mobile creation and cancellation work together', async ({
  page,
}) => {
  test.setTimeout(120000);
  test.skip(
    !['localhost', '127.0.0.1'].includes(
      new URL(process.env.DATABASE_URL || 'http://unavailable').hostname,
    ),
    'Fixtures somente locais',
  );
  const p = new PrismaClient();
  const suffix = Date.now(),
    email = `agenda-${suffix}@example.test`;
  const empresa = await p.empresa.create({
    data: {
      nome: 'TESTE agenda',
      cnpj: `agenda-${suffix}`,
      usuarios: {
        create: {
          nome: 'TESTE gestor',
          email,
          senhaHash: await argon2.hash('AgendaTeste123!'),
          role: 'ADMIN',
        },
      },
    },
    include: { usuarios: true },
  });
  try {
    await p.cliente.createMany({
      data: Array.from({ length: 60 }, (_, i) => ({
        empresaId: empresa.id,
        nome: `AAA Cliente ${String(i).padStart(2, '0')}`,
      })),
    });
    const alvo = await p.cliente.create({
      data: { empresaId: empresa.id, nome: 'ZZZ cliente fora da primeira página' },
    });
    const outro = await p.cliente.create({
      data: { empresaId: empresa.id, nome: 'TESTE cliente simultâneo' },
    });
    const noite = await p.cliente.create({
      data: { empresaId: empresa.id, nome: 'TESTE cliente noturno' },
    });
    const prof1 = await p.profissional.create({
      data: { empresaId: empresa.id, nome: 'TESTE equipe A' },
    });
    const prof2 = await p.profissional.create({
      data: { empresaId: empresa.id, nome: 'TESTE equipe B' },
    });
    const servico = await p.servico.create({
      data: { empresaId: empresa.id, nome: 'Consulta teste', preco: 90, duracaoMin: 30 },
    });
    const dates = await page.evaluate(() => {
      const day = new Date(),
        late = new Date(),
        tomorrow = new Date();
      day.setHours(10, 0, 0, 0);
      late.setHours(23, 0, 0, 0);
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(9, 0, 0, 0);
      return {
        day: day.toISOString(),
        late: late.toISOString(),
        tomorrow: tomorrow.toISOString(),
        local: `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, '0')}-${String(tomorrow.getDate()).padStart(2, '0')}T09:00`,
      };
    });
    const horario = new Date(dates.day),
      late = new Date(dates.late);
    const agendar = (clienteId: string, profissionalId: string, dataHora: Date) =>
      p.agendamento.create({
        data: {
          empresaId: empresa.id,
          clienteId,
          profissionalId,
          servicoId: servico.id,
          status: 'CONFIRMADO',
          dataHora,
          dataHoraFim: new Date(dataHora.getTime() + 1800000),
        },
      });
    const a = await agendar(alvo.id, prof1.id, horario),
      b = await agendar(outro.id, prof2.id, horario);
    const n = await agendar(noite.id, prof1.id, late);
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/login');
    await page.getByLabel('E-mail', { exact: true }).fill(email);
    await page.getByLabel('Senha', { exact: true }).fill('AgendaTeste123!');
    await page.getByRole('button', { name: 'Entrar no painel', exact: true }).click();
    await page.waitForURL('**/dashboard');
    await page.goto('/agenda');
    await expect(page.getByText(noite.nome, { exact: true })).toBeVisible();
    await page.getByLabel('Filtrar por profissional').selectOption(prof2.id);
    await expect(page.getByText(noite.nome, { exact: true })).toHaveCount(0);
    await expect(page.getByText(outro.nome, { exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Semana', exact: true }).click();
    await expect(page.locator('[data-appointment-id]')).toHaveCount(1);
    await page.getByRole('button', { name: 'Concluído', exact: true }).click();
    await expect(page.locator('[data-appointment-id]')).toHaveCount(0);
    await page.getByRole('button', { name: 'Todos', exact: true }).click();
    await page.getByLabel('Filtrar por profissional').selectOption('');
    await expect(page.locator('[data-appointment-id]')).toHaveCount(3);
    await expect(page.locator(`[data-appointment-id="${n.id}"]`)).toBeAttached();
    const boxA = await page.locator(`[data-appointment-id="${a.id}"]`).boundingBox();
    const boxB = await page.locator(`[data-appointment-id="${b.id}"]`).boundingBox();
    expect(boxA!.x + boxA!.width <= boxB!.x + 1 || boxB!.x + boxB!.width <= boxA!.x + 1).toBe(true);
    await page.getByRole('button', { name: '+ Novo agendamento', exact: true }).click();
    const modal = page.getByRole('dialog', { name: 'Novo agendamento', exact: true });
    await expect(modal).toBeVisible();
    await modal.getByLabel('Buscar cliente', { exact: true }).fill('ZZZ cliente');
    await modal.getByRole('button', { name: alvo.nome, exact: true }).click();
    await modal.getByRole('button', { name: 'Próximo', exact: true }).click();
    await modal.getByLabel('Profissional', { exact: true }).selectOption(prof1.id);
    await modal.getByLabel('Serviço', { exact: true }).selectOption(servico.id);
    await modal.getByRole('button', { name: 'Próximo', exact: true }).click();
    const tomorrow = new Date(dates.tomorrow);
    const local = dates.local;
    await modal.getByLabel('Data e hora', { exact: true }).fill(local);
    await page.screenshot({ path: 'docs/review-agendamento-mobile.png', fullPage: false });
    await modal.getByRole('button', { name: 'Salvar', exact: true }).click();
    await expect(modal).toBeHidden();
    await page.getByRole('button', { name: 'Lista', exact: true }).click();
    await expect(page.getByText(alvo.nome, { exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Cancelar', exact: true }).click();
    await expect(
      page.getByRole('dialog', { name: 'Cancelar agendamento', exact: true }),
    ).toBeVisible();
    await page.getByRole('button', { name: 'Manter agendamento', exact: true }).click();
    expect(
      (await p.agendamento.findFirst({ where: { empresaId: empresa.id, dataHora: tomorrow } }))
        ?.status,
    ).toBe('AGENDADO');
    await page.getByRole('button', { name: 'Cancelar', exact: true }).click();
    await page.getByRole('button', { name: 'Confirmar cancelamento', exact: true }).click();
    await expect
      .poll(
        async () =>
          (await p.agendamento.findFirst({ where: { empresaId: empresa.id, dataHora: tomorrow } }))
            ?.status,
      )
      .toBe('CANCELADO');
    await p.usuario.update({
      where: { id: empresa.usuarios[0]!.id },
      data: { role: 'PROFISSIONAL' },
    });
    await page.reload();
    await expect(page.getByRole('button', { name: '+ Novo agendamento', exact: true })).toHaveCount(
      0,
    );
    await expect(page.getByRole('button', { name: 'Cancelar', exact: true })).toHaveCount(0);
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
