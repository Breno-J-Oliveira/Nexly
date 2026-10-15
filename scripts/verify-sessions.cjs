require('./local-api-env.cjs');
const { PrismaClient } = require('@prisma/client');
const argon2 = require('argon2');
const assert = require('node:assert/strict');
const p = new PrismaClient();
const companies = [];
let checks = 0;
function ok(value, message) {
  assert(value, message);
  checks++;
  console.log('PASS ' + message);
}
async function req(method, path, session, body) {
  const r = await fetch('http://localhost:3001/api' + path, {
    method,
    headers: {
      'Content-Type': 'application/json',
      Origin: 'http://localhost:3002',
      ...(session?.token ? { Authorization: 'Bearer ' + session.token } : {}),
      ...(session?.cookie ? { Cookie: session.cookie } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = await r.json();
  return { status: r.status, data, cookie: r.headers.get('set-cookie')?.split(';')[0] };
}
async function login(user, senha) {
  const r = await req('POST', '/auth/login', null, { email: user.email, senha });
  assert.equal(r.status, 200, 'login do fixture');
  return { token: r.data.accessToken, cookie: r.cookie };
}
(async () => {
  const suffix = Date.now(),
    senha = 'TesteSeguro123!';
  for (let i = 0; i < 2; i++)
    companies.push(
      await p.empresa.create({
        data: { nome: 'TESTE sessoes descartavel', cnpj: `sessions-${suffix}-${i}` },
      }),
    );
  const [a, b] = companies;
  const user = await p.usuario.create({
    data: {
      empresaId: a.id,
      nome: 'TESTE admin',
      email: `sessions-${suffix}@example.test`,
      senhaHash: await argon2.hash(senha),
      role: 'ADMIN',
    },
  });
  const s1 = await login(user, senha);
  ok(
    (await req('PUT', '/usuarios/' + user.id, s1, { ativo: false })).status === 409,
    'ultimo admin nao pode ser desativado',
  );
  ok(
    (await req('PUT', '/usuarios/' + user.id, s1, { role: 'CAIXA' })).status === 409,
    'ultimo admin nao pode perder o papel',
  );
  ok(
    (await req('DELETE', '/usuarios/' + user.id, s1)).status === 409,
    'DELETE preserva ultimo admin',
  );
  const sessions = await req('GET', '/auth/sessions', s1);
  ok(
    sessions.status === 200 && sessions.data.length === 1 && sessions.data[0].atual,
    'lista somente a sessao pessoal atual',
  );
  const sid = sessions.data[0].id;
  const refreshed = await req('POST', '/auth/refresh', s1, {});
  ok(refreshed.status === 200 && !!refreshed.data.accessToken, 'rotacao de refresh aceita');
  ok(
    (await req('GET', '/auth/me', s1)).status === 200,
    'rotacao nao derruba access token de outra aba',
  );
  const rotated = { token: refreshed.data.accessToken, cookie: refreshed.cookie };
  ok(
    (await req('GET', '/auth/sessions', rotated)).data[0].id === sid,
    'rotacao mantem a mesma sessao',
  );
  const s2 = await login(user, senha);
  await req('POST', '/auth/logout', s1, {});
  ok(
    (await req('GET', '/auth/me', rotated)).status === 401,
    'logout com cookie antigo revoga access token atual',
  );
  ok(
    (await req('POST', '/auth/refresh', rotated, {})).status === 401,
    'sessao encerrada nao renova',
  );
  ok(
    (await req('GET', '/auth/me', s2)).status === 200,
    'logout preserva outra sessao independente',
  );
  const foreign = await p.usuario.create({
    data: {
      empresaId: b.id,
      nome: 'TESTE externo',
      email: `sessions-foreign-${suffix}@example.test`,
      senhaHash: await argon2.hash(senha),
      role: 'ADMIN',
    },
  });
  const foreignSession = await login(foreign, senha);
  const foreignId = (await req('GET', '/auth/sessions', foreignSession)).data[0].id;
  ok(
    (await req('DELETE', '/auth/sessions/' + foreignId, s2)).status === 404,
    'nao revoga sessao de outra pessoa/empresa',
  );
  ok(
    (await req('PUT', '/usuarios/' + foreign.id, s2, { ativo: false })).status === 404,
    'gestao de usuario nao cruza empresas',
  );
  const s3 = await login(user, senha);
  ok(
    (
      await req('POST', '/usuarios/trocar-senha', s2, {
        senhaAtual: 'errada',
        novaSenha: 'NovaSenha123!',
      })
    ).status === 400,
    'senha atual obrigatoriamente conferida',
  );
  ok((await req('GET', '/auth/me', s2)).status === 200, 'falha de senha nao encerra acesso');
  ok(
    (
      await req('POST', '/usuarios/trocar-senha', s2, {
        senhaAtual: senha,
        novaSenha: 'NovaSenha123!',
      })
    ).status === 201,
    'troca de senha valida',
  );
  ok(
    (await req('GET', '/auth/me', s2)).status === 401 &&
      (await req('GET', '/auth/me', s3)).status === 401,
    'troca de senha invalida todos os JWT imediatamente',
  );
  ok(
    (await req('POST', '/auth/refresh', s3, {})).status === 401,
    'troca de senha impede renovar sessao anterior',
  );
  const s4 = await login(user, 'NovaSenha123!');
  const admin2 = await p.usuario.create({
    data: {
      empresaId: a.id,
      nome: 'TESTE admin 2',
      email: `sessions-second-${suffix}@example.test`,
      senhaHash: await argon2.hash(senha),
      role: 'ADMIN',
    },
  });
  const second = await login(admin2, senha);
  await req('PUT', '/usuarios/' + admin2.id, s4, { ativo: false });
  await req('PUT', '/usuarios/' + admin2.id, s4, { ativo: true });
  ok(
    (await req('GET', '/auth/me', second)).status === 401,
    'reativar usuario nao restaura token revogado',
  );
  const results = await Promise.all([
    req('PUT', '/usuarios/' + user.id, s4, { role: 'CAIXA' }),
    req('PUT', '/usuarios/' + admin2.id, s4, { role: 'CAIXA' }),
  ]);
  ok(
    results.filter((r) => r.status === 200).length === 1 &&
      (await p.usuario.count({ where: { empresaId: a.id, ativo: true, role: 'ADMIN' } })) === 1,
    'mudancas concorrentes preservam um administrador',
  );
  ok(
    (await req('GET', '/auth/me', foreignSession)).status === 200,
    'mudancas pessoais preservam a outra empresa',
  );
  console.log(checks + ' verificacoes de sessoes e administradores passaram');
})()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    for (const company of companies) await p.empresa.delete({ where: { id: company.id } });
    await p.$disconnect();
  });
