import { NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { PrismaService } from '../database/prisma.service';
import { ClientesService } from './clientes.service';

describe('ClientesService', () => {
  let service: ClientesService;
  let cliente: {
    findMany: jest.Mock;
    count: jest.Mock;
    findFirst: jest.Mock;
    create: jest.Mock;
    updateMany: jest.Mock;
  };

  beforeEach(async () => {
    cliente = {
      findMany: jest.fn(),
      count: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      updateMany: jest.fn(),
    };
    const moduleRef = await Test.createTestingModule({
      providers: [
        ClientesService,
        { provide: PrismaService, useValue: { client: { cliente } } },
      ],
    }).compile();
    service = moduleRef.get(ClientesService);
  });

  describe('listar', () => {
    it('filtra por nome OU telefone quando há busca (case-insensitive)', async () => {
      cliente.findMany.mockResolvedValue([]);
      cliente.count.mockResolvedValue(0);
      await service.listar(1, 10, 'maria');
      const whereArg = cliente.findMany.mock.calls[0][0].where;
      expect(whereArg.ativo).toBe(true);
      expect(whereArg.OR).toEqual([
        { nome: { contains: 'maria', mode: 'insensitive' } },
        { telefone: { contains: 'maria' } },
      ]);
    });

    it('sem busca, retorna apenas ativos', async () => {
      cliente.findMany.mockResolvedValue([]);
      cliente.count.mockResolvedValue(0);
      await service.listar(1, 10);
      const whereArg = cliente.findMany.mock.calls[0][0].where;
      expect(whereArg.OR).toBeUndefined();
      expect(whereArg.ativo).toBe(true);
    });

    it('aplica paginação correta (skip/take)', async () => {
      cliente.findMany.mockResolvedValue([]);
      cliente.count.mockResolvedValue(0);
      await service.listar(3, 25);
      const args = cliente.findMany.mock.calls[0][0];
      expect(args.skip).toBe(50); // (3-1)*25
      expect(args.take).toBe(25);
    });

    it('retorna metadados de paginação', async () => {
      cliente.findMany.mockResolvedValue([{ id: '1' }]);
      cliente.count.mockResolvedValue(42);
      const result = await service.listar(1, 10);
      expect(result).toEqual({ data: [{ id: '1' }], total: 42, page: 1, limit: 10 });
    });
  });

  describe('obter', () => {
    it('lança NotFoundException se não existe', async () => {
      cliente.findFirst.mockResolvedValue(null);
      await expect(service.obter('x')).rejects.toThrow(NotFoundException);
    });

    it('retorna cliente com agendamentos ordenados por dataHora desc', async () => {
      cliente.findFirst.mockResolvedValue({ id: '1', agendamentos: [] });
      const result = await service.obter('1');
      expect(result.id).toBe('1');
      const args = cliente.findFirst.mock.calls[0][0];
      expect(args.where).toEqual({ id: '1', ativo: true });
      expect(args.include.agendamentos.orderBy).toEqual({ dataHora: 'desc' });
      expect(args.include.agendamentos.take).toBe(10);
    });
  });

  describe('criar', () => {
    it('repassa campos do DTO', async () => {
      cliente.create.mockResolvedValue({ id: '1', nome: 'Ana' });
      const result = await service.criar({ nome: 'Ana', telefone: '11999', email: 'a@b.c' });
      expect(result.nome).toBe('Ana');
      const data = cliente.create.mock.calls[0][0].data;
      expect(data.nome).toBe('Ana');
      expect(data.telefone).toBe('11999');
      expect(data.email).toBe('a@b.c');
    });
  });

  describe('atualizar', () => {
    it('lança NotFound se o cliente não existe', async () => {
      cliente.findFirst.mockResolvedValue(null);
      await expect(
        service.atualizar('x', { nome: 'Bia', telefone: '', email: '' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('atualiza e retorna registro fresco', async () => {
      cliente.findFirst
        .mockResolvedValueOnce({ id: '1' }) // obter() — valida existência
        .mockResolvedValueOnce({ id: '1', nome: 'Bia' }); // obter() no return
      cliente.updateMany.mockResolvedValue({ count: 1 });
      const result = await service.atualizar('1', {
        nome: 'Bia',
        telefone: '',
        email: '',
      });
      expect(result.nome).toBe('Bia');
      expect(cliente.updateMany).toHaveBeenCalled();
    });
  });

  describe('desativar', () => {
    it('marca ativo=false', async () => {
      cliente.findFirst.mockResolvedValue({ id: '1' });
      cliente.updateMany.mockResolvedValue({ count: 1 });
      const result = await service.desativar('1');
      expect(result).toEqual({ success: true });
      const args = cliente.updateMany.mock.calls[0][0];
      expect(args.data.ativo).toBe(false);
    });

    it('lança NotFound se não existe', async () => {
      cliente.findFirst.mockResolvedValue(null);
      await expect(service.desativar('x')).rejects.toThrow(NotFoundException);
    });
  });
});
