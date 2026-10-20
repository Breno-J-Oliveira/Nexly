import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Plano } from '@prisma/client';
import { Test } from '@nestjs/testing';
import { PrismaService } from '../database/prisma.service';
import { ProfissionaisService } from './profissionais.service';
import { tenantStorage } from '../database/tenant-context';

describe('ProfissionaisService', () => {
  let service: ProfissionaisService;
  let profissional: {
    findMany: jest.Mock;
    findFirst: jest.Mock;
    create: jest.Mock;
    updateMany: jest.Mock;
    count: jest.Mock;
  };
  let agendamento: { findMany: jest.Mock };
  let empresa: { findUniqueOrThrow: jest.Mock };
  let queryRaw: jest.Mock;
  const inTenant = <T>(work: () => T): T =>
    tenantStorage.run(
      { tenantId: 'e1', userId: 'u1', role: 'ADMIN', email: 'test@example.test' },
      work,
    );

  beforeEach(async () => {
    profissional = {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      updateMany: jest.fn(),
      count: jest.fn().mockResolvedValue(0),
    };
    agendamento = { findMany: jest.fn() };
    empresa = { findUniqueOrThrow: jest.fn().mockResolvedValue({ plano: Plano.FREE }) };
    queryRaw = jest.fn().mockResolvedValue([{ plano: Plano.FREE }]);
    const tx = { profissional, agendamento, empresa, $queryRaw: queryRaw };
    const moduleRef = await Test.createTestingModule({
      providers: [
        ProfissionaisService,
        {
          provide: PrismaService,
          useValue: {
            client: {
              ...tx,
              $transaction: jest.fn((work: (client: typeof tx) => Promise<unknown>) => work(tx)),
            },
          },
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
      await inTenant(() => service.criar({ nome: 'Bruno', especialidade: 'Barbeiro' }));
      const data = profissional.create.mock.calls[0][0].data;
      expect(data).toEqual({ empresaId: 'e1', nome: 'Bruno', especialidade: 'Barbeiro' });
    });

    it.each([
      [Plano.FREE, 1],
      [Plano.FREE, 3],
      [Plano.BASIC, 2],
      [Plano.PRO, 10],
    ])('recusa cadastro acima do limite de %s com %i ativos', async (plano, ativos) => {
      queryRaw.mockResolvedValue([{ plano }]);
      profissional.count.mockResolvedValue(ativos);
      const result = inTenant(() => service.criar({ nome: 'Novo profissional' }));
      await expect(result).rejects.toBeInstanceOf(ForbiddenException);
      await expect(result).rejects.toMatchObject({
        response: { code: 'PROFESSIONAL_LIMIT_REACHED' },
      });
      expect(profissional.create).not.toHaveBeenCalled();
    });

    it.each([
      [Plano.FREE, 0],
      [Plano.BASIC, 1],
      [Plano.PRO, 9],
      [Plano.ENTERPRISE, 100],
    ])('permite cadastro dentro da capacidade de %s com %i ativos', async (plano, ativos) => {
      queryRaw.mockResolvedValue([{ plano }]);
      profissional.count.mockResolvedValue(ativos);
      profissional.create.mockResolvedValue({ id: 'novo' });
      await expect(inTenant(() => service.criar({ nome: 'Novo profissional' }))).resolves.toEqual({
        id: 'novo',
      });
      expect(profissional.count).toHaveBeenCalledWith({ where: { empresaId: 'e1', ativo: true } });
    });

    it('não consulta nem grava sem contexto autenticado', async () => {
      await expect(service.criar({ nome: 'Novo profissional' })).rejects.toThrow(
        'Contexto de tenant ausente',
      );
      expect(queryRaw).not.toHaveBeenCalled();
      expect(profissional.create).not.toHaveBeenCalled();
    });
  });

  describe('limites', () => {
    it('mostra excesso após redução de plano sem desativar cadastros existentes', async () => {
      profissional.count.mockResolvedValue(3);
      await expect(inTenant(() => service.limites())).resolves.toEqual({
        plano: 'FREE',
        ativos: 3,
        limite: 1,
        podeAdicionar: false,
      });
      expect(empresa.findUniqueOrThrow).toHaveBeenCalledWith({
        where: { id: 'e1' },
        select: { plano: true },
      });
      expect(profissional.updateMany).not.toHaveBeenCalled();
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
    it('não sugere disponibilidade de profissional inexistente', async () => {
      profissional.findFirst.mockResolvedValue(null);
      await expect(service.disponibilidade('externo', '2026-10-15')).rejects.toThrow(
        NotFoundException,
      );
      expect(agendamento.findMany).not.toHaveBeenCalled();
    });
    it('recusa datas inexistentes', async () => {
      await expect(service.disponibilidade('p1', '2026-02-30')).rejects.toThrow();
      expect(agendamento.findMany).not.toHaveBeenCalled();
    });
    it('mapeia dataHora/dataHoraFim para {inicio, fim}', async () => {
      profissional.findFirst.mockResolvedValue({ id: 'p1' });
      const inicio = new Date('2026-01-15T10:00:00Z');
      const fim = new Date('2026-01-15T10:30:00Z');
      agendamento.findMany.mockResolvedValue([{ dataHora: inicio, dataHoraFim: fim }]);
      const result = await service.disponibilidade('p1', '2026-01-15');
      expect(result).toEqual([{ inicio, fim }]);
      const args = agendamento.findMany.mock.calls[0][0];
      expect(args.where.profissionalId).toBe('p1');
      expect(args.where.status.in).toEqual(['AGENDADO', 'CONFIRMADO']);
      expect(args.where.dataHora.lte.toISOString()).toBe('2026-01-15T23:59:59.999Z');
      expect(args.where.dataHoraFim.gt.toISOString()).toBe('2026-01-15T00:00:00.000Z');
    });
  });
});
