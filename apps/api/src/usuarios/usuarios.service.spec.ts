import { Role } from '@nexly/shared';
import { PrismaService } from '../database/prisma.service';
import { UsuariosService } from './usuarios.service';

describe('UsuariosService.atualizar', () => {
  const tx = {
    $queryRaw: jest.fn(),
    usuario: {
      findFirst: jest.fn().mockResolvedValue({ id: 'u1', ativo: true, role: Role.CAIXA }),
      updateMany: jest.fn(),
    },
    authSession: { updateMany: jest.fn() },
    refreshToken: { updateMany: jest.fn() },
  };
  const prisma = {
    client: { $transaction: (callback: (transaction: typeof tx) => unknown) => callback(tx) },
  };
  const service = new UsuariosService(prisma as unknown as PrismaService);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it.each([{ ativo: false }, { role: Role.ADMIN }])(
    'invalida o desafio 2FA junto com as sessões ao atualizar %j',
    async (dto) => {
      await service.atualizar('e1', 'u1', dto);

      expect(tx.usuario.updateMany).toHaveBeenCalledWith({
        where: { id: 'u1', empresaId: 'e1' },
        data: { ...dto, twoFactorChallengeHash: null, twoFactorChallengeExpiresAt: null },
      });
      expect(tx.authSession.updateMany).toHaveBeenCalledTimes(1);
      expect(tx.refreshToken.updateMany).toHaveBeenCalledTimes(1);
    },
  );

  it('preserva o desafio 2FA e as sessões ao atualizar apenas o nome', async () => {
    const dto = { nome: 'Novo nome' };
    await service.atualizar('e1', 'u1', dto);

    expect(tx.usuario.updateMany).toHaveBeenCalledWith({
      where: { id: 'u1', empresaId: 'e1' },
      data: dto,
    });
    expect(tx.authSession.updateMany).not.toHaveBeenCalled();
    expect(tx.refreshToken.updateMany).not.toHaveBeenCalled();
  });
});
