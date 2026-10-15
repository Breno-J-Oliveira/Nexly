require('./local-api-env.cjs');
const { PrismaClient } = require('@prisma/client');
const argon2 = require('argon2');
const assert = require('node:assert/strict');
const p = new PrismaClient();
const companies = [];
let checks = 0;
function ok(v, m) {
  assert(v, m);
  checks++;
  console.log('PASS ' + m);
}
async function req(method, path, token, body) {
  const r = await fetch('http://localhost:3001/api' + path, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: 'Bearer ' + token } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await r.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    data = text;
  }
  return { status: r.status, data };
}
(async () => {
  const suffix = Date.now();
  const senha = 'TesteSeguro123!';
  for (let i = 0; i < 2; i++)
    companies.push(
      await p.empresa.create({
        data: { nome: 'TESTE revisao descartavel', cnpj: `review-${suffix}-${i}` },
      }),
    );
  const [a, b] = companies;
  const tokens = {};
  for (const role of ['ADMIN', 'CAIXA', 'RECEPCIONISTA']) {
    const u = await p.usuario.create({
      data: {
        empresaId: a.id,
        nome: 'TESTE revisao ' + role,
        email: `review-${role.toLowerCase()}-${suffix}@example.test`,
        role,
        senhaHash: await argon2.hash(senha),
      },
    });
    tokens[role] = (
      await req('POST', '/auth/login', null, { email: u.email, senha })
    ).data.accessToken;
    ok(!!tokens[role], 'sessao ' + role);
  }
  await p.venda.create({
    data: {
      empresaId: a.id,
      total: 180,
      desconto: 20,
      createdAt: new Date('2026-10-14T18:00:00Z'),
    },
  });
  await p.venda.create({
    data: {
      empresaId: b.id,
      total: 99999,
      desconto: 0,
      createdAt: new Date('2026-10-14T18:00:00Z'),
    },
  });
  const admin = await req('GET', '/dashboard', tokens.ADMIN);
  ok(admin.status === 200 && admin.data.receitaMes, 'dashboard administrativo completo');
  for (const role of ['CAIXA', 'RECEPCIONISTA']) {
    const r = await req('GET', '/dashboard', tokens[role]);
    ok(r.status === 200, 'dashboard basico ' + role);
    ok(
      !('receitaMes' in r.data) &&
        !('ticketMedio' in r.data) &&
        !('evolucaoVendasSemanal' in r.data),
      'cache nao expõe financeiro ' + role,
    );
  }
  const caixa = (await req('GET', '/dashboard', tokens.CAIXA)).data;
  ok(!('proximosCompromissos' in caixa), 'caixa nao recebe agenda sem permissao');
  const dre = await req(
    'GET',
    '/financeiro/dre?dataInicio=2026-10-01&dataFim=2026-10-14',
    tokens.ADMIN,
  );
  ok(dre.status === 200, 'DRE responde');
  ok(
    dre.data.receitaBruta === 200 &&
      dre.data.receitaLiquida === 180 &&
      dre.data.qtdVendas === 1 &&
      dre.data.ticketMedio === 180,
    'DRE correto e isolado da outra empresa',
  );
  ok(
    dre.data.cmv === null && dre.data.margemBruta === null,
    'sem margem ficticia quando faltam custos',
  );
  ok(
    (await req('GET', '/financeiro/dre?dataInicio=2026-10-15&dataFim=2026-10-01', tokens.ADMIN))
      .status === 400,
    'periodo invertido retorna 400',
  );
  ok(
    (await req('GET', '/relatorios/agenda?dataInicio=2026-02-30&dataFim=2026-03-01', tokens.ADMIN))
      .status === 400,
    'data inexistente retorna 400',
  );
  ok(
    (await req('GET', '/health/migrations')).status === 401,
    'diagnostico de migrations protegido',
  );
  ok(
    (await req('GET', '/health/migrations', tokens.CAIXA)).status === 403,
    'diagnostico restrito a administrador',
  );
  ok(
    (await req('GET', '/health/migrations', tokens.ADMIN)).status === 200,
    'administrador consulta migrations',
  );
  const csv = await req(
    'GET',
    '/export/vendas/csv?dataInicio=2026-10-14&dataFim=2026-10-14',
    tokens.ADMIN,
  );
  ok(csv.status === 200 && csv.data.includes('180'), 'CSV inclui venda no dia final');
  ok(!csv.data.includes('99999'), 'CSV isolado por empresa');
  ok(
    (await req('GET', '/agendamentos?page=-1', tokens.ADMIN)).status === 400,
    'paginacao negativa recusada',
  );
  ok(
    (await req('GET', '/agendamentos?limit=9999999', tokens.ADMIN)).status === 400,
    'limite abusivo recusado',
  );
  ok(
    (await req('PUT', '/configuracoes', tokens.ADMIN, { lembretesAtivos: 'false' })).status === 400,
    'booleano textual recusado',
  );
  console.log(checks + ' verificacoes passaram');
})()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    for (const c of companies) {
      await p.venda.deleteMany({ where: { empresaId: c.id } });
      await p.empresa.delete({ where: { id: c.id } });
    }
    await p.$disconnect();
  });
