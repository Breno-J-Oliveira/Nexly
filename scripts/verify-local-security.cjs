const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { randomUUID } = require('node:crypto');
const dotenv = require('dotenv');
const argon2 = require('argon2');
const { PrismaClient } = require('@prisma/client');

const root = path.resolve(__dirname, '..');
const env = dotenv.parse(fs.readFileSync(path.join(root, 'apps/api/.env')));
if (!['localhost', '127.0.0.1'].includes(new URL(env.DATABASE_URL).hostname)) {
  throw new Error('Este teste só pode executar no banco local.');
}
process.env.DATABASE_URL = env.DATABASE_URL;
const prisma = new PrismaClient();
const fixtures = [];
let passed = 0;
const origin = 'http://localhost:3002';
async function request(endpoint, token, body, method = body ? 'POST' : 'GET', headers = {}) {
  const response = await fetch(`http://localhost:3001/api${endpoint}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      Origin: origin,
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  return {
    status: response.status,
    data: await response.json(),
    cookie: response.headers.get('set-cookie')?.split(';')[0],
  };
}
function check(name, fn) {
  fn();
  passed++;
  console.log(`PASS ${name}`);
}

async function fixture(role = 'ADMIN') {
  const suffix = randomUUID();
  const password = randomUUID();
  const empresa = await prisma.empresa.create({
    data: {
      nome: `Validação temporária ${suffix}`,
      cnpj: suffix,
      usuarios: {
        create: {
          nome: 'Validação',
          email: `${suffix}@example.test`,
          senhaHash: await argon2.hash(password),
          role,
        },
      },
    },
    include: { usuarios: true },
  });
  fixtures.push(empresa.id);
  const cliente = await prisma.cliente.create({
    data: { empresaId: empresa.id, nome: 'Cliente de teste' },
  });
  const produto = await prisma.produto.create({
    data: {
      empresaId: empresa.id,
      nome: 'Produto de teste',
      sku: suffix,
      preco: '0.10',
      estoqueAtual: 5,
    },
  });
  const login = await request('/auth/login', null, {
    email: empresa.usuarios[0].email,
    senha: password,
  });
  assert.equal(login.status, 200, 'login da fixture');
  return { empresa, cliente, produto, token: login.data.accessToken, cookie: login.cookie };
}

async function main() {
  const deadline = Date.now() + 30_000;
  let ready = false;
  while (Date.now() < deadline) {
    try {
      ready = (
        await fetch('http://localhost:3001/api/health', { signal: AbortSignal.timeout(1000) })
      ).ok;
      if (ready) break;
    } catch {
      /* Aguarda apenas a inicialização do processo local. */
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  if (!ready) throw new Error('API local não ficou pronta em 30 segundos.');
  const a = await fixture();
  const b = await fixture('CAIXA');
  let response = await request(`/produtos/${b.produto.id}`, a.token);
  check('leitura por ID de outra empresa bloqueada', () => assert.equal(response.status, 404));
  response = await request(`/produtos/${b.produto.id}`, a.token, { nome: 'Intrusão' }, 'PUT');
  check('alteração de produto externo bloqueada', () => assert.equal(response.status, 404));
  response = await request('/vendas', a.token, {
    clienteId: b.cliente.id,
    itens: [{ produtoId: a.produto.id, quantidade: 1 }],
  });
  check('venda não referencia cliente externo', () => assert.equal(response.status, 404));
  response = await request('/estoque/entrada', a.token, {
    produtoId: b.produto.id,
    quantidade: 5,
    motivo: 'Validação',
  });
  check('entrada de estoque externa bloqueada', () => assert.equal(response.status, 404));
  const protectedProduct = await prisma.produto.findUnique({ where: { id: b.produto.id } });
  check('saldo externo permanece inalterado', () => assert.equal(protectedProduct.estoqueAtual, 5));
  response = await request('/financeiro/dre', b.token);
  check('caixa não acessa financeiro', () => assert.equal(response.status, 403));
  response = await request('/vendas', a.token, {
    itens: [
      { produtoId: a.produto.id, quantidade: 3 },
      { produtoId: a.produto.id, quantidade: 3 },
    ],
  });
  check('itens repetidos não ultrapassam saldo', () => assert.equal(response.status, 409));
  response = await request('/vendas', a.token, {
    itens: [
      { produtoId: a.produto.id, quantidade: 1 },
      { produtoId: a.produto.id, quantidade: 2 },
    ],
  });
  check('venda decimal consolida itens e total', () => {
    assert.equal(response.status, 201);
    assert.equal(response.data.total, 0.3);
    assert.equal(response.data.itens.length, 1);
    assert.equal(response.data.itens[0].quantidade, 3);
  });
  const soldProduct = await prisma.produto.findUnique({ where: { id: a.produto.id } });
  check('baixa de venda e movimentação são gravadas', () =>
    assert.equal(soldProduct.estoqueAtual, 2),
  );
  const csrf = await request('/auth/refresh', null, {}, 'POST', {
    Origin: 'https://attacker.test',
    Cookie: a.cookie,
  });
  check('refresh com origem externa bloqueado', () => assert.equal(csrf.status, 403));
  const refreshed = await request('/auth/refresh', null, {}, 'POST', { Cookie: a.cookie });
  check('refresh da origem local funciona', () => {
    assert.equal(refreshed.status, 200);
    assert.ok(refreshed.data.accessToken);
  });
  await prisma.usuario.update({ where: { id: a.empresa.usuarios[0].id }, data: { role: 'CAIXA' } });
  response = await request('/financeiro/dre', a.token);
  check('mudança de papel vale para token já emitido', () => assert.equal(response.status, 403));
  await prisma.usuario.update({ where: { id: a.empresa.usuarios[0].id }, data: { ativo: false } });
  response = await request('/auth/me', a.token);
  check('usuário desativado perde acesso imediatamente', () => assert.equal(response.status, 401));
  console.log(`${passed} verificações de integração aprovadas.`);
}

main()
  .catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    // Limpeza exclusiva dos IDs criados por esta execução, preservando o seed/demo.
    for (const empresaId of fixtures) {
      await prisma.itemVenda.deleteMany({ where: { venda: { empresaId } } });
      await prisma.lancamentoFinanceiro.deleteMany({ where: { empresaId } });
      await prisma.venda.deleteMany({ where: { empresaId } });
      await prisma.movimentacaoEstoque.deleteMany({ where: { empresaId } });
      await prisma.produto.deleteMany({ where: { empresaId } });
      await prisma.cliente.deleteMany({ where: { empresaId } });
      await prisma.empresa.delete({ where: { id: empresaId } });
    }
    await prisma.$disconnect();
  });
