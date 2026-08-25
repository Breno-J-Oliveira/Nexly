import { BadRequestException, ConflictException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { PrismaService } from '../database/prisma.service';
import { tenantStorage } from '../database/tenant-context';
import { EstoqueService } from './estoque.service';

describe('EstoqueService', () => {
  let service: EstoqueService;
  let prisma: {
    client: {
      produto: { updateMany: jest.Mock };
      movimentacaoEstoque: { create: jest.Mock };
      $transaction: jest.Mock;
    };
  };

  // Roda cada teste dentro de um contexto de tenant
  const withTenant = <T>(fn: () => T | Promise<T>): Promise<T> =>
    tenantStorage.run(
      { tenantId: 'e1', userId: 'u1', role: 'ADMIN', email: 'a@b.c' },
      fn,
    ) as Promise<T>;

  beforeEach(async () => {
    prisma = {
      client: {
        produto: { updateMany: jest.fn() },
        movimentacaoEstoque: { create: jest.fn() },
        $transaction: jest.fn().mockImplementation(async (cb) => cb(prisma.client)),
      },
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        EstoqueService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = moduleRef.get(EstoqueService);
  });

  describe('registrarSaidaTx', () => {
    it('rejeita quantidade <= 0', async () => {
      await expect(
        withTenant(() =>
          service.registrarSaidaTx(
            prisma.client as unknown as Parameters<EstoqueService['registrarSaidaTx']>[0],
            'p1',
            0,
            'teste',
          ),
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('lança OUT_OF_STOCK se updateMany não afeta nenhuma linha', async () => {
      prisma.client.produto.updateMany.mockResolvedValue({ count: 0 });

      try {
        await withTenant(() =>
          service.registrarSaidaTx(
            prisma.client as unknown as Parameters<EstoqueService['registrarSaidaTx']>[0],
            'p1',
            5,
            'teste',
          ),
        );
        fail('esperava ConflictException');
      } catch (e) {
        const err = e as ConflictException;
        const body = err.getResponse() as { code: string; message: string };
        expect(body.code).toBe('OUT_OF_STOCK');
        expect(body.message).toMatch(/Saldo insuficiente/);
      }
      // Não deve criar movimentação se não decrementou
      expect(prisma.client.movimentacaoEstoque.create).not.toHaveBeenCalled();
    });
  });
});

