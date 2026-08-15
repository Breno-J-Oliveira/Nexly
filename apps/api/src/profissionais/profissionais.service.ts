import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { AtualizarProfissionalDto } from './dto/atualizar-profissional.dto';
import { CriarProfissionalDto } from './dto/criar-profissional.dto';

@Injectable()
export class ProfissionaisService {
  constructor(private readonly prisma: PrismaService) {}

  listar() {
    return this.prisma.client.profissional.findMany({
      where: { ativo: true },
      orderBy: { nome: 'asc' },
    });
  }

  async obter(id: string) {
    const profissional = await this.prisma.client.profissional.findFirst({
      where: { id, ativo: true },
      include: {
        agendamentos: {
          where: { status: { in: ['AGENDADO', 'CONFIRMADO'] } },
          include: { servico: true },
          orderBy: { dataHora: 'asc' },
        },
      },
    });
    if (!profissional) {
      throw new NotFoundException('Profissional não encontrado');
    }
    return profissional;
  }

  criar(dto: CriarProfissionalDto) {
    return this.prisma.client.profissional.create({
      data: { nome: dto.nome, especialidade: dto.especialidade },
    });
  }

  async atualizar(id: string, dto: AtualizarProfissionalDto) {
    await this.obter(id);
    await this.prisma.client.profissional.updateMany({
      where: { id },
      data: { nome: dto.nome, especialidade: dto.especialidade },
    });
    return this.obter(id);
  }

  async desativar(id: string) {
    await this.obter(id);
    await this.prisma.client.profissional.updateMany({
      where: { id },
      data: { ativo: false },
    });
    return { success: true };
  }

  /**
   * Retorna os intervalos ocupados de um profissional em uma data
   * (agendamentos AGENDADO/CONFIRMADO), para o frontend desabilitar
   * horários indisponíveis no modal de agendamento.
   */
  async disponibilidade(id: string, data: string) {
    const inicio = new Date(`${data}T00:00:00.000Z`);
    const fim = new Date(`${data}T23:59:59.999Z`);

    const agendamentos = await this.prisma.client.agendamento.findMany({
      where: {
        profissionalId: id,
        status: { in: ['AGENDADO', 'CONFIRMADO'] },
        dataHora: { gte: inicio, lte: fim },
      },
      select: { dataHora: true, dataHoraFim: true },
      orderBy: { dataHora: 'asc' },
    });

    return agendamentos.map((a) => ({ inicio: a.dataHora, fim: a.dataHoraFim }));
  }
}
