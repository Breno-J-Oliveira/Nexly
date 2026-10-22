import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { RedisService } from '../redis/redis.service';
import { AuthUser, hasPermission } from '@nexly/shared';
import { diaNoFuso, periodoNoFuso } from '../booking/booking-time';

const TTL_SEGUNDOS = 5 * 60;

@Injectable()
export class DashboardService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  /** Pendências recentes, sem reutilizar o cache financeiro entre papéis. */
  async getAlertas(user: AuthUser) {
    const financeiro = hasPermission(user.role, 'financeiro:read');
    const agenda = hasPermission(user.role, 'agenda:read');
    const alertas: {
      id: string;
      titulo: string;
      quantidade: number;
      href: string;
      modulo: string;
    }[] = [];
    if (!financeiro && !agenda) return { alertas };
    const empresaId = user.empresaId;
    const empresa = await this.prisma.client.empresa.findFirstOrThrow({
      where: { id: empresaId },
      select: { fusoHorario: true },
    });
    const agora = new Date();
    const hoje = diaNoFuso(agora, empresa.fusoHorario);
    // Contas usam datas civis armazenadas em UTC; agenda usa instantes no fuso da empresa.
    const inicioHoje = new Date(`${hoje}T00:00:00.000Z`);
    const limite = new Date(inicioHoje.getTime() + 7 * 86400000);
    const ontem = new Date(inicioHoje.getTime() - 86400000).toISOString().slice(0, 10);
    const fim = new Date(limite.getTime() - 1).toISOString().slice(0, 10);
    const [atrasadas, proximas, confirmacoes] = await Promise.all([
      financeiro
        ? this.prisma.client.lancamentoFinanceiro.groupBy({
            by: ['tipo'],
            where: {
              empresaId,
              status: { in: ['ABERTO', 'PARCIAL'] },
              vencimento: { lt: inicioHoje },
            },
            _count: true,
            _min: { vencimento: true },
          })
        : [],
      financeiro
        ? this.prisma.client.lancamentoFinanceiro.groupBy({
            by: ['tipo'],
            where: {
              empresaId,
              status: { in: ['ABERTO', 'PARCIAL'] },
              vencimento: { gte: inicioHoje, lt: limite },
            },
            _count: true,
            _min: { vencimento: true },
          })
        : [],
      agenda
        ? this.prisma.client.agendamento.count({
            where: {
              empresaId,
              status: 'AGENDADO',
              dataHora: { gte: agora, lt: periodoNoFuso(hoje, empresa.fusoHorario).fimExclusivo },
            },
          })
        : 0,
    ]);
    for (const [grupos, vencidas] of [
      [atrasadas, true],
      [proximas, false],
    ] as const) {
      for (const grupo of grupos) {
        if (!grupo._count || !grupo._min.vencimento || !['DESPESA', 'RECEITA'].includes(grupo.tipo))
          continue;
        const pagar = grupo.tipo === 'DESPESA';
        const inicio = vencidas ? grupo._min.vencimento.toISOString().slice(0, 10) : hoje;
        alertas.push({
          id: `${vencidas ? 'atrasadas' : 'proximas'}-${grupo.tipo}`,
          titulo: `Contas a ${pagar ? 'pagar' : 'receber'} ${vencidas ? 'atrasadas' : 'nos próximos 7 dias'}`,
          quantidade: grupo._count,
          href: `/financeiro?inicio=${inicio}&fim=${vencidas ? ontem : fim}`,
          modulo: 'relatorios',
        });
      }
    }
    if (confirmacoes > 0)
      alertas.push({
        id: 'confirmacoes',
        titulo: 'Atendimentos de hoje aguardando confirmação',
        quantidade: confirmacoes,
        href: '/agenda',
        modulo: 'agenda',
      });
    return { alertas };
  }

  async getDashboard(empresaId: string) {
    const cacheKey = `dashboard:${empresaId}`;
    const cached = await this.redis.get(cacheKey);
    if (cached) {
      return JSON.parse(cached) as unknown;
    }

    const agora = new Date();
    const inicioDia = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate());
    const fimDia = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate() + 1);
    const inicioMes = new Date(agora.getFullYear(), agora.getMonth(), 1);
    const inicioMesAnterior = new Date(agora.getFullYear(), agora.getMonth() - 1, 1);
    const ultimos30d = new Date(agora.getTime() - 30 * 86_400_000);
    const inicioSemana = new Date(inicioDia.getTime() - 6 * 86_400_000);

    const [
      agendamentosHoje,
      agendamentosHojeDetalhado,
      vendasDia,
      vendasMes,
      vendasMesAnterior,
      qtdVendasMes,
      agendamentosConcluidos,
      vendasSemana,
      profissionaisAtivos,
      saidasPorAgendamento,
      produtos,
    ] = await Promise.all([
      this.prisma.client.agendamento.findMany({
        where: { dataHora: { gte: inicioDia, lt: fimDia } },
        select: { status: true },
      }),
      this.prisma.client.agendamento.findMany({
        where: { dataHora: { gte: inicioDia, lt: fimDia } },
        include: { cliente: true, profissional: true, servico: true },
        orderBy: { dataHora: 'asc' },
      }),
      this.prisma.client.venda.aggregate({
        where: { status: 'CONCLUIDA', createdAt: { gte: inicioDia, lt: fimDia } },
        _sum: { total: true },
      }),
      this.prisma.client.venda.aggregate({
        where: { status: 'CONCLUIDA', createdAt: { gte: inicioMes } },
        _sum: { total: true },
      }),
      this.prisma.client.venda.aggregate({
        where: { status: 'CONCLUIDA', createdAt: { gte: inicioMesAnterior, lt: inicioMes } },
        _sum: { total: true },
      }),
      this.prisma.client.venda.count({
        where: { status: 'CONCLUIDA', createdAt: { gte: inicioMes } },
      }),
      this.prisma.client.agendamento.findMany({
        where: { status: 'CONCLUIDO', dataHora: { gte: ultimos30d } },
        include: { servico: true },
      }),
      this.prisma.client.venda.findMany({
        where: { status: 'CONCLUIDA', createdAt: { gte: inicioSemana, lt: fimDia } },
        select: { createdAt: true, total: true },
      }),
      this.prisma.client.profissional.count({ where: { ativo: true } }),
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

    // Faturamento hoje
    const faturamentoHoje = Number(vendasDia._sum.total ?? 0);

    // Taxa de ocupação (simplificada): agendamentos hoje / (profissionais * 8 slots de 1h)
    const slotsDisponiveis = Math.max(profissionaisAtivos * 8, 1);
    const ocupacao = Math.min(100, Math.round((agendamentosHoje.length / slotsDisponiveis) * 100));

    // Agendamentos concluídos por dia (últimos 30 dias)
    const porDia = new Map<string, number>();
    for (const a of agendamentosConcluidos) {
      const chave = a.dataHora.toISOString().slice(0, 10);
      porDia.set(chave, (porDia.get(chave) ?? 0) + 1);
    }
    const agendamentosPorDia = [...porDia.entries()]
      .map(([data, total]) => ({ data, total }))
      .sort((a, b) => a.data.localeCompare(b.data));

    // Evolução de vendas semanal (receita acumulada dos últimos 7 dias)
    const vendasPorDia = new Map<string, number>();
    for (const venda of vendasSemana) {
      const chave = `${venda.createdAt.getFullYear()}-${venda.createdAt.getMonth()}-${venda.createdAt.getDate()}`;
      vendasPorDia.set(chave, (vendasPorDia.get(chave) ?? 0) + Number(venda.total));
    }
    const diasSemana = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    const evolucaoVendasSemanal = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(inicioSemana.getTime() + i * 86_400_000);
      const chave = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
      const total = vendasPorDia.get(chave) ?? 0;
      return { dia: diasSemana[d.getDay()], total };
    });

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
      .map((p) => ({
        id: p.id,
        nome: p.nome,
        estoqueAtual: p.estoqueAtual,
        estoqueMinimo: p.estoqueMinimo,
      }));

    // Próximos compromissos (hoje)
    const proximosCompromissos = agendamentosHojeDetalhado.slice(0, 5).map((a) => ({
      id: a.id,
      horaInicio: a.dataHora.toISOString(),
      horaFim: a.dataHoraFim?.toISOString() ?? null,
      cliente: a.cliente?.nome ?? 'Cliente não informado',
      servico: a.servico.nome,
      profissional: a.profissional?.nome ?? 'Profissional não informado',
      status: a.status,
    }));

    const resultado = {
      agendamentosHoje: { total: agendamentosHoje.length, ...porStatus },
      receitaMes: { atual: receitaAtual, anterior: receitaAnterior, variacaoPercentual },
      ticketMedio,
      faturamentoHoje,
      taxaOcupacao: ocupacao,
      agendamentosPorDia,
      evolucaoVendasSemanal,
      topServicos,
      topProdutos,
      alertasEstoque,
      proximosCompromissos,
    };

    await this.redis.set(cacheKey, JSON.stringify(resultado), TTL_SEGUNDOS);

    return resultado;
  }
}
