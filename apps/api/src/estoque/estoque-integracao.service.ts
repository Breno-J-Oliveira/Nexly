import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PendenciaEstoque } from '@nexly/shared';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { getTenantIdOrFail } from '../database/tenant-context';
import { PrismaService } from '../database/prisma.service';
import { EstoqueService } from './estoque.service';

const pendenciasSchema = z.array(
  z.object({
    produtoId: z.string().uuid(),
    nomeProduto: z.string(),
    quantidade: z.number().int().positive(),
  }),
);
const linkPendencia = (id: string) => `/estoque?atendimento=${id}`;

/** Consumo e pendências acompanham a transação do atendimento, inclusive após reinício. */
@Injectable()
export class EstoqueIntegracaoService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly estoque: EstoqueService,
  ) {}

  async concluirTx(
    tx: Prisma.TransactionClient,
    agendamento: { id: string; servicoId: string },
  ): Promise<PendenciaEstoque[]> {
    const empresaId = getTenantIdOrFail();
    const insumos = await tx.insumoServico.findMany({
      where: { servicoId: agendamento.servicoId, servico: { empresaId } },
      select: { produtoId: true, quantidade: true },
      orderBy: { produtoId: 'asc' },
    });
    const produtos = await tx.produto.findMany({
      where: { empresaId, id: { in: insumos.map((i) => i.produtoId) } },
      select: { id: true, nome: true },
    });
    const nomes = new Map(produtos.map((p) => [p.id, p.nome]));
    const items = insumos.map((i) => ({
      ...i,
      nomeProduto: nomes.get(i.produtoId) ?? 'Produto indisponível',
    }));
    const pendencias = await this.processarItensTx(tx, agendamento.id, items);
    if (pendencias.length) {
      const gestores = await tx.usuario.findMany({
        where: { empresaId, ativo: true, role: { in: ['ADMIN', 'GESTOR'] } },
        select: { id: true },
        take: 50,
      });
      if (gestores.length)
        await tx.notificacao.createMany({
          data: gestores.map((user) => ({
            empresaId,
            usuarioId: user.id,
            titulo: 'Baixa de estoque pendente',
            mensagem: `O atendimento #${agendamento.id.slice(0, 8)} foi concluído com insumos pendentes. Verifique o saldo e regularize a baixa.`,
            link: linkPendencia(agendamento.id),
          })),
        });
    }
    return pendencias;
  }

  async listar(page: number, limit: number) {
    const empresaId = getTenantIdOrFail();
    const where = { empresaId, status: 'CONCLUIDO' as const, pendenciasEstoque: { not: [] } };
    const [rows, total] = await Promise.all([
      this.prisma.client.agendamento.findMany({
        where,
        select: { id: true, dataHora: true, pendenciasEstoque: true },
        orderBy: [{ dataHora: 'desc' }, { id: 'desc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.client.agendamento.count({ where }),
    ]);
    return {
      data: rows.map((row) => ({
        ...row,
        pendenciasEstoque: pendenciasSchema.parse(row.pendenciasEstoque),
      })),
      total,
      page,
      limit,
    };
  }

  async reprocessar(id: string) {
    return this.prisma.client.$transaction(async (tx) => {
      const agendamento = await this.bloquearTx(tx as unknown as Prisma.TransactionClient, id);
      const pendencias = await this.processarItensTx(
        tx as unknown as Prisma.TransactionClient,
        id,
        pendenciasSchema.parse(agendamento.pendenciasEstoque),
      );
      return { pendenciasEstoque: pendencias };
    });
  }

  async cancelar(id: string, motivo: string, usuarioId: string) {
    const empresaId = getTenantIdOrFail();
    return this.prisma.client.$transaction(async (tx) => {
      const agendamento = await this.bloquearTx(tx as unknown as Prisma.TransactionClient, id);
      const anteriores = pendenciasSchema.parse(agendamento.pendenciasEstoque);
      if (!anteriores.length) return { pendenciasEstoque: [] };
      await tx.agendamento.updateMany({
        where: { id, empresaId },
        data: { pendenciasEstoque: [] },
      });
      await tx.auditLog.create({
        data: {
          empresaId,
          usuarioId,
          acao: 'EDITAR',
          recurso: 'PendenciaEstoque',
          recursoId: id,
          dadosAntigos: { pendencias: anteriores.map((item) => ({ ...item })) },
          dadosNovos: { pendencias: [], motivo },
        },
      });
      await this.resolverAvisosTx(tx as unknown as Prisma.TransactionClient, id);
      return { pendenciasEstoque: [] };
    });
  }

  private async bloquearTx(tx: Prisma.TransactionClient, id: string) {
    const empresaId = getTenantIdOrFail();
    // O UPDATE adquire lock de linha. Uma segunda réplica só lê as pendências após o commit.
    const locked = await tx.agendamento.updateMany({
      where: { id, empresaId, status: 'CONCLUIDO' },
      data: { status: 'CONCLUIDO' },
    });
    if (locked.count !== 1) throw new NotFoundException('Atendimento concluído não encontrado');
    const row = await tx.agendamento.findFirst({
      where: { id, empresaId },
      select: { pendenciasEstoque: true },
    });
    if (!row) throw new NotFoundException('Atendimento não encontrado');
    return row;
  }

  private async processarItensTx(
    tx: Prisma.TransactionClient,
    id: string,
    items: PendenciaEstoque[],
  ) {
    const empresaId = getTenantIdOrFail(),
      pendencias: PendenciaEstoque[] = [];
    for (const item of [...items].sort((a, b) => a.produtoId.localeCompare(b.produtoId))) {
      try {
        await this.estoque.registrarSaidaTx(
          tx,
          item.produtoId,
          item.quantidade,
          `Consumo no atendimento #${id}`,
          id,
        );
      } catch (error) {
        const body = error instanceof ConflictException ? error.getResponse() : null;
        if (!body || typeof body !== 'object' || !('code' in body) || body.code !== 'OUT_OF_STOCK')
          throw error;
        pendencias.push(item);
      }
    }
    await tx.agendamento.updateMany({
      where: { id, empresaId },
      data: { pendenciasEstoque: pendencias.map((item) => ({ ...item })) },
    });
    if (!pendencias.length) await this.resolverAvisosTx(tx, id);
    return pendencias;
  }

  private async resolverAvisosTx(tx: Prisma.TransactionClient, id: string) {
    await tx.notificacao.updateMany({
      where: { empresaId: getTenantIdOrFail(), link: linkPendencia(id), lida: false },
      data: { lida: true },
    });
  }
}
