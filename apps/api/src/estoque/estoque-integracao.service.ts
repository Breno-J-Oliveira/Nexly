import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { PrismaService } from '../database/prisma.service';
import { EstoqueService } from './estoque.service';

interface AgendamentoConcluidoPayload {
  agendamentoId: string;
  servicoId: string;
}

/**
 * ⭐ Feature central do Nexly: **baixa automática de estoque** ao concluir um
 * serviço. Escuta o evento `agendamento.concluido` (emitido pelo
 * `AgendamentosService.atualizarStatus` quando o status vira `CONCLUIDO`) e
 * dá baixa nos insumos configurados para o serviço.
 *
 * **Comportamento de falha**: se algum insumo não tiver saldo suficiente,
 * o erro é registrado no log mas **NÃO** bloqueia a conclusão do
 * agendamento. Isso evita que um problema de estoque impeça o atendimento
 * de ser registrado — a equipe de operações pode regularizar o saldo
 * depois (entrada manual + devolução).
 */
@Injectable()
export class EstoqueIntegracaoService {
  private readonly logger = new Logger(EstoqueIntegracaoService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly estoqueService: EstoqueService,
  ) {}

  /**
   * Handler do evento `agendamento.concluido`. Para cada insumo do
   * serviço, registra uma SAÍDA no estoque com a quantidade configurada
   * e referencia o agendamento original.
   */
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
