import { ConflictException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { PrismaService } from '../database/prisma.service';
import { ServicosService } from './servicos.service';

describe('ServicosService', () => {
  let service: ServicosService;
  let servico: {
    findMany: jest.Mock;
    findFirst: jest.Mock;
    create: jest.Mock;
    updateMany: jest.Mock;
  };
  let produto: { findFirst: jest.Mock };
  let agendamento: { count: jest.Mock };
  let insumoServico: {
    findMany: jest.Mock;
    upsert: jest.Mock;
    deleteMany: jest.Mock;
  };

  beforeEach(async () => {
    servico = {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      updateMany: jest.fn(),
    };
    produto = { findFirst: jest.fn() };
    agendamento = { count: jest.fn() };
    insumoServico = {
      findMany: jest.fn(),
      upsert: jest.fn(),
      deleteMany: jest.fn(),
    };
    const moduleRef = await Test.createTestingModule({
      providers: [
        ServicosService,
        {
          provide: PrismaService,
          useValue: { client: { servico, produto, agendamento, insumoServico } },
        },
      ],
    }).compile();
    service = moduleRef.get(ServicosService);
  });

  describe('listar', () => {
    it('retorna apenas ativos, ordenados por nome', async () => {
      servico.findMany.mockResolvedValue([{ id: 's1' }]);
      const result = await service.listar();
      expect(result).toEqual([{ id: 's1' }]);
      const args = servico.findMany.mock.calls[0][0];
      expect(args.where).toEqual({ ativo: true });
      expect(args.orderBy).toEqual({ nome: 'asc' });
    });
  });

  describe('obter', () => {
    it('lança NotFound se inativo/inexistente', async () => {
      servico.findFirst.mockResolvedValue(null);
      await expect(service.obter('x')).rejects.toThrow(NotFoundException);
    });

    it('retorna serviço com insumos e produtos incluídos', async () => {
      servico.findFirst.mockResolvedValue({ id: 's1', insumos: [] });
      await service.obter('s1');
      const args = servico.findFirst.mock.calls[0][0];
      expect(args.where).toEqual({ id: 's1', ativo: true });
      expect(args.include.insumos.include.produto).toBe(true);
    });
  });

  describe('criar', () => {
    it('repassa nome, duracaoMin e preco', async () => {
      servico.create.mockResolvedValue({ id: 's1', nome: 'Corte' });
      await service.criar({ nome: 'Corte', duracaoMin: 30, preco: 50 });
      const data = servico.create.mock.calls[0][0].data;
      expect(data).toEqual({ nome: 'Corte', duracaoMin: 30, preco: 50 });
    });
  });

  describe('atualizar', () => {
    it('lança NotFound se o serviço não existe', async () => {
      servico.findFirst.mockResolvedValue(null);
      await expect(
        service.atualizar('x', { nome: 'A', duracaoMin: 30, preco: 50 }),
      ).rejects.toThrow(NotFoundException);
    });

    it('atualiza e retorna registro fresco', async () => {
      servico.findFirst
        .mockResolvedValueOnce({ id: 's1' })
        .mockResolvedValueOnce({ id: 's1', nome: 'A' });
      servico.updateMany.mockResolvedValue({ count: 1 });
      const result = await service.atualizar('s1', {
        nome: 'A',
        duracaoMin: 30,
        preco: 50,
      });
      expect(result.nome).toBe('A');
    });
  });

  describe('desativar', () => {
    it('marca ativo=false quando não há agendamentos futuros', async () => {
      servico.findFirst.mockResolvedValue({ id: 's1' });
      agendamento.count.mockResolvedValue(0);
      servico.updateMany.mockResolvedValue({ count: 1 });
      const result = await service.desativar('s1');
      expect(result).toEqual({ success: true });
      expect(servico.updateMany).toHaveBeenCalled();
    });

    it('rejeita (409) quando há agendamentos futuros', async () => {
      servico.findFirst.mockResolvedValue({ id: 's1' });
      agendamento.count.mockResolvedValue(3);
      await expect(service.desativar('s1')).rejects.toThrow(ConflictException);
      expect(servico.updateMany).not.toHaveBeenCalled();
    });

    it('lança NotFound se o serviço não existe', async () => {
      servico.findFirst.mockResolvedValue(null);
      await expect(service.desativar('x')).rejects.toThrow(NotFoundException);
    });
  });
});
