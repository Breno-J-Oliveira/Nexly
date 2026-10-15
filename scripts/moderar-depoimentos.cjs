// Run on a trusted server with its database credentials; never shipped to the browser.
const path = require('node:path');
require('dotenv').config({ path: path.resolve(__dirname, '../apps/api/.env') });
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const [action, id, version] = process.argv.slice(2);
  if (action === 'listar') {
    const items = await prisma.depoimento.findMany({
      where: { status: 'PENDENTE', autorizaPublicacao: true, usuario: { ativo: true } },
      select: {
        id: true,
        nomePublico: true,
        ocupacao: true,
        texto: true,
        nota: true,
        createdAt: true,
        updatedAt: true,
      },
      take: 100,
      orderBy: { createdAt: 'asc' },
    });
    console.log(JSON.stringify(items, null, 2));
    return;
  }
  if (
    !id ||
    !version ||
    Number.isNaN(Date.parse(version)) ||
    !['aprovar', 'rejeitar'].includes(action)
  )
    throw new Error(
      'Uso: node scripts/moderar-depoimentos.cjs listar | aprovar ID UPDATED_AT | rejeitar ID UPDATED_AT',
    );
  const result = await prisma.depoimento.updateMany({
    where: {
      id,
      updatedAt: new Date(version),
      status: 'PENDENTE',
      autorizaPublicacao: true,
      usuario: { ativo: true },
    },
    data: { status: action === 'aprovar' ? 'APROVADO' : 'REJEITADO' },
  });
  if (result.count !== 1)
    throw new Error(
      'Recomendação alterada, sem autorização, inativa ou já revisada. Liste e revise novamente.',
    );
  console.log(`Recomendação ${action === 'aprovar' ? 'aprovada' : 'rejeitada'}.`);
}
main()
  .catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
