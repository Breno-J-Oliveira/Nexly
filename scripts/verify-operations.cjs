require('./local-api-env.cjs');
const { PrismaClient } = require('@prisma/client');
const { MODULE_IDS } = require('../packages/shared/dist');
const argon2 = require('argon2');
const assert = require('node:assert/strict');
const prisma = new PrismaClient();
const companies = [];
let checks = 0;
const base = 'http://localhost:3001/api';
function ok(value, msg) {
  assert(value, msg);
  checks++;
  console.log(`PASS ${msg}`);
}
async function req(method, path, token, body) {
  const r = await fetch(base + path, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = await r.json();
  return { status: r.status, data };
}
async function main() {
  const flags =
    await prisma.$queryRaw`SELECT relname, relrowsecurity FROM pg_class WHERE relname IN ('tarefas','filiais','documentos','campanhas','consentimentos_marketing','automacoes','recorrencias')`;
  ok(
    flags.length === 7 && flags.every((t) => t.relrowsecurity),
    'novas tabelas com RLS habilitado',
  );
  const suffix = Date.now();
  const senha = 'TesteSeguro123!';
  for (let i = 0; i < 2; i++) {
    const c = await prisma.empresa.create({
      data: {
        nome: 'TESTE operacoes descartavel',
        cnpj: `ops-${suffix}-${i}`,
        modulos: MODULE_IDS,
        usuarios: {
          create: {
            nome: 'TESTE admin',
            email: `ops-${suffix}-${i}@example.test`,
            senhaHash: await argon2.hash(senha),
            role: 'ADMIN',
          },
        },
      },
      include: { usuarios: true },
    });
    companies.push(c);
  }
  const [a, b] = companies;
  const login = async (u) =>
    (await req('POST', '/auth/login', null, { email: u.email, senha })).data.accessToken;
  const token = await login(a.usuarios[0]);
  const other = await login(b.usuarios[0]);
  ok(!!token && !!other, 'autenticacao das fixtures');
  const cashier = await prisma.usuario.create({
    data: {
      empresaId: a.id,
      nome: 'TESTE caixa',
      email: `ops-staff-${suffix}@example.test`,
      senhaHash: await argon2.hash(senha),
      role: 'CAIXA',
    },
  });
  const staff = await login(cashier);
  for (const path of [
    'tarefas',
    'filiais',
    'documentos',
    'campanhas',
    'automacoes',
    'recorrencias',
  ]) {
    ok((await req('GET', `/operacoes/${path}`)).status === 401, `${path} exige sessao`);
    ok(
      (await req('GET', `/operacoes/${path}`, staff)).status === 403,
      `${path} protege permissoes`,
    );
  }
  const filial = {
    nome: 'Unidade centro',
    endereco: 'Rua de teste 123',
    telefone: '11999999999',
    ativa: true,
  };
  const f = await req('POST', '/operacoes/filiais', token, filial);
  ok(f.status === 201, 'filial criada');
  ok(
    (await req('PUT', `/operacoes/filiais/${f.data.id}`, other, filial)).status === 404,
    'filial isolada por empresa',
  );
  const tarefa = {
    titulo: 'Conferir sala',
    descricao: 'Conferir materiais',
    status: 'PENDENTE',
    prioridade: 'ALTA',
    filialId: f.data.id,
    responsavelId: a.usuarios[0].id,
    prazo: new Date(Date.now() + 86400000).toISOString(),
  };
  const t = await req('POST', '/operacoes/tarefas', token, tarefa);
  ok(t.status === 201, 'tarefa vinculada a filial e responsavel');
  ok(
    (await req('POST', '/operacoes/tarefas', token, { ...tarefa, responsavelId: b.usuarios[0].id }))
      .status === 400,
    'responsavel de outra empresa bloqueado',
  );
  ok(
    (await req('POST', '/operacoes/tarefas', other, { ...tarefa, responsavelId: null })).status ===
      400,
    'filial de outra empresa bloqueada',
  );
  ok(
    (await req('PUT', `/operacoes/tarefas/${t.data.id}`, token, { ...tarefa, status: 'CONCLUIDA' }))
      .status === 200,
    'tarefa concluida',
  );
  await req('PUT', `/operacoes/filiais/${f.data.id}`, token, { ...filial, ativa: false });
  ok(
    (await req('PUT', `/operacoes/tarefas/${t.data.id}`, token, { ...tarefa, status: 'CONCLUIDA' }))
      .status === 200,
    'conclusao preserva filial arquivada',
  );
  ok((await req('GET', '/operacoes/tarefas', other)).data.total === 0, 'lista de tarefas isolada');
  ok(
    (await req('GET', '/operacoes/tarefas?status=PENDENTE', token)).data.total === 0,
    'filtro de situacao aplicado no servidor',
  );
  ok(
    (await req('GET', `/operacoes/tarefas?filialId=${f.data.id}`, token)).data.total === 1,
    'filtro por filial aplicado no servidor',
  );
  ok(
    (await req('GET', '/operacoes/tarefas?page=0', token)).status === 400,
    'pagina invalida rejeitada',
  );
  const doc = {
    titulo: 'Procedimento interno',
    conteudo: 'Texto seguro <script>alert(1)</script>',
    categoria: 'PROCEDIMENTO',
  };
  const d = await req('POST', '/operacoes/documentos', token, doc);
  ok(d.status === 201, 'documento criado');
  ok(
    (await req('GET', `/operacoes/documentos/${d.data.id}`, other)).status === 404,
    'documento privado da empresa',
  );
  ok(
    (
      await req('PUT', `/operacoes/documentos/${d.data.id}`, token, {
        ...doc,
        conteudo: 'Segunda versao',
        versao: 1,
      })
    ).status === 200,
    'documento atualizado com versao',
  );
  ok(
    (await req('PUT', `/operacoes/documentos/${d.data.id}`, token, { ...doc, versao: 1 }))
      .status === 409,
    'edicao obsoleta nao sobrescreve documento',
  );
  ok(
    (await req('GET', `/operacoes/documentos/${d.data.id}`, token)).data.versao === 2,
    'versao incrementada',
  );
  const cliente = await prisma.cliente.create({
    data: { empresaId: a.id, nome: 'TESTE contato', telefone: '11999999999' },
  });
  const campanha = {
    titulo: 'Campanha de teste',
    mensagem: 'Ola {nome}, confira os horarios.',
    status: 'ATIVA',
  };
  const c = await req('POST', '/operacoes/campanhas', token, campanha);
  ok(c.status === 201, 'campanha criada');
  ok(
    (await req('GET', `/operacoes/campanhas/${c.data.id}/contatos`, token)).data.data.length === 0,
    'nenhum contato sem autorizacao',
  );
  const consent = {
    clienteId: cliente.id,
    autorizado: true,
    evidencia: 'Autorizacao explicita presencial em teste',
  };
  ok(
    (await req('PUT', '/operacoes/consentimentos', token, { ...consent, autorizado: 'true' }))
      .status === 400,
    'consentimento textual nao vira booleano',
  );
  ok(
    (await req('PUT', '/operacoes/consentimentos', other, consent)).status === 404,
    'consentimento nao referencia outro tenant',
  );
  ok(
    (await req('PUT', '/operacoes/consentimentos', token, consent)).status === 200,
    'consentimento registrado',
  );
  const contacts = await req('GET', `/operacoes/campanhas/${c.data.id}/contatos`, token);
  ok(
    contacts.data.data.length === 1 &&
      contacts.data.data[0].url.startsWith('https://wa.me/5511999999999?text='),
    'link manual restrito a contato autorizado',
  );
  ok(
    decodeURIComponent(contacts.data.data[0].url).includes(cliente.nome),
    'mensagem personalizada',
  );
  await req('PUT', '/operacoes/consentimentos', token, {
    ...consent,
    autorizado: false,
    evidencia: 'Revogacao expressa em teste',
  });
  ok(
    (await req('GET', `/operacoes/campanhas/${c.data.id}/contatos`, token)).data.data.length === 0,
    'revogacao remove contato imediatamente',
  );
  await req('PUT', `/operacoes/campanhas/${c.data.id}`, token, {
    ...campanha,
    status: 'ENCERRADA',
  });
  ok(
    (await req('GET', `/operacoes/campanhas/${c.data.id}/contatos`, token)).status === 400,
    'campanha encerrada nao prepara contatos',
  );
  const auto = {
    titulo: 'Conferir abertura',
    descricao: 'Tarefa automatica',
    intervaloDias: 7,
    proximaExecucao: new Date(Date.now() + 86400000).toISOString(),
    ativa: true,
    responsavelId: a.usuarios[0].id,
  };
  const au = await req('POST', '/operacoes/automacoes', token, auto);
  ok(au.status === 201, 'automacao criada');
  await prisma.automacao.update({
    where: { id: au.data.id },
    data: { proximaExecucao: new Date(Date.now() - 86400000) },
  });
  await Promise.all([
    req('POST', '/operacoes/automacoes/processar', token, {}),
    req('POST', '/operacoes/automacoes/processar', token, {}),
  ]);
  ok(
    (await prisma.tarefa.count({ where: { automacaoId: au.data.id } })) === 1,
    'execucao concorrente gera apenas uma tarefa',
  );
  const { OperacoesService } = require('../apps/api/dist/src/operacoes/operacoes.service');
  await prisma.automacao.update({
    where: { id: au.data.id },
    data: { proximaExecucao: new Date(Date.now() - 86400000) },
  });
  await Promise.all([
    new OperacoesService({ client: prisma }).processarAutomacoes(a.id),
    new OperacoesService({ client: prisma }).processarAutomacoes(a.id),
  ]);
  ok(
    (await prisma.tarefa.count({ where: { automacaoId: au.data.id } })) === 2,
    'instancias independentes nao duplicam a mesma ocorrencia',
  );
  await req('POST', '/operacoes/automacoes/processar', token, {});
  ok(
    (await prisma.tarefa.count({ where: { automacaoId: au.data.id } })) === 2,
    'nova verificacao nao duplica tarefa',
  );
  ok(
    (await prisma.automacao.findUnique({ where: { id: au.data.id } })).proximaExecucao > new Date(),
    'automacao avanca proximo ciclo',
  );
  await prisma.automacao.update({
    where: { id: au.data.id },
    data: { proximaExecucao: new Date(Date.now() - 60000) },
  });
  const deadline = Date.now() + 75000;
  while (
    (await prisma.tarefa.count({ where: { automacaoId: au.data.id } })) < 3 &&
    Date.now() < deadline
  )
    await new Promise((resolve) => setTimeout(resolve, 1000));
  ok(
    (await prisma.tarefa.count({ where: { automacaoId: au.data.id } })) === 3,
    'scheduler gera tarefa sem acionar endpoint manual',
  );
  ok(
    (
      await req('PUT', `/operacoes/automacoes/${au.data.id}`, token, {
        ...auto,
        ativa: false,
        proximaExecucao: new Date(Date.now() - 86400000).toISOString(),
      })
    ).status === 200,
    'automacao vencida pode ser pausada',
  );
  const profissional = await prisma.profissional.create({
    data: { empresaId: a.id, nome: 'TESTE profissional' },
  });
  const servico = await prisma.servico.create({
    data: { empresaId: a.id, nome: 'TESTE consulta', duracaoMin: 30, preco: 100 },
  });
  const serie = {
    titulo: 'Consultas semanais',
    clienteId: cliente.id,
    profissionalId: profissional.id,
    servicoId: servico.id,
    inicio: new Date(Date.now() + 7 * 86400000).toISOString(),
    intervaloDias: 7,
    quantidade: 4,
  };
  const results = await Promise.all([
    req('POST', '/operacoes/recorrencias', token, serie),
    req('POST', '/operacoes/recorrencias', token, serie),
  ]);
  ok(
    results.filter((r) => r.status === 201).length === 1 &&
      results.filter((r) => r.status === 409).length === 1,
    'series concorrentes nao sobrepoem horarios',
  );
  const series = results.find((r) => r.status === 201).data;
  ok(
    (await prisma.agendamento.count({ where: { recorrenciaId: series.id } })) === 4,
    'quatro atendimentos na agenda',
  );
  ok(
    (await prisma.recorrencia.count({ where: { empresaId: a.id } })) === 1,
    'conflito nao deixa serie parcial',
  );
  ok(
    (await req('POST', '/operacoes/recorrencias', other, serie)).status === 400,
    'serie com referencias cruzadas rejeitada',
  );
  const individual = await req('POST', '/agendamentos', token, {
    clienteId: cliente.id,
    profissionalId: profissional.id,
    servicoId: servico.id,
    dataHora: serie.inicio,
  });
  ok(individual.status === 409, 'agenda individual respeita horario da serie');
  await prisma.agendamento.updateMany({
    where: { recorrenciaId: series.id },
    data: { status: 'CONCLUIDO' },
  });
  const one = await prisma.agendamento.findFirst({ where: { recorrenciaId: series.id } });
  await prisma.agendamento.update({ where: { id: one.id }, data: { status: 'CONFIRMADO' } });
  ok(
    (await req('POST', `/operacoes/recorrencias/${series.id}/cancelar`, other, {})).status === 404,
    'cancelamento de outro tenant bloqueado',
  );
  const canceled = await req('POST', `/operacoes/recorrencias/${series.id}/cancelar`, token, {});
  ok(canceled.data.cancelados === 1, 'cancelamento preserva atendimentos concluidos');
  ok(
    (await prisma.agendamento.count({
      where: { recorrenciaId: series.id, status: 'CONCLUIDO' },
    })) === 3,
    'historico preservado',
  );
  ok(
    (await req('DELETE', `/operacoes/documentos/${d.data.id}`, token)).status === 200,
    'documento excluido',
  );
  ok(
    (await req('DELETE', `/operacoes/tarefas/${t.data.id}`, token)).status === 200,
    'tarefa excluida',
  );
  console.log(`${checks} verificacoes passaram`);
}
main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    for (const c of companies) {
      await prisma.agendamento.deleteMany({ where: { empresaId: c.id } });
      await prisma.servico.deleteMany({ where: { empresaId: c.id } });
      await prisma.profissional.deleteMany({ where: { empresaId: c.id } });
      await prisma.cliente.deleteMany({ where: { empresaId: c.id } });
      await prisma.empresa.delete({ where: { id: c.id } });
    }
    await prisma.$disconnect();
  });
