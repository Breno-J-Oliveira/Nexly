import { UnauthorizedException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as argon2 from 'argon2';
import { PrismaService } from '../database/prisma.service';
import { AuthService } from './auth.service';
import { LoginThrottleService } from './login-throttle.service';
import { TokenService } from './token.service';

jest.mock('argon2', () => ({
  argon2id: 'argon2id',
  hash: jest.fn().mockResolvedValue('hashed'),
  verify: jest.fn(),
}));

const verifyMock = jest.mocked(argon2.verify);

describe('AuthService', () => {
  let service: AuthService;
  let prisma: {
    client: { usuario: { findUnique: jest.Mock } };
  };
  let tokenService: {
    generateAccessToken: jest.Mock;
    issueRefreshToken: jest.Mock;
  };
  let throttle: {
    isBlocked: jest.Mock;
    registerFailure: jest.Mock;
    registerSuccess: jest.Mock;
    retryAfterSeconds: jest.Mock;
  };
  const KEY = 'user@x.com|127.0.0.1';

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
    throttle = {
      isBlocked: jest.fn().mockReturnValue(false),
      registerFailure: jest.fn(),
      registerSuccess: jest.fn(),
      retryAfterSeconds: jest.fn().mockReturnValue(0),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prisma },
        { provide: TokenService, useValue: tokenService },
        { provide: LoginThrottleService, useValue: throttle },
      ],
    }).compile();

    service = moduleRef.get(AuthService);
  });

  it('login com credenciais válidas retorna token válido', async () => {
    prisma.client.usuario.findUnique.mockResolvedValue(usuarioMock);
    verifyMock.mockResolvedValue(true);

    const result = await service.login({ email: 'admin@test.com', senha: 'senha123' }, KEY);

    expect(result.accessToken).toBe('access-token');
    expect(result.usuario.email).toBe('admin@test.com');
  });

  it('login com senha errada retorna 401', async () => {
    prisma.client.usuario.findUnique.mockResolvedValue(usuarioMock);
    verifyMock.mockReset().mockResolvedValue(false);

    await expect(
      service.login({ email: 'admin@test.com', senha: 'senha-errada' }, KEY),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('login com e-mail inexistente retorna 401 com mensagem genérica', async () => {
    prisma.client.usuario.findUnique.mockResolvedValue(null);

    await expect(
      service.login({ email: 'nao@existe.com', senha: 'qualquer' }, KEY),
    ).rejects.toThrow('E-mail ou senha incorretos');
  });

  describe('me', () => {
    it('retorna UsuarioPublico quando o usuário existe', async () => {
      prisma.client.usuario.findUnique.mockResolvedValue(usuarioMock);

      const result = await service.me('u1');

      expect(result).toEqual({
        id: 'u1',
        empresaId: 'e1',
        nome: 'Admin',
        email: 'admin@test.com',
        role: 'ADMIN',
      });
      // não devolve senhaHash
      expect(result).not.toHaveProperty('senhaHash');
      // busca pelo id correto
      expect(prisma.client.usuario.findUnique).toHaveBeenCalledWith({ where: { id: 'u1' } });
    });

    it('lança UnauthorizedException quando o usuário não existe mais', async () => {
      prisma.client.usuario.findUnique.mockResolvedValue(null);

      await expect(service.me('u-fantasma')).rejects.toThrow(UnauthorizedException);
    });
  });
});
