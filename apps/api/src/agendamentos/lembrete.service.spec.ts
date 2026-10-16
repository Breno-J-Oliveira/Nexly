import { Logger } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { WhatsAppService } from '../whatsapp/whatsapp.service';
import { LembreteService } from './lembrete.service';

describe('lembrete manual: empresa e dia local explícitos', () => {
  const prisma = {
    empresa: { findUniqueOrThrow: jest.fn() },
    agendamento: { findMany: jest.fn() },
  };
  const whatsapp = { sendAppointmentReminder: jest.fn() };
  const appointment = {
    dataHora: new Date('2026-10-16T14:00:00Z'),
    cliente: { nome: 'Cliente', telefone: '(11) 99999-1234' },
    profissional: { nome: 'Profissional' },
    servico: { nome: 'Serviço' },
  };
  let service: LembreteService;

  beforeEach(() => {
    jest.resetAllMocks();
    jest.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
    prisma.empresa.findUniqueOrThrow.mockResolvedValue({ fusoHorario: 'America/Manaus' });
    prisma.agendamento.findMany.mockResolvedValue([appointment]);
    whatsapp.sendAppointmentReminder.mockResolvedValue(true);
    service = new LembreteService(
      { client: prisma } as unknown as PrismaService,
      whatsapp as unknown as WhatsAppService,
    );
  });
  afterEach(() => jest.restoreAllMocks());

  it('seleciona somente a empresa e o dia solicitado, passando o fuso para o envio', async () => {
    expect(await service.enviarLembretesManualmente('2026-10-16', 'empresa-a')).toEqual({
      total: 1,
      enviados: 1,
      falhas: 0,
    });
    expect(prisma.empresa.findUniqueOrThrow).toHaveBeenCalledWith({
      where: { id: 'empresa-a' },
      select: { fusoHorario: true },
    });
    expect(prisma.agendamento.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          empresaId: 'empresa-a',
          dataHora: { gte: new Date('2026-10-16T04:00:00Z'), lt: new Date('2026-10-17T04:00:00Z') },
          status: { in: ['AGENDADO', 'CONFIRMADO'] },
        },
      }),
    );
    expect(whatsapp.sendAppointmentReminder).toHaveBeenCalledWith(
      expect.objectContaining({
        dateTime: '2026-10-16T14:00:00.000Z',
      }),
      'America/Manaus',
    );
  });

  it('contabiliza telefone ausente como falha sem solicitar envio', async () => {
    prisma.agendamento.findMany.mockResolvedValue([
      {
        ...appointment,
        cliente: { nome: 'Cliente', telefone: null },
      },
    ]);
    expect(await service.enviarLembretesManualmente('2026-10-16', 'empresa-a')).toEqual({
      total: 1,
      enviados: 0,
      falhas: 1,
    });
    expect(whatsapp.sendAppointmentReminder).not.toHaveBeenCalled();
  });

  it('rejeita dia inexistente antes de consultar agendamentos', async () => {
    await expect(service.enviarLembretesManualmente('2026-02-30', 'empresa-a')).rejects.toThrow(
      'Data inválida',
    );
    expect(prisma.agendamento.findMany).not.toHaveBeenCalled();
    expect(whatsapp.sendAppointmentReminder).not.toHaveBeenCalled();
  });
});
