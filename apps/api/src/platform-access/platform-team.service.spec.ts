import { ConflictException, NotFoundException } from '@nestjs/common';
import type { AuthUser } from '@nexly/shared';
import { Prisma } from '@prisma/client';
import type { PrismaService } from '../database/prisma.service';
import { PlatformTeamService } from './platform-team.service';

describe('Gestão da equipe da plataforma', () => {
  const operador = { id: 'owner', empresaId: 'empresa-interna' } as AuthUser;
  const tx = {
    usuario: { findFirst: jest.fn(), findMany: jest.fn() },
    platformMember: { create: jest.fn(), findUniqueOrThrow: jest.fn(), updateMany: jest.fn() },
  };
  const service = new PlatformTeamService({
    client: { ...tx, $transaction: (run: (transaction: typeof tx) => unknown) => run(tx) },
  } as unknown as PrismaService);

  beforeEach(() => jest.resetAllMocks());

  it('não vincula uma conta fora da empresa interna', async () => {
    tx.usuario.findFirst.mockResolvedValue(null);
    await expect(
      service.adicionar(operador, { usuarioId: 'conta-externa', papel: 'VIEWER' }),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(tx.usuario.findFirst).toHaveBeenCalledWith({
      where: { id: 'conta-externa', empresaId: 'empresa-interna', ativo: true },
      select: { id: true },
    });
    expect(tx.platformMember.create).not.toHaveBeenCalled();
  });

  it('protege o proprietário e as outras empresas na gravação', async () => {
    tx.platformMember.updateMany.mockResolvedValue({ count: 0 });
    await expect(
      service.atualizar(operador, 'member-owner', { ativo: false }),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(tx.platformMember.updateMany).toHaveBeenCalledWith({
      where: {
        id: 'member-owner',
        papel: { not: 'OWNER' },
        usuario: { empresaId: 'empresa-interna' },
      },
      data: { ativo: false, papel: undefined },
    });
    expect(tx.platformMember.findUniqueOrThrow).not.toHaveBeenCalled();
  });

  it('impede restaurar o acesso de uma conta desativada na empresa interna', async () => {
    tx.platformMember.updateMany.mockResolvedValue({ count: 0 });
    await expect(service.atualizar(operador, 'staff', { ativo: true })).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(tx.platformMember.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ usuario: { empresaId: 'empresa-interna', ativo: true } }),
      }),
    );
  });

  it('retorna um conflito específico quando outro operador vinculou a mesma conta', async () => {
    tx.usuario.findFirst.mockResolvedValue({ id: 'staff' });
    tx.platformMember.create.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('Duplicate member', {
        code: 'P2002',
        clientVersion: '5.22.0',
        meta: { target: ['usuario_id'] },
      }),
    );
    await expect(
      service.adicionar(operador, { usuarioId: 'staff', papel: 'VIEWER' }),
    ).rejects.toMatchObject({
      constructor: ConflictException,
      response: { code: 'PLATFORM_MEMBER_EXISTS' },
    });
  });

  it('restringe a busca a contas ativas e sem vínculo interno', async () => {
    tx.usuario.findMany.mockResolvedValue([
      { id: 'staff', nome: 'Aline', email: 'a@example.test', twoFactorEnabled: true },
    ]);
    await expect(service.candidatos(operador, ' ali ')).resolves.toEqual([
      { usuarioId: 'staff', nome: 'Aline', email: 'a@example.test', doisFatoresAtivo: true },
    ]);
    expect(tx.usuario.findMany).toHaveBeenCalledWith({
      where: {
        empresaId: 'empresa-interna',
        ativo: true,
        platformMember: { is: null },
        OR: [
          { nome: { contains: 'ali', mode: 'insensitive' } },
          { email: { contains: 'ali', mode: 'insensitive' } },
        ],
      },
      orderBy: [{ nome: 'asc' }, { id: 'asc' }],
      take: 30,
      select: { id: true, nome: true, email: true, twoFactorEnabled: true },
    });
  });
});
