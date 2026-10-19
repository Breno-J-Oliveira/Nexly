import { UnauthorizedException, ConflictException } from '@nestjs/common';
import { authenticator } from '@otplib/preset-default';
import * as argon2 from 'argon2';
import { createHash } from 'node:crypto';
import { AuthService } from './auth.service';

jest.mock('argon2', () => ({ verify: jest.fn().mockResolvedValue(true) }));

describe('Vinculação Google e segundo fator', () => {
  const user = {
    id: 'u1',
    empresaId: 'e1',
    email: 'user@gmail.com',
    ativo: true,
    googleSubject: null,
    senhaHash: 'hash',
    twoFactorEnabled: false,
    twoFactorSecret: null,
    twoFactorLastUsedStep: null,
    twoFactorBackupCodes: [] as string[],
  };
  let prisma: { client: { usuario: { findUnique: jest.Mock; updateMany: jest.Mock } } };
  let tokens: {
    generateTempToken: jest.Mock;
    issueRefreshToken: jest.Mock;
    generateAccessToken: jest.Mock;
  };
  let throttle: { isBlocked: jest.Mock; registerFailure: jest.Mock; registerSuccess: jest.Mock };
  let service: AuthService;
  beforeEach(() => {
    prisma = {
      client: {
        usuario: {
          findUnique: jest.fn().mockResolvedValue(user),
          updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        },
      },
    };
    tokens = {
      generateTempToken: jest.fn().mockResolvedValue('temporary'),
      issueRefreshToken: jest.fn(),
      generateAccessToken: jest.fn(),
    };
    throttle = {
      isBlocked: jest.fn().mockResolvedValue(false),
      registerFailure: jest.fn(),
      registerSuccess: jest.fn(),
    };
    jest.mocked(argon2.verify).mockResolvedValue(true);
    service = new AuthService(
      prisma as never,
      tokens as never,
      throttle as never,
      { registrar: jest.fn() } as never,
    );
  });
  afterEach(() => jest.restoreAllMocks());
  it('recusa senha incorreta sem vincular', async () => {
    jest.mocked(argon2.verify).mockResolvedValue(false);
    await expect(
      service.linkGoogle('u1', { sub: 'g1', email: user.email }, 'wrong'),
    ).rejects.toThrow(UnauthorizedException);
    expect(prisma.client.usuario.updateMany).not.toHaveBeenCalled();
    expect(throttle.registerFailure).toHaveBeenCalled();
  });
  it('recusa vincular um e-mail diferente ou substituir a identidade', async () => {
    await expect(
      service.linkGoogle('u1', { sub: 'g1', email: 'other@gmail.com' }, 'password'),
    ).rejects.toThrow(ConflictException);
    prisma.client.usuario.findUnique.mockResolvedValue({ ...user, googleSubject: 'old' });
    await expect(
      service.linkGoogle('u1', { sub: 'new', email: user.email }, 'password'),
    ).rejects.toThrow(ConflictException);
    expect(prisma.client.usuario.updateMany).not.toHaveBeenCalled();
  });
  it('exige 2FA e consome código de backup atomicamente junto com a vinculação', async () => {
    const code = 'a'.repeat(16);
    const hash = createHash('sha256').update(code).digest('hex');
    prisma.client.usuario.findUnique.mockResolvedValue({
      ...user,
      twoFactorEnabled: true,
      twoFactorBackupCodes: [hash],
    });
    await expect(
      service.linkGoogle('u1', { sub: 'g1', email: user.email }, 'password'),
    ).rejects.toThrow(UnauthorizedException);
    await service.linkGoogle('u1', { sub: 'g1', email: user.email }, 'password', code);
    expect(prisma.client.usuario.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          senhaHash: 'hash',
          googleSubject: null,
          twoFactorBackupCodes: { equals: [hash] },
        }),
        data: expect.objectContaining({ googleSubject: 'g1', twoFactorBackupCodes: [] }),
      }),
    );
  });
  it('recusa código TOTP já usado e mudanças concorrentes no acesso', async () => {
    jest.spyOn(authenticator, 'check').mockReturnValue(true);
    prisma.client.usuario.findUnique.mockResolvedValue({
      ...user,
      twoFactorEnabled: true,
      twoFactorSecret: 'secret',
      twoFactorLastUsedStep: Math.floor(Date.now() / 30_000),
    });
    await expect(
      service.linkGoogle('u1', { sub: 'g1', email: user.email }, 'password', '123456'),
    ).rejects.toThrow(UnauthorizedException);
    prisma.client.usuario.findUnique.mockResolvedValue(user);
    prisma.client.usuario.updateMany.mockResolvedValue({ count: 0 });
    await expect(
      service.linkGoogle('u1', { sub: 'g1', email: user.email }, 'password'),
    ).rejects.toThrow(ConflictException);
  });
  it('conta desativada não pode usar Google', async () => {
    prisma.client.usuario.findUnique.mockResolvedValue({
      ...user,
      ativo: false,
      googleSubject: 'g1',
    });
    await expect(service.loginGoogle('u1')).rejects.toThrow(UnauthorizedException);
    expect(tokens.issueRefreshToken).not.toHaveBeenCalled();
  });
  it('login Google com 2FA emite somente o desafio temporário', async () => {
    prisma.client.usuario.findUnique.mockResolvedValue({
      ...user,
      twoFactorEnabled: true,
      googleSubject: 'g1',
    });
    await expect(service.loginGoogle('u1')).resolves.toEqual({
      requiresTwoFactor: true,
      tempToken: 'temporary',
    });
    expect(tokens.issueRefreshToken).not.toHaveBeenCalled();
    expect(tokens.generateAccessToken).not.toHaveBeenCalled();
  });
});
