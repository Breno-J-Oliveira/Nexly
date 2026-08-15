import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class RelatoriosService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Lista de serviços com os insumos configurados e a quantidade total
   * consumida no período (via baixa automática de estoque em agendamentos).
   */
  async insumosPorServico(dataInicio: string, dataFim: string) {
    const inicio = new Date(dataInicio);
    const fim = new Date(dataFim);

    const servicos = await this.prisma.client.servico.findMany({
      where: { ativo: true },
      include: { insumos: { include: { produto: true } } },
      orderBy: { nome: 'asc' },
    });

    const movimentacoes = await this.prisma.client.movimentacaoEstoque.findMany({
      where: {
        tipo: 'SAIDA',
        agendamentoId: { not: null },
        createdAt: { gte: inicio, lte: fim },
      },
    });

    const agendamentoIds = movimentacoes
      .map((m) => m.agendamentoId)
      .filter((x): x is string => x !== null);

    const agendamentos = await this.prisma.client.agendamento.findMany({
      where: { id: { in: agendamentoIds } },
      select: { id: true, servicoId: true },
    });
    const servicoPorAgendamento = new Map(agendamentos.map((a) => [a.id, a.servicoId]));

    const consumoMap = new Map<string, Map<string, number>>();
    for (const m of movimentacoes) {
      if (!m.agendamentoId) continue;
      const servicoId = servicoPorAgendamento.get(m.agendamentoId);
      if (!servicoId) continue;
      const porProduto = consumoMap.get(servicoId) ?? new Map<string, number>();
      porProduto.set(m.produtoId, (porProduto.get(m.produtoId) ?? 0) + m.quantidade);
      consumoMap.set(servicoId, porProduto);
    }

    return servicos.map((s) => ({
      id: s.id,
      nome: s.nome,
      insumos: s.insumos.map((i) => ({
        produtoId: i.produtoId,
        produtoNome: i.produto.nome,
        quantidadeConfigurada: i.quantidade,
        quantidadeConsumida: consumoMap.get(s.id)?.get(i.produtoId) ?? 0,
      })),
    }));
  }

  /**
   * Agendamentos concluídos agrupados por faixa de horário (a cada hora)
   * nos últimos 30 dias.
   */
  async horariosPico() {
    const inicio = new Date();
    inicio.setDate(inicio.getDate() - 30);

    const agendamentos = await this.prisma.client.agendamento.findMany({
      where: { status: 'CONCLUIDO', dataHora: { gte: inicio } },
      select: { dataHora: true },
    });

    const porHora = new Map<string, number>();
    for (const a of agendamentos) {
      const hora = String(a.dataHora.getHours()).padStart(2, '0');
      const chave = `${hora}:00`;
      porHora.set(chave, (porHora.get(chave) ?? 0) + 1);
    }

    return [...porHora.entries()]
      .map(([hora, total]) => ({ hora, total }))
      .sort((a, b) => a.hora.localeCompare(b.hora));
  }
}
