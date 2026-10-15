import { dateRange } from '../common/validation/date-range';
import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { csvCell } from './csv';

@Injectable()
export class ExportService {
  constructor(private readonly prisma: PrismaService) {}

  async vendasCsv(dataInicio?: string, dataFim?: string): Promise<string> {
    const where: { createdAt?: { gte?: Date; lte?: Date } } = {};
    if (dataInicio || dataFim) {
      where.createdAt = {};
      if (dataInicio) where.createdAt.gte = dateRange(dataInicio, dataInicio).inicio;
      if (dataFim) where.createdAt.lte = dateRange(dataFim, dataFim).fim;
      if (dataInicio && dataFim) dateRange(dataInicio, dataFim);
    }
    const vendas = await this.prisma.client.venda.findMany({
      where,
      include: { cliente: true, itens: { include: { produto: true } } },
      orderBy: { createdAt: 'desc' },
      take: 500,
    });
    const lines = ['Data;Cliente;Itens;Pagamento;Desconto;Total'];
    for (const v of vendas) {
      const itens = v.itens.map((i) => i.quantidade + 'x ' + i.produto.nome).join('; ');
      lines.push(
        [
          csvCell(v.createdAt.toISOString().slice(0, 10)),
          csvCell(v.cliente?.nome ?? 'Avulso', true),
          csvCell(itens, true),
          csvCell(v.formaPagamento ?? 'Dinheiro', true),
          csvCell(String(v.desconto ?? 0)),
          csvCell(String(v.total)),
        ].join(';'),
      );
    }
    return lines.join('\n');
  }

  async produtosVencendo(dias = 30) {
    if (!Number.isInteger(dias) || dias < 0 || dias > 3650)
      throw new BadRequestException('Dias deve ser um inteiro entre 0 e 3650');
    const limite = new Date();
    limite.setUTCDate(limite.getUTCDate() + dias);
    limite.setUTCHours(23, 59, 59, 999);
    return this.prisma.client.produto.findMany({
      where: { ativo: true, dataVencimento: { not: null, lte: limite } },
      select: {
        id: true,
        nome: true,
        sku: true,
        estoqueAtual: true,
        dataVencimento: true,
        lote: true,
      },
      orderBy: { dataVencimento: 'asc' },
    });
  }
}
