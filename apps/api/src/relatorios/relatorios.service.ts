import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class RelatoriosService {
  constructor(private readonly prisma: PrismaService) {}

  async insumosPorServico(dataInicio: string, dataFim: string) {
    const inicio = new Date(dataInicio);
    const fim = new Date(dataFim);
    const servicos = await this.prisma.client.servico.findMany({
      where: { ativo: true },
      include: { insumos: { include: { produto: true } } },
      orderBy: { nome: 'asc' },
    });
    const movs = await this.prisma.client.movimentacaoEstoque.findMany({
      where: { tipo: 'SAIDA', agendamentoId: { not: null }, createdAt: { gte: inicio, lte: fim } },
    });
    const agIds = movs.map((m) => m.agendamentoId).filter((x): x is string => x !== null);
    const ags = await this.prisma.client.agendamento.findMany({
      where: { id: { in: agIds } },
      select: { id: true, servicoId: true },
    });
    const svPorAg = new Map(ags.map((a) => [a.id, a.servicoId]));
    const consumo = new Map<string, Map<string, number>>();
    for (const m of movs) {
      if (!m.agendamentoId) continue;
      const sid = svPorAg.get(m.agendamentoId);
      if (!sid) continue;
      const pp = consumo.get(sid) ?? new Map();
      pp.set(m.produtoId, (pp.get(m.produtoId) ?? 0) + m.quantidade);
      consumo.set(sid, pp);
    }
    return servicos.map((s) => ({
      id: s.id,
      nome: s.nome,
      insumos: s.insumos.map((i) => ({
        produtoId: i.produtoId,
        produtoNome: i.produto.nome,
        quantidadeConfigurada: i.quantidade,
        quantidadeConsumida: consumo.get(s.id)?.get(i.produtoId) ?? 0,
      })),
    }));
  }

  async horariosPico() {
    const inicio = new Date();
    inicio.setDate(inicio.getDate() - 30);
    const ags = await this.prisma.client.agendamento.findMany({
      where: { status: 'CONCLUIDO', dataHora: { gte: inicio } },
      select: { dataHora: true },
    });
    const porHora = new Map<string, number>();
    for (const a of ags) {
      const h = String(a.dataHora.getHours()).padStart(2, '0');
      const chave = h + ':00';
      porHora.set(chave, (porHora.get(chave) ?? 0) + 1);
    }
    return [...porHora.entries()]
      .map(([hora, total]) => ({ hora, total }))
      .sort((a, b) => a.hora.localeCompare(b.hora));
  }

  async faturamento(dataInicio: string, dataFim: string) {
    const inicio = new Date(dataInicio);
    inicio.setHours(0, 0, 0, 0);
    const fim = new Date(dataFim);
    fim.setHours(23, 59, 59, 999);
    const [vendas, custos] = await Promise.all([
      this.prisma.client.venda.findMany({
        where: { createdAt: { gte: inicio, lte: fim } },
        select: { total: true, createdAt: true },
      }),
      this.prisma.client.movimentacaoEstoque.findMany({
        where: {
          tipo: 'SAIDA',
          agendamentoId: { not: null },
          createdAt: { gte: inicio, lte: fim },
        },
        include: { produto: { select: { preco: true } } },
      }),
    ]);
    let ft = 0,
      ct = 0;
    for (const v of vendas) ft += Number(v.total);
    for (const m of custos) ct += Number(m.produto.preco) * m.quantidade;
    const porDia = new Map<string, number>();
    for (const v of vendas) {
      const d = v.createdAt.toISOString().slice(0, 10);
      porDia.set(d, (porDia.get(d) ?? 0) + Number(v.total));
    }
    const dias = [...porDia.entries()]
      .map(([data, fat]) => ({ data, faturamento: fat }))
      .sort((a, b) => a.data.localeCompare(b.data));
    return {
      faturamentoTotal: ft,
      custoTotal: ct,
      margemBruta: ft - ct,
      margemPercentual: ft === 0 ? 0 : ((ft - ct) / ft) * 100,
      totalVendas: vendas.length,
      ticketMedio: vendas.length === 0 ? 0 : ft / vendas.length,
      porDia: dias,
    };
  }

  /* Novo: resumo geral do periodo */
  async resumoGeral(dataInicio: string, dataFim: string) {
    const [fat, clientes, ags, produtos] = await Promise.all([
      this.faturamento(dataInicio, dataFim),
      this.prisma.client.cliente.count({
        where: { createdAt: { gte: new Date(dataInicio), lte: new Date(dataFim) } },
      }),
      this.prisma.client.agendamento.count({
        where: { dataHora: { gte: new Date(dataInicio), lte: new Date(dataFim) } },
      }),
      this.prisma.client.produto.count({ where: { ativo: true } }),
    ]);
    return {
      ...fat,
      novosClientes: clientes,
      totalAgendamentos: ags,
      totalProdutosAtivos: produtos,
    };
  }

  /* Relatório de agenda: taxas, heatmap (7 dias x 12h) e ranking de profissionais */
  async relatorioAgenda(dataInicio: string, dataFim: string) {
    const inicio = new Date(dataInicio);
    inicio.setHours(0, 0, 0, 0);
    const fim = new Date(dataFim);
    fim.setHours(23, 59, 59, 999);

    const ags = await this.prisma.client.agendamento.findMany({
      where: { dataHora: { gte: inicio, lte: fim } },
      include: { profissional: { select: { nome: true } } },
    });

    const total = ags.length;
    const concluidos = ags.filter((a) => a.status === 'CONCLUIDO').length;
    const cancelados = ags.filter((a) => a.status === 'CANCELADO').length;
    const taxaConclusao = total === 0 ? 0 : (concluidos / total) * 100;
    const taxaCancelamento = total === 0 ? 0 : (cancelados / total) * 100;

    // Heatmap: linhas = Seg..Dom, colunas = 08h..19h
    const DIAS = [1, 2, 3, 4, 5, 6, 0];
    const heatmap = DIAS.map(() => Array<number>(12).fill(0));
    for (const a of ags) {
      const d = a.dataHora.getDay();
      const h = a.dataHora.getHours();
      if (h < 8 || h > 19) continue;
      const linha = DIAS.indexOf(d);
      if (linha < 0) continue;
      const row = heatmap[linha];
      if (!row) continue;
      const col = h - 8;
      row[col] = (row[col] ?? 0) + 1;
    }

    const contagem = new Map<string, number>();
    for (const a of ags) {
      contagem.set(a.profissional.nome, (contagem.get(a.profissional.nome) ?? 0) + 1);
    }
    const rankingProfissionais = [...contagem.entries()]
      .map(([nome, totalAgendamentos]) => ({ nome, total: totalAgendamentos }))
      .sort((a, b) => b.total - a.total);

    return {
      total,
      concluidos,
      cancelados,
      taxaConclusao,
      taxaCancelamento,
      heatmap,
      rankingProfissionais,
    };
  }

  /* Relatório por profissional: agendamentos, receita, comissão e avaliação */
  async relatorioProfissionais(dataInicio: string, dataFim: string) {
    const inicio = new Date(dataInicio);
    inicio.setHours(0, 0, 0, 0);
    const fim = new Date(dataFim);
    fim.setHours(23, 59, 59, 999);

    const profissionais = await this.prisma.client.profissional.findMany({
      where: { ativo: true },
      include: {
        agendamentos: {
          where: { dataHora: { gte: inicio, lte: fim } },
          include: {
            servico: { select: { preco: true } },
            avaliacoes: { select: { nota: true } },
          },
        },
      },
      orderBy: { nome: 'asc' },
    });

    return profissionais.map((p) => {
      const concluidos = p.agendamentos.filter((a) => a.status === 'CONCLUIDO');
      const receita = concluidos.reduce((acc, a) => acc + Number(a.servico.preco), 0);
      const notas = p.agendamentos.flatMap((a) => a.avaliacoes.map((av) => av.nota));
      const avaliacaoMedia =
        notas.length === 0 ? 0 : notas.reduce((a, b) => a + b, 0) / notas.length;
      const avatar = p.nome
        .split(' ')
        .filter(Boolean)
        .map((n) => n[0])
        .slice(0, 2)
        .join('')
        .toUpperCase();

      return {
        id: p.id,
        nome: p.nome,
        avatar,
        agendamentos: p.agendamentos.length,
        receita,
        comissao: receita * (p.comissaoPercentual / 100),
        avaliacaoMedia: Number(avaliacaoMedia.toFixed(1)),
      };
    });
  }

  /* Relatório de estoque: produtos mais consumidos + alertas de reposição */
  async relatorioEstoque(dataInicio: string, dataFim: string) {
    const inicio = new Date(dataInicio);
    inicio.setHours(0, 0, 0, 0);
    const fim = new Date(dataFim);
    fim.setHours(23, 59, 59, 999);

    const [saidas, produtos, movimentacoes] = await Promise.all([
      this.prisma.client.movimentacaoEstoque.findMany({
        where: { tipo: 'SAIDA', createdAt: { gte: inicio, lte: fim } },
        include: { produto: { select: { nome: true } } },
      }),
      this.prisma.client.produto.findMany({
        where: { ativo: true },
        select: { id: true, nome: true, estoqueAtual: true, estoqueMinimo: true },
      }),
      this.prisma.client.movimentacaoEstoque.count({
        where: { createdAt: { gte: inicio, lte: fim } },
      }),
    ]);

    const consumo = new Map<string, number>();
    for (const m of saidas) {
      consumo.set(m.produtoId, (consumo.get(m.produtoId) ?? 0) + m.quantidade);
    }

    const produtosMaisConsumidos = [...consumo.entries()]
      .map(([produtoId, quantidade]) => {
        const p = produtos.find((x) => x.id === produtoId);
        return { nome: p?.nome ?? 'Produto', quantidade };
      })
      .sort((a, b) => b.quantidade - a.quantidade)
      .slice(0, 10);

    const alertas = produtos
      .filter((p) => p.estoqueAtual === 0 || p.estoqueAtual < p.estoqueMinimo)
      .map((p) => ({
        id: p.id,
        nome: p.nome,
        estoqueAtual: p.estoqueAtual,
        estoqueMinimo: p.estoqueMinimo,
      }));

    return { produtosMaisConsumidos, movimentacoes, alertas };
  }
}
