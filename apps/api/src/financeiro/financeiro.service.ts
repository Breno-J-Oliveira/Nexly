import { BadRequestException } from '@nestjs/common';
import { dateRange } from '../common/validation/date-range';
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
    const { inicio, fim } = dateRange(dataInicio, dataFim);
    const cacheKey = 'dre:' + empresaId + ':v2:' + dataInicio + ':' + dataFim;
    const cached = await this.redis.get(cacheKey);
    if (cached) return JSON.parse(cached);

    const vendas = await this.prisma.client.venda.aggregate({
      where: { empresaId, createdAt: { gte: inicio, lte: fim } },
      _sum: { total: true, desconto: true },
      _count: { _all: true },
    });

    // Venda.total ja e liquido: subtrair desconto novamente altera a receita real.
    const receitaLiquida = Number(vendas._sum.total ?? 0);
    const descontos = Number(vendas._sum.desconto ?? 0);
    const receitaBruta = receitaLiquida + descontos;
    const qtdVendas = vendas._count._all;
    const ticketMedio = qtdVendas === 0 ? 0 : receitaLiquida / qtdVendas;
    // O schema nao guarda custo historico de aquisicao; preco de venda nao e CMV.
    const cmv = null,
      margemBruta = null,
      margemPercentual = null;
    const resultado = {
      periodo: { dataInicio, dataFim },
      receitaBruta,
      descontos,
      receitaLiquida,
      cmv,
      custosDisponiveis: false,
      margemBruta,
      margemPercentual,
      qtdVendas,
      ticketMedio,
    };

    await this.redis.set(cacheKey, JSON.stringify(resultado), 300);
    return resultado;
  }

  /* Fluxo de caixa diario */
  async fluxoCaixa(empresaId: string, dataInicio: string, dataFim: string) {
    const { inicio, fim } = dateRange(dataInicio, dataFim);

    const vendas = await this.prisma.client.venda.findMany({
      where: { empresaId, createdAt: { gte: inicio, lte: fim } },
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
    const fluxo = [...porDia.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([dia, d]) => {
        saldo += d.total;
        return { data: dia, ...d, saldoAcumulado: saldo };
      });

    return { periodo: { dataInicio, dataFim }, fluxo, saldoFinal: saldo };
  }

  /* Top produtos por faturamento */
  async topProdutos(empresaId: string, dataInicio: string, dataFim: string, limit = 10) {
    if (!Number.isInteger(limit) || limit < 1 || limit > 100)
      throw new BadRequestException('Limite deve estar entre 1 e 100');
    const { inicio, fim } = dateRange(dataInicio, dataFim);

    const itens = await this.prisma.client.itemVenda.findMany({
      where: { venda: { empresaId, createdAt: { gte: inicio, lte: fim } } },
      select: {
        quantidade: true,
        precoUnitario: true,
        produto: { select: { id: true, nome: true, sku: true } },
      },
    });

    const porProduto = new Map<string, { nome: string; sku: string; qtd: number; total: number }>();
    for (const i of itens) {
      const p = porProduto.get(i.produto.id) ?? {
        nome: i.produto.nome,
        sku: i.produto.sku,
        qtd: 0,
        total: 0,
      };
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
