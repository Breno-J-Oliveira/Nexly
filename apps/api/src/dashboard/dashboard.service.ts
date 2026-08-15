import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { RedisService } from '../redis/redis.service';

const TTL_SEGUNDOS = 5 * 60;

@Injectable()
export class DashboardService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  async getDashboard(empresaId: string) {
    const cacheKey = `dashboard:${empresaId}`;
    const cached = await this.redis.get(cacheKey);
    if (cached) {
      return JSON.parse(cached) as unknown;
    }

    const agora = new Date();
    const inicioDia = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate());
    const inicioMes = new Date(agora.getFullYear(), agora.getMonth(), 1);
    const inicioMesAnterior = new Date(agora.getFullYear(), agora.getMonth() - 1, 1);
    const ultimos30d = new Date(agora.getTime() - 30 * 86_400_000);

    const [
      agendamentosHoje,
      vendasMes,
      vendasMesAnterior,
      qtdVendasMes,
      agendamentosConcluidos,
      saidasPorAgendamento,
      produtos,
    ] = await Promise.all([
      this.prisma.client.agendamento.findMany({
        where: { dataHora: { gte: inicioDia } },
        select: { status: true },
      }),
      this.prisma.client.venda.aggregate({
        where: { createdAt: { gte: inicioMes } },
        _sum: { total: true },
      }),
      this.prisma.client.venda.aggregate({
        where: { createdAt: { gte: inicioMesAnterior, lt: inicioMes } },
        _sum: { total: true },
      }),
      this.prisma.client.venda.count({ where: { createdAt: { gte: inicioMes } } }),
      this.prisma.client.agendamento.findMany({
        where: { status: 'CONCLUIDO', dataHora: { gte: ultimos30d } },
        include: { servico: true },
      }),
      this.prisma.client.movimentacaoEstoque.findMany({
        where: { tipo: 'SAIDA', agendamentoId: { not: null }, createdAt: { gte: ultimos30d } },
        include: { produto: true },
      }),
      this.prisma.client.produto.findMany({
        where: { ativo: true },
        select: { id: true, nome: true, estoqueAtual: true, estoqueMinimo: true },
      }),
    ]);

    // Agendamentos hoje (por status)
    const porStatus: Record<string, number> = {
      AGENDADO: 0,
      CONFIRMADO: 0,
      CONCLUIDO: 0,
      CANCELADO: 0,
    };
    for (const a of agendamentosHoje) {
      porStatus[a.status] = (porStatus[a.status] ?? 0) + 1;
    }

    // Receita do mês (atual vs anterior)
    const receitaAtual = Number(vendasMes._sum.total ?? 0);
    const receitaAnterior = Number(vendasMesAnterior._sum.total ?? 0);
    const variacaoPercentual =
      receitaAnterior === 0 ? 0 : ((receitaAtual - receitaAnterior) / receitaAnterior) * 100;

    const ticketMedio = qtdVendasMes === 0 ? 0 : receitaAtual / qtdVendasMes;

    // Agendamentos concluídos por dia (últimos 30 dias)
    const porDia = new Map<string, number>();
    for (const a of agendamentosConcluidos) {
      const chave = a.dataHora.toISOString().slice(0, 10);
      porDia.set(chave, (porDia.get(chave) ?? 0) + 1);
    }
    const agendamentosPorDia = [...porDia.entries()]
      .map(([data, total]) => ({ data, total }))
      .sort((a, b) => a.data.localeCompare(b.data));

    // Top 5 serviços mais realizados
    const porServico = new Map<string, number>();
    for (const a of agendamentosConcluidos) {
      porServico.set(a.servico.nome, (porServico.get(a.servico.nome) ?? 0) + 1);
    }
    const topServicos = [...porServico.entries()]
      .map(([nome, quantidade]) => ({ nome, quantidade }))
      .sort((a, b) => b.quantidade - a.quantidade)
      .slice(0, 5);

    // Top 5 produtos mais consumidos (baixa por agendamento)
    const porProduto = new Map<string, number>();
    for (const m of saidasPorAgendamento) {
      porProduto.set(m.produto.nome, (porProduto.get(m.produto.nome) ?? 0) + m.quantidade);
    }
    const topProdutos = [...porProduto.entries()]
      .map(([nome, quantidade]) => ({ nome, quantidade }))
      .sort((a, b) => b.quantidade - a.quantidade)
      .slice(0, 5);

    // Alertas de estoque (abaixo do mínimo)
    const alertasEstoque = produtos
      .filter((p) => p.estoqueAtual < p.estoqueMinimo)
      .map((p) => ({ id: p.id, nome: p.nome, estoqueAtual: p.estoqueAtual, estoqueMinimo: p.estoqueMinimo }));

    const resultado = {
      agendamentosHoje: { total: agendamentosHoje.length, ...porStatus },
      receitaMes: { atual: receitaAtual, anterior: receitaAnterior, variacaoPercentual },
      ticketMedio,
      agendamentosPorDia,
      topServicos,
      topProdutos,
      alertasEstoque,
    };

    await this.redis.set(cacheKey, JSON.stringify(resultado), TTL_SEGUNDOS);

    return resultado;
  }
}
