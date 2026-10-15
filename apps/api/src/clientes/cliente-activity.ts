import { ConflictException } from '@nestjs/common';
import { Prisma } from '@prisma/client';

/** Usa a transação da venda/agenda: o CRM não pode ficar diferente da operação confirmada. */
export async function registrarVisitaClienteTx(
  tx: Prisma.TransactionClient,
  empresaId: string,
  clienteId: string,
  quando: Date,
) {
  await tx.cliente.updateMany({
    where: {
      id: clienteId,
      empresaId,
      OR: [{ ultimaVisita: null }, { ultimaVisita: { lt: quando } }],
    },
    data: { ultimaVisita: quando },
  });
}

export async function registrarCompraClienteTx(
  tx: Prisma.TransactionClient,
  empresaId: string,
  clienteId: string,
  total: Prisma.Decimal,
  quando: Date,
) {
  const updated = await tx.cliente.updateMany({
    where: { id: clienteId, empresaId, ativo: true },
    data: { totalGasto: { increment: total } },
  });
  if (updated.count !== 1)
    throw new ConflictException('Cliente indisponível. Atualize a venda e tente novamente.');
  await registrarVisitaClienteTx(tx, empresaId, clienteId, quando);
}
