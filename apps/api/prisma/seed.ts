import { PrismaClient } from '@prisma/client';
import * as argon2 from 'argon2';

const prisma = new PrismaClient();

async function main(): Promise<void> {
  const email = 'admin@nexly.com.br';
  const existente = await prisma.usuario.findUnique({ where: { email } });

  if (existente) {
    console.log('Seed: empresa demo já existe, ignorando.');
    return;
  }

  const senhaHash = await argon2.hash('nexly123', { type: argon2.argon2id });

  const empresa = await prisma.empresa.create({
    data: {
      nome: 'Salão Beleza Total',
      cnpj: '12.345.678/0001-90',
      usuarios: {
        create: {
          nome: 'Admin Demo',
          email,
          senhaHash,
          role: 'ADMIN',
        },
      },
    },
  });

  console.log(`Seed: empresa demo criada com id ${empresa.id}`);
  console.log('Seed: login → admin@nexly.com.br / nexly123');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
