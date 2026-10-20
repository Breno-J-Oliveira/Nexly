import { expect, test } from '../fixtures';
import { PrismaClient } from '@prisma/client';
import { config } from 'dotenv';
import argon2 from 'argon2';
import { randomUUID } from 'crypto';
config({ path: 'apps/api/.env', quiet: true });
test.use({ timezoneId: 'America/Sao_Paulo', viewport: { width: 390, height: 844 } });
const senha = 'EstoqueAtomico123!';
function localOnly() {
  test.skip(
    !['localhost', '127.0.0.1'].includes(
      new URL(process.env.DATABASE_URL || 'http://unavailable').hostname,
    ),
    'Fixtures somente locais',
  );
}
async function company(p: PrismaClient, prefix: string) {
  const stamp = randomUUID();
  return p.empresa.create({
    data: {
      nome: `TESTE ${prefix}`,
      cnpj: `${prefix}-${stamp}`,
      usuarios: {
        create: {
          nome: 'TESTE gestor',
          email: `${prefix}-${stamp}@example.test`,
          senhaHash: await argon2.hash(senha),
          role: 'ADMIN',
        },
      },
    },
    include: { usuarios: true },
  });
}
async function clean(p: PrismaClient, id: string) {
  await p.movimentacaoEstoque.deleteMany({ where: { empresaId: id } });
  await p.agendamento.deleteMany({ where: { empresaId: id } });
  await p.servico.deleteMany({ where: { empresaId: id } });
  await p.produto.deleteMany({ where: { empresaId: id } });
  await p.profissional.deleteMany({ where: { empresaId: id } });
  await p.cliente.deleteMany({ where: { empresaId: id } });
  await p.notificacao.deleteMany({ where: { empresaId: id } });
  await p.empresa.delete({ where: { id } });
}
function todayAtTen() {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());
  return new Date(
    ['year', 'month', 'day'].map((t) => parts.find((x) => x.type === t)?.value).join('-') +
      'T13:00:00Z',
  );
}

test('pendências persistem, reprocessam uma vez entre requisições concorrentes e permitem cancelamento auditado', async ({
  page,
  request,
  baseURL,
}) => {
  localOnly();
  test.setTimeout(120000);
  const p = new PrismaClient(),
    a = await company(p, 'stock-pending'),
    b = await company(p, 'stock-other');
  const api = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
  try {
    const valid = await p.produto.create({
      data: {
        id: '1' + randomUUID().slice(1),
        empresaId: a.id,
        nome: 'Insumo com saldo',
        sku: 'OK',
        preco: 10,
        estoqueAtual: 5,
      },
    });
    const missing = await p.produto.create({
      data: {
        id: '2' + randomUUID().slice(1),
        empresaId: a.id,
        nome: 'Insumo a regularizar',
        sku: 'PENDENTE',
        preco: 10,
        estoqueAtual: 0,
      },
    });
    const servico = await p.servico.create({
      data: {
        empresaId: a.id,
        nome: 'Atendimento com insumos',
        duracaoMin: 60,
        preco: 100,
        insumos: {
          create: [
            { produtoId: valid.id, quantidade: 2 },
            { produtoId: missing.id, quantidade: 3 },
          ],
        },
      },
    });
    const cliente = await p.cliente.create({
        data: { empresaId: a.id, nome: 'TESTE cliente de estoque' },
      }),
      prof = await p.profissional.create({ data: { empresaId: a.id, nome: 'TESTE profissional' } });
    const createAppointment = (offset = 0) => {
      const start = new Date(todayAtTen().getTime() + offset);
      return p.agendamento.create({
        data: {
          empresaId: a.id,
          clienteId: cliente.id,
          profissionalId: prof.id,
          servicoId: servico.id,
          dataHora: start,
          dataHoraFim: new Date(start.getTime() + 3600000),
          status: 'CONFIRMADO',
        },
      });
    };
    const agendamento = await createAppointment();
    await page.goto('/login');
    await page.getByLabel('E-mail', { exact: true }).fill(a.usuarios[0]!.email);
    await page.getByLabel('Senha', { exact: true }).fill(senha);
    const loginResponse = page.waitForResponse(
      (r) => r.url().endsWith('/api/auth/login') && r.request().method() === 'POST',
    );
    await page.getByRole('button', { name: 'Entrar no painel', exact: true }).click();
    const { accessToken } = await (await loginResponse).json();
    await page.waitForURL('**/dashboard');
    const headers = { Authorization: `Bearer ${accessToken}`, Origin: baseURL! };
    await page.goto('/agenda');
    await page.getByRole('button', { name: 'Lista', exact: true }).click();
    await page.getByRole('button', { name: 'Concluir', exact: true }).click();
    await expect(page.getByText('Baixa de estoque pendente', { exact: true })).toBeVisible();
    expect((await p.produto.findUniqueOrThrow({ where: { id: valid.id } })).estoqueAtual).toBe(3);
    expect((await p.produto.findUniqueOrThrow({ where: { id: missing.id } })).estoqueAtual).toBe(0);
    expect(
      (await p.agendamento.findUniqueOrThrow({ where: { id: agendamento.id } })).pendenciasEstoque,
    ).toEqual([{ produtoId: missing.id, nomeProduto: missing.nome, quantidade: 3 }]);
    const otherLogin = await request.post(`${api}/api/auth/login`, {
      headers: { Origin: baseURL! },
      data: { email: b.usuarios[0]!.email, senha },
    });
    const other = (await otherLogin.json()).accessToken;
    expect(
      (
        await request.post(`${api}/api/estoque/pendencias/${agendamento.id}/reprocessar`, {
          headers: { Authorization: `Bearer ${other}`, Origin: baseURL! },
          data: {},
        })
      ).status(),
    ).toBe(404);
    await page.goto('/estoque');
    await expect(
      page.getByRole('heading', { name: 'Baixas de atendimento pendentes (1)', exact: true }),
    ).toBeVisible();
    await page
      .getByRole('button', {
        name: `Reprocessar baixa do atendimento ${agendamento.id.slice(0, 8)}`,
        exact: true,
      })
      .click();
    await expect(page.getByRole('alert').filter({ hasText: 'Ainda há insumos' })).toBeVisible();
    const entrada = await request.post(`${api}/api/estoque/entrada`, {
      headers,
      data: { produtoId: missing.id, quantidade: 5, motivo: 'Reposição de teste' },
    });
    expect(entrada.status()).toBe(201);
    const retried = await Promise.all(
      [0, 1].map(() =>
        request.post(`${api}/api/estoque/pendencias/${agendamento.id}/reprocessar`, {
          headers,
          data: {},
        }),
      ),
    );
    expect(retried.map((r) => r.status())).toEqual([201, 201]);
    expect((await p.produto.findUniqueOrThrow({ where: { id: missing.id } })).estoqueAtual).toBe(2);
    expect(
      await p.movimentacaoEstoque.count({
        where: { agendamentoId: agendamento.id, produtoId: missing.id, tipo: 'SAIDA' },
      }),
    ).toBe(1);
    expect((await p.produto.findUniqueOrThrow({ where: { id: valid.id } })).estoqueAtual).toBe(3);
    await page.reload();
    await expect(
      page.getByRole('heading', { name: /Baixas de atendimento pendentes/ }),
    ).toHaveCount(0);
    await p.produto.update({ where: { id: missing.id }, data: { estoqueAtual: 0 } });
    const second = await createAppointment(7200000);
    expect(
      (
        await request.patch(`${api}/api/agendamentos/${second.id}/status`, {
          headers,
          data: { status: 'CONCLUIDO' },
        })
      ).status(),
    ).toBe(200);
    await page.reload();
    await page.getByRole('button', { name: 'Desconsiderar baixa', exact: true }).click();
    const modal = page.getByRole('dialog', { name: 'Desconsiderar baixa pendente', exact: true });
    await expect(modal).toBeVisible();
    await modal
      .getByLabel('Motivo para desconsiderar', { exact: true })
      .fill('Insumo não utilizado neste atendimento');
    await modal.getByRole('button', { name: 'Confirmar e registrar motivo', exact: true }).click();
    await expect(modal).toBeHidden();
    expect((await p.produto.findUniqueOrThrow({ where: { id: missing.id } })).estoqueAtual).toBe(0);
    expect(
      (await p.agendamento.findUniqueOrThrow({ where: { id: second.id } })).pendenciasEstoque,
    ).toEqual([]);
    expect(
      await p.auditLog.count({
        where: { empresaId: a.id, recurso: 'PendenciaEstoque', recursoId: second.id },
      }),
    ).toBe(1);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await p.usuario.update({ where: { id: a.usuarios[0]!.id }, data: { role: 'CAIXA' } });
    expect(
      (
        await request.post(`${api}/api/estoque/pendencias/${second.id}/reprocessar`, {
          headers,
          data: {},
        })
      ).status(),
    ).toBe(403);
  } finally {
    await clean(p, a.id);
    await clean(p, b.id);
    await p.$disconnect();
  }
});

test('erro inesperado após o primeiro insumo reverte status, CRM e todos os descontos', async ({
  request,
  baseURL,
}) => {
  localOnly();
  const p = new PrismaClient(),
    a = await company(p, 'stock-rollback');
  const api = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
  try {
    const first = await p.produto.create({
      data: {
        id: '1' + randomUUID().slice(1),
        empresaId: a.id,
        nome: 'Primeiro insumo válido',
        sku: 'FIRST',
        preco: 10,
        estoqueAtual: 10,
      },
    });
    const invalid = await p.produto.create({
      data: {
        id: '2' + randomUUID().slice(1),
        empresaId: a.id,
        nome: 'Segundo insumo inconsistente',
        sku: 'INVALID',
        preco: 10,
        estoqueAtual: 10,
      },
    });
    // Simula inconsistência legada no banco. A API de serviços não aceita quantidade zero.
    const servico = await p.servico.create({
      data: {
        empresaId: a.id,
        nome: 'TESTE rollback',
        duracaoMin: 60,
        preco: 100,
        insumos: {
          create: [
            { produtoId: first.id, quantidade: 1 },
            { produtoId: invalid.id, quantidade: 0 },
          ],
        },
      },
    });
    const cliente = await p.cliente.create({ data: { empresaId: a.id, nome: 'TESTE rollback' } }),
      prof = await p.profissional.create({ data: { empresaId: a.id, nome: 'TESTE rollback' } });
    const ag = await p.agendamento.create({
      data: {
        empresaId: a.id,
        clienteId: cliente.id,
        profissionalId: prof.id,
        servicoId: servico.id,
        dataHora: todayAtTen(),
        dataHoraFim: new Date(todayAtTen().getTime() + 3600000),
        status: 'CONFIRMADO',
      },
    });
    const login = await request.post(`${api}/api/auth/login`, {
      headers: { Origin: baseURL! },
      data: { email: a.usuarios[0]!.email, senha },
    });
    const { accessToken } = await login.json();
    const result = await request.patch(`${api}/api/agendamentos/${ag.id}/status`, {
      headers: { Authorization: `Bearer ${accessToken}`, Origin: baseURL! },
      data: { status: 'CONCLUIDO' },
    });
    expect(result.status()).toBe(400);
    const rolledBack = await p.agendamento.findUniqueOrThrow({ where: { id: ag.id } });
    expect(rolledBack.status).toBe('CONFIRMADO');
    expect(rolledBack.valorServicoConcluido).toBeNull();
    expect(rolledBack.comissaoPercentualAplicada).toBeNull();
    expect((await p.produto.findUniqueOrThrow({ where: { id: first.id } })).estoqueAtual).toBe(10);
    expect(await p.movimentacaoEstoque.count({ where: { agendamentoId: ag.id } })).toBe(0);
    expect(
      (await p.cliente.findUniqueOrThrow({ where: { id: cliente.id } })).ultimaVisita,
    ).toBeNull();
  } finally {
    await clean(p, a.id);
    await p.$disconnect();
  }
});
