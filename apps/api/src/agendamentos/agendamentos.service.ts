import { calendarRange } from '../common/validation/calendar-range';
import { bloquearAgenda } from '../database/agenda-lock';
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { getTenantIdOrFail } from '../database/tenant-context';
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
  dataFim?: string;
  inicio?: string;
  fim?: string;
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
    if (
      !Number.isInteger(page) ||
      page < 1 ||
      page > 100000 ||
      !Number.isInteger(limit) ||
      limit < 1 ||
      limit > 500
    )
      throw new BadRequestException('Página ou limite inválido (1 a 500 registros por página)');
    const where: Prisma.AgendamentoWhereInput = {};

    const periodo = calendarRange(filtros);
    if (periodo) where.dataHora = { gte: periodo.inicio, lte: periodo.fim };
    if (filtros.status && !Object.values(StatusAgendamento).includes(filtros.status))
      throw new BadRequestException('Status inválido');
    if (filtros.profissionalId) where.profissionalId = filtros.profissionalId;
    if (filtros.clienteId) where.clienteId = filtros.clienteId;
    if (filtros.status) where.status = filtros.status;

    const [data, total] = await Promise.all([
      this.prisma.client.agendamento.findMany({
        where,
        include: includeCompleto,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: [{ dataHora: 'asc' }, { id: 'asc' }],
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
      throw new BadRequestException({ code: 'INVALID_DATETIME', message: 'Data/hora inválida' });
    }
    if (dataHora < new Date()) {
      throw new BadRequestException({
        code: 'DATETIME_IN_PAST',
        message: 'O horário do agendamento deve ser no futuro',
      });
    }

    const dataHoraFim = new Date(dataHora.getTime() + servico.duracaoMin * 60_000);

    const [cliente, profissional] = await Promise.all([
      this.prisma.client.cliente.findFirst({
        where: { id: dto.clienteId, ativo: true },
        select: { id: true },
      }),
      this.prisma.client.profissional.findFirst({
        where: { id: dto.profissionalId, ativo: true },
        select: { id: true },
      }),
    ]);
    if (!cliente) throw new NotFoundException('Cliente não encontrado');
    if (!profissional) throw new NotFoundException('Profissional não encontrado');

    const empresaId = getTenantIdOrFail();
    return this.prisma.client.$transaction(async (tx) => {
      await bloquearAgenda(tx, dto.profissionalId);
      const conflito = await tx.agendamento.findFirst({
        where: {
          empresaId,
          profissionalId: dto.profissionalId,
          status: { in: ['AGENDADO', 'CONFIRMADO'] },
          dataHora: { lt: dataHoraFim },
          dataHoraFim: { gt: dataHora },
        },
      });
      if (conflito)
        throw new ConflictException({
          code: 'BUSY_PROFESSIONAL',
          message: 'Profissional ja tem agendamento nesse horario',
        });
      return tx.agendamento.create({
        data: {
          empresaId,
          clienteId: dto.clienteId,
          profissionalId: dto.profissionalId,
          servicoId: dto.servicoId,
          dataHora,
          dataHoraFim,
        },
        include: includeCompleto,
      });
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

    const changed = await this.prisma.client.agendamento.updateMany({
      where: { id, status: agendamento.status },
      data: { status: novoStatus },
    });
    if (changed.count !== 1) {
      throw new ConflictException(
        'O agendamento foi alterado. Atualize a agenda e tente novamente.',
      );
    }

    const atualizado = await this.prisma.client.agendamento.findFirst({
      where: { id },
      include: includeCompleto,
    });
    if (!atualizado) {
      throw new NotFoundException('Agendamento não encontrado');
    }

    // Hook de conclusão — ponto de extensão para a integração com estoque (Fase 4).
    if (novoStatus === StatusAgendamento.CONCLUIDO) {
      this.eventEmitter.emit('agendamento.concluido', {
        agendamentoId: id,
        servicoId: atualizado.servicoId,
      });
    }

    return atualizado;
  }
}
