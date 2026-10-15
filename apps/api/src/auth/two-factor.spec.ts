import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { authenticator } from '@otplib/preset-default';
import { createHash } from 'crypto';
import * as argon2 from 'argon2';
import { AuthService } from './auth.service';
import { TokenService } from './token.service';
import { PrismaService } from '../database/prisma.service';
import { LoginThrottleService } from './login-throttle.service';
import { AuditService } from '../audit/audit.service';

jest.mock('argon2', () => ({ verify: jest.fn().mockResolvedValue(true) }));

describe('segundo fator de uso único', () => {
  const hash = (value: string) => createHash('sha256').update(value).digest('hex');
  let user: Record<string, unknown>;
  let service: AuthService;
  const usuario = { findUnique: jest.fn(), updateMany: jest.fn() };
  const authSession = { updateMany: jest.fn() };
  const refreshToken = { updateMany: jest.fn() };
  const client = { usuario, authSession, refreshToken, $transaction: jest.fn() };
  const tokens = {
    verifyTempToken: jest.fn(),
    issueRefreshToken: jest.fn(),
    generateAccessToken: jest.fn(),
  };
  const throttle = { isBlocked: jest.fn(), registerFailure: jest.fn(), registerSuccess: jest.fn() };
  beforeEach(() => {
    jest.clearAllMocks();
    user = {
      id: 'u1',
      ativo: true,
      senhaHash: 'hashed',
      twoFactorEnabled: true,
      twoFactorSecret: authenticator.generateSecret(),
      twoFactorBackupCodes: [hash('abcdef01')],
      twoFactorChallengeHash: hash('challenge'),
      twoFactorChallengeExpiresAt: new Date(Date.now() + 60000),
      twoFactorLastUsedStep: null,
    };
    usuario.findUnique.mockImplementation(() => Promise.resolve({ ...user }));
    usuario.updateMany.mockResolvedValue({ count: 1 });
    client.$transaction.mockImplementation((callback: (tx: unknown) => unknown) =>
      callback(client),
    );
    tokens.verifyTempToken.mockResolvedValue({ sub: 'u1', challengeHash: hash('challenge') });
    tokens.issueRefreshToken.mockResolvedValue({ token: 'refresh', sessionId: 's1' });
    tokens.generateAccessToken.mockResolvedValue('access');
    throttle.isBlocked.mockResolvedValue(false);
    jest.mocked(argon2.verify).mockResolvedValue(true);
    service = new AuthService(
      { client } as unknown as PrismaService,
      tokens as unknown as TokenService,
      throttle as unknown as LoginThrottleService,
      {} as AuditService,
    );
  });
  it('consome desafio e passo TOTP numa única escrita', async () => {
    const code = authenticator.generate(user.twoFactorSecret as string);
    await expect(service.verify2fa('challenge', code)).resolves.toMatchObject({
      accessToken: 'access',
    });
    const update = usuario.updateMany.mock.calls[0]?.[0];
    expect(update.where).toMatchObject({
      twoFactorChallengeHash: hash('challenge'),
      twoFactorEnabled: true,
      ativo: true,
      twoFactorLastUsedStep: null,
    });
    expect(update.data).toMatchObject({
      twoFactorChallengeHash: null,
      twoFactorChallengeExpiresAt: null,
      twoFactorLastUsedStep: Math.floor(Date.now() / 30000),
    });
  });
  it('consome backup e desafio juntos', async () => {
    await service.verify2fa('challenge', 'abcdef01');
    expect(usuario.updateMany.mock.calls[0]?.[0].data).toMatchObject({
      twoFactorBackupCodes: [],
      twoFactorChallengeHash: null,
    });
  });
  it.each(['expired', 'consumed', 'replaced'])(
    'rejeita desafio %s sem criar sessão',
    async (state) => {
      if (state === 'expired') user.twoFactorChallengeExpiresAt = new Date(0);
      else user.twoFactorChallengeHash = state === 'consumed' ? null : hash('other');
      await expect(service.verify2fa('challenge', 'abcdef01')).rejects.toThrow(
        UnauthorizedException,
      );
      expect(tokens.issueRefreshToken).not.toHaveBeenCalled();
    },
  );
  it('não aceita repetir o passo TOTP em novo desafio', async () => {
    user.twoFactorLastUsedStep = Math.floor(Date.now() / 30000);
    await expect(
      service.verify2fa('challenge', authenticator.generate(user.twoFactorSecret as string)),
    ).rejects.toThrow(UnauthorizedException);
    expect(usuario.updateMany).not.toHaveBeenCalled();
  });
  it('apenas o vencedor do CAS cria uma sessão', async () => {
    usuario.updateMany.mockResolvedValue({ count: 0 });
    await expect(service.verify2fa('challenge', 'abcdef01')).rejects.toThrow(UnauthorizedException);
    expect(tokens.issueRefreshToken).not.toHaveBeenCalled();
  });
  it('não regenera códigos de recuperação do 2FA ativo', async () => {
    await expect(service.enable2fa('u1', '000000', 's1')).rejects.toThrow(BadRequestException);
    expect(usuario.updateMany).not.toHaveBeenCalled();
  });
  it('ativação encerra outros acessos e preserva o atual', async () => {
    user.twoFactorEnabled = false;
    const result = await service.enable2fa(
      'u1',
      authenticator.generate(user.twoFactorSecret as string),
      'current',
    );
    expect(result.backupCodes).toHaveLength(10);
    expect(result.backupCodes.every((code) => /^[a-f0-9]{20}$/.test(code))).toBe(true);
    expect(new Set(result.backupCodes).size).toBe(10);
    expect(authSession.updateMany).toHaveBeenCalledWith({
      where: { usuarioId: 'u1', id: { not: 'current' }, revogado: false },
      data: { revogado: true },
    });
    expect(refreshToken.updateMany).toHaveBeenCalled();
  });
  it('não ativa configuração substituída por outra requisição', async () => {
    user.twoFactorEnabled = false;
    usuario.updateMany.mockResolvedValue({ count: 0 });
    await expect(
      service.enable2fa('u1', authenticator.generate(user.twoFactorSecret as string), 's1'),
    ).rejects.toThrow(BadRequestException);
    expect(authSession.updateMany).not.toHaveBeenCalled();
  });
  it('desativação exige senha e segundo fator e limpa desafios', async () => {
    await service.disable2fa('u1', 'password', 'abcdef01');
    expect(usuario.updateMany.mock.calls[0]?.[0].data).toMatchObject({
      twoFactorEnabled: false,
      twoFactorChallengeHash: null,
      twoFactorSecret: null,
      twoFactorBackupCodes: [],
    });
  });
  it('senha isolada não desativa o segundo fator', async () => {
    await expect(service.disable2fa('u1', 'password', 'invalid')).rejects.toThrow(
      BadRequestException,
    );
    expect(usuario.updateMany).not.toHaveBeenCalled();
  });
  it('senha incorreta não altera a configuração', async () => {
    jest.mocked(argon2.verify).mockResolvedValue(false);
    await expect(service.disable2fa('u1', 'wrong', 'abcdef01')).rejects.toThrow(
      BadRequestException,
    );
    expect(usuario.updateMany).not.toHaveBeenCalled();
  });
});
