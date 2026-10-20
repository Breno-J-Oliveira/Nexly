import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { professionalQuota, PLAN_NAMES } from '@nexly/shared';
import { calendarRange } from '../common/validation/calendar-range';
import { Plano } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { getTenantIdOrFail } from '../database/tenant-context';
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

  async limites() {
    const empresaId = getTenantIdOrFail();
    const [empresa, ativos] = await Promise.all([
      this.prisma.client.empresa.findUniqueOrThrow({
        where: { id: empresaId },
        select: { plano: true },
      }),
      this.prisma.client.profissional.count({ where: { empresaId, ativo: true } }),
    ]);
    return professionalQuota(empresa.plano, ativos);
  }

  async criar(dto: CriarProfissionalDto) {
    const empresaId = getTenantIdOrFail();
    return this.prisma.client.$transaction(
      async (tx) => {
        // O lock serializa os cadastros e as mudanças de plano desta empresa.
        // O identificador vem do contexto autenticado, nunca do corpo do pedido.
        const [empresa] = await tx.$queryRaw<{ plano: Plano }[]>`
        SELECT "plano" FROM "empresas" WHERE "id" = ${empresaId} FOR UPDATE
      `;
        if (!empresa) throw new NotFoundException('Empresa não encontrada');
        const ativos = await tx.profissional.count({ where: { empresaId, ativo: true } });
        const quota = professionalQuota(empresa.plano, ativos);
        if (!quota.podeAdicionar) {
          throw new ForbiddenException({
            code: 'PROFESSIONAL_LIMIT_REACHED',
            message: `O plano ${PLAN_NAMES[empresa.plano]} permite até ${quota.limite} ${quota.limite === 1 ? 'profissional ativo' : 'profissionais ativos'}. Desative um cadastro ou altere o plano para adicionar outro.`,
          });
        }
        return tx.profissional.create({
          data: { empresaId, nome: dto.nome, especialidade: dto.especialidade },
        });
      },
      { maxWait: 5000, timeout: 10000 },
    );
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
  async disponibilidade(id: string, data?: string, inicio?: string, fim?: string) {
    const periodo = calendarRange({ data, inicio, fim });
    if (!periodo) throw new BadRequestException('Informe a data ou o período');
    const profissional = await this.prisma.client.profissional.findFirst({
      where: { id, ativo: true },
      select: { id: true },
    });
    if (!profissional) throw new NotFoundException('Profissional não encontrado');

    const agendamentos = await this.prisma.client.agendamento.findMany({
      where: {
        profissionalId: id,
        status: { in: ['AGENDADO', 'CONFIRMADO'] },
        dataHora: { gte: periodo.inicio, lte: periodo.fim },
      },
      select: { dataHora: true, dataHoraFim: true },
      orderBy: { dataHora: 'asc' },
    });

    return agendamentos.map((a) => ({ inicio: a.dataHora, fim: a.dataHoraFim }));
  }
}
