// Run on a trusted server with its database credentials; never shipped to the browser.
const path = require('node:path');
require('dotenv').config({ path: path.resolve(__dirname, '../apps/api/.env') });
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const [action, id] = process.argv.slice(2);
  if (action === 'listar') {
    const items = await prisma.depoimento.findMany({ where: { status: 'PENDENTE', autorizaPublicacao: true, usuario: { ativo: true } }, select: { id: true, nomePublico: true, ocupacao: true, texto: true, nota: true, createdAt: true }, take: 100, orderBy: { createdAt: 'asc' } });
    console.log(JSON.stringify(items, null, 2));
    return;
  }
  if (!id || !['aprovar', 'rejeitar'].includes(action)) throw new Error('Uso: node scripts/moderar-depoimentos.cjs listar | aprovar ID | rejeitar ID');
  const result = await prisma.depoimento.updateMany({ where: { id, status: 'PENDENTE', autorizaPublicacao: true, usuario: { ativo: true } }, data: { status: action === 'aprovar' ? 'APROVADO' : 'REJEITADO' } });
  if (result.count !== 1) throw new Error('Recomendação não encontrada, sem autorização, inativa ou já revisada.');
  console.log(`Recomendação ${action === 'aprovar' ? 'aprovada' : 'rejeitada'}.`);
}
main().catch(error => { console.error(error.message); process.exitCode = 1; }).finally(() => prisma.$disconnect());
