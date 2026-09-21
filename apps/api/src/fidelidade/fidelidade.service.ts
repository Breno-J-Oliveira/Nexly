import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class FidelidadeService {
  constructor(private readonly prisma: PrismaService) {}

  async adicionarPontos(empresaId: string, clienteId: string, pontos: number) {
    const cliente = await this.prisma.client.cliente.findFirst({
      where: { id: clienteId, empresaId },
      select: { id: true },
    });
    if (!cliente) throw new NotFoundException('Cliente nao encontrado');
    if (pontos < 0) throw new BadRequestException('Pontos nao podem ser negativos');
    return this.prisma.client.cliente.updateMany({
      where: { id: clienteId, empresaId },
      data: { pontosFidelidade: { increment: pontos }, ultimaVisita: new Date() },
    });
  }

  async ranking(empresaId: string, limit = 10) {
    return this.prisma.client.cliente.findMany({
      where: { empresaId },
      select: {
        id: true,
        nome: true,
        pontosFidelidade: true,
        totalGasto: true,
        ultimaVisita: true,
        tag: true,
      },
      orderBy: { pontosFidelidade: 'desc' },
      take: limit,
    });
  }

  async segmentar(empresaId: string) {
    const clientes = await this.prisma.client.cliente.findMany({
      where: { empresaId },
      select: { id: true, nome: true, totalGasto: true, ultimaVisita: true },
    });
    const agora = Date.now();
    const dias30 = 30 * 86400000;
    return clientes
      .map((c) => ({
        id: c.id,
        nome: c.nome,
        segmento: !c.ultimaVisita
          ? 'novo'
          : agora - c.ultimaVisita.getTime() > dias30 * 3
            ? 'inativo'
            : agora - c.ultimaVisita.getTime() > dias30
              ? 'em_risco'
              : 'ativo',
        gasto: Number(c.totalGasto ?? 0),
      }))
      .sort((a, b) => b.gasto - a.gasto);
  }
}
