const { createHash } = require('node:crypto');
const { PrismaClient } = require('@prisma/client');

const USAGE = 'Uso: node apps/api/prisma/seed-platform-workspace.cjs --usuario <UUID> [--aplicar]';
const DAY_MS = 86_400_000;
const taskTemplates = [
  {
    key: 'atendimento',
    title: 'Revisar roteiro da demonstração',
    status: 'PENDENTE',
    priority: 'ALTA',
    day: -1,
  },
  {
    key: 'agenda',
    title: 'Ensaiar fluxo de agenda e estoque',
    status: 'EM_ANDAMENTO',
    priority: 'ALTA',
    day: 1,
  },
  {
    key: 'primeiro-acesso',
    title: 'Revisar a experiência do primeiro acesso',
    status: 'PENDENTE',
    priority: 'NORMAL',
    day: 3,
  },
  {
    key: 'materiais',
    title: 'Organizar materiais de apoio do Nexly',
    status: 'CONCLUIDA',
    priority: 'BAIXA',
    day: null,
  },
];
const contactTemplates = [
  { key: 'aurora', name: 'Ateliê Aurora (contato fictício)' },
  { key: 'horizonte', name: 'Estúdio Horizonte (contato fictício)' },
  { key: 'vila', name: 'Espaço Vila (contato fictício)' },
];

function parseArgs(args) {
  const [option, uuid, applyFlag, ...extra] = args;
  if (
    option !== '--usuario' ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(uuid ?? '') ||
    (applyFlag !== undefined && applyFlag !== '--aplicar') ||
    extra.length
  ) {
    throw new Error(USAGE);
  }
  return { userId: uuid.toLowerCase(), apply: applyFlag === '--aplicar' };
}

function demoId(empresaId, resource, key) {
  const hex = createHash('sha256')
    .update(`nexly.workspace.demo.v1:${empresaId}:${resource}:${key}`)
    .digest('hex');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-8${hex.slice(13, 16)}-a${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
}

async function seedDemoWorkspace(prisma, { userId, apply }) {
  return prisma.$transaction(async (tx) => {
    if (apply) {
      await tx.$queryRaw`SELECT 1 FROM pg_advisory_xact_lock(hashtext('nexly.platform.workspace.seed'))`;
    }
    const member = await tx.platformMember.findUnique({
      where: { usuarioId: userId },
      select: {
        ativo: true,
        papel: true,
        usuario: {
          select: {
            ativo: true,
            role: true,
            twoFactorEnabled: true,
            empresa: { select: { id: true, nome: true } },
          },
        },
      },
    });
    if (
      !member?.ativo ||
      member.papel !== 'OWNER' ||
      !member.usuario.ativo ||
      member.usuario.role !== 'ADMIN' ||
      !member.usuario.twoFactorEnabled
    ) {
      throw new Error(
        '[DEMO] Informe o UUID de um proprietário ativo da plataforma e administrador da empresa interna com 2FA.',
      );
    }

    const empresa = member.usuario.empresa;
    const empresaId = empresa.id;
    const now = Date.now();
    const tasks = taskTemplates.map(({ key, title, status, priority, day }) => ({
      id: demoId(empresaId, 'tarefas', key),
      empresaId,
      titulo: `[DEMO] ${title}`,
      descricao: '[DEMO] Exemplo para apresentar a gestão interna do Nexly.',
      status,
      prioridade: priority,
      prazo: day === null ? null : new Date(now + day * DAY_MS),
    }));
    const contacts = contactTemplates.map(({ key, name }) => ({
      id: demoId(empresaId, 'clientes', key),
      empresaId,
      nome: `[DEMO] ${name}`,
      tag: 'DEMO',
      observacoes: '[DEMO] Registro fictício, sem dados de contato.',
    }));

    const [existingTasks, existingContacts] = await Promise.all([
      tx.tarefa.findMany({
        where: { empresaId, id: { in: tasks.map(({ id }) => id) } },
        select: { id: true },
      }),
      tx.cliente.findMany({
        where: { empresaId, id: { in: contacts.map(({ id }) => id) } },
        select: { id: true },
      }),
    ]);
    const missingTasks = tasks.filter(({ id }) => !existingTasks.some((row) => row.id === id));
    const missingContacts = contacts.filter(
      ({ id }) => !existingContacts.some((row) => row.id === id),
    );
    if (apply) {
      if (missingTasks.length) await tx.tarefa.createMany({ data: missingTasks });
      if (missingContacts.length) await tx.cliente.createMany({ data: missingContacts });
    }

    return {
      empresa,
      tarefas: { existentes: existingTasks.length, novas: missingTasks.length },
      contatos: { existentes: existingContacts.length, novos: missingContacts.length },
    };
  });
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (!process.env.DATABASE_URL) {
    throw new Error('[DEMO] Defina DATABASE_URL no ambiente do processo para o banco desejado.');
  }

  const prisma = new PrismaClient({ datasourceUrl: process.env.DATABASE_URL });
  try {
    const result = await seedDemoWorkspace(prisma, options);
    console.info(`[DEMO] ${options.apply ? 'Carga aplicada' : 'Prévia sem gravação'}`);
    console.info(JSON.stringify(result, null, 2));
    if (!options.apply)
      console.info('[DEMO] Confira a empresa na prévia e use --aplicar para inserir.');
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  main().catch((error) => {
    const expected = error?.constructor === Error;
    console.error(
      expected ? error.message : '[DEMO] Falha na carga. Confira o banco e as migrações.',
    );
    process.exitCode = 1;
  });
}

module.exports = { parseArgs, seedDemoWorkspace };
