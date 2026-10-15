import { BookingService } from './booking.service';
import { PrismaService } from '../database/prisma.service';
import { diaNoFuso, instanteNoFuso, instanteSolicitado, periodoNoFuso } from './booking-time';

const DIA = '2026-10-16';
describe('agendamento no fuso do estabelecimento', () => {
  const horarios = Object.fromEntries(
    ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sab'].map((d) => [
      d,
      { aberto: true, abre: '09:00', fecha: '18:00' },
    ]),
  );
  let service: BookingService;
  let company: Record<string, unknown>;
  const client = {
    empresa: { findUnique: jest.fn() },
    servico: { findFirst: jest.fn() },
    profissional: { findMany: jest.fn(), findFirst: jest.fn() },
    agendamento: { findMany: jest.fn(), findFirst: jest.fn(), create: jest.fn() },
    cliente: { findFirst: jest.fn() },
    $queryRaw: jest.fn(),
    $transaction: jest.fn(),
  };
  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(new Date('2026-10-15T12:00:00Z'));
    jest.clearAllMocks();
    company = { id: 'e1', fusoHorario: 'America/Sao_Paulo', horarios };
    client.empresa.findUnique.mockImplementation(() => Promise.resolve(company));
    client.servico.findFirst.mockResolvedValue({ id: 's1', duracaoMin: 60 });
    client.profissional.findMany.mockImplementation(({ where }: { where: { id?: string } }) =>
      Promise.resolve(where.id ? [{ id: where.id }] : [{ id: 'p1' }, { id: 'p2' }]),
    );
    client.profissional.findFirst.mockResolvedValue({ id: 'p1' });
    client.agendamento.findMany.mockResolvedValue([
      {
        profissionalId: 'p1',
        dataHora: new Date(`${DIA}T13:00:00Z`),
        dataHoraFim: new Date(`${DIA}T14:00:00Z`),
      },
    ]);
    client.agendamento.findFirst.mockResolvedValue(null);
    client.agendamento.create.mockResolvedValue({ id: 'a1' });
    client.cliente.findFirst.mockResolvedValue({ id: 'c1' });
    client.$transaction.mockImplementation((fn: (tx: unknown) => unknown) => fn(client));
    service = new BookingService({ client } as unknown as PrismaService);
  });
  afterEach(() => jest.useRealTimers());
  it('o profissional escolhido altera os horários disponíveis', async () => {
    const own = await service.getDisponibilidade('token', DIA, 'p1', 's1');
    const other = await service.getDisponibilidade('token', DIA, 'p2', 's1');
    expect(own.slots).not.toContain('10:00');
    expect(other.slots).toContain('10:00');
    expect(other.instantes['10:00']).toBe(`${DIA}T13:00:00.000Z`);
  });
  it('qualquer profissional considera os demais profissionais livres', async () => {
    expect((await service.getDisponibilidade('token', DIA, undefined, 's1')).slots).toContain(
      '10:00',
    );
  });
  it('consulta sobreposição incluindo atendimento iniciado no dia anterior', async () => {
    await service.getDisponibilidade('token', DIA, 'p1', 's1');
    expect(client.agendamento.findMany.mock.calls[0]?.[0].where).toMatchObject({
      dataHora: { lt: new Date('2026-10-17T03:00:00Z') },
      dataHoraFim: { gt: new Date('2026-10-16T03:00:00Z') },
    });
  });
  it('não oferece horários que já passaram nem serviços além do fechamento', async () => {
    client.agendamento.findMany.mockResolvedValue([]);
    const current = await service.getDisponibilidade('token', '2026-10-15', 'p1', 's1');
    expect(current.slots).not.toContain('09:00');
    expect(current.slots[0]).toBe('09:30');
    expect(current.slots.at(-1)).toBe('17:00');
  });
  it('rejeita serviço que não pertence à empresa', async () => {
    client.servico.findFirst.mockResolvedValue(null);
    await expect(service.getDisponibilidade('token', DIA, 'p1', 'foreign')).rejects.toThrow(
      'Servico nao encontrado',
    );
  });
  it('rejeita data impossível antes de consultar a agenda', async () => {
    await expect(service.getDisponibilidade('token', '2026-02-30', 'p1', 's1')).rejects.toThrow();
    expect(client.agendamento.findMany).not.toHaveBeenCalled();
  });
  it('respeita dia fechado', async () => {
    company.horarios = { sex: { aberto: false, abre: '09:00', fecha: '18:00' } };
    expect((await service.getDisponibilidade('token', DIA, 'p1', 's1')).slots).toEqual([]);
  });
  it.each([
    ['America/Sao_Paulo', 13],
    ['America/Manaus', 14],
    ['America/Rio_Branco', 15],
    ['America/Noronha', 12],
  ])('interpreta 10h no fuso %s como UTC %sh', async (zone, hour) => {
    company.fusoHorario = zone;
    await service.agendar('token', {
      servicoId: 's1',
      profissionalId: 'p1',
      dataHora: `${DIA}T10:00:00`,
      clienteNome: 'Teste',
      clienteTelefone: '11999990000',
    });
    expect(client.agendamento.create.mock.calls[0]?.[0].data.dataHora).toEqual(
      new Date(`${DIA}T${hour}:00:00Z`),
    );
  });
  it('valida expediente no fuso comercial em vez de usar a hora UTC', async () => {
    await service.agendar('token', {
      servicoId: 's1',
      profissionalId: 'p1',
      dataHora: `${DIA}T20:00:00Z`,
      clienteNome: 'Teste',
      clienteTelefone: '11999990000',
    });
    expect(client.agendamento.create).toHaveBeenCalled();
    await expect(
      service.agendar('token', {
        servicoId: 's1',
        profissionalId: 'p1',
        dataHora: `${DIA}T09:00:00Z`,
        clienteNome: 'Teste',
        clienteTelefone: '11999990000',
      }),
    ).rejects.toThrow('Horario fora do funcionamento');
  });
});

describe('conversão de horários de negócio', () => {
  it('mantém o instante quando o cliente já envia offset', () =>
    expect(instanteSolicitado('2026-10-16T10:00:00-03:00', 'America/Manaus').toISOString()).toBe(
      '2026-10-16T13:00:00.000Z',
    ));
  it('00h UTC ainda pertence ao dia anterior no Brasil', () =>
    expect(diaNoFuso(new Date('2026-10-16T02:30:00Z'), 'America/Sao_Paulo')).toBe('2026-10-15'));
  it('limites de dia preservam mudança de offset histórica', () => {
    const range = periodoNoFuso('2018-11-04', 'America/Sao_Paulo');
    expect(range.fimExclusivo.getTime() - range.inicio.getTime()).toBe(23 * 3600000);
    expect(instanteNoFuso('2026-10-16', '10:00', 'America/Manaus').toISOString()).toBe(
      '2026-10-16T14:00:00.000Z',
    );
  });
});
