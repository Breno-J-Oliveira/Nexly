import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { PrismaService } from '../database/prisma.service';
import { EstoqueService } from './estoque.service';

interface AgendamentoConcluidoPayload {
  agendamentoId: string;
  servicoId: string;
}

/**
 * ⭐ Feature central do Nexly: baixa automática de estoque ao concluir um
 * serviço. Escuta o evento `agendamento.concluido` (emitido pelo módulo de
 * agendamentos) e dá baixa nos insumos configurados para o serviço.
 *
 * Se algum insumo não tiver saldo suficiente, o erro é registrado no log
 * mas NÃO bloqueia a conclusão do agendamento (a baixa fica pendente).
 */
@Injectable()
export class EstoqueIntegracaoService {
  private readonly logger = new Logger(EstoqueIntegracaoService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly estoqueService: EstoqueService,
  ) {}

  @OnEvent('agendamento.concluido')
  async handleAgendamentoConcluido(payload: AgendamentoConcluidoPayload): Promise<void> {
    const insumos = await this.prisma.client.insumoServico.findMany({
      where: { servicoId: payload.servicoId },
    });

    for (const insumo of insumos) {
      try {
        await this.estoqueService.registrarSaida(
          insumo.produtoId,
          insumo.quantidade,
          `Consumo no atendimento #${payload.agendamentoId}`,
          payload.agendamentoId,
        );
      } catch (error) {
        this.logger.error(
          `Falha ao dar baixa no insumo ${insumo.produtoId} do serviço ${payload.servicoId}: ${String(error)}`,
        );
      }
    }
  }
}
