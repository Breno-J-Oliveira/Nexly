// Exercita apenas fixtures próprias em PostgreSQL e API locais. Nunca envia mensagens reais.
require('./local-api-env.cjs');
const assert = require('node:assert/strict');
const { randomUUID, createHash } = require('node:crypto');
const { PrismaClient } = require('@prisma/client');
const { MODULE_IDS } = require('@nexly/shared');
const argon2 = require('argon2');
const p = new PrismaClient(),
  companies = [];
let checks = 0;
const today = new Date().toISOString().slice(0, 10);
async function req(path, token, body, method = body ? 'POST' : 'GET', cookie) {
  const r = await fetch(`http://localhost:3001/api${path}`, {
    method,
    signal: AbortSignal.timeout(15000),
    headers: {
      Origin: 'http://localhost:3002',
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(cookie ? { Cookie: cookie } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  return {
    status: r.status,
    data: await r.json(),
    cookie: r.headers.get('set-cookie')?.split(';')[0],
  };
}
function ok(name, fn) {
  fn();
  checks++;
  console.log('PASS ' + name);
}
async function fixture(role) {
  const id = randomUUID(),
    password = randomUUID();
  const company = await p.empresa.create({
    data: {
      nome: 'TESTE comercial descartável',
      cnpj: id,
      modulos: MODULE_IDS,
      usuarios: {
        create: {
          nome: 'TESTE operador',
          email: `${id}@example.test`,
          senhaHash: await argon2.hash(password),
          role,
        },
      },
    },
    include: { usuarios: true },
  });
  companies.push(company.id);
  const login = await req('/auth/login', null, {
    email: company.usuarios[0].email,
    senha: password,
  });
  assert.equal(login.status, 200, 'Login da fixture');
  return {
    company,
    user: company.usuarios[0],
    token: login.data.accessToken,
    cookie: login.cookie,
  };
}
async function main() {
  const a = await fixture('ADMIN'),
    b = await fixture('CAIXA'),
    empresaId = a.company.id;
  const produto = await p.produto.create({
    data: {
      empresaId,
      nome: 'TESTE produto',
      sku: randomUUID(),
      preco: 25,
      custoAtual: 10,
      estoqueAtual: 10,
    },
  });
  const cliente = await p.cliente.create({ data: { empresaId, nome: 'TESTE cliente' } });
  const filial = await p.filial.create({
    data: { empresaId, nome: 'TESTE filial', endereco: 'Rua de teste, 123' },
  });
  const transfer = {
    chave: randomUUID(),
    produtoId: produto.id,
    destinoId: filial.id,
    quantidade: 4,
    motivo: 'Distribuição inicial de teste',
  };
  let r = await req('/gestao/transferencias', a.token, transfer);
  ok('transferência central → filial', () => assert.equal(r.status, 201));
  r = await req('/gestao/transferencias', a.token, transfer);
  ok('transferência repetida mantém um único registro', () => assert.equal(r.status, 201));
  assert.equal(await p.transferenciaFilial.count({ where: { empresaId } }), 1);
  r = await req('/gestao/transferencias', a.token, { ...transfer, quantidade: 3 });
  ok('chave alterada é recusada', () => assert.equal(r.status, 409));
  r = await req('/gestao/transferencias', a.token, {
    ...transfer,
    chave: randomUUID(),
    quantidade: 100,
  });
  ok('saldo insuficiente reverte toda transferência', () => assert.equal(r.status, 409));
  const central = await p.produto.findUniqueOrThrow({ where: { id: produto.id } }),
    saldo = await p.saldoFilial.findFirstOrThrow({
      where: { empresaId, filialId: filial.id, produtoId: produto.id },
    });
  ok('estoques separados preservados após rollback', () => {
    assert.equal(central.estoqueAtual, 6);
    assert.equal(saldo.quantidade, 4);
  });
  const sale = {
    clienteId: cliente.id,
    filialId: filial.id,
    recebido: true,
    chaveOperacao: randomUUID(),
    itens: [{ produtoId: produto.id, quantidade: 2 }],
    formaPagamento: 'PIX',
  };
  r = await req('/vendas', a.token, sale);
  ok('venda usa estoque da filial e custo histórico', () => {
    assert.equal(r.status, 201);
    assert.equal(r.data.total, 50);
    assert.equal(r.data.itens[0].custoUnitario, 10);
  });
  const vendaId = r.data.id;
  r = await req('/vendas', a.token, {
    ...sale,
    chaveOperacao: randomUUID(),
    itens: [{ produtoId: produto.id, quantidade: 2147483648 }],
  });
  ok('quantidade fora do limite é recusada antes de gravar itens na filial', () =>
    assert.equal(r.status, 400),
  );
  r = await req('/vendas', a.token, sale);
  ok('retry de venda não gera outra cobrança ou baixa', () => {
    assert.equal(r.status, 201);
    assert.equal(r.data.id, vendaId);
  });
  r = await req('/vendas', a.token, { ...sale, itens: [{ produtoId: produto.id, quantidade: 1 }] });
  ok('chave de venda não aceita payload alterado', () => assert.equal(r.status, 409));
  const contaVenda = await p.lancamentoFinanceiro.findUniqueOrThrow({ where: { vendaId } });
  ok('venda recebida gera conta e pagamento únicos', () => {
    assert.equal(contaVenda.status, 'PAGO');
    assert.equal(Number(contaVenda.valorPago), 50);
  });
  assert.equal(await p.baixaFinanceira.count({ where: { lancamentoId: contaVenda.id } }), 1);
  const estornos = await Promise.all([
    req(`/vendas/${vendaId}/estornar`, a.token, { motivo: 'Cliente devolveu todos os produtos' }),
    req(`/vendas/${vendaId}/estornar`, a.token, { motivo: 'Cliente devolveu todos os produtos' }),
  ]);
  ok('estornos concorrentes são idempotentes', () =>
    assert.deepEqual(
      estornos.map((s) => s.status),
      [201, 201],
    ),
  );
  const devolvido = await p.saldoFilial.findUniqueOrThrow({ where: { id: saldo.id } });
  const contaEstornada = await p.lancamentoFinanceiro.findUniqueOrThrow({ where: { vendaId } }),
    pagamentoEstornado = await p.baixaFinanceira.findFirstOrThrow({
      where: { lancamentoId: contaVenda.id },
    });
  ok('estorno repõe uma vez e mantém data da devolução', () => {
    assert.equal(devolvido.quantidade, 4);
    assert.equal(contaEstornada.status, 'CANCELADO');
    assert.equal(Number(contaEstornada.valorPago), 0);
    assert.equal(pagamentoEstornado.estornada, true);
    assert.ok(pagamentoEstornado.estornadaEm);
  });
  r = await req(
    `/gestao/financeiro/resumo?inicio=${today}&fim=${today}&filialId=${filial.id}`,
    a.token,
  );
  ok('caixa preserva recebimento e devolução sem receita fictícia', () => {
    assert.equal(r.status, 200);
    assert.equal(r.data.receita, 0);
    assert.equal(r.data.entradas, 50);
    assert.equal(r.data.saidas, 50);
    assert.equal(r.data.saldoCaixa, 0);
  });
  const crm = await p.cliente.findUniqueOrThrow({ where: { id: cliente.id } });
  ok('estorno atualiza o total gasto do cliente', () => assert.equal(Number(crm.totalGasto), 0));
  r = await req('/gestao/financeiro', a.token, {
    descricao: 'TESTE despesa',
    tipo: 'DESPESA',
    categoria: 'INSUMOS',
    valor: 100,
    vencimento: today,
  });
  assert.equal(r.status, 201);
  const contaId = r.data.id,
    key = randomUUID();
  r = await req(`/gestao/financeiro/${contaId}/baixar`, a.token, { chave: key, valor: 30 });
  ok('pagamento parcial deixa saldo correto', () => {
    assert.equal(r.status, 201);
    assert.equal(r.data.valorPago, 30);
    assert.equal(r.data.status, 'PARCIAL');
  });
  r = await req(`/gestao/financeiro/${contaId}/baixar`, a.token, { chave: key, valor: 30 });
  ok('pagamento repetido não duplica a baixa', () => {
    assert.equal(r.status, 201);
    assert.equal(r.data.valorPago, 30);
  });
  r = await req(`/gestao/financeiro/${contaId}/baixar`, a.token, {
    chave: randomUUID(),
    valor: 71,
  });
  ok('pagamento acima do saldo é recusado', () => assert.equal(r.status, 400));
  r = await req(`/gestao/financeiro/${contaId}/cancelar`, a.token, {});
  ok('conta paga exige estorno antes do cancelamento', () => assert.equal(r.status, 409));
  const baixa = await p.baixaFinanceira.findUniqueOrThrow({ where: { chave: key } });
  r = await req(`/gestao/financeiro/${contaId}/baixas/${baixa.id}/estornar`, a.token, {});
  ok('estorno parcial reabre conta', () => {
    assert.equal(r.status, 201);
    assert.equal(r.data.valorPago, 0);
  });
  r = await req(`/gestao/financeiro/${contaId}/baixas/${baixa.id}/estornar`, a.token, {});
  ok('repetir estorno não produz saldo negativo', () => assert.equal(r.data.valorPago, 0));
  const concurrent = await Promise.all([
    req(`/gestao/financeiro/${contaId}/baixar`, a.token, { chave: randomUUID(), valor: 60 }),
    req(`/gestao/financeiro/${contaId}/baixar`, a.token, { chave: randomUUID(), valor: 60 }),
  ]);
  ok('pagamentos concorrentes não ultrapassam o saldo', () =>
    assert.deepEqual(concurrent.map((s) => s.status).sort(), [201, 400]),
  );
  const body = {
    tipo: 'clientes',
    chave: randomUUID(),
    linhas: [
      { nome: 'TESTE Ana', email: 'ana@example.test' },
      { nome: 'TESTE Ana repetida', email: 'ana@example.test' },
      { nome: 'TESTE Bia', telefone: '11999999999' },
    ],
  };
  r = await req('/gestao/importacao/previa', a.token, body);
  ok('prévia identifica duplicados sem salvar', () => {
    assert.equal(r.status, 201);
    assert.equal(r.data.linhas.length, 2);
    assert.equal(r.data.duplicados, 1);
  });
  assert.equal(await p.cliente.count({ where: { empresaId } }), 1);
  r = await req('/gestao/importacao/confirmar', a.token, body);
  ok('importação confirma somente novos cadastros', () => {
    assert.equal(r.status, 201);
    assert.equal(r.data.criados, 2);
  });
  r = await req('/gestao/importacao/confirmar', a.token, body);
  ok('retry da importação devolve resultado sem duplicar', () => {
    assert.equal(r.status, 201);
    assert.equal(r.data.criados, 2);
  });
  assert.equal(await p.cliente.count({ where: { empresaId } }), 3);
  r = await req('/gestao/importacao/confirmar', a.token, {
    ...body,
    linhas: [{ nome: 'Outro nome' }],
  });
  ok('mesma chave não importa outro arquivo', () => assert.equal(r.status, 409));
  r = await req('/gestao/importacao/confirmar', a.token, {
    ...body,
    chave: randomUUID(),
    linhas: [{ nome: 'Inválido', email: 'email inválido' }],
  });
  ok('importação inválida não grava parcialmente', () => assert.equal(r.status, 400));
  assert.equal(await p.cliente.count({ where: { empresaId } }), 3);
  const grande = {
    tipo: 'clientes',
    chave: randomUUID(),
    linhas: Array.from({ length: 500 }, (_, i) => ({
      nome: `Cliente ${i} ` + 'X'.repeat(90),
      email: `cliente${i}@${'a'.repeat(60)}.${'b'.repeat(60)}.example.test`,
    })),
  };
  assert.ok(Buffer.byteLength(JSON.stringify(grande)) > 100 * 1024);
  r = await req('/gestao/importacao/previa', a.token, grande);
  ok('prévia aceita 500 linhas válidas acima de 100 KB', () => {
    assert.equal(r.status, 201);
    assert.equal(r.data.linhas.length, 500);
  });
  r = await req(
    '/gestao/preferencias',
    a.token,
    { nomeCliente: 'Pacientes', nomeServico: 'Sessões', segmento: 'psicologia', mostrarGuia: true },
    'PUT',
  );
  ok('personalização persiste termos e guia', () => assert.equal(r.status, 200));
  r = await req('/gestao/inicio', a.token);
  ok('guia usa dados reais do negócio', () => {
    assert.equal(r.status, 200);
    assert.equal(r.data.etapas.find((e) => e.id === 'clientes').concluida, true);
    assert.equal(r.data.preferencias.nomeCliente, 'Pacientes');
  });
  for (const path of [
    '/gestao/monitor',
    '/gestao/historico',
    '/gestao/financeiro?inicio=' + today + '&fim=' + today,
  ]) {
    r = await req(path, b.token);
    ok('caixa sem acesso: ' + path.split('?')[0], () => assert.equal(r.status, 403));
  }
  r = await req(`/gestao/catalogo-filial/${filial.id}`, b.token);
  ok('catálogo de outra empresa não é exposto ao caixa', () => assert.equal(r.status, 404));
  const foreign = await p.lancamentoFinanceiro.create({
    data: {
      empresaId: b.company.id,
      descricao: 'Externa',
      tipo: 'RECEITA',
      valor: 10,
      vencimento: new Date(),
    },
  });
  r = await req(`/gestao/financeiro/${foreign.id}/baixar`, a.token, {
    chave: randomUUID(),
    valor: 1,
  });
  ok('pagamento cruzado entre empresas é bloqueado', () => assert.equal(r.status, 404));
  r = await req('/gestao/financeiro', a.token, {
    empresaId: b.company.id,
    descricao: 'Tentativa de trocar empresa',
    tipo: 'DESPESA',
    categoria: 'TESTE',
    valor: 10,
    vencimento: today,
  });
  ok('mass assignment de empresa é recusado', () => assert.equal(r.status, 400));
  r = await req('/clientes?search=' + encodeURIComponent("' OR 1=1 --") + '&limit=5', a.token);
  ok('tentativa de SQL injection permanece uma busca literal', () => {
    assert.equal(r.status, 200);
    assert.equal(r.data.data.length, 0);
  });
  r = await req('/gestao/historico?pagina=abc', a.token);
  ok('paginação inválida retorna 400', () => assert.equal(r.status, 400));
  r = await req('/gestao/financeiro', a.token, {
    descricao: 'Teste inválido',
    tipo: 'DESPESA',
    categoria: 'GERAL',
    valor: -1,
    vencimento: today,
  });
  ok('validação devolve orientação em português', () => {
    assert.equal(r.status, 400);
    assert.ok(JSON.stringify(r.data).includes('Valor'));
    assert.ok(!JSON.stringify(r.data).includes('must'));
  });
  await p.lancamentoFinanceiro.createMany({
    data: Array.from({ length: 201 }, (_, i) => ({
      empresaId,
      descricao: `Conta de paginação ${i}`,
      tipo: 'DESPESA',
      valor: 1,
      vencimento: new Date(today),
    })),
  });
  r = await req(`/gestao/financeiro?inicio=${today}&fim=${today}&pagina=5`, a.token);
  ok('contas acima das primeiras 200 continuam acessíveis por página', () => {
    assert.equal(r.status, 200);
    assert.equal(r.data.limit, 50);
    assert.ok(r.data.data.length > 0);
    assert.ok(r.data.total > 200);
  });
  r = await req('/auth/recuperacao/status');
  ok('e-mail segue desativado', () => assert.equal(r.data.disponivel, false));
  r = await req('/auth/recuperacao/solicitar', null, { email: a.user.email });
  ok('pedido com provedor desativado não simula envio', () => {
    assert.equal(r.status, 201);
    assert.equal(r.data.disponivel, false);
  });
  assert.equal(await p.jobDuravel.count({ where: { empresaId, tipo: 'EMAIL_RECUPERACAO' } }), 0);
  const token = randomUUID().replaceAll('-', '') + randomUUID().replaceAll('-', '');
  await p.recuperacaoSenha.create({
    data: {
      usuarioId: a.user.id,
      tokenHash: createHash('sha256').update(token).digest('hex'),
      expiresAt: new Date(Date.now() + 60000),
    },
  });
  const resets = await Promise.all([
    req('/auth/recuperacao/redefinir', null, { token, senha: 'NovaSenhaSegura123!' }),
    req('/auth/recuperacao/redefinir', null, { token, senha: 'NovaSenhaSegura123!' }),
  ]);
  ok('link de recuperação só pode ser usado uma vez', () =>
    assert.deepEqual(resets.map((r) => r.status).sort(), [201, 400]),
  );
  r = await req('/auth/me', a.token);
  ok('redefinição revoga sessão já emitida', () => assert.equal(r.status, 401));
  r = await req('/auth/refresh', null, {}, 'POST', a.cookie);
  ok('redefinição também revoga refresh token', () => assert.equal(r.status, 401));
  console.log(`${checks} verificações comerciais aprovadas.`);
}
main()
  .catch((e) => {
    console.error(e.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    for (const empresaId of companies) {
      await p.lancamentoFinanceiro.deleteMany({ where: { empresaId } });
      await p.itemVenda.deleteMany({ where: { venda: { empresaId } } });
      await p.venda.deleteMany({ where: { empresaId } });
      await p.movimentacaoEstoque.deleteMany({ where: { empresaId } });
      await p.saldoFilial.deleteMany({ where: { empresaId } });
      await p.produto.deleteMany({ where: { empresaId } });
      await p.cliente.deleteMany({ where: { empresaId } });
      await p.empresa.delete({ where: { id: empresaId } });
    }
    await p.$disconnect();
  });
