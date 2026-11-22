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
  const usuario = { findUnique: jest.fn(), updateMany: jest.fn(), update: jest.fn() };
  const authSession = { updateMany: jest.fn() };
  const refreshToken = { updateMany: jest.fn() };
  const client = {
    usuario,
    authSession,
    refreshToken,
    $transaction: jest.fn(),
    $queryRaw: jest.fn().mockResolvedValue([{ id: 'u1' }]),
  };
  const tokens = {
    verifyTempToken: jest.fn(),
    issueRefreshToken: jest.fn(),
    generateAccessToken: jest.fn(),
    generateTwoFactorSetupToken: jest.fn(),
    verifyTwoFactorSetupToken: jest.fn(),
  };
  const throttle = { isBlocked: jest.fn(), registerFailure: jest.fn(), registerSuccess: jest.fn() };
  beforeEach(() => {
    jest.clearAllMocks();
    user = {
      id: 'u1',
      email: 'admin@example.test',
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
    tokens.generateTwoFactorSetupToken.mockResolvedValue('setup-token');
    tokens.verifyTwoFactorSetupToken.mockResolvedValue(undefined);
    throttle.isBlocked.mockResolvedValue(false);
    jest.mocked(argon2.verify).mockResolvedValue(true);
    service = new AuthService(
      { client } as unknown as PrismaService,
      tokens as unknown as TokenService,
      throttle as unknown as LoginThrottleService,
      {} as AuditService,
    );
  });
  it('setup com senha confirmada gera configuração vinculada à sessão', async () => {
    user.twoFactorEnabled = false;
    const result = await service.setup2fa('u1', 's1', { password: 'password' });
    expect(argon2.verify).toHaveBeenCalledWith('hashed', 'password');
    expect(result).toMatchObject({ setupToken: 'setup-token', qrCodeUrl: expect.any(String) });
    expect(tokens.generateTwoFactorSetupToken).toHaveBeenCalledWith(
      expect.objectContaining({ twoFactorSecret: result.secret }),
      's1',
    );
    expect(usuario.update).toHaveBeenCalledWith({
      where: { id: 'u1' },
      data: { twoFactorSecret: result.secret },
    });
  });
  it('recusa senha incorreta e registra a falha antes de gerar segredo', async () => {
    user.twoFactorEnabled = false;
    jest.mocked(argon2.verify).mockResolvedValue(false);
    await expect(service.setup2fa('u1', 's1', { password: 'wrong' })).rejects.toThrow(
      UnauthorizedException,
    );
    expect(throttle.registerFailure).toHaveBeenCalledWith('2fa:setup:u1');
    expect(tokens.generateTwoFactorSetupToken).not.toHaveBeenCalled();
    expect(usuario.update).not.toHaveBeenCalled();
  });
  it('não verifica senha quando a reautenticação está bloqueada', async () => {
    user.twoFactorEnabled = false;
    throttle.isBlocked.mockResolvedValueOnce(true);
    await expect(service.setup2fa('u1', 's1', { password: 'password' })).rejects.toThrow(
      UnauthorizedException,
    );
    expect(argon2.verify).not.toHaveBeenCalled();
    expect(usuario.update).not.toHaveBeenCalled();
  });
  it('aceita apenas a identidade Google vinculada', async () => {
    user.twoFactorEnabled = false;
    user.googleSubject = 'linked-google-id';
    await expect(service.setup2fa('u1', 's1', { identity: { sub: 'other' } })).rejects.toThrow(
      UnauthorizedException,
    );
    expect(usuario.update).not.toHaveBeenCalled();
    await expect(
      service.setup2fa('u1', 's1', { identity: { sub: 'linked-google-id' } }),
    ).resolves.toMatchObject({ setupToken: 'setup-token' });
    expect(argon2.verify).not.toHaveBeenCalled();
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
    expect(tokens.issueRefreshToken).toHaveBeenCalledWith('u1', undefined, client);
    expect(usuario.updateMany.mock.calls[0]?.[0].data).toMatchObject({
      twoFactorBackupCodes: [],
      twoFactorChallengeHash: null,
    });
  });
  it('reset confirmado antes do lock rejeita o desafio sem consumir nem criar sessão', async () => {
    usuario.findUnique.mockResolvedValueOnce({ ...user });
    user.senhaHash = 'new-password-hash';
    await expect(service.verify2fa('challenge', 'abcdef01')).rejects.toThrow(UnauthorizedException);
    expect(usuario.updateMany).not.toHaveBeenCalled();
    expect(tokens.issueRefreshToken).not.toHaveBeenCalled();
  });

  it('falha na emissão não registra sucesso do segundo fator', async () => {
    tokens.issueRefreshToken.mockRejectedValueOnce(new Error('session insert failed'));
    await expect(service.verify2fa('challenge', 'abcdef01')).rejects.toThrow(
      'session insert failed',
    );
    expect(throttle.registerSuccess).not.toHaveBeenCalled();
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
    await expect(service.enable2fa('u1', '000000', 's1', 'setup-token')).rejects.toThrow(
      BadRequestException,
    );
    expect(usuario.updateMany).not.toHaveBeenCalled();
  });
  it('ativação encerra outros acessos e preserva o atual', async () => {
    user.twoFactorEnabled = false;
    const result = await service.enable2fa(
      'u1',
      authenticator.generate(user.twoFactorSecret as string),
      'current',
      'setup-token',
    );
    expect(result.backupCodes).toHaveLength(10);
    expect(result.backupCodes.every((code) => /^[a-f0-9]{20}$/.test(code))).toBe(true);
    expect(new Set(result.backupCodes).size).toBe(10);
    expect(authSession.updateMany).toHaveBeenCalledWith({
      where: { usuarioId: 'u1', id: { not: 'current' }, revogado: false },
      data: { revogado: true },
    });
    expect(refreshToken.updateMany).toHaveBeenCalled();
    expect(tokens.verifyTwoFactorSetupToken).toHaveBeenCalledWith(
      'setup-token',
      expect.objectContaining({ id: 'u1' }),
      'current',
    );
  });
  it('não ativa configuração substituída por outra requisição', async () => {
    user.twoFactorEnabled = false;
    usuario.updateMany.mockResolvedValue({ count: 0 });
    await expect(
      service.enable2fa(
        'u1',
        authenticator.generate(user.twoFactorSecret as string),
        's1',
        'setup-token',
      ),
    ).rejects.toThrow(BadRequestException);
    expect(authSession.updateMany).not.toHaveBeenCalled();
  });
  it('recusa ativação quando a sessão foi revogada durante a requisição', async () => {
    user.twoFactorEnabled = false;
    client.$queryRaw.mockResolvedValueOnce([{ id: 'u1' }]).mockResolvedValueOnce([]);
    await expect(service.enable2fa('u1', '000000', 's1', 'setup-token')).rejects.toThrow(
      UnauthorizedException,
    );
    expect(tokens.verifyTwoFactorSetupToken).not.toHaveBeenCalled();
    expect(usuario.updateMany).not.toHaveBeenCalled();
  });
  it('não altera o autenticador quando a confirmação da identidade é inválida', async () => {
    user.twoFactorEnabled = false;
    tokens.verifyTwoFactorSetupToken.mockRejectedValueOnce(new UnauthorizedException());
    await expect(service.enable2fa('u1', '000000', 's1', 'setup-token')).rejects.toThrow(
      UnauthorizedException,
    );
    expect(usuario.updateMany).not.toHaveBeenCalled();
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
