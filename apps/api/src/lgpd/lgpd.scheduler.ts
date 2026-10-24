import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import * as cron from 'node-cron';
import { PrismaService } from '../database/prisma.service';
import { Prisma } from '@prisma/client';
import { AssinaturasService } from '../assinaturas/assinaturas.service';

/**
 * Executa as exclusões de conta agendadas (LGPD) após o prazo de 30 dias.
 * Cron: '0 3 * * *' — todo dia às 03:00.
 */
@Injectable()
export class LgpdScheduler implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(LgpdScheduler.name);
  private task?: cron.ScheduledTask;

  constructor(
    private readonly prisma: PrismaService,
    private readonly assinaturas: AssinaturasService,
  ) {}

  onModuleInit(): void {
    if (process.env.NODE_ENV === 'test') return;
    this.task = cron.schedule('0 3 * * *', () => {
      void this.executarExclusoes().catch(() => {
        this.logger.error('Falha no job de exclusão LGPD; verificar a rotina');
      });
    });
    this.logger.log('Job de exclusão LGPD agendado (0 3 * * *)');
  }

  onModuleDestroy(): void {
    if (this.task) void this.task.stop();
  }

  async executarExclusoes(): Promise<void> {
    const agora = new Date();
    const pendentes = await this.prisma.client.exclusaoConta.findMany({
      where: { executada: false, executarEm: { lte: agora } },
    });

    for (const exclusao of pendentes) {
      try {
        const removida = await this.excluirTenant(exclusao.id, exclusao.empresaId);
        // A exclusão da empresa remove a solicitação por cascade.
        if (removida) this.logger.log(`Conta ${exclusao.empresaId} excluída (LGPD)`);
      } catch {
        this.logger.error(
          `Exclusão da conta ${exclusao.empresaId} adiada; conferir cobrança e disponibilidade das dependências`,
        );
      }
    }
  }

  /**
   * Remove todos os dados do tenant. A ordem respeita as FKs `Restrict`
   * (dependentes primeiro), e a deleção da Empresa faz o cascade nos models
   * que possuem relação com `onDelete: Cascade`.
   */
  private async excluirTenant(exclusaoId: string, empresaId: string): Promise<boolean> {
    return this.prisma.client.$transaction(
      async (tx) => {
        // Revalida sob lock: outro worker ou o titular pode ter cancelado após a varredura.
        const reserva = await tx.exclusaoConta.updateMany({
          where: { id: exclusaoId, empresaId, executada: false, executarEm: { lte: new Date() } },
          data: { executada: true },
        });
        if (!reserva.count) return false;
        await this.assinaturas.validarEncerramento(
          empresaId,
          tx as unknown as Prisma.TransactionClient,
        );
        await tx.lancamentoFinanceiro.deleteMany({ where: { empresaId } });
        await tx.saldoFilial.deleteMany({ where: { empresaId } });
        await tx.avaliacao.deleteMany({ where: { empresaId } });
        await tx.itemVenda.deleteMany({ where: { venda: { empresaId } } });
        await tx.itemPedidoCompra.deleteMany({ where: { pedido: { empresaId } } });
        await tx.insumoServico.deleteMany({ where: { servico: { empresaId } } });
        await tx.movimentacaoEstoque.deleteMany({ where: { empresaId } });
        await tx.agendamento.deleteMany({ where: { empresaId } });
        await tx.venda.deleteMany({ where: { empresaId } });
        await tx.notificacao.deleteMany({ where: { empresaId } });
        await tx.cliente.deleteMany({ where: { empresaId } });
        await tx.profissional.deleteMany({ where: { empresaId } });
        await tx.servico.deleteMany({ where: { empresaId } });
        await tx.produto.deleteMany({ where: { empresaId } });
        // Cascade: usuario, refreshToken, cupom, fornecedor, pedidoCompra,
        // conviteUsuario, auditLog, termoAceite, exclusaoConta.
        await tx.empresa.delete({ where: { id: empresaId } });
        return true;
      },
      { maxWait: 5000, timeout: 30_000 },
    );
  }
}
