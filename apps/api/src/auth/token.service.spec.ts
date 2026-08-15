import { UnauthorizedException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../database/prisma.service';
import { TokenService } from './token.service';

describe('TokenService', () => {
  let service: TokenService;
  let prisma: {
    client: {
      refreshToken: {
        findUnique: jest.Mock;
        update: jest.Mock;
        updateMany: jest.Mock;
        create: jest.Mock;
      };
      usuario: { findUnique: jest.Mock };
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
        usuario: { findUnique: jest.fn() },
      },
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        TokenService,
        { provide: PrismaService, useValue: prisma },
        { provide: JwtService, useValue: { signAsync: jest.fn() } },
      ],
    }).compile();

    service = moduleRef.get(TokenService);
  });

  it('refresh com token válido revoga o antigo e emite um novo', async () => {
    prisma.client.refreshToken.findUnique.mockResolvedValue({
      id: 'rt1',
      usuarioId: 'u1',
      tokenHash: 'hash',
      expiresAt: new Date(Date.now() + 60_000),
      revogado: false,
    });
    prisma.client.usuario.findUnique.mockResolvedValue(usuarioMock);
    prisma.client.refreshToken.update.mockResolvedValue({});
    prisma.client.refreshToken.create.mockResolvedValue({});

    const result = await service.rotateRefreshToken('token-valido');

    expect(prisma.client.refreshToken.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'rt1' }, data: { revogado: true } }),
    );
    expect(result.newToken).toBeDefined();
    expect(result.usuario.id).toBe('u1');
  });

  it('refresh com token já revogado invalida todas as sessões e retorna 401', async () => {
    prisma.client.refreshToken.findUnique.mockResolvedValue({
      id: 'rt1',
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
});
