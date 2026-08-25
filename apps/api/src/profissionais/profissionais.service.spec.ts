import { NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { PrismaService } from '../database/prisma.service';
import { ProfissionaisService } from './profissionais.service';

describe('ProfissionaisService', () => {
  let service: ProfissionaisService;
  let profissional: {
    findMany: jest.Mock;
    findFirst: jest.Mock;
    create: jest.Mock;
    updateMany: jest.Mock;
  };
  let agendamento: { findMany: jest.Mock };

  beforeEach(async () => {
    profissional = {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      updateMany: jest.fn(),
    };
    agendamento = { findMany: jest.fn() };
    const moduleRef = await Test.createTestingModule({
      providers: [
        ProfissionaisService,
        {
          provide: PrismaService,
          useValue: { client: { profissional, agendamento } },
        },
      ],
    }).compile();
    service = moduleRef.get(ProfissionaisService);
  });

  describe('listar', () => {
    it('retorna apenas ativos, ordenados por nome', async () => {
      profissional.findMany.mockResolvedValue([{ id: '1' }]);
      const result = await service.listar();
      expect(result).toEqual([{ id: '1' }]);
      const args = profissional.findMany.mock.calls[0][0];
      expect(args.where).toEqual({ ativo: true });
      expect(args.orderBy).toEqual({ nome: 'asc' });
    });
  });

  describe('obter', () => {
    it('lança NotFound se inativo/inexistente', async () => {
      profissional.findFirst.mockResolvedValue(null);
      await expect(service.obter('x')).rejects.toThrow(NotFoundException);
    });

    it('filtra agendamentos por status AGENDADO/CONFIRMADO', async () => {
      profissional.findFirst.mockResolvedValue({ id: '1', agendamentos: [] });
      await service.obter('1');
      const args = profissional.findFirst.mock.calls[0][0];
      expect(args.where).toEqual({ id: '1', ativo: true });
      expect(args.include.agendamentos.where.status.in).toEqual(['AGENDADO', 'CONFIRMADO']);
    });
  });

  describe('criar', () => {
    it('repassa nome + especialidade', async () => {
      profissional.create.mockResolvedValue({ id: '1', nome: 'Bruno' });
      await service.criar({ nome: 'Bruno', especialidade: 'Barbeiro' });
      const data = profissional.create.mock.calls[0][0].data;
      expect(data).toEqual({ nome: 'Bruno', especialidade: 'Barbeiro' });
    });
  });

  describe('atualizar', () => {
    it('lança NotFound se não existe', async () => {
      profissional.findFirst.mockResolvedValue(null);
      await expect(
        service.atualizar('x', { nome: 'Carla', especialidade: 'Manicure' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('atualiza e retorna registro atualizado', async () => {
      profissional.findFirst
        .mockResolvedValueOnce({ id: '1' })
        .mockResolvedValueOnce({ id: '1', nome: 'Carla' });
      profissional.updateMany.mockResolvedValue({ count: 1 });
      const result = await service.atualizar('1', {
        nome: 'Carla',
        especialidade: 'Manicure',
      });
      expect(result.nome).toBe('Carla');
      const args = profissional.updateMany.mock.calls[0][0];
      expect(args.data).toEqual({ nome: 'Carla', especialidade: 'Manicure' });
    });
  });

  describe('desativar', () => {
    it('marca ativo=false', async () => {
      profissional.findFirst.mockResolvedValue({ id: '1' });
      profissional.updateMany.mockResolvedValue({ count: 1 });
      const result = await service.desativar('1');
      expect(result).toEqual({ success: true });
    });
  });

  describe('disponibilidade', () => {
    it('mapeia dataHora/dataHoraFim para {inicio, fim}', async () => {
      const inicio = new Date('2026-01-15T10:00:00Z');
      const fim = new Date('2026-01-15T10:30:00Z');
      agendamento.findMany.mockResolvedValue([{ dataHora: inicio, dataHoraFim: fim }]);
      const result = await service.disponibilidade('p1', '2026-01-15');
      expect(result).toEqual([{ inicio, fim }]);
      const args = agendamento.findMany.mock.calls[0][0];
      expect(args.where.profissionalId).toBe('p1');
      expect(args.where.status.in).toEqual(['AGENDADO', 'CONFIRMADO']);
      expect(args.where.dataHora.gte.toISOString()).toBe('2026-01-15T00:00:00.000Z');
      expect(args.where.dataHora.lte.toISOString()).toBe('2026-01-15T23:59:59.999Z');
    });
  });
});
