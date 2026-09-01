import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class BookingService {
  constructor(private readonly prisma: PrismaService) {}

  async getEmpresa(token: string) {
    const empresa = await this.prisma.client.empresa.findUnique({ where: { bookingToken: token }, select: { id: true, nome: true, horarioAbertura: true, horarioFechamento: true, diasFuncionamento: true } });
    if (!empresa) throw new NotFoundException('Pagina de agendamento nao encontrada');
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
    return this.prisma.client.profissional.findMany({ where: { empresaId: empresa.id, ativo: true }, select: { id: true, nome: true, fotoUrl: true } });
  }

  async getHorariosDisponiveis(token: string, dataStr: string, profissionalId: string) {
    const empresa = await this.prisma.client.empresa.findUnique({ where: { bookingToken: token }, select: { id: true, horarioAbertura: true, horarioFechamento: true, diasFuncionamento: true } });
    if (!empresa) throw new NotFoundException('Pagina nao encontrada');

    const data = new Date(dataStr + 'T00:00:00');
    const diaSemana = data.getDay(); // 0=dom, 1=seg
    const dias = (empresa.diasFuncionamento || '1,2,3,4,5,6').split(',').map(Number);
    if (!dias.includes(diaSemana)) return [];

    const inicioHora = parseInt(empresa.horarioAbertura || '08:00', 10);
    const fimHora = parseInt(empresa.horarioFechamento || '20:00', 10);

    // Buscar agendamentos existentes para este dia + profissional
    const inicio = new Date(dataStr + 'T00:00:00');
    const fim = new Date(dataStr + 'T23:59:59');
    const ocupados = await this.prisma.client.agendamento.findMany({
      where: { empresaId: empresa.id, profissionalId, dataHora: { gte: inicio, lte: fim }, status: { in: ['AGENDADO', 'CONFIRMADO'] } },
      select: { dataHora: true, dataHoraFim: true },
    });

    const slots: string[] = [];
    for (let h = inicioHora; h < fimHora; h++) {
      for (let m = 0; m < 60; m += 30) {
        const slotInicio = new Date(data); slotInicio.setHours(h, m, 0, 0);
        const slotFim = new Date(slotInicio.getTime() + 30 * 60000);
        const conflito = ocupados.some(o => o.dataHora < slotFim && o.dataHoraFim > slotInicio);
        if (!conflito) slots.push(`${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`);
      }
    }
    return slots;
  }

  async agendar(token: string, body: any) {
    const empresa = await this.prisma.client.empresa.findUnique({ where: { bookingToken: token }, select: { id: true } });
    if (!empresa) throw new NotFoundException('Pagina nao encontrada');

    const { servicoId, profissionalId, dataHora, clienteNome, clienteTelefone, clienteEmail } = body;
    if (!servicoId || !profissionalId || !dataHora || !clienteNome || !clienteTelefone) {
      throw new BadRequestException('Todos os campos obrigatorios devem ser preenchidos');
    }

    const servico = await this.prisma.client.servico.findFirst({ where: { id: servicoId, empresaId: empresa.id } });
    if (!servico) throw new NotFoundException('Servico nao encontrado');

    // Find or create cliente
    let cliente = await this.prisma.client.cliente.findFirst({ where: { empresaId: empresa.id, telefone: clienteTelefone.replace(/\D/g,'') } });
    if (!cliente) {
      cliente = await this.prisma.client.cliente.create({ data: { empresaId: empresa.id, nome: clienteNome, telefone: clienteTelefone.replace(/\D/g,''), email: clienteEmail || null } });
    }

    const inicio = new Date(dataHora);
    const fim = new Date(inicio.getTime() + servico.duracaoMin * 60000);

    // Check conflict
    const conflito = await this.prisma.client.agendamento.findFirst({
      where: { empresaId: empresa.id, profissionalId, status: { in: ['AGENDADO','CONFIRMADO'] }, dataHora: { lt: fim }, dataHoraFim: { gt: inicio } },
    });
    if (conflito) throw new ConflictException('Horario ja ocupado');

    const agendamento = await this.prisma.client.agendamento.create({
      data: { empresaId: empresa.id, clienteId: cliente.id, profissionalId, servicoId, dataHora: inicio, dataHoraFim: fim },
      include: { cliente: true, profissional: true, servico: true },
    });

    return { ok: true, agendamento };
  }
}
