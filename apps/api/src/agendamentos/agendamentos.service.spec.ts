import { ConflictException, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { StatusAgendamento } from '@nexly/shared';
import { PrismaService } from '../database/prisma.service';
import { AgendamentosService } from './agendamentos.service';

describe('AgendamentosService', () => {
  let service: AgendamentosService;
  let prisma: {
    client: {
      servico: { findFirst: jest.Mock };
      agendamento: { findFirst: jest.Mock; findMany: jest.Mock; count: jest.Mock; create: jest.Mock; update: jest.Mock };
    };
  };
  let emitter: { emit: jest.Mock };

  const empresaId = 'e1';
  const servico = { id: 's1', duracaoMin: 60 };
  const profissional = { id: 'p1' };
  const cliente = { id: 'c1' };

  beforeEach(async () => {
    prisma = {
      client: {
        servico: { findFirst: jest.fn() },
        agendamento: {
          findFirst: jest.fn(),
          findMany: jest.fn(),
          count: jest.fn(),
          create: jest.fn(),
          update: jest.fn(),
        },
      },
    };
    emitter = { emit: jest.fn() };

    const moduleRef = await Test.createTestingModule({
      providers: [
        AgendamentosService,
        { provide: PrismaService, useValue: prisma },
        { provide: EventEmitter2, useValue: emitter },
      ],
    }).compile();

    service = moduleRef.get(AgendamentosService);
  });

  describe('criar', () => {
    const dataHoraFutura = new Date(Date.now() + 86_400_000).toISOString();

    it('cria agendamento quando não há conflito', async () => {
      prisma.client.servico.findFirst.mockResolvedValue(servico);
      prisma.client.agendamento.findFirst.mockResolvedValue(null);
      prisma.client.agendamento.create.mockResolvedValue({ id: 'a1' });

      const result = await service.criar({
        clienteId: cliente.id,
        profissionalId: profissional.id,
        servicoId: servico.id,
        dataHora: dataHoraFutura,
      });

      expect(result).toEqual({ id: 'a1' });
      expect(prisma.client.agendamento.create).toHaveBeenCalled();
    });

    it('rejeita criação com conflito de horário (409)', async () => {
      prisma.client.servico.findFirst.mockResolvedValue(servico);
      prisma.client.agendamento.findFirst.mockResolvedValue({ id: 'conflito' });

      await expect(
        service.criar({
          clienteId: cliente.id,
          profissionalId: profissional.id,
          servicoId: servico.id,
          dataHora: dataHoraFutura,
        }),
      ).rejects.toThrow(ConflictException);
      expect(prisma.client.agendamento.create).not.toHaveBeenCalled();
    });

    it('rejeita criação no passado', async () => {
      prisma.client.servico.findFirst.mockResolvedValue(servico);
      const passada = new Date(Date.now() - 86_400_000).toISOString();

      await expect(
        service.criar({
          clienteId: cliente.id,
          profissionalId: profissional.id,
          servicoId: servico.id,
          dataHora: passada,
        }),
      ).rejects.toThrow(/no futuro/);
    });

    it('lança 404 quando serviço não existe', async () => {
      prisma.client.servico.findFirst.mockResolvedValue(null);

      await expect(
        service.criar({
          clienteId: cliente.id,
          profissionalId: profissional.id,
          servicoId: 'invalido',
          dataHora: dataHoraFutura,
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('listar', () => {
    it('monta where vazio sem filtros', async () => {
      prisma.client.agendamento.findMany.mockResolvedValue([]);
      prisma.client.agendamento.count.mockResolvedValue(0);
      await service.listar(1, 10, {});
      const where = prisma.client.agendamento.findMany.mock.calls[0][0].where;
      expect(where).toEqual({});
    });

    it('filtra por data (range 00:00 → 23:59 UTC)', async () => {
      prisma.client.agendamento.findMany.mockResolvedValue([]);
      prisma.client.agendamento.count.mockResolvedValue(0);
      await service.listar(1, 10, { data: '2026-01-15' });
      const where = prisma.client.agendamento.findMany.mock.calls[0][0].where;
      expect(where.dataHora.gte.toISOString()).toBe('2026-01-15T00:00:00.000Z');
      expect(where.dataHora.lte.toISOString()).toBe('2026-01-15T23:59:59.999Z');
    });

    it('combina filtros: data + profissional + cliente + status', async () => {
      prisma.client.agendamento.findMany.mockResolvedValue([]);
      prisma.client.agendamento.count.mockResolvedValue(0);
      await service.listar(1, 10, {
        data: '2026-01-15',
        profissionalId: 'p1',
        clienteId: 'c1',
        status: StatusAgendamento.AGENDADO,
      });
      const where = prisma.client.agendamento.findMany.mock.calls[0][0].where;
      expect(where.profissionalId).toBe('p1');
      expect(where.clienteId).toBe('c1');
      expect(where.status).toBe(StatusAgendamento.AGENDADO);
    });

    it('aplica paginação (skip/take) e ordena por dataHora asc', async () => {
      prisma.client.agendamento.findMany.mockResolvedValue([]);
      prisma.client.agendamento.count.mockResolvedValue(0);
      await service.listar(2, 25, {});
      const args = prisma.client.agendamento.findMany.mock.calls[0][0];
      expect(args.skip).toBe(25);
      expect(args.take).toBe(25);
      expect(args.orderBy).toEqual({ dataHora: 'asc' });
    });

    it('retorna metadados de paginação', async () => {
      prisma.client.agendamento.findMany.mockResolvedValue([{ id: 'a1' }]);
      prisma.client.agendamento.count.mockResolvedValue(7);
      const r = await service.listar(1, 10, {});
      expect(r).toEqual({ data: [{ id: 'a1' }], total: 7, page: 1, limit: 10 });
    });
  });

  describe('obter', () => {
    it('lança NotFound quando não existe', async () => {
      prisma.client.agendamento.findFirst.mockResolvedValue(null);
      await expect(service.obter('x')).rejects.toThrow(NotFoundException);
    });

    it('retorna com include completo (cliente, profissional, servico)', async () => {
      prisma.client.agendamento.findFirst.mockResolvedValue({ id: 'a1' });
      await service.obter('a1');
      const args = prisma.client.agendamento.findFirst.mock.calls[0][0];
      expect(args.include).toMatchObject({
        cliente: true,
        profissional: true,
        servico: true,
      });
    });
  });

  describe('atualizarStatus', () => {
    const base = { id: 'a1', status: StatusAgendamento.AGENDADO, servicoId: 's1' };

    it('permite AGENDADO → CONFIRMADO', async () => {
      prisma.client.agendamento.findFirst.mockResolvedValue(base);
      prisma.client.agendamento.update.mockResolvedValue({ ...base, status: 'CONFIRMADO' });
      await service.atualizarStatus('a1', StatusAgendamento.CONFIRMADO);
      expect(prisma.client.agendamento.update).toHaveBeenCalled();
    });

    it('rejeita CONCLUIDO → CONFIRMADO (estado terminal)', async () => {
      prisma.client.agendamento.findFirst.mockResolvedValue({ ...base, status: 'CONCLUIDO' });
      await expect(
        service.atualizarStatus('a1', StatusAgendamento.CONFIRMADO),
      ).rejects.toThrow(UnprocessableEntityException);
    });

    it('rejeita CANCELADO → qualquer (estado terminal)', async () => {
      prisma.client.agendamento.findFirst.mockResolvedValue({ ...base, status: 'CANCELADO' });
      await expect(
        service.atualizarStatus('a1', StatusAgendamento.CONCLUIDO),
      ).rejects.toThrow(UnprocessableEntityException);
    });

    it('emite evento agendamento.concluido ao concluir', async () => {
      prisma.client.agendamento.findFirst.mockResolvedValue({ ...base, status: 'CONFIRMADO' });
      prisma.client.agendamento.update.mockResolvedValue({ ...base, status: 'CONCLUIDO' });
      emitter.emit.mockClear();
      await service.atualizarStatus('a1', StatusAgendamento.CONCLUIDO);
      expect(emitter.emit).toHaveBeenCalledWith('agendamento.concluido', {
        agendamentoId: 'a1',
        servicoId: 's1',
      });
    });

    it('NÃO emite evento em outras transições', async () => {
      prisma.client.agendamento.findFirst.mockResolvedValue(base);
      prisma.client.agendamento.update.mockResolvedValue({ ...base, status: 'CANCELADO' });
      emitter.emit.mockClear();
      await service.atualizarStatus('a1', StatusAgendamento.CANCELADO);
      expect(emitter.emit).not.toHaveBeenCalled();
    });

    it('lança NotFound se agendamento não existe', async () => {
      prisma.client.agendamento.findFirst.mockResolvedValue(null);
      await expect(
        service.atualizarStatus('x', StatusAgendamento.CONFIRMADO),
      ).rejects.toThrow(NotFoundException);
    });
  });
});