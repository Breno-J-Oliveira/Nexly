import { Prisma } from '@prisma/client';
/** Serializa reservas do profissional ate o commit, inclusive entre replicas. */
export async function bloquearAgenda(
  tx: Pick<Prisma.TransactionClient, '$queryRaw'>,
  profissionalId: string,
): Promise<void> {
  await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${profissionalId}))::text`;
}
