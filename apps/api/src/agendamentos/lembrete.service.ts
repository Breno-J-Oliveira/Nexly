import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { WhatsAppService } from '../whatsapp/whatsapp.service';

@Injectable()
export class LembreteService {
  private readonly logger = new Logger(LembreteService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly whatsapp: WhatsAppService,
  ) {}

  async enviarLembretesManualmente(data: string): Promise<{ total: number; enviados: number; falhas: number }> {
    const inicio = new Date(data); inicio.setHours(0,0,0,0);
    const fim = new Date(data); fim.setHours(23,59,59,999);

    const agendamentos = await this.prisma.client.agendamento.findMany({
      where: { dataHora: { gte: inicio, lte: fim }, status: { in: ['AGENDADO', 'CONFIRMADO'] } },
      include: { cliente: { select: { nome: true, telefone: true } }, profissional: { select: { nome: true } }, servico: { select: { nome: true } } },
    });

    let enviados = 0, falhas = 0;
    for (const ag of agendamentos) {
      if (!ag.cliente.telefone) continue;
      const ok = await this.whatsapp.sendAppointmentReminder({ phone: ag.cliente.telefone, clientName: ag.cliente.nome, professionalName: ag.profissional.nome, serviceName: ag.servico.nome, dateTime: ag.dataHora.toISOString() });
      if (ok) enviados++; else falhas++;
      await new Promise(r => setTimeout(r, 500));
    }
    this.logger.log(`Lembretes data ${data}: ${enviados} enviados`);
    return { total: agendamentos.length, enviados, falhas };
  }
}
