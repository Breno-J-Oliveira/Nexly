require('./local-api-env.cjs');
const { PrismaClient } = require('@prisma/client');
const argon2 = require('argon2');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const prisma = new PrismaClient();
const base = 'http://localhost:3001/api';
const created = [];
let checks = 0;
function ok(value, message) {
  assert(value, message);
  checks++;
  console.log(`PASS ${message}`);
}
async function request(method, url, token, body) {
  const r = await fetch(base + url, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return { status: r.status, data: await r.json() };
}
async function main() {
  const suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const senha = 'TesteSeguro123!';
  for (const role of ['ADMIN', 'CAIXA']) {
    const company = await prisma.empresa.create({
      data: {
        nome: 'TESTE temporário workspace',
        cnpj: `${Date.now()}${created.length}`,
        preset: 'psicologia',
        modulos: ['agenda', 'clientes', 'profissionais', 'servicos', 'relatorios'],
        usuarios: {
          create: {
            nome: 'TESTE automatizado',
            email: `${role.toLowerCase()}-${suffix}@example.test`,
            senhaHash: await argon2.hash(senha),
            role,
            createdAt: new Date(Date.now() - 8 * 86400000),
            diasDeUso: 2,
            ultimoDiaUso: '2020-01-01',
          },
        },
      },
      include: { usuarios: true },
    });
    created.push(company);
  }
  const [admin, staff] = created.map((c) => c.usuarios[0]);
  const login = async (user) =>
    (await request('POST', '/auth/login', null, { email: user.email, senha })).data.accessToken;
  const token = await login(admin),
    staffToken = await login(staff);
  ok(!!token && !!staffToken, 'sessões de teste criadas');
  ok((await request('GET', '/experiencia')).status === 401, 'perfil exige autenticação');
  await Promise.all([1, 2, 3].map(() => request('POST', '/experiencia/atividade', token, {})));
  ok(
    (await prisma.usuario.findUnique({ where: { id: admin.id } })).diasDeUso === 3,
    'atividade concorrente conta só um dia',
  );
  ok(
    (await request('GET', '/experiencia', token)).data.pedirRecomendacao === true,
    'convite elegível após tempo e dias de uso',
  );
  ok(
    (
      await request('PUT', '/experiencia/workspace', staffToken, {
        preset: 'salao',
        modulos: ['pdv'],
      })
    ).status === 403,
    'caixa não altera módulos da empresa',
  );
  ok(
    (
      await request('PUT', '/experiencia/workspace', token, {
        preset: 'personalizado',
        modulos: [],
      })
    ).status === 400,
    'seleção vazia rejeitada',
  );
  ok(
    (
      await request('PUT', '/experiencia/workspace', token, {
        preset: 'personalizado',
        modulos: ['inventado'],
      })
    ).status === 400,
    'módulo desconhecido rejeitado',
  );
  const saved = await request('PUT', '/experiencia/workspace', token, {
    preset: 'personalizado',
    modulos: ['pdv'],
  });
  ok(
    saved.data.modulos.includes('estoque') &&
      saved.data.modulos.includes('clientes') &&
      saved.data.modulos.includes('vendas'),
    'dependências persistidas no servidor',
  );
  ok(
    !(await request('GET', '/experiencia', staffToken)).data.modulos.includes('pdv'),
    'configuração não vaza para outra empresa',
  );
  const text = {
    nota: 1,
    texto: 'TESTE AUTOMATIZADO: fixture temporária, removida após a verificação.',
    nomePublico: 'TESTE temporário',
    ocupacao: 'Fixture automatizada',
    autorizaPublicacao: true,
  };
  ok(
    (await request('PUT', '/experiencia/recomendacao', token, { ...text, status: 'APROVADO' }))
      .status === 400,
    'usuário não injeta aprovação',
  );
  ok(
    (await request('PUT', '/experiencia/recomendacao', token, text)).status === 200,
    'aceita experiência real mesmo com nota baixa',
  );
  let row = await prisma.depoimento.findUnique({ where: { usuarioId: admin.id } });
  const publicItems = async () => (await request('GET', '/experiencia/recomendacoes')).data;
  ok(!(await publicItems()).some((item) => item.id === row.id), 'pendente não aparece em público');
  const previousVersion = row.updatedAt.toISOString();
  row = await prisma.depoimento.update({
    where: { id: row.id },
    data: { texto: `${text.texto} Alteração posterior.` },
  });
  const stale = spawnSync(process.execPath, [
    'scripts/moderar-depoimentos.cjs',
    'aprovar',
    row.id,
    previousVersion,
  ]);
  ok(stale.status !== 0, 'moderação rejeita versão alterada depois da revisão');
  const approved = spawnSync(process.execPath, [
    'scripts/moderar-depoimentos.cjs',
    'aprovar',
    row.id,
    row.updatedAt.toISOString(),
  ]);
  ok(approved.status === 0, 'operador aprova exatamente a versão revisada');
  const item = (await publicItems()).find((item) => item.id === row.id);
  ok(
    item?.nota === 1 && !('usuarioId' in item) && !('empresaId' in item) && !('email' in item),
    'publicação aprovada contém só campos públicos',
  );
  await request('PUT', '/experiencia/recomendacao', token, { ...text, autorizaPublicacao: false });
  await prisma.depoimento.update({ where: { id: row.id }, data: { status: 'APROVADO' } });
  ok(
    !(await publicItems()).some((item) => item.id === row.id),
    'aprovação não substitui consentimento',
  );
  await request('PUT', '/experiencia/recomendacao', token, text);
  row = await prisma.depoimento.findUnique({ where: { id: row.id } });
  ok(row.status === 'PENDENTE', 'edição volta à moderação');
  await request('DELETE', '/experiencia/recomendacao', token);
  ok(
    !(await prisma.depoimento.findUnique({ where: { id: row.id } })),
    'retirada remove recomendação',
  );
  await prisma.usuario.update({ where: { id: admin.id }, data: { naoPedirAvaliacao: false } });
  await request('POST', '/experiencia/lembrar', token, { escolha: 'DEPOIS' });
  ok(
    (await request('GET', '/experiencia', token)).data.pedirRecomendacao === false,
    'adiamento respeitado',
  );
  await request('POST', '/experiencia/lembrar', token, { escolha: 'NUNCA' });
  ok(
    (await prisma.usuario.findUnique({ where: { id: admin.id } })).naoPedirAvaliacao,
    'recusa persistida',
  );
  console.log(`${checks} verificações aprovadas.`);
}
main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    for (const company of created) await prisma.empresa.delete({ where: { id: company.id } });
    await prisma.$disconnect();
  });
