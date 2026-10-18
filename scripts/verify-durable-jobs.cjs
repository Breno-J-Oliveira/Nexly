require('./local-api-env.cjs');
const { PrismaClient } = require('@prisma/client');
const { randomUUID } = require('node:crypto');
const assert = require('node:assert/strict');
const p = new PrismaClient();
let empresaId;
async function esperar(fn) {
  const deadline = Date.now() + 60000;
  while (Date.now() < deadline) {
    if (await fn()) return;
    await new Promise((r) => setTimeout(r, 500));
  }
  throw Error('A fila não concluiu as fixtures em 60 segundos.');
}
(async () => {
  assert.ok((await fetch('http://localhost:3001/api/health')).ok, 'API local ativa');
  const c = await p.empresa.create({
    data: {
      nome: 'TESTE fila durável descartável',
      cnpj: randomUUID(),
      modulos: ['automacao', 'tarefas'],
      usuarios: {
        create: {
          nome: 'TESTE administrador da fila',
          email: `fila-${randomUUID()}@example.test`,
          senhaHash: 'fixture-sem-login',
          role: 'ADMIN',
        },
      },
    },
  });
  empresaId = c.id;
  const a = await p.automacao.create({
    data: {
      empresaId,
      titulo: 'TESTE ocorrência única',
      descricao: 'Fixture da fila',
      intervaloDias: 1,
      proximaExecucao: new Date(Date.now() - 60000),
    },
  });
  const b = await p.automacao.create({
    data: {
      empresaId,
      titulo: 'TESTE recuperação de reserva',
      descricao: 'Fixture da fila',
      intervaloDias: 1,
      proximaExecucao: new Date(Date.now() - 60000),
    },
  });
  await p.jobDuravel.createMany({
    data: Array.from({ length: 20 }, (_, i) => ({
      empresaId,
      tipo: 'AUTOMACAO',
      chave: `teste-fila:${empresaId}:${i}`,
      payload: { id: a.id },
    })),
  });
  const stale = await p.jobDuravel.create({
    data: {
      empresaId,
      tipo: 'AUTOMACAO',
      chave: `teste-reserva:${empresaId}`,
      payload: { id: b.id },
      status: 'PROCESSANDO',
      tentativas: 1,
      reserva: randomUUID(),
      reservadoEm: new Date(Date.now() - 600000),
    },
  });
  await esperar(
    async () => (await p.jobDuravel.count({ where: { empresaId, status: 'CONCLUIDO' } })) === 21,
  );
  assert.equal(
    await p.tarefa.count({ where: { empresaId } }),
    2,
    'Cada ocorrência deve criar uma única tarefa',
  );
  assert.equal((await p.jobDuravel.findUniqueOrThrow({ where: { id: stale.id } })).tentativas, 2);
  const feitos = await p.jobDuravel.findMany({ where: { empresaId, status: 'CONCLUIDO' } });
  assert.ok(
    feitos.every((j) => j.payload === null),
    'Payload concluído deve ser apagado',
  );
  console.log(
    'PASS 20 jobs concorrentes criam uma única ocorrência; reserva antiga é recuperada e payload é removido.',
  );
  const fail = await p.jobDuravel.create({
    data: {
      empresaId,
      tipo: 'EMAIL_RECUPERACAO',
      chave: `teste-falha:${empresaId}`,
      payload: {},
      tentativas: 4,
    },
  });
  await esperar(
    async () => (await p.jobDuravel.count({ where: { id: fail.id, status: 'FALHOU' } })) === 1,
  );
  assert.equal(await p.notificacao.count({ where: { empresaId, link: '/operacao' } }), 1);
  const failed = await p.jobDuravel.findUniqueOrThrow({ where: { id: fail.id } });
  assert.equal(failed.tentativas, 5);
  assert.equal(failed.erro, 'Não foi possível concluir a rotina');
  console.log('PASS quinta falha gera uma única notificação interna, sem enviar e-mail.');
})()
  .catch((e) => {
    console.error(e.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    if (empresaId) await p.empresa.delete({ where: { id: empresaId } });
    await p.$disconnect();
  });
