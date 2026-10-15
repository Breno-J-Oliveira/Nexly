import { ConflictException, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { EstoqueService } from './estoque.service';
import { EstoqueIntegracaoService } from './estoque-integracao.service';
import { tenantStorage } from '../database/tenant-context';

const P1 = '00000000-0000-4000-8000-000000000001',
  P2 = '00000000-0000-4000-8000-000000000002';
describe('consumo durável de insumos', () => {
  const estoque = { registrarSaidaTx: jest.fn() };
  const tx = {
    insumoServico: { findMany: jest.fn() },
    produto: { findMany: jest.fn() },
    usuario: { findMany: jest.fn() },
    notificacao: { createMany: jest.fn(), updateMany: jest.fn() },
    agendamento: { updateMany: jest.fn(), findFirst: jest.fn() },
    auditLog: { create: jest.fn() },
  };
  const prisma = { client: { $transaction: jest.fn() } };
  let service: EstoqueIntegracaoService;
  const withTenant = <T>(fn: () => T) =>
    tenantStorage.run(
      { tenantId: 'empresa1', userId: 'u1', role: 'ADMIN', email: 'test@example.test' },
      fn,
    );
  beforeEach(() => {
    jest.clearAllMocks();
    tx.insumoServico.findMany.mockResolvedValue([
      { produtoId: P1, quantidade: 2 },
      { produtoId: P2, quantidade: 1 },
    ]);
    tx.produto.findMany.mockResolvedValue([
      { id: P1, nome: 'Insumo A' },
      { id: P2, nome: 'Insumo B' },
    ]);
    tx.usuario.findMany.mockResolvedValue([{ id: 'manager' }]);
    tx.agendamento.updateMany.mockResolvedValue({ count: 1 });
    estoque.registrarSaidaTx.mockResolvedValue(undefined);
    prisma.client.$transaction.mockImplementation((fn: (transaction: unknown) => unknown) =>
      fn(tx),
    );
    service = new EstoqueIntegracaoService(
      prisma as unknown as PrismaService,
      estoque as unknown as EstoqueService,
    );
  });
  it('grava baixa ou pendência na transação do atendimento e avisa gestores', async () =>
    withTenant(async () => {
      estoque.registrarSaidaTx.mockImplementation((_tx: unknown, id: string) =>
        id === P2
          ? Promise.reject(new ConflictException({ code: 'OUT_OF_STOCK' }))
          : Promise.resolve(),
      );
      const pending = await service.concluirTx(tx as unknown as Prisma.TransactionClient, {
        id: 'a1',
        servicoId: 's1',
      });
      expect(pending).toEqual([{ produtoId: P2, quantidade: 1, nomeProduto: 'Insumo B' }]);
      expect(tx.agendamento.updateMany).toHaveBeenCalledWith({
        where: { id: 'a1', empresaId: 'empresa1' },
        data: { pendenciasEstoque: pending },
      });
      expect(tx.notificacao.createMany).toHaveBeenCalledWith(
        expect.objectContaining({
          data: [
            expect.objectContaining({
              empresaId: 'empresa1',
              usuarioId: 'manager',
              titulo: 'Baixa de estoque pendente',
            }),
          ],
        }),
      );
    }));
  it('sem insumos não movimenta saldo nem cria alerta', async () =>
    withTenant(async () => {
      tx.insumoServico.findMany.mockResolvedValue([]);
      expect(
        await service.concluirTx(tx as unknown as Prisma.TransactionClient, {
          id: 'a1',
          servicoId: 's1',
        }),
      ).toEqual([]);
      expect(estoque.registrarSaidaTx).not.toHaveBeenCalled();
      expect(tx.notificacao.createMany).not.toHaveBeenCalled();
    }));
  it('erro inesperado é propagado para reverter a transação inteira', async () =>
    withTenant(async () => {
      estoque.registrarSaidaTx.mockRejectedValue(new Error('Falha no banco'));
      await expect(
        service.concluirTx(tx as unknown as Prisma.TransactionClient, {
          id: 'a1',
          servicoId: 's1',
        }),
      ).rejects.toThrow('Falha no banco');
      expect(tx.agendamento.updateMany).not.toHaveBeenCalled();
    }));
  it('reprocessa somente itens pendentes após obter lock do atendimento', async () =>
    withTenant(async () => {
      tx.agendamento.findFirst.mockResolvedValue({
        pendenciasEstoque: [{ produtoId: P2, quantidade: 1, nomeProduto: 'Insumo B' }],
      });
      await service.reprocessar('a1');
      expect(tx.agendamento.updateMany.mock.calls[0]?.[0]).toEqual({
        where: { id: 'a1', empresaId: 'empresa1', status: 'CONCLUIDO' },
        data: { status: 'CONCLUIDO' },
      });
      expect(estoque.registrarSaidaTx).toHaveBeenCalledTimes(1);
      expect(estoque.registrarSaidaTx.mock.calls[0]?.[1]).toBe(P2);
    }));
  it('sem pendências uma nova tentativa não altera o estoque', async () =>
    withTenant(async () => {
      tx.agendamento.findFirst.mockResolvedValue({ pendenciasEstoque: [] });
      await service.reprocessar('a1');
      expect(estoque.registrarSaidaTx).not.toHaveBeenCalled();
    }));
  it('não reprocessa atendimentos fora do tenant ou sem conclusão', async () =>
    withTenant(async () => {
      tx.agendamento.updateMany.mockResolvedValue({ count: 0 });
      await expect(service.reprocessar('foreign')).rejects.toThrow(NotFoundException);
      expect(estoque.registrarSaidaTx).not.toHaveBeenCalled();
    }));
  it('desconsiderar exige motivo auditável e preserva o saldo', async () =>
    withTenant(async () => {
      tx.agendamento.findFirst.mockResolvedValue({
        pendenciasEstoque: [{ produtoId: P2, quantidade: 1, nomeProduto: 'Insumo B' }],
      });
      await service.cancelar('a1', 'Insumo não utilizado', 'u1');
      expect(estoque.registrarSaidaTx).not.toHaveBeenCalled();
      expect(tx.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          empresaId: 'empresa1',
          usuarioId: 'u1',
          recursoId: 'a1',
          dadosNovos: { pendencias: [], motivo: 'Insumo não utilizado' },
        }),
      });
    }));
});
