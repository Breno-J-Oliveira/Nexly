import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class ComissaoService {
  constructor(private readonly prisma: PrismaService) {}

  async calcular(profissionalId: string, dataInicio: string, dataFim: string) {
    const profissional = await this.prisma.client.profissional.findUnique({ where: { id: profissionalId }, select: { nome: true, comissaoPercentual: true } });
    if (!profissional) return { comissao: 0, totalServicos: 0, faturamento: 0 };

    const agendamentos = await this.prisma.client.agendamento.findMany({
      where: { profissionalId, status: 'CONCLUIDO', dataHora: { gte: new Date(dataInicio), lte: new Date(dataFim) } },
      include: { servico: true },
    });

    const faturamento = agendamentos.reduce((acc, a) => acc + Number(a.servico.preco), 0);
    const comissao = faturamento * ((profissional.comissaoPercentual ?? 0) / 100);

    return { profissional: profissional.nome, comissaoPercentual: profissional.comissaoPercentual, faturamento, comissao, totalServicos: agendamentos.length, periodo: { dataInicio, dataFim } };
  }

  async resumoGeral(dataInicio: string, dataFim: string) {
    const profissionais = await this.prisma.client.profissional.findMany({ where: { ativo: true }, select: { id: true, nome: true, comissaoPercentual: true } });
    const resumo = await Promise.all(profissionais.map(async (p) => {
      const { faturamento, comissao, totalServicos } = await this.calcular(p.id, dataInicio, dataFim);
      return { id: p.id, nome: p.nome, comissaoPercentual: p.comissaoPercentual, faturamento, comissao, totalServicos };
    }));
    const total = resumo.reduce((a, r) => ({ faturamento: a.faturamento + r.faturamento, comissao: a.comissao + r.comissao, servicos: a.servicos + r.totalServicos }), { faturamento: 0, comissao: 0, servicos: 0 });
    return { profissionais: resumo, total, periodo: { dataInicio, dataFim } };
  }
}
