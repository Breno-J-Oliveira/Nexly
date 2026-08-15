import { UnauthorizedException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as argon2 from 'argon2';
import { PrismaService } from '../database/prisma.service';
import { AuthService } from './auth.service';
import { TokenService } from './token.service';

describe('AuthService', () => {
  let service: AuthService;
  let prisma: {
    client: { usuario: { findUnique: jest.Mock } };
  };
  let tokenService: {
    generateAccessToken: jest.Mock;
    issueRefreshToken: jest.Mock;
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
    prisma = { client: { usuario: { findUnique: jest.fn() } } };
    tokenService = {
      generateAccessToken: jest.fn().mockResolvedValue('access-token'),
      issueRefreshToken: jest.fn().mockResolvedValue('refresh-token'),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prisma },
        { provide: TokenService, useValue: tokenService },
      ],
    }).compile();

    service = moduleRef.get(AuthService);
  });

  it('login com credenciais válidas retorna token válido', async () => {
    prisma.client.usuario.findUnique.mockResolvedValue(usuarioMock);
    jest.spyOn(argon2, 'verify').mockResolvedValue(true);

    const result = await service.login({ email: 'admin@test.com', senha: 'senha123' });

    expect(result.accessToken).toBe('access-token');
    expect(result.usuario.email).toBe('admin@test.com');
  });

  it('login com senha errada retorna 401', async () => {
    prisma.client.usuario.findUnique.mockResolvedValue(usuarioMock);
    jest.spyOn(argon2, 'verify').mockResolvedValue(false);

    await expect(
      service.login({ email: 'admin@test.com', senha: 'senha-errada' }),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('login com e-mail inexistente retorna 401 com mensagem genérica', async () => {
    prisma.client.usuario.findUnique.mockResolvedValue(null);

    await expect(
      service.login({ email: 'nao@existe.com', senha: 'qualquer' }),
    ).rejects.toThrow('E-mail ou senha incorretos');
  });
});
