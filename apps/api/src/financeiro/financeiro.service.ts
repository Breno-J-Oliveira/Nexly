import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { RedisService } from '../redis/redis.service';

@Injectable()
export class FinanceiroService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  /* DRE simplificado (Demonstracao do Resultado do Exercicio) */
  async dre(empresaId: string, dataInicio: string, dataFim: string) {
    const cacheKey = 'dre:' + empresaId + ':' + dataInicio + ':' + dataFim;
    const cached = await this.redis.get(cacheKey);
    if (cached) return JSON.parse(cached);

    const inicio = new Date(dataInicio); inicio.setHours(0,0,0,0);
    const fim = new Date(dataFim); fim.setHours(23,59,59,999);

    const [vendas, custos, despesas] = await Promise.all([
      this.prisma.client.venda.aggregate({ where: { createdAt: { gte: inicio, lte: fim } }, _sum: { total: true, desconto: true } }),
      (this.prisma.client as any).movimentacaoEstoque.aggregate({
        where: { tipo: 'SAIDA', createdAt: { gte: inicio, lte: fim } },
        _sum: { quantidade: true },
      }),
      this.prisma.client.venda.count({ where: { createdAt: { gte: inicio, lte: fim } } }),
    ]);

    const receitaBruta = Number(vendas._sum.total ?? 0);
    const descontos = Number(vendas._sum.desconto ?? 0);
    const receitaLiquida = receitaBruta - descontos;

    // CMV (Custo das Mercadorias Vendidas): soma dos precos dos produtos vendidos
    const itensVendidos = await (this.prisma.client as any).itemVenda.findMany({
      where: { venda: { createdAt: { gte: inicio, lte: fim } } },
      select: { quantidade: true, precoUnitario: true, produto: { select: { nome: true } } },
    });
    const cmv = itensVendidos.reduce((acc: number, i: any) => acc + Number(i.precoUnitario) * i.quantidade, 0);
    const margemBruta = receitaLiquida - cmv;
    const margemPercentual = receitaLiquida === 0 ? 0 : (margemBruta / receitaLiquida) * 100;
    const qtdVendas = Number(vendas);
    const ticketMedio = qtdVendas === 0 ? 0 : receitaLiquida / qtdVendas;

    const resultado = {
      periodo: { dataInicio, dataFim },
      receitaBruta, descontos, receitaLiquida,
      cmv, margemBruta, margemPercentual,
      qtdVendas, ticketMedio,
    };

    await this.redis.set(cacheKey, JSON.stringify(resultado), 300);
    return resultado;
  }

  /* Fluxo de caixa diario */
  async fluxoCaixa(empresaId: string, dataInicio: string, dataFim: string) {
    const inicio = new Date(dataInicio); inicio.setHours(0,0,0,0);
    const fim = new Date(dataFim); fim.setHours(23,59,59,999);

    const vendas = await this.prisma.client.venda.findMany({
      where: { createdAt: { gte: inicio, lte: fim } },
      select: { total: true, createdAt: true },
      orderBy: { createdAt: 'asc' },
    });

    const porDia = new Map<string, { entradas: number; total: number }>();
    for (const v of vendas) {
      const dia = v.createdAt.toISOString().slice(0, 10);
      const atual = porDia.get(dia) ?? { entradas: 0, total: 0 };
      atual.entradas += 1;
      atual.total += Number(v.total);
      porDia.set(dia, atual);
    }

    let saldo = 0;
    const fluxo = [...porDia.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([dia, d]) => {
      saldo += d.total;
      return { data: dia, ...d, saldoAcumulado: saldo };
    });

    return { periodo: { dataInicio, dataFim }, fluxo, saldoFinal: saldo };
  }

  /* Top produtos por faturamento */
  async topProdutos(empresaId: string, dataInicio: string, dataFim: string, limit = 10) {
    const inicio = new Date(dataInicio); inicio.setHours(0,0,0,0);
    const fim = new Date(dataFim); fim.setHours(23,59,59,999);

    const itens = await (this.prisma.client as any).itemVenda.findMany({
      where: { venda: { createdAt: { gte: inicio, lte: fim } } },
      select: { quantidade: true, precoUnitario: true, produto: { select: { id: true, nome: true, sku: true } } },
    });

    const porProduto = new Map<string, { nome: string; sku: string; qtd: number; total: number }>();
    for (const i of itens) {
      const p = porProduto.get(i.produto.id) ?? { nome: i.produto.nome, sku: i.produto.sku, qtd: 0, total: 0 };
      p.qtd += i.quantidade;
      p.total += Number(i.precoUnitario) * i.quantidade;
      porProduto.set(i.produto.id, p);
    }

    return [...porProduto.entries()]
      .map(([id, p]) => ({ id, ...p }))
      .sort((a, b) => b.total - a.total)
      .slice(0, limit);
  }
}
