import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Prisma } from '@prisma/client';
import { StatusAgendamento } from '@nexly/shared';
import { PrismaService } from '../database/prisma.service';
import { CriarAgendamentoDto } from './dto/criar-agendamento.dto';

const TRANSICOES: Record<StatusAgendamento, StatusAgendamento[]> = {
  AGENDADO: ['CONFIRMADO', 'CONCLUIDO', 'CANCELADO'],
  CONFIRMADO: ['CONCLUIDO', 'CANCELADO'],
  CONCLUIDO: [],
  CANCELADO: [],
};

const includeCompleto = {
  cliente: true,
  profissional: true,
  servico: true,
} satisfies Prisma.AgendamentoInclude;

export interface FiltrosAgendamento {
  data?: string;
  profissionalId?: string;
  clienteId?: string;
  status?: StatusAgendamento;
}

@Injectable()
export class AgendamentosService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async listar(page: number, limit: number, filtros: FiltrosAgendamento) {
    const where: Prisma.AgendamentoWhereInput = {};

    if (filtros.data) {
      const inicio = new Date(`${filtros.data}T00:00:00.000Z`);
      const fim = new Date(`${filtros.data}T23:59:59.999Z`);
      where.dataHora = { gte: inicio, lte: fim };
    }
    if (filtros.profissionalId) where.profissionalId = filtros.profissionalId;
    if (filtros.clienteId) where.clienteId = filtros.clienteId;
    if (filtros.status) where.status = filtros.status;

    const [data, total] = await Promise.all([
      this.prisma.client.agendamento.findMany({
        where,
        include: includeCompleto,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { dataHora: 'asc' },
      }),
      this.prisma.client.agendamento.count({ where }),
    ]);

    return { data, total, page, limit };
  }

  async obter(id: string) {
    const agendamento = await this.prisma.client.agendamento.findFirst({
      where: { id },
      include: includeCompleto,
    });
    if (!agendamento) {
      throw new NotFoundException('Agendamento não encontrado');
    }
    return agendamento;
  }

  async criar(dto: CriarAgendamentoDto) {
    const servico = await this.prisma.client.servico.findFirst({
      where: { id: dto.servicoId, ativo: true },
    });
    if (!servico) {
      throw new NotFoundException('Serviço não encontrado');
    }

    const dataHora = new Date(dto.dataHora);
    if (Number.isNaN(dataHora.getTime())) {
      throw new BadRequestException('Data/hora inválida');
    }
    if (dataHora < new Date()) {
      throw new BadRequestException('O horário do agendamento deve ser no futuro');
    }

    const dataHoraFim = new Date(dataHora.getTime() + servico.duracaoMin * 60_000);

    await this.validarConflito(dto.profissionalId, dataHora, dataHoraFim);

    return this.prisma.client.agendamento.create({
      data: {
        clienteId: dto.clienteId,
        profissionalId: dto.profissionalId,
        servicoId: dto.servicoId,
        dataHora,
        dataHoraFim,
      } as Prisma.AgendamentoUncheckedCreateInput,
      include: includeCompleto,
    });
  }

  async atualizarStatus(id: string, novoStatus: StatusAgendamento) {
    const agendamento = await this.obter(id);

    const permitidas = TRANSICOES[agendamento.status] ?? [];
    if (!permitidas.includes(novoStatus)) {
      throw new UnprocessableEntityException(
        `Transição de ${agendamento.status} para ${novoStatus} não é permitida`,
      );
    }

    const atualizado = await this.prisma.client.agendamento.update({
      where: { id },
      data: { status: novoStatus },
      include: includeCompleto,
    });

    // Hook de conclusão — ponto de extensão para a integração com estoque (Fase 4).
    if (novoStatus === StatusAgendamento.CONCLUIDO) {
      this.eventEmitter.emit('agendamento.concluido', {
        agendamentoId: id,
        servicoId: atualizado.servicoId,
      });
    }

    return atualizado;
  }

  private async validarConflito(
    profissionalId: string,
    inicio: Date,
    fim: Date,
    excluirId?: string,
  ): Promise<void> {
    const conflito = await this.prisma.client.agendamento.findFirst({
      where: {
        profissionalId,
        ...(excluirId ? { id: { not: excluirId } } : {}),
        status: { in: [StatusAgendamento.AGENDADO, StatusAgendamento.CONFIRMADO] },
        dataHora: { lt: fim },
        dataHoraFim: { gt: inicio },
      },
    });

    if (conflito) {
      throw new ConflictException('Profissional já tem agendamento nesse horário');
    }
  }
}
