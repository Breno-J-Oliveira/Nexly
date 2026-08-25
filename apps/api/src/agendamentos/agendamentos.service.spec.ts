import { ConflictException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { EventEmitter2 } from '@nestjs/event-emitter';
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
});