import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class AvaliacoesService {
  constructor(private readonly prisma: PrismaService) {}

  async criar(agendamentoId: string, nota: number, comentario?: string) {
    if (nota < 0 || nota > 10) throw new BadRequestException('Nota deve ser entre 0 e 10');
    const ag = await (this.prisma.client as any).agendamento.findUnique({ where: { id: agendamentoId }, select: { empresaId: true, status: true } });
    if (!ag || ag.status !== 'CONCLUIDO') throw new BadRequestException('Agendamento nao encontrado ou nao concluido');
    return (this.prisma.client as any).avaliacao.upsert({
      where: { agendamentoId }, update: { nota, comentario }, create: { empresaId: ag.empresaId, agendamentoId, nota, comentario },
    });
  }

  async nps(empresaId: string) {
    const av = await (this.prisma.client as any).avaliacao.findMany({ where: { empresaId }, select: { nota: true } });
    if (av.length === 0) return { nps: 0, promotores: 0, neutros: 0, detratores: 0, total: 0 };
    const p = av.filter((a:any) => a.nota >= 9).length, n = av.filter((a:any) => a.nota >= 7 && a.nota <= 8).length, d = av.filter((a:any) => a.nota <= 6).length;
    return { nps: Math.round(((p - d) / av.length) * 100), promotores: p, neutros: n, detratores: d, total: av.length };
  }
}
