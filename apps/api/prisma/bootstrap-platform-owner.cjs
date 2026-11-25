const { PrismaClient } = require('@prisma/client');

async function grantOwner(prisma, userId) {
  return prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT 1 FROM pg_advisory_xact_lock(hashtext('nexly.platform.owner'))`;
    const user = await tx.usuario.findUnique({
      where: { id: userId },
      select: { id: true, empresaId: true, ativo: true, role: true, twoFactorEnabled: true },
    });
    if (!user?.ativo || user.role !== 'ADMIN' || !user.twoFactorEnabled) {
      throw new Error('Escolha um administrador ativo da empresa interna com 2FA já configurado.');
    }

    const owners = await tx.platformMember.findMany({
      where: { papel: 'OWNER' },
      select: { usuarioId: true, ativo: true, usuario: { select: { empresaId: true } } },
    });
    if (owners.some(({ usuario }) => usuario.empresaId !== user.empresaId)) {
      throw new Error('Use uma conta da mesma empresa interna dos proprietários existentes.');
    }
    if (owners.some((owner) => owner.usuarioId === userId && owner.ativo)) return false;

    await tx.platformMember.upsert({
      where: { usuarioId: userId },
      create: { usuarioId: userId, papel: 'OWNER' },
      update: { papel: 'OWNER', ativo: true },
    });
    return true;
  });
}

async function main() {
  const [, , option, uuid, ...extra] = process.argv;
  if (
    option !== '--usuario' ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(uuid ?? '') ||
    extra.length
  ) {
    throw new Error('Uso: node apps/api/prisma/bootstrap-platform-owner.cjs --usuario <UUID>');
  }
  if (!process.env.DATABASE_URL) {
    throw new Error('Defina DATABASE_URL no ambiente do processo para o banco correto.');
  }

  const prisma = new PrismaClient({ datasourceUrl: process.env.DATABASE_URL });
  try {
    const changed = await grantOwner(prisma, uuid.toLowerCase());
    console.info(changed ? 'Proprietário da plataforma cadastrado.' : 'Esse acesso já está ativo.');
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  const expected = error?.constructor === Error;
  console.error(
    expected ? error.message : 'Falha ao configurar o acesso. Confira o banco e as migrações.',
  );
  process.exitCode = 1;
});
