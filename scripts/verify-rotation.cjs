require('./local-api-env.cjs');
const { PrismaClient } = require('@prisma/client');
const argon2 = require('argon2');
const assert = require('node:assert/strict');
const p = new PrismaClient();
let company;
let checks = 0;
function ok(value, label) {
  assert(value, label);
  checks++;
  console.log('PASS ' + label);
}
async function req(path, session, body) {
  const r = await fetch('http://localhost:3001/api' + path, {
    method: body === undefined ? 'GET' : 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: 'http://localhost:3002',
      ...(session?.cookie ? { Cookie: session.cookie } : {}),
      ...(session?.token ? { Authorization: 'Bearer ' + session.token } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = await r.json();
  return {
    status: r.status,
    token: data.accessToken,
    cookie: r.headers.get('set-cookie')?.split(';')[0],
    data,
  };
}
(async () => {
  const stamp = Date.now();
  const senha = 'TesteSeguro123!';
  company = await p.empresa.create({
    data: { nome: 'TESTE rotacao descartavel', cnpj: 'rotation-' + stamp },
  });
  const user = await p.usuario.create({
    data: {
      empresaId: company.id,
      nome: 'TESTE rotacao',
      email: `rotation-${stamp}@example.test`,
      senhaHash: await argon2.hash(senha),
      role: 'ADMIN',
    },
  });
  const login = async () => {
    const r = await req('/auth/login', null, { email: user.email, senha });
    assert.equal(r.status, 200, 'login do fixture');
    return r;
  };
  const initial = await login();
  const results = await Promise.all([
    req('/auth/refresh', initial, {}),
    req('/auth/refresh', initial, {}),
  ]);
  ok(
    results.every((r) => r.status === 200 && r.token),
    'duas renovacoes concorrentes aceitas',
  );
  const session = await p.authSession.findFirstOrThrow({
    where: { usuarioId: user.id, revogado: false },
  });
  ok(
    (await p.authSession.count({ where: { usuarioId: user.id } })) === 1,
    'concorrencia preserva uma unica sessao',
  );
  ok(
    (await Promise.all(results.map((s) => req('/auth/me', s)))).every((r) => r.status === 200),
    'ambos os acessos concorrentes funcionam',
  );
  const recovered = await req('/auth/refresh', initial, {});
  ok(recovered.status === 200, 'resposta perdida pode ser recuperada na janela');
  const after = await p.authSession.findUniqueOrThrow({ where: { id: session.id } });
  ok(
    +after.lastRotationAt === +session.lastRotationAt && +after.expiresAt === +session.expiresAt,
    'recuperacao nao prolonga tolerancia nem validade absoluta',
  );
  const child = await req('/auth/refresh', recovered, {});
  ok(child.status === 200, 'filho pode renovar normalmente');
  ok(
    (await req('/auth/refresh', initial, {})).status === 401,
    'ancestral antigo aciona deteccao mesmo dentro da janela',
  );
  ok(
    (await p.authSession.findUniqueOrThrow({ where: { id: session.id } })).revogado,
    'revogacao por replay e persistida fora do rollback',
  );
  ok(
    (await req('/auth/me', child)).status === 401,
    'JWT emitido antes do replay perde acesso imediatamente',
  );
  const outside = await login();
  await req('/auth/refresh', outside, {});
  await p.authSession.updateMany({
    where: { usuarioId: user.id, revogado: false },
    data: { lastRotationAt: new Date(Date.now() - 10000) },
  });
  ok(
    (await req('/auth/refresh', outside, {})).status === 401,
    'repeticao fora da tolerancia bloqueada',
  );
  ok(
    (await p.authSession.count({ where: { usuarioId: user.id, revogado: false } })) === 0,
    'replay tardio nao deixa sessao ativa',
  );
  const racing = await login();
  const [refresh, logout] = await Promise.all([
    req('/auth/refresh', racing, {}),
    req('/auth/logout', racing, {}),
  ]);
  ok(
    logout.status === 200 && [200, 401].includes(refresh.status),
    'logout e refresh concorrentes terminam com respostas validas',
  );
  ok(
    (await p.authSession.count({ where: { usuarioId: user.id, revogado: false } })) === 0,
    'logout vence sem deixar sessao sobrevivente',
  );
  if (refresh.status === 200)
    ok(
      (await req('/auth/me', refresh)).status === 401,
      'JWT emitido durante logout tambem fica revogado',
    );
  const stored = await p.refreshToken.findMany({ where: { usuarioId: user.id } });
  ok(
    stored.every((t) => /^[a-f0-9]{64}$/.test(t.tokenHash)),
    'somente hashes dos refresh tokens persistidos',
  );
  console.log(`${checks} verificacoes de concorrencia e replay aprovadas`);
})()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    if (company) await p.empresa.delete({ where: { id: company.id } });
    await p.$disconnect();
  });
