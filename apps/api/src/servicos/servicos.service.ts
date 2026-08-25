import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { AssociarInsumoDto } from './dto/associar-insumo.dto';
import { AtualizarServicoDto } from './dto/atualizar-servico.dto';
import { CriarServicoDto } from './dto/criar-servico.dto';

@Injectable()
export class ServicosService {
  constructor(private readonly prisma: PrismaService) {}

  listar() {
    return this.prisma.client.servico.findMany({
      where: { ativo: true },
      orderBy: { nome: 'asc' },
    });
  }

  async obter(id: string) {
    const servico = await this.prisma.client.servico.findFirst({
      where: { id, ativo: true },
      include: {
        insumos: { include: { produto: true } },
      },
    });
    if (!servico) {
      throw new NotFoundException('Serviço não encontrado');
    }
    return servico;
  }

  criar(dto: CriarServicoDto) {
    return this.prisma.client.servico.create({
      data: {
        nome: dto.nome,
        duracaoMin: dto.duracaoMin,
        preco: dto.preco,
      } as Prisma.ServicoUncheckedCreateInput,
    });
  }

  async atualizar(id: string, dto: AtualizarServicoDto) {
    await this.obter(id);
    await this.prisma.client.servico.updateMany({
      where: { id },
      data: { nome: dto.nome, duracaoMin: dto.duracaoMin, preco: dto.preco },
    });
    return this.obter(id);
  }

  async desativar(id: string) {
    await this.obter(id);

    const futuros = await this.prisma.client.agendamento.count({
      where: {
        servicoId: id,
        status: { in: ['AGENDADO', 'CONFIRMADO'] },
        dataHora: { gte: new Date() },
      },
    });
    if (futuros > 0) {
      throw new ConflictException(
        'Não é possível desativar: existem agendamentos futuros para este serviço',
      );
    }

    await this.prisma.client.servico.updateMany({
      where: { id },
      data: { ativo: false },
    });
    return { success: true };
  }

  // ── Insumos por serviço ──────────────────────────────────

  async listarInsumos(servicoId: string) {
    await this.obter(servicoId);
    return this.prisma.client.insumoServico.findMany({
      where: { servicoId },
      include: { produto: true },
      orderBy: { produto: { nome: 'asc' } },
    });
  }

  async associarInsumo(servicoId: string, dto: AssociarInsumoDto) {
    await this.obter(servicoId);

    const produto = await this.prisma.client.produto.findFirst({
      where: { id: dto.produtoId, ativo: true },
    });
    if (!produto) {
      throw new NotFoundException('Produto não encontrado');
    }

    return this.prisma.client.insumoServico.upsert({
      where: { servicoId_produtoId: { servicoId, produtoId: dto.produtoId } },
      create: { servicoId, produtoId: dto.produtoId, quantidade: dto.quantidade },
      update: { quantidade: dto.quantidade },
      include: { produto: true },
    });
  }

  async removerInsumo(servicoId: string, produtoId: string) {
    await this.prisma.client.insumoServico.deleteMany({
      where: { servicoId, produtoId },
    });
    return { success: true };
  }
}
