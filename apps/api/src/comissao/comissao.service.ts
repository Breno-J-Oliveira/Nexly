import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { dateRange } from '../common/validation/date-range';
import { calendarRange } from '../common/validation/calendar-range';
import { commissionTotals } from './commission-totals';
import { Prisma } from '@prisma/client';

function commissionRange(inicio: string, fim: string) {
  if (typeof inicio === 'string' && inicio.includes('T')) {
    return calendarRange({ inicio, fim })!;
  }
  return dateRange(inicio, fim);
}

@Injectable()
export class ComissaoService {
  constructor(private readonly prisma: PrismaService) {}

  async calcular(profissionalId: string, dataInicio: string, dataFim: string) {
    const { inicio, fim } = commissionRange(dataInicio, dataFim);
    const profissional = await this.prisma.client.profissional.findFirst({
      where: { id: profissionalId },
      select: { nome: true, comissaoPercentual: true },
    });
    if (!profissional) return { comissao: 0, totalServicos: 0, faturamento: 0 };

    const agendamentos = await this.prisma.client.agendamento.findMany({
      where: {
        profissionalId,
        status: 'CONCLUIDO',
        dataHora: { gte: inicio, lte: fim },
      },
      include: { servico: true },
    });

    return {
      profissional: profissional.nome,
      comissaoPercentual: profissional.comissaoPercentual,
      ...commissionTotals(agendamentos, profissional.comissaoPercentual ?? 0),
      periodo: { dataInicio, dataFim },
    };
  }

  async resumoGeral(dataInicio: string, dataFim: string) {
    const { inicio, fim } = commissionRange(dataInicio, dataFim);
    const profissionais = await this.prisma.client.profissional.findMany({
      where: {
        OR: [
          { ativo: true },
          { agendamentos: { some: { status: 'CONCLUIDO', dataHora: { gte: inicio, lte: fim } } } },
        ],
      },
      select: {
        id: true,
        nome: true,
        ativo: true,
        comissaoPercentual: true,
        agendamentos: {
          where: { status: 'CONCLUIDO', dataHora: { gte: inicio, lte: fim } },
          include: { servico: { select: { preco: true } } },
        },
      },
    });
    const resumo = profissionais.map((p) => {
      return {
        id: p.id,
        nome: p.nome,
        ativo: p.ativo,
        comissaoPercentual: p.comissaoPercentual,
        ...commissionTotals(p.agendamentos, p.comissaoPercentual ?? 0),
      };
    });
    const total = resumo.reduce(
      (a, r) => ({
        faturamento: a.faturamento.plus(r.faturamento),
        comissao: a.comissao.plus(r.comissao),
        servicos: a.servicos + r.totalServicos,
        estimados: a.estimados + r.estimados,
      }),
      {
        faturamento: new Prisma.Decimal(0),
        comissao: new Prisma.Decimal(0),
        servicos: 0,
        estimados: 0,
      },
    );
    return {
      profissionais: resumo,
      total: {
        ...total,
        faturamento: total.faturamento.toNumber(),
        comissao: total.comissao.toNumber(),
      },
      periodo: { dataInicio, dataFim },
    };
  }
}
