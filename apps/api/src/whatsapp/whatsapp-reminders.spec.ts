import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../database/prisma.service';
import { EvolutionProvider } from './providers/evolution.provider';
import { WhatsAppService } from './whatsapp.service';
import { WhatsAppController } from './whatsapp.controller';

describe('lembretes no fuso da empresa e com consultas limitadas', () => {
  const prisma = {
    empresa: { findMany: jest.fn(), findUniqueOrThrow: jest.fn() },
    agendamento: { findMany: jest.fn() },
  };
  const company = (id: string, fusoHorario = 'America/Sao_Paulo', templateLembrete = '') => ({
    id,
    fusoHorario,
    templateLembrete,
  });
  const appointment = (id: string, dateTime = '2026-10-16T14:00:00Z') => ({
    id,
    dataHora: new Date(dateTime),
    cliente: { nome: 'Cliente', telefone: '(11) 99999-1234' },
    profissional: { nome: 'Profissional' },
    servico: { nome: 'Serviço' },
  });
  let service: WhatsAppService;
  let send: jest.SpyInstance;

  beforeEach(() => {
    jest.resetAllMocks();
    jest.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
    service = new WhatsAppService(
      new ConfigService({ WHATSAPP_PROVIDER: 'meta', META_PHONE_ID: 'test', META_API_KEY: 'test' }),
      { client: prisma } as unknown as PrismaService,
      {} as EvolutionProvider,
    );
    // Nenhum provedor externo é chamado nesta suíte.
    send = jest.spyOn(service, 'send').mockResolvedValue(true);
    prisma.empresa.findMany.mockResolvedValue([company('empresa-a')]);
    prisma.agendamento.findMany.mockResolvedValue([]);
  });

  afterEach(() => jest.restoreAllMocks());

  it.each([
    ['America/Sao_Paulo', '2026-10-16T03:00:00Z', '2026-10-17T03:00:00Z', '11:00'],
    ['America/Manaus', '2026-10-16T04:00:00Z', '2026-10-17T04:00:00Z', '10:00'],
    ['America/Rio_Branco', '2026-10-16T05:00:00Z', '2026-10-17T05:00:00Z', '09:00'],
  ])('seleciona amanhã e informa a hora local em %s', async (zone, start, end, hour) => {
    prisma.empresa.findMany.mockResolvedValue([company('empresa-a', zone)]);
    prisma.agendamento.findMany.mockResolvedValue([appointment('a1')]);
    expect(await service.sendDailyReminders(new Date('2026-10-16T02:30:00Z'))).toEqual({
      sent: 1,
      failed: 0,
    });
    expect(prisma.empresa.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { lembretesAtivos: true },
        take: 100,
      }),
    );
    expect(prisma.agendamento.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          empresaId: 'empresa-a',
          dataHora: { gte: new Date(start), lt: new Date(end) },
          status: { in: ['AGENDADO', 'CONFIRMADO'] },
        },
        take: 100,
      }),
    );
    expect(send).toHaveBeenCalledWith(
      expect.objectContaining({
        message: expect.stringContaining(`amanhã às ${hour}`),
      }),
    );
  });

  it('calcula amanhã separadamente quando empresas estão em dias locais diferentes', async () => {
    prisma.empresa.findMany.mockResolvedValue([
      company('empresa-a', 'America/Sao_Paulo'),
      company('empresa-b', 'America/Noronha'),
    ]);
    await service.sendDailyReminders(new Date('2026-10-16T02:30:00Z'));
    expect(prisma.agendamento.findMany.mock.calls.map(([query]) => query.where)).toEqual([
      {
        empresaId: 'empresa-a',
        dataHora: {
          gte: new Date('2026-10-16T03:00:00Z'),
          lt: new Date('2026-10-17T03:00:00Z'),
        },
        status: { in: ['AGENDADO', 'CONFIRMADO'] },
      },
      {
        empresaId: 'empresa-b',
        dataHora: {
          gte: new Date('2026-10-17T02:00:00Z'),
          lt: new Date('2026-10-18T02:00:00Z'),
        },
        status: { in: ['AGENDADO', 'CONFIRMADO'] },
      },
    ]);
  });

  it.each([
    ['2026-12-31T12:00:00Z', '2027-01-01T03:00:00Z', '2027-01-02T03:00:00Z'],
    ['2018-11-03T12:00:00Z', '2018-11-04T03:00:00Z', '2018-11-05T02:00:00Z'],
  ])(
    'preserva limites de ano e dia com horário de verão a partir de %s',
    async (now, start, end) => {
      await service.sendDailyReminders(new Date(now));
      expect(prisma.agendamento.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ dataHora: { gte: new Date(start), lt: new Date(end) } }),
        }),
      );
    },
  );

  it('não consulta agendamentos quando nenhuma empresa habilitou lembretes', async () => {
    prisma.empresa.findMany.mockResolvedValue([]);
    expect(await service.sendDailyReminders()).toEqual({ sent: 0, failed: 0 });
    expect(prisma.agendamento.findMany).not.toHaveBeenCalled();
    expect(send).not.toHaveBeenCalled();
  });

  it('pagina empresas e encerra cada lote antes de buscar o próximo', async () => {
    prisma.empresa.findMany
      .mockResolvedValueOnce(Array.from({ length: 100 }, (_, i) => company(`empresa-${i}`)))
      .mockResolvedValueOnce([company('empresa-100')]);
    await service.sendDailyReminders(new Date('2026-10-16T12:00:00Z'));
    expect(prisma.empresa.findMany).toHaveBeenCalledTimes(2);
    expect(prisma.empresa.findMany).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        cursor: { id: 'empresa-99' },
        skip: 1,
        take: 100,
      }),
    );
    expect(prisma.agendamento.findMany).toHaveBeenCalledTimes(101);
  });

  it('pagina agendamentos sem duplicar o último item e mantém o filtro da empresa', async () => {
    prisma.agendamento.findMany
      .mockResolvedValueOnce(Array.from({ length: 100 }, (_, i) => appointment(`a${i}`)))
      .mockResolvedValueOnce([appointment('a100')]);
    expect(await service.sendDailyReminders()).toEqual({ sent: 101, failed: 0 });
    expect(prisma.agendamento.findMany).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        cursor: { id: 'a99' },
        skip: 1,
        take: 100,
        where: expect.objectContaining({ empresaId: 'empresa-a' }),
      }),
    );
    expect(send).toHaveBeenCalledTimes(101);
  });

  it('contabiliza telefone ausente e recusa do provedor, e continua os outros lembretes', async () => {
    prisma.agendamento.findMany.mockResolvedValue([
      { ...appointment('a1'), cliente: { nome: 'Cliente', telefone: null } },
      appointment('a2'),
      appointment('a3'),
    ]);
    send.mockResolvedValueOnce(false).mockResolvedValueOnce(true);
    expect(await service.sendDailyReminders()).toEqual({ sent: 1, failed: 2 });
    expect(send).toHaveBeenCalledTimes(2);
  });

  it('preserva caracteres especiais nos nomes sem interpretar valores como novos placeholders', async () => {
    prisma.empresa.findMany.mockResolvedValue([
      company('empresa-a', 'America/Manaus', '{{nome}} — {{hora}} — {{servico}}'),
    ]);
    prisma.agendamento.findMany.mockResolvedValue([
      {
        ...appointment('a1'),
        cliente: { nome: '$& {{hora}}', telefone: '(11) 99999-1234' },
      },
    ]);
    await service.sendDailyReminders();
    expect(send).toHaveBeenCalledWith(
      expect.objectContaining({
        message: '$& {{hora}} — 10:00 — Serviço',
      }),
    );
  });

  it('teste manual usa a empresa autenticada e formata inclusive a data no fuso salvo', async () => {
    prisma.empresa.findUniqueOrThrow.mockResolvedValue({ fusoHorario: 'America/Rio_Branco' });
    const controller = new WhatsAppController(service);
    await controller.testReminder(
      {
        phone: '(11) 99999-1234',
        clientName: 'Cliente',
        professionalName: 'Profissional',
        serviceName: 'Serviço',
        dateTime: '2026-10-16T02:30:00Z',
      },
      {
        id: 'u1',
        empresaId: 'empresa-autenticada',
        role: 'ADMIN',
        email: 'test@example.test',
        nome: 'Teste',
      },
    );
    expect(prisma.empresa.findUniqueOrThrow).toHaveBeenCalledWith({
      where: { id: 'empresa-autenticada' },
      select: { fusoHorario: true },
    });
    expect(send).toHaveBeenCalledWith(
      expect.objectContaining({
        message: expect.stringContaining('15 de outubro'),
      }),
    );
    expect(send).toHaveBeenCalledWith(
      expect.objectContaining({
        message: expect.stringContaining('21:30'),
      }),
    );
  });

  it('interrompe o teste manual sem enviar se a empresa não existir', async () => {
    prisma.empresa.findUniqueOrThrow.mockRejectedValue(new Error('Empresa não encontrada'));
    await expect(
      service.sendAppointmentReminderForCompany(
        {
          phone: '(11) 99999-1234',
          clientName: 'Cliente',
          professionalName: 'Profissional',
          serviceName: 'Serviço',
          dateTime: '2026-10-16T14:00:00Z',
        },
        'empresa-inexistente',
      ),
    ).rejects.toThrow('Empresa não encontrada');
    expect(send).not.toHaveBeenCalled();
  });

  it('interpreta horário manual sem offset como horário do estabelecimento', async () => {
    await service.sendAppointmentReminder(
      {
        phone: '(11) 99999-1234',
        clientName: 'Cliente',
        professionalName: 'Profissional',
        serviceName: 'Serviço',
        dateTime: '2026-10-16T10:00:00',
      },
      'America/Manaus',
    );
    expect(send).toHaveBeenCalledWith(
      expect.objectContaining({
        message: expect.stringContaining('10:00'),
      }),
    );
  });
});
