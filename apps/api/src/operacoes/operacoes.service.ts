import { isUUID } from 'class-validator';
import { bloquearAgenda } from '../database/agenda-lock';
import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import {
  AutomacaoDto,
  CampanhaDto,
  ConsentimentoDto,
  DocumentoDto,
  FilialDto,
  RecorrenciaDto,
  TarefaDto,
} from './operacoes.dto';

export function datasRecorrentes(inicio: Date, intervaloDias: number, quantidade: number): Date[] {
  return Array.from(
    { length: quantidade },
    (_, i) => new Date(inicio.getTime() + i * intervaloDias * 86400000),
  );
}
export function proximaExecucao(inicio: Date, intervaloDias: number, agora: Date): Date {
  const periodo = intervaloDias * 86400000;
  return new Date(
    inicio.getTime() + (Math.floor((agora.getTime() - inicio.getTime()) / periodo) + 1) * periodo,
  );
}
export function telefoneWhatsApp(telefone: string | null): string | null {
  const digits = (telefone || '').replace(/\D/g, '');
  if (/^\d{10,11}$/.test(digits)) return `55${digits}`;
  if (/^55\d{10,11}$/.test(digits)) return digits;
  return null;
}
@Injectable()
export class OperacoesService implements OnModuleInit, OnModuleDestroy {
  private timer?: ReturnType<typeof setInterval>;
  private running = false;
  private readonly logger = new Logger(OperacoesService.name);
  constructor(private readonly prisma: PrismaService) {}
  onModuleInit() {
    this.timer = setInterval(() => {
      void this.processarAutomacoes().catch(() =>
        this.logger.error('Falha ao processar automacoes; nova tentativa no proximo ciclo'),
      );
    }, 60000);
    this.timer.unref();
  }
  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }
  async opcoes(empresaId: string, busca = '') {
    const [usuarios, filiais, clientes, profissionais, servicos] = await Promise.all([
      this.prisma.client.usuario.findMany({
        where: { empresaId, ativo: true },
        select: { id: true, nome: true },
        orderBy: { nome: 'asc' },
        take: 200,
      }),
      this.prisma.client.filial.findMany({
        where: { empresaId, ativa: true },
        orderBy: { nome: 'asc' },
        take: 200,
      }),
      this.prisma.client.cliente.findMany({
        where: {
          empresaId,
          ativo: true,
          ...(busca ? { nome: { contains: busca, mode: 'insensitive' as const } } : {}),
        },
        select: { id: true, nome: true },
        orderBy: { nome: 'asc' },
        take: 100,
      }),
      this.prisma.client.profissional.findMany({
        where: { empresaId, ativo: true },
        select: { id: true, nome: true },
        orderBy: { nome: 'asc' },
        take: 200,
      }),
      this.prisma.client.servico.findMany({
        where: { empresaId, ativo: true },
        select: { id: true, nome: true },
        orderBy: { nome: 'asc' },
        take: 200,
      }),
    ]);
    return { usuarios, filiais, clientes, profissionais, servicos };
  }
  private async responsavel(empresaId: string, id?: string | null) {
    if (
      id &&
      !(await this.prisma.client.usuario.findFirst({ where: { id, empresaId, ativo: true } }))
    )
      throw new BadRequestException('Responsavel indisponivel');
  }
  async tarefas(empresaId: string, page: number, status?: string, filialId?: string) {
    if (status && !['PENDENTE', 'EM_ANDAMENTO', 'CONCLUIDA'].includes(status))
      throw new BadRequestException('Situacao invalida');
    if (filialId && !isUUID(filialId)) throw new BadRequestException('Filial invalida');
    const where = { empresaId, ...(status ? { status } : {}), ...(filialId ? { filialId } : {}) };
    const [data, total] = await Promise.all([
      this.prisma.client.tarefa.findMany({
        where,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        skip: (page - 1) * 50,
        take: 50,
      }),
      this.prisma.client.tarefa.count({ where }),
    ]);
    return { data, total, page, limit: 50 };
  }
  async salvarTarefa(empresaId: string, dto: TarefaDto, id?: string) {
    const anterior = id
      ? await this.prisma.client.tarefa.findFirst({ where: { id, empresaId } })
      : null;
    if (id && !anterior) throw new NotFoundException('Tarefa nao encontrada');
    if (dto.responsavelId !== anterior?.responsavelId)
      await this.responsavel(empresaId, dto.responsavelId);
    if (
      dto.filialId &&
      dto.filialId !== anterior?.filialId &&
      !(await this.prisma.client.filial.findFirst({
        where: { empresaId, id: dto.filialId, ativa: true },
      }))
    )
      throw new BadRequestException('Filial indisponivel');
    const data = {
      ...dto,
      empresaId,
      prazo: dto.prazo ? new Date(dto.prazo) : null,
      responsavelId: dto.responsavelId || null,
      filialId: dto.filialId || null,
    };
    if (!id) return this.prisma.client.tarefa.create({ data });
    const result = await this.prisma.client.tarefa.updateMany({ where: { empresaId, id }, data });
    if (!result.count) throw new NotFoundException('Tarefa nao encontrada');
    return { ok: true };
  }
  async excluirTarefa(empresaId: string, id: string) {
    const result = await this.prisma.client.tarefa.deleteMany({ where: { empresaId, id } });
    if (!result.count) throw new NotFoundException('Tarefa nao encontrada');
    return { ok: true };
  }
  async filiais(empresaId: string, page: number) {
    const where = { empresaId };
    const [data, total] = await Promise.all([
      this.prisma.client.filial.findMany({
        where,
        orderBy: [{ nome: 'asc' }, { id: 'asc' }],
        take: 50,
        skip: (page - 1) * 50,
      }),
      this.prisma.client.filial.count({ where }),
    ]);
    return { data, total, page, limit: 50 };
  }
  async salvarFilial(empresaId: string, dto: FilialDto, id?: string) {
    if (!id) return this.prisma.client.filial.create({ data: { empresaId, ...dto } });
    const result = await this.prisma.client.filial.updateMany({
      where: { id, empresaId },
      data: dto,
    });
    if (!result.count) throw new NotFoundException('Filial nao encontrada');
    return { ok: true };
  }
  async documentos(empresaId: string, page: number) {
    const where = { empresaId };
    const [data, total] = await Promise.all([
      this.prisma.client.documento.findMany({
        where,
        select: { id: true, titulo: true, categoria: true, versao: true, updatedAt: true },
        orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
        take: 50,
        skip: (page - 1) * 50,
      }),
      this.prisma.client.documento.count({ where }),
    ]);
    return { data, total, page, limit: 50 };
  }
  async documento(empresaId: string, id: string) {
    const doc = await this.prisma.client.documento.findFirst({ where: { id, empresaId } });
    if (!doc) throw new NotFoundException('Documento nao encontrado');
    return doc;
  }
  async salvarDocumento(empresaId: string, dto: DocumentoDto, id?: string) {
    const { versao, ...data } = dto;
    if (!id) return this.prisma.client.documento.create({ data: { empresaId, ...data } });
    if (!versao) throw new BadRequestException('Informe a versao do documento');
    const result = await this.prisma.client.documento.updateMany({
      where: { id, empresaId, versao },
      data: { ...data, versao: { increment: 1 } },
    });
    if (!result.count)
      throw new ConflictException('Documento alterado ou removido. Reabra antes de editar.');
    return { ok: true };
  }
  async excluirDocumento(empresaId: string, id: string) {
    const result = await this.prisma.client.documento.deleteMany({ where: { empresaId, id } });
    if (!result.count) throw new NotFoundException('Documento nao encontrado');
    return { ok: true };
  }
  async campanhas(empresaId: string, page: number) {
    const where = { empresaId };
    const [data, total] = await Promise.all([
      this.prisma.client.campanha.findMany({
        where,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        take: 50,
        skip: (page - 1) * 50,
      }),
      this.prisma.client.campanha.count({ where }),
    ]);
    return { data, total, page, limit: 50 };
  }
  async salvarCampanha(empresaId: string, dto: CampanhaDto, id?: string) {
    if (!id) return this.prisma.client.campanha.create({ data: { empresaId, ...dto } });
    const result = await this.prisma.client.campanha.updateMany({
      where: { empresaId, id },
      data: dto,
    });
    if (!result.count) throw new NotFoundException('Campanha nao encontrada');
    return { ok: true };
  }
  async consentimento(empresaId: string, dto: ConsentimentoDto) {
    if (
      !(await this.prisma.client.cliente.findFirst({
        where: { id: dto.clienteId, empresaId, ativo: true },
      }))
    )
      throw new NotFoundException('Cliente nao encontrado');
    return this.prisma.client.consentimentoMarketing.upsert({
      where: { empresaId_clienteId: { empresaId, clienteId: dto.clienteId } },
      create: { empresaId, ...dto },
      update: { autorizado: dto.autorizado, evidencia: dto.evidencia },
    });
  }
  async contatosMarketing(empresaId: string, id: string, page: number) {
    const campanha = await this.prisma.client.campanha.findFirst({ where: { id, empresaId } });
    if (!campanha) throw new NotFoundException('Campanha nao encontrada');
    if (campanha.status !== 'ATIVA')
      throw new BadRequestException('Ative a campanha para preparar os contatos');
    const where = { empresaId, autorizado: true };
    const [consentimentos, total] = await Promise.all([
      this.prisma.client.consentimentoMarketing.findMany({
        where,
        orderBy: { id: 'asc' },
        take: 50,
        skip: (page - 1) * 50,
      }),
      this.prisma.client.consentimentoMarketing.count({ where }),
    ]);
    const clientes = await this.prisma.client.cliente.findMany({
      where: { empresaId, ativo: true, id: { in: consentimentos.map((c) => c.clienteId) } },
      select: { id: true, nome: true, telefone: true },
    });
    return {
      data: clientes.map((c) => ({
        id: c.id,
        nome: c.nome,
        url: telefoneWhatsApp(c.telefone)
          ? `https://wa.me/${telefoneWhatsApp(c.telefone)}?text=${encodeURIComponent(campanha.mensagem.replaceAll('{nome}', c.nome))}`
          : null,
      })),
      total,
      page,
      limit: 50,
    };
  }
  async automacoes(empresaId: string, page: number) {
    const where = { empresaId };
    const [data, total] = await Promise.all([
      this.prisma.client.automacao.findMany({
        where,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        take: 50,
        skip: (page - 1) * 50,
      }),
      this.prisma.client.automacao.count({ where }),
    ]);
    return { data, total, page, limit: 50 };
  }
  async salvarAutomacao(empresaId: string, dto: AutomacaoDto, id?: string) {
    const anterior = id
      ? await this.prisma.client.automacao.findFirst({ where: { id, empresaId } })
      : null;
    if (id && !anterior) throw new NotFoundException('Automacao nao encontrada');
    if (dto.responsavelId !== anterior?.responsavelId)
      await this.responsavel(empresaId, dto.responsavelId);
    if (dto.ativa && new Date(dto.proximaExecucao).getTime() < Date.now() - 60000)
      throw new BadRequestException('A proxima execucao deve estar no futuro');
    const data = {
      ...dto,
      proximaExecucao: new Date(dto.proximaExecucao),
      responsavelId: dto.responsavelId || null,
    };
    if (!id) return this.prisma.client.automacao.create({ data: { empresaId, ...data } });
    const result = await this.prisma.client.automacao.updateMany({
      where: { empresaId, id },
      data,
    });
    if (!result.count) throw new NotFoundException('Automacao nao encontrada');
    return { ok: true };
  }
  async processarAutomacoes(empresaId?: string, agora = new Date()) {
    if (this.running) return { criadas: 0 };
    this.running = true;
    try {
      const automacoes = await this.prisma.client.automacao.findMany({
        where: {
          ...(empresaId ? { empresaId } : {}),
          ativa: true,
          proximaExecucao: { lte: agora },
        },
        orderBy: { proximaExecucao: 'asc' },
        take: 100,
      });
      let criadas = 0;
      for (const a of automacoes) {
        const empresa = await this.prisma.client.empresa.findFirst({
          where: { id: a.empresaId },
          select: { modulos: true },
        });
        if (!empresa?.modulos.includes('automacao')) continue;
        await this.prisma.client.$transaction(async (tx) => {
          const result = await tx.automacao.updateMany({
            where: {
              id: a.id,
              empresaId: a.empresaId,
              ativa: true,
              proximaExecucao: a.proximaExecucao,
            },
            data: {
              ultimaExecucao: agora,
              proximaExecucao: proximaExecucao(a.proximaExecucao, a.intervaloDias, agora),
            },
          });
          if (!result.count) return;
          const responsavel = a.responsavelId
            ? await tx.usuario.findFirst({
                where: { id: a.responsavelId, empresaId: a.empresaId, ativo: true },
                select: { id: true },
              })
            : null;
          await tx.tarefa.create({
            data: {
              empresaId: a.empresaId,
              titulo: a.titulo,
              descricao: a.descricao,
              responsavelId: responsavel?.id,
              automacaoId: a.id,
              ocorrencia: a.proximaExecucao,
              prazo: agora,
            },
          });
          criadas++;
        });
      }
      return { criadas };
    } finally {
      this.running = false;
    }
  }
  async recorrencias(empresaId: string, page: number) {
    const where = { empresaId };
    const [data, total] = await Promise.all([
      this.prisma.client.recorrencia.findMany({
        where,
        include: {
          agendamentos: {
            select: { id: true, dataHora: true, status: true },
            orderBy: { dataHora: 'asc' },
          },
        },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        take: 50,
        skip: (page - 1) * 50,
      }),
      this.prisma.client.recorrencia.count({ where }),
    ]);
    return { data, total, page, limit: 50 };
  }
  async criarRecorrencia(empresaId: string, dto: RecorrenciaDto) {
    const inicio = new Date(dto.inicio);
    if (inicio.getTime() <= Date.now())
      throw new BadRequestException('O inicio deve estar no futuro');
    return this.prisma.client.$transaction(async (tx) => {
      // Mesmo bloqueio usado por agendamentos individuais; parametros nunca concatenados em SQL.
      await bloquearAgenda(tx, dto.profissionalId);
      const [cliente, profissional, servico] = await Promise.all([
        tx.cliente.findFirst({ where: { empresaId, id: dto.clienteId, ativo: true } }),
        tx.profissional.findFirst({ where: { empresaId, id: dto.profissionalId, ativo: true } }),
        tx.servico.findFirst({ where: { empresaId, id: dto.servicoId, ativo: true } }),
      ]);
      if (!cliente || !profissional || !servico)
        throw new BadRequestException('Cliente, profissional ou servico indisponivel');
      const datas = datasRecorrentes(inicio, dto.intervaloDias, dto.quantidade);
      const duracao = servico.duracaoMin * 60000;
      if (duracao >= dto.intervaloDias * 86400000)
        throw new BadRequestException('A duracao deve ser menor que o intervalo');
      const conflito = await tx.agendamento.findFirst({
        where: {
          empresaId,
          profissionalId: dto.profissionalId,
          status: { in: ['AGENDADO', 'CONFIRMADO'] },
          OR: datas.map((dataHora) => ({
            dataHora: { lt: new Date(dataHora.getTime() + duracao) },
            dataHoraFim: { gt: dataHora },
          })),
        },
      });
      if (conflito)
        throw new ConflictException(
          `Conflito em ${conflito.dataHora.toISOString()}. Nenhum horario foi criado.`,
        );
      const serie = await tx.recorrencia.create({
        data: {
          empresaId,
          titulo: dto.titulo,
          inicio,
          intervaloDias: dto.intervaloDias,
          quantidade: dto.quantidade,
        },
      });
      await tx.agendamento.createMany({
        data: datas.map((dataHora) => ({
          empresaId,
          clienteId: dto.clienteId,
          profissionalId: dto.profissionalId,
          servicoId: dto.servicoId,
          recorrenciaId: serie.id,
          dataHora,
          dataHoraFim: new Date(dataHora.getTime() + duracao),
        })),
      });
      return serie;
    });
  }
  async cancelarRecorrencia(empresaId: string, id: string) {
    return this.prisma.client.$transaction(async (tx) => {
      const result = await tx.recorrencia.updateMany({
        where: { empresaId, id },
        data: { cancelada: true },
      });
      if (!result.count) throw new NotFoundException('Serie nao encontrada');
      const cancelados = await tx.agendamento.updateMany({
        where: {
          empresaId,
          recorrenciaId: id,
          dataHora: { gt: new Date() },
          status: { in: ['AGENDADO', 'CONFIRMADO'] },
        },
        data: { status: 'CANCELADO' },
      });
      return { cancelados: cancelados.count };
    });
  }
}
