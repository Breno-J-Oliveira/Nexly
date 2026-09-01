import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class ExportService {
  constructor(private readonly prisma: PrismaService) {}

  async vendasCsv(dataInicio?: string, dataFim?: string): Promise<string> {
    const where: any = {};
    if (dataInicio || dataFim) {
      where.createdAt = {};
      if (dataInicio) where.createdAt.gte = new Date(dataInicio);
      if (dataFim) where.createdAt.lte = new Date(dataFim);
    }
    const vendas = await this.prisma.client.venda.findMany({
      where, include: { cliente: true, itens: { include: { produto: true } } },
      orderBy: { createdAt: 'desc' }, take: 500,
    });
    const lines = ['Data;Cliente;Itens;Pagamento;Desconto;Total'];
    for (const v of vendas) {
      const itens = v.itens.map((i: any) => i.quantidade + 'x ' + i.produto.nome).join('; ');
      lines.push([
        v.createdAt.toISOString().slice(0, 10),
        v.cliente?.nome ?? 'Avulso',
        itens,
        (v as any).formaPagamento ?? 'Dinheiro',
        String((v as any).desconto ?? 0),
        String(v.total),
      ].join(';'));
    }
    return lines.join('\n');
  }

  async produtosVencendo(dias = 30) {
    const limite = new Date();
    limite.setDate(limite.getDate() + dias);
    return (this.prisma.client as any).produto.findMany({
      where: { ativo: true, dataVencimento: { not: null, lte: limite, gte: new Date() } },
      select: { id: true, nome: true, sku: true, estoqueAtual: true, dataVencimento: true, lote: true },
      orderBy: { dataVencimento: 'asc' },
    });
  }
}
