import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import * as cron from 'node-cron';
import { PrismaService } from '../database/prisma.service';

/**
 * Executa as exclusões de conta agendadas (LGPD) após o prazo de 30 dias.
 * Cron: '0 3 * * *' — todo dia às 03:00.
 */
@Injectable()
export class LgpdScheduler implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(LgpdScheduler.name);
  private task?: cron.ScheduledTask;

  constructor(private readonly prisma: PrismaService) {}

  onModuleInit(): void {
    this.task = cron.schedule('0 3 * * *', () => {
      void this.executarExclusoes().catch((err) => {
        this.logger.error(`Falha no job de exclusão LGPD: ${(err as Error).message}`);
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
        await this.excluirTenant(exclusao.empresaId);
        await this.prisma.client.exclusaoConta.update({
          where: { id: exclusao.id },
          data: { executada: true },
        });
        this.logger.log(`Conta ${exclusao.empresaId} excluída (LGPD)`);
      } catch (err) {
        this.logger.error(
          `Falha ao excluir conta ${exclusao.empresaId}: ${(err as Error).message}`,
        );
      }
    }
  }

  /**
   * Remove todos os dados do tenant. A ordem respeita as FKs `Restrict`
   * (dependentes primeiro), e a deleção da Empresa faz o cascade nos models
   * que possuem relação com `onDelete: Cascade`.
   */
  private async excluirTenant(empresaId: string): Promise<void> {
    await this.prisma.client.$transaction(async (tx) => {
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
    });
  }
}
