import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class FidelidadeService {
  constructor(private readonly prisma: PrismaService) {}

  async adicionarPontos(clienteId: string, pontos: number) {
    return (this.prisma.client as any).cliente.update({ where: { id: clienteId }, data: { pontosFidelidade: { increment: pontos }, ultimaVisita: new Date() } });
  }

  async ranking(empresaId: string, limit = 10) {
    return (this.prisma.client as any).cliente.findMany({ where: { empresaId }, select: { id: true, nome: true, pontosFidelidade: true, totalGasto: true, ultimaVisita: true, tag: true }, orderBy: { pontosFidelidade: 'desc' }, take: limit });
  }

  async segmentar(empresaId: string) {
    const clientes = await (this.prisma.client as any).cliente.findMany({ where: { empresaId }, select: { id: true, nome: true, totalGasto: true, ultimaVisita: true } });
    const agora = Date.now(); const dias30 = 30 * 86400000;
    return clientes.map((c:any) => ({
      id: c.id, nome: c.nome,
      segmento: !c.ultimaVisita ? 'novo' : (agora - c.ultimaVisita.getTime()) > dias30 * 3 ? 'inativo' : (agora - c.ultimaVisita.getTime()) > dias30 ? 'em_risco' : 'ativo',
      gasto: Number(c.totalGasto ?? 0),
    })).sort((a:any,b:any) => b.gasto - a.gasto);
  }
}
