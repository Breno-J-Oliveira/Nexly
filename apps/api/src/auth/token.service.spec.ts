import { UnauthorizedException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../database/prisma.service';
import { TokenService } from './token.service';

describe('TokenService', () => {
  let service: TokenService;
  let jwt: { signAsync: jest.Mock; verifyAsync: jest.Mock };
  let prisma: {
    client: {
      refreshToken: {
        findUnique: jest.Mock;
        update: jest.Mock;
        updateMany: jest.Mock;
        create: jest.Mock;
      };
      usuario: { findUnique: jest.Mock; updateMany: jest.Mock };
      authSession: { updateMany: jest.Mock };
      $transaction: jest.Mock;
      $queryRaw: jest.Mock;
    };
  };

  const usuarioMock = {
    id: 'u1',
    empresaId: 'e1',
    nome: 'Admin',
    email: 'admin@test.com',
    senhaHash: 'hashed',
    role: 'ADMIN',
    ativo: true,
  };

  beforeEach(async () => {
    prisma = {
      client: {
        refreshToken: {
          findUnique: jest.fn(),
          update: jest.fn(),
          updateMany: jest.fn(),
          create: jest.fn(),
        },
        usuario: {
          findUnique: jest.fn().mockResolvedValue(usuarioMock),
          updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        },
        authSession: { updateMany: jest.fn().mockResolvedValue({ count: 1 }) },
        $transaction: jest.fn((input: unknown) =>
          Array.isArray(input)
            ? Promise.all(input)
            : (input as (tx: unknown) => unknown)(prisma.client),
        ),
        $queryRaw: jest.fn().mockImplementation(() => Promise.resolve([{ now: new Date() }])),
      },
    };

    jwt = { signAsync: jest.fn().mockResolvedValue('signed-challenge'), verifyAsync: jest.fn() };
    const moduleRef = await Test.createTestingModule({
      providers: [
        TokenService,
        { provide: PrismaService, useValue: prisma },
        { provide: JwtService, useValue: jwt },
      ],
    }).compile();

    service = moduleRef.get(TokenService);
  });

  it('persiste apenas hash do desafio temporário com expiração', async () => {
    await expect(service.generateTempToken('u1')).resolves.toBe('signed-challenge');
    expect(jwt.signAsync).toHaveBeenCalledWith(
      expect.objectContaining({ sub: 'u1', scope: '2fa', jti: expect.any(String) }),
      { expiresIn: '5m' },
    );
    const saved = prisma.client.usuario.updateMany.mock.calls[0]?.[0];
    expect(saved.where).toMatchObject({ id: 'u1', ativo: true, twoFactorEnabled: true });
    expect(saved.data.twoFactorChallengeHash).toMatch(/^[a-f0-9]{64}$/);
    expect(JSON.stringify(saved)).not.toContain('signed-challenge');
  });

  it('JWT malformado ou expirado resulta em 401', async () => {
    jwt.verifyAsync.mockRejectedValue(new Error('jwt expired'));
    await expect(service.verifyTempToken('invalid')).rejects.toThrow(UnauthorizedException);
  });

  it.each([{ sub: 'u1' }, { sub: 'u1', scope: '2fa' }, { sub: 'u1', scope: 'other', jti: 'n' }])(
    'rejeita token fora do contrato de desafio: %j',
    async (payload) => {
      jwt.verifyAsync.mockResolvedValue(payload);
      await expect(service.verifyTempToken('invalid')).rejects.toThrow(UnauthorizedException);
    },
  );

  it('refresh com token válido revoga o antigo e emite um novo', async () => {
    prisma.client.refreshToken.findUnique.mockResolvedValue({
      id: 'rt1',
      sessionId: 's1',
      sessao: { revogado: false, expiresAt: new Date(Date.now() + 60000) },
      usuarioId: 'u1',
      tokenHash: 'hash',
      expiresAt: new Date(Date.now() + 60_000),
      revogado: false,
    });
    prisma.client.usuario.findUnique.mockResolvedValue(usuarioMock);
    prisma.client.refreshToken.updateMany.mockResolvedValue({ count: 1 });
    prisma.client.refreshToken.create.mockResolvedValue({ sessionId: 's1' });

    const result = await service.rotateRefreshToken('token-valido');

    expect(prisma.client.refreshToken.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ id: 'rt1', revogado: false }),
        data: { revogado: true },
      }),
    );
    expect(result.newToken).toBeDefined();
    expect(result.usuario.id).toBe('u1');
    expect(result.sessionId).toBe('s1');
    expect(prisma.client.refreshToken.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ sessao: { connect: { id: 's1' } } }),
      }),
    );
  });

  it('refresh com token já revogado invalida todas as sessões e retorna 401', async () => {
    prisma.client.refreshToken.findUnique.mockResolvedValue({
      id: 'rt1',
      sessionId: 's1',
      sessao: { revogado: false, expiresAt: new Date(Date.now() + 60000) },
      usuarioId: 'u1',
      tokenHash: 'hash',
      expiresAt: new Date(Date.now() + 60_000),
      revogado: true,
    });
    prisma.client.refreshToken.updateMany.mockResolvedValue({ count: 2 });

    await expect(service.rotateRefreshToken('token-revogado')).rejects.toThrow(
      UnauthorizedException,
    );
    expect(prisma.client.refreshToken.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { usuarioId: 'u1', revogado: false },
        data: { revogado: true },
      }),
    );
  });

  it('não emite token novo se outra requisição venceu a rotação', async () => {
    prisma.client.refreshToken.findUnique.mockResolvedValue({
      id: 'rt1',
      sessionId: 's1',
      sessao: { revogado: false, expiresAt: new Date(Date.now() + 60000) },
      usuarioId: 'u1',
      expiresAt: new Date(Date.now() + 60000),
      revogado: false,
    });
    prisma.client.usuario.findUnique.mockResolvedValue(usuarioMock);
    prisma.client.refreshToken.updateMany.mockResolvedValue({ count: 0 });
    await expect(service.rotateRefreshToken('same-token')).rejects.toThrow(UnauthorizedException);
    expect(prisma.client.refreshToken.create).not.toHaveBeenCalled();
  });
  it.each(['revogado', 'expirado'])('não renova uma sessão %s', async (state) => {
    prisma.client.refreshToken.findUnique.mockResolvedValue({
      id: 'rt1',
      usuarioId: 'u1',
      sessionId: 's1',
      revogado: false,
      expiresAt: new Date(Date.now() + 60000),
      sessao: {
        revogado: state === 'revogado',
        expiresAt: new Date(Date.now() + (state === 'expirado' ? -1000 : 60000)),
      },
    });
    await expect(service.rotateRefreshToken('token')).rejects.toThrow(UnauthorizedException);
    expect(prisma.client.refreshToken.create).not.toHaveBeenCalled();
  });

  it('logout revoga a sessão estável mesmo com cookie de uma rotação anterior', async () => {
    prisma.client.refreshToken.findUnique.mockResolvedValue({
      id: 'rt1',
      usuarioId: 'u1',
      sessionId: 's1',
      revogado: true,
    });
    await service.revokeRefreshToken('old-cookie');
    expect(prisma.client.authSession.updateMany).toHaveBeenCalledWith({
      where: { id: 's1', usuarioId: 'u1' },
      data: { revogado: true },
    });
  });
  it('refresh após logout não revoga outras sessões legítimas', async () => {
    prisma.client.refreshToken.findUnique.mockResolvedValue({
      revogado: true,
      expiresAt: new Date(Date.now() + 60000),
      sessao: { revogado: true, expiresAt: new Date(Date.now() + 60000) },
    });
    await expect(service.rotateRefreshToken('logged-out')).rejects.toThrow(UnauthorizedException);
    expect(prisma.client.authSession.updateMany).not.toHaveBeenCalled();
  });

  it('recupera só a rotação mais recente dentro da janela sem prolongá-la', async () => {
    prisma.client.refreshToken.findUnique.mockResolvedValue({
      id: 'rt1',
      usuarioId: 'u1',
      sessionId: 's1',
      revogado: true,
      expiresAt: new Date(Date.now() + 60000),
      sessao: {
        revogado: false,
        expiresAt: new Date(Date.now() + 60000),
        lastRotationTokenId: 'rt1',
        lastRotationAt: new Date(Date.now() - 100),
      },
    });
    prisma.client.refreshToken.create.mockResolvedValue({ sessionId: 's1' });
    await expect(service.rotateRefreshToken('recent')).resolves.toMatchObject({ sessionId: 's1' });
    expect(prisma.client.authSession.updateMany).not.toHaveBeenCalled();
    expect(prisma.client.refreshToken.updateMany).not.toHaveBeenCalled();
  });

  it.each(['expired-window', 'older-ancestor'])('detecta replay %s', async (state) => {
    prisma.client.refreshToken.findUnique.mockResolvedValue({
      id: 'rt1',
      usuarioId: 'u1',
      sessionId: 's1',
      revogado: true,
      expiresAt: new Date(Date.now() + 60000),
      sessao: {
        revogado: false,
        expiresAt: new Date(Date.now() + 60000),
        lastRotationTokenId: state === 'older-ancestor' ? 'rt2' : 'rt1',
        lastRotationAt: new Date(Date.now() - (state === 'expired-window' ? 5000 : 100)),
      },
    });
    await expect(service.rotateRefreshToken('replay')).rejects.toThrow(UnauthorizedException);
    expect(prisma.client.authSession.updateMany).toHaveBeenCalledWith({
      where: { usuarioId: 'u1', revogado: false },
      data: { revogado: true },
    });
    expect(prisma.client.refreshToken.create).not.toHaveBeenCalled();
  });
});
