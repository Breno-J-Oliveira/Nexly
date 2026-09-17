import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { AgendarPublicoDto } from './dto/agendar-publico.dto';

/** Chave do JSON `empresa.horarios` para cada dia da semana (0=domingo). */
const DIAS_SEMANA = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sab'] as const;

const ABERTURA_PADRAO = 8 * 60;
const FECHAMENTO_PADRAO = 20 * 60;

interface HorarioDia {
  abre?: string;
  fecha?: string;
  aberto?: boolean;
}

/** "HH:MM" em minutos desde a meia-noite; usa o padrão quando o valor é inválido. */
function minutosDoHorario(valor: string | null | undefined, padrao: number): number {
  const match = /^(\d{1,2}):(\d{2})$/.exec((valor ?? '').trim());
  if (!match) return padrao;
  const horas = Number(match[1]);
  const minutos = Number(match[2]);
  if (horas > 23 || minutos > 59) return padrao;
  return horas * 60 + minutos;
}

function formatarHorario(minutosTotais: number): string {
  const horas = Math.floor(minutosTotais / 60);
  const minutos = minutosTotais % 60;
  return `${String(horas).padStart(2, '0')}:${String(minutos).padStart(2, '0')}`;
}

@Injectable()
export class BookingService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Dados públicos da página de agendamento.
   * O front espera `{ empresa: { nome, logo }, horarios }`.
   */
  async getEmpresa(token: string) {
    const empresa = await this.prisma.client.empresa.findUnique({
      where: { bookingToken: token },
      select: { id: true, nome: true, horarios: true },
    });
    if (!empresa) throw new NotFoundException('Pagina de agendamento nao encontrada');
    return {
      empresa: { nome: empresa.nome, logo: null },
      horarios: (empresa.horarios as Record<string, { abre: string; fecha: string }> | null) ?? {},
    };
  }

  /** Empresa do token (uso interno) com os campos de funcionamento. */
  private async carregarEmpresa(token: string) {
    const empresa = await this.prisma.client.empresa.findUnique({
      where: { bookingToken: token },
      select: {
        id: true,
        horarios: true,
        horarioAbertura: true,
        horarioFechamento: true,
        diasFuncionamento: true,
      },
    });
    if (!empresa) throw new NotFoundException('Pagina nao encontrada');
    return empresa;
  }

  async getServicos(token: string) {
    const empresa = await this.prisma.client.empresa.findUnique({ where: { bookingToken: token }, select: { id: true } });
    if (!empresa) throw new NotFoundException('Pagina nao encontrada');
    return this.prisma.client.servico.findMany({ where: { empresaId: empresa.id, ativo: true }, select: { id: true, nome: true, duracaoMin: true, preco: true } });
  }

  async getProfissionais(token: string) {
    const empresa = await this.prisma.client.empresa.findUnique({ where: { bookingToken: token }, select: { id: true } });
    if (!empresa) throw new NotFoundException('Pagina nao encontrada');
    return this.prisma.client.profissional.findMany({
      where: { empresaId: empresa.id, ativo: true },
      select: { id: true, nome: true, especialidade: true, fotoUrl: true },
    });
  }

  /**
   * Expediente do dia em minutos desde a meia-noite; `null` quando a empresa
   * não atende no dia. A fonte de verdade é o JSON `horarios` (editado em
   * Configurações → Horário de Funcionamento); os campos escalares ficam como
   * fallback para empresas que ainda não salvaram o JSON.
   */
  private expedienteDoDia(
    empresa: {
      horarios: unknown;
      horarioAbertura: string | null;
      horarioFechamento: string | null;
      diasFuncionamento: string | null;
    },
    diaSemana: number,
  ): { abreMin: number; fechaMin: number } | null {
    const chaveDia = DIAS_SEMANA[diaSemana];
    const horarios = empresa.horarios as Record<string, HorarioDia> | null;
    const dia =
      horarios && typeof horarios === 'object' && chaveDia ? horarios[chaveDia] : undefined;

    if (dia) {
      if (dia.aberto === false) return null;
      const abreMin = minutosDoHorario(dia.abre, ABERTURA_PADRAO);
      const fechaMin = minutosDoHorario(dia.fecha, FECHAMENTO_PADRAO);
      return fechaMin > abreMin ? { abreMin, fechaMin } : null;
    }

    // Dia não configurado no JSON → mantém o comportamento antigo (campos escalares).
    const dias = (empresa.diasFuncionamento || '1,2,3,4,5,6').split(',').map(Number);
    if (!dias.includes(diaSemana)) return null;
    const abreMin = minutosDoHorario(empresa.horarioAbertura, ABERTURA_PADRAO);
    const fechaMin = minutosDoHorario(empresa.horarioFechamento, FECHAMENTO_PADRAO);
    return fechaMin > abreMin ? { abreMin, fechaMin } : null;
  }

  /**
   * Slots livres de um dia. Quando `profissionalId` não é informado, um slot é
   * considerado livre se **algum** profissional ativo estiver disponível.
   * `duracaoMin` é a duração do serviço escolhido (30 min por padrão), usada
   * para garantir que o slot caiba no expediente e não sobreponha agendamento.
   */
  private async calcularSlots(
    empresa: {
      id: string;
      horarios: unknown;
      horarioAbertura: string | null;
      horarioFechamento: string | null;
      diasFuncionamento: string | null;
    },
    dataStr: string,
    profissionalId?: string,
    duracaoMin = 30,
  ): Promise<string[]> {
    const data = new Date(`${dataStr}T00:00:00`);
    if (Number.isNaN(data.getTime())) throw new BadRequestException('Data invalida');

    const expediente = this.expedienteDoDia(empresa, data.getDay());
    if (!expediente) return [];
    const { abreMin, fechaMin } = expediente;
    const duracao = duracaoMin > 0 ? duracaoMin : 30;

    // Profissional informado é sempre validado dentro do tenant do token.
    const profissionais = await this.prisma.client.profissional.findMany({
      where: {
        empresaId: empresa.id,
        ativo: true,
        ...(profissionalId ? { id: profissionalId } : {}),
      },
      select: { id: true },
    });
    if (profissionais.length === 0) return [];

    const inicio = new Date(`${dataStr}T00:00:00`);
    const fim = new Date(`${dataStr}T23:59:59`);
    const ocupados = await this.prisma.client.agendamento.findMany({
      where: {
        empresaId: empresa.id,
        profissionalId: { in: profissionais.map((p) => p.id) },
        dataHora: { gte: inicio, lte: fim },
        status: { in: ['AGENDADO', 'CONFIRMADO'] },
      },
      select: { profissionalId: true, dataHora: true, dataHoraFim: true },
    });

    const slots: string[] = [];
    for (let inicioMin = abreMin; inicioMin + duracao <= fechaMin; inicioMin += 30) {
      const slotInicio = new Date(data);
      slotInicio.setHours(0, inicioMin, 0, 0);
      const slotFim = new Date(slotInicio.getTime() + duracao * 60000);
      const livre = profissionais.some(
        (p) =>
          !ocupados.some(
            (o) => o.profissionalId === p.id && o.dataHora < slotFim && o.dataHoraFim > slotInicio,
          ),
      );
      if (livre) slots.push(formatarHorario(inicioMin));
    }
    return slots;
  }

  /** Duração do serviço validada no tenant do token (30 min quando ausente). */
  private async duracaoDoServico(empresaId: string, servicoId?: string): Promise<number> {
    if (!servicoId) return 30;
    const servico = await this.prisma.client.servico.findFirst({
      where: { id: servicoId, empresaId, ativo: true },
      select: { duracaoMin: true },
    });
    return servico?.duracaoMin ?? 30;
  }

  /** Formato consumido pela página pública: `{ slots }`. */
  async getDisponibilidade(
    token: string,
    dataStr: string,
    profissionalId?: string,
    servicoId?: string,
  ) {
    const empresa = await this.carregarEmpresa(token);
    const duracaoMin = await this.duracaoDoServico(empresa.id, servicoId);
    return { slots: await this.calcularSlots(empresa, dataStr, profissionalId, duracaoMin) };
  }

  async getHorariosDisponiveis(token: string, dataStr: string, profissionalId: string) {
    const empresa = await this.carregarEmpresa(token);
    return this.calcularSlots(empresa, dataStr, profissionalId);
  }

  async agendar(token: string, dto: AgendarPublicoDto) {
    const empresa = await this.carregarEmpresa(token);
    const { servicoId, profissionalId, dataHora, clienteNome, clienteTelefone, clienteEmail } = dto;

    const inicio = new Date(dataHora);
    if (Number.isNaN(inicio.getTime())) throw new BadRequestException('Data/hora invalida');
    if (inicio.getTime() < Date.now()) throw new BadRequestException('Nao e possivel agendar em data passada');

    const servico = await this.prisma.client.servico.findFirst({
      where: { id: servicoId, empresaId: empresa.id, ativo: true },
      select: { id: true, duracaoMin: true },
    });
    if (!servico) throw new NotFoundException('Servico nao encontrado');

    const fim = new Date(inicio.getTime() + servico.duracaoMin * 60000);

    // O agendamento precisa caber no expediente do dia (mesma fonte usada nos slots).
    const expediente = this.expedienteDoDia(empresa, inicio.getDay());
    if (!expediente) throw new BadRequestException('Empresa nao atende nesse dia');
    const abertura = new Date(inicio);
    abertura.setHours(0, expediente.abreMin, 0, 0);
    const fechamento = new Date(inicio);
    fechamento.setHours(0, expediente.fechaMin, 0, 0);
    if (inicio < abertura || fim > fechamento) {
      throw new BadRequestException('Horario fora do funcionamento');
    }

    const semConflito = {
      status: { in: ['AGENDADO' as const, 'CONFIRMADO' as const] },
      dataHora: { lt: fim },
      dataHoraFim: { gt: inicio },
    };

    // O profissional escolhido é sempre validado dentro do tenant do token —
    // sem isso seria possível agendar referenciando profissional de outra empresa.
    let profissionalEscolhido = profissionalId ?? null;
    if (profissionalEscolhido) {
      const profissional = await this.prisma.client.profissional.findFirst({
        where: { id: profissionalEscolhido, empresaId: empresa.id, ativo: true },
        select: { id: true },
      });
      if (!profissional) throw new NotFoundException('Profissional nao encontrado');
    } else {
      // "Qualquer profissional": escolhe o primeiro livre no horário.
      const livre = await this.prisma.client.profissional.findFirst({
        where: { empresaId: empresa.id, ativo: true, agendamentos: { none: semConflito } },
        select: { id: true },
        orderBy: { nome: 'asc' },
      });
      if (!livre) throw new ConflictException('Horario ja ocupado');
      profissionalEscolhido = livre.id;
    }

    const conflito = await this.prisma.client.agendamento.findFirst({
      where: { empresaId: empresa.id, profissionalId: profissionalEscolhido, ...semConflito },
      select: { id: true },
    });
    if (conflito) throw new ConflictException('Horario ja ocupado');

    // Find or create cliente
    const telefone = clienteTelefone.replace(/\D/g, '');
    let cliente = await this.prisma.client.cliente.findFirst({
      where: { empresaId: empresa.id, telefone },
      select: { id: true },
    });
    if (!cliente) {
      cliente = await this.prisma.client.cliente.create({
        data: { empresaId: empresa.id, nome: clienteNome, telefone, email: clienteEmail || null },
        select: { id: true },
      });
    }

    const agendamento = await this.prisma.client.agendamento.create({
      data: {
        empresaId: empresa.id,
        clienteId: cliente.id,
        profissionalId: profissionalEscolhido,
        servicoId: servico.id,
        dataHora: inicio,
        dataHoraFim: fim,
      },
      select: { id: true },
    });

    return { ok: true, agendamentoId: agendamento.id, mensagem: 'Agendamento confirmado!' };
  }
}
