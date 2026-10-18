require('./local-api-env.cjs');
const { PrismaClient } = require('@prisma/client');
const argon2 = require('argon2');
const assert = require('node:assert/strict');
const p = new PrismaClient();
let empresa;
let checks = 0;
function ok(value, message) {
  assert(value, message);
  checks++;
  console.log('PASS ' + message);
}
async function req(method, path, token, body) {
  const response = await fetch('http://localhost:3001/api' + path, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: 'Bearer ' + token } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return { status: response.status, data: await response.json() };
}
(async () => {
  const suffix = Date.now(),
    senha = 'ClienteTeste123!';
  empresa = await p.empresa.create({
    data: { nome: 'TESTE atividade CRM', cnpj: `crm-${suffix}` },
  });
  const tokens = {};
  for (const role of ['ADMIN', 'RECEPCIONISTA']) {
    const user = await p.usuario.create({
      data: {
        empresaId: empresa.id,
        nome: 'TESTE ' + role,
        email: `crm-${role.toLowerCase()}-${suffix}@example.test`,
        role,
        senhaHash: await argon2.hash(senha),
      },
    });
    const login = await req('POST', '/auth/login', null, { email: user.email, senha });
    assert.equal(login.status, 200);
    tokens[role] = login.data.accessToken;
  }
  const cliente = await p.cliente.create({
    data: { empresaId: empresa.id, nome: 'TESTE cliente CRM' },
  });
  const produto = await p.produto.create({
    data: {
      empresaId: empresa.id,
      nome: 'TESTE produto CRM',
      sku: `crm-${suffix}`,
      preco: 25,
      estoqueAtual: 10,
      estoqueMinimo: 1,
    },
  });
  const vender = (quantidade, desconto = 0) =>
    req('POST', '/vendas', tokens.ADMIN, {
      clienteId: cliente.id,
      itens: [{ produtoId: produto.id, quantidade }],
      desconto,
    });
  ok((await vender(2, 10)).status === 201, 'venda com desconto confirmada');
  let atual = await p.cliente.findUniqueOrThrow({ where: { id: cliente.id } });
  ok(
    Number(atual.totalGasto) === 40 && atual.ultimaVisita,
    'CRM recebe valor liquido e atividade na mesma transacao',
  );
  ok((await vender(1)).status === 201, 'segunda compra confirmada');
  const simultaneas = await Promise.all([vender(1), vender(1)]);
  ok(
    simultaneas.every((r) => r.status === 201),
    'compras concorrentes confirmadas',
  );
  atual = await p.cliente.findUniqueOrThrow({ where: { id: cliente.id } });
  ok(Number(atual.totalGasto) === 115, 'incrementos concorrentes nao perdem valores');
  ok(
    (await vender(999)).status === 409 &&
      Number((await p.cliente.findUniqueOrThrow({ where: { id: cliente.id } })).totalGasto) === 115,
    'venda recusada nao altera gasto do cliente',
  );
  const profissional = await p.profissional.create({
    data: { empresaId: empresa.id, nome: 'TESTE profissional CRM' },
  });
  const servico = await p.servico.create({
    data: { empresaId: empresa.id, nome: 'TESTE servico CRM', duracaoMin: 30, preco: 60 },
  });
  const atendimento = await p.agendamento.create({
    data: {
      empresaId: empresa.id,
      clienteId: cliente.id,
      profissionalId: profissional.id,
      servicoId: servico.id,
      dataHora: new Date(Date.now() - 3600000),
      dataHoraFim: new Date(Date.now() - 1800000),
      status: 'CONFIRMADO',
    },
  });
  const depois = new Date(Date.now() + 86400000);
  await p.cliente.update({ where: { id: cliente.id }, data: { ultimaVisita: depois } });
  ok(
    (
      await req('PATCH', `/agendamentos/${atendimento.id}/status`, tokens.ADMIN, {
        status: 'CONCLUIDO',
      })
    ).status === 200,
    'atendimento concluido',
  );
  ok(
    (await p.cliente.findUniqueOrThrow({ where: { id: cliente.id } })).ultimaVisita.getTime() ===
      depois.getTime(),
    'atendimento antigo nao apaga atividade mais recente',
  );
  const metrics = (await req('GET', `/clientes/${cliente.id}/metricas`, tokens.ADMIN)).data;
  ok(
    metrics.totalVisitas === 1 &&
      metrics.totalCompras === 4 &&
      metrics.totalGasto === 115 &&
      metrics.ticketMedio === 28.75,
    'ticket divide compras reais e preserva total de visitas',
  );
  const list = await req('GET', '/clientes', tokens.RECEPCIONISTA);
  ok(
    list.status === 200 && list.data.data[0].totalGasto === null,
    'lista nao revela compras para recepcao',
  );
  ok(
    (await req('GET', `/clientes/${cliente.id}`, tokens.RECEPCIONISTA)).data.totalGasto === null,
    'detalhe respeita permissao de vendas',
  );
  const privateMetrics = (
    await req('GET', `/clientes/${cliente.id}/metricas`, tokens.RECEPCIONISTA)
  ).data;
  ok(
    privateMetrics.totalVisitas === 1 &&
      privateMetrics.totalGasto === null &&
      privateMetrics.ticketMedio === null,
    'recepcao consulta visitas sem valores de compras',
  );
  const agenda = (await req('GET', `/agendamentos/${atendimento.id}`, tokens.RECEPCIONISTA)).data;
  ok(
    !('totalGasto' in agenda.cliente) && !('observacoes' in agenda.cliente),
    'agenda nao contorna a privacidade via relacoes aninhadas',
  );
  const altered = await req('PUT', `/clientes/${cliente.id}`, tokens.RECEPCIONISTA, {
    nome: 'TESTE cliente atualizado',
  });
  ok(
    altered.status === 200 && altered.data.totalGasto === null,
    'resposta de edicao tambem protege compras',
  );
  console.log(checks + ' verificacoes de atividade do cliente passaram');
})()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    if (empresa) {
      await p.movimentacaoEstoque.deleteMany({ where: { empresaId: empresa.id } });
      await p.lancamentoFinanceiro.deleteMany({ where: { empresaId: empresa.id } });
      await p.venda.deleteMany({ where: { empresaId: empresa.id } });
      await p.agendamento.deleteMany({ where: { empresaId: empresa.id } });
      await p.servico.deleteMany({ where: { empresaId: empresa.id } });
      await p.profissional.deleteMany({ where: { empresaId: empresa.id } });
      await p.produto.deleteMany({ where: { empresaId: empresa.id } });
      await p.cliente.deleteMany({ where: { empresaId: empresa.id } });
      await p.empresa.delete({ where: { id: empresa.id } });
    }
    await p.$disconnect();
  });
