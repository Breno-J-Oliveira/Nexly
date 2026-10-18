import { ConflictException, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';

export async function saidaFilial(
  tx: Prisma.TransactionClient,
  empresaId: string,
  filialId: string,
  produtoId: string,
  quantidade: number,
  motivo: string,
) {
  const ativa = await tx.filial.findFirst({
    where: { id: filialId, empresaId, ativa: true },
    select: { id: true },
  });
  if (!ativa) throw new NotFoundException('Filial indisponível');
  const changed = await tx.saldoFilial.updateMany({
    where: { empresaId, filialId, produtoId, quantidade: { gte: quantidade } },
    data: { quantidade: { decrement: quantidade } },
  });
  if (changed.count !== 1) throw new ConflictException('Saldo insuficiente nesta unidade');
  await tx.movimentacaoEstoque.create({
    data: { empresaId, filialId, produtoId, tipo: 'SAIDA', quantidade, motivo },
  });
}
export async function entradaFilial(
  tx: Prisma.TransactionClient,
  empresaId: string,
  filialId: string,
  produtoId: string,
  quantidade: number,
  motivo: string,
) {
  const filial = await tx.filial.findFirst({
    where: { id: filialId, empresaId },
    select: { id: true },
  });
  if (!filial) throw new NotFoundException('Filial não encontrada');
  await tx.saldoFilial.upsert({
    where: { empresaId_filialId_produtoId: { empresaId, filialId, produtoId } },
    create: { empresaId, filialId, produtoId, quantidade },
    update: { quantidade: { increment: quantidade } },
  });
  await tx.movimentacaoEstoque.create({
    data: { empresaId, filialId, produtoId, tipo: 'ENTRADA', quantidade, motivo },
  });
}
