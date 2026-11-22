import { UnauthorizedException } from '@nestjs/common';
import { Usuario } from '@prisma/client';
import * as argon2 from 'argon2';
import { AuthService } from './auth.service';
import { PrismaService } from '../database/prisma.service';
import { TokenService } from './token.service';
import { LoginThrottleService } from './login-throttle.service';
import { AuditService } from '../audit/audit.service';

jest.mock('argon2', () => ({ verify: jest.fn() }));

describe('emissão de sessão e mudanças concorrentes de segurança', () => {
  it('login Google também rejeita ativação de 2FA antes da emissão', async () => {
    const before = {
      id: 'u1',
      empresaId: 'e1',
      ativo: true,
      senhaHash: 'hash',
      googleSubject: 'google-id',
      twoFactorEnabled: false,
      twoFactorSecret: null,
    } as Usuario;
    const client = {
      usuario: {
        findUnique: jest
          .fn()
          .mockResolvedValueOnce(before)
          .mockResolvedValue({ ...before, twoFactorEnabled: true, twoFactorSecret: 'new-secret' }),
      },
      $queryRaw: jest.fn().mockResolvedValue([{ id: 'u1' }]),
      $transaction: jest.fn(),
    };
    client.$transaction.mockImplementation((callback: (tx: unknown) => unknown) =>
      callback(client),
    );
    const tokens = { issueRefreshToken: jest.fn() };
    const service = new AuthService(
      { client } as unknown as PrismaService,
      tokens as unknown as TokenService,
      {} as LoginThrottleService,
      { registrar: jest.fn() } as unknown as AuditService,
    );
    await expect(service.loginGoogle('u1')).rejects.toBeInstanceOf(UnauthorizedException);
    expect(tokens.issueRefreshToken).not.toHaveBeenCalled();
  });
  it.each(['password-reset', 'enable-2fa', 'role-change'])(
    'não emite sessão de um snapshot anterior a %s',
    async (change) => {
      let user = {
        id: 'u1',
        empresaId: 'e1',
        nome: 'Admin',
        email: 'a@example.test',
        role: 'ADMIN',
        ativo: true,
        senhaHash: 'old-hash',
        googleSubject: null,
        twoFactorEnabled: false,
        twoFactorSecret: null,
      } as Usuario;
      let entered!: () => void;
      const checking = new Promise<void>((resolve) => {
        entered = resolve;
      });
      let resume!: (valid: boolean) => void;
      jest.mocked(argon2.verify).mockImplementation(() => {
        entered();
        return new Promise<boolean>((resolve) => {
          resume = resolve;
        });
      });
      const client = {
        usuario: { findUnique: jest.fn(() => Promise.resolve({ ...user })) },
        $queryRaw: jest.fn(() => Promise.resolve([{ id: 'u1' }])),
        $transaction: jest.fn(),
      };
      client.$transaction.mockImplementation((callback: (tx: unknown) => unknown) =>
        callback(client),
      );
      const tokens = {
        issueRefreshToken: jest.fn().mockResolvedValue({ token: 'refresh', sessionId: 'session' }),
        generateAccessToken: jest.fn().mockResolvedValue('access'),
      };
      const service = new AuthService(
        { client } as unknown as PrismaService,
        tokens as unknown as TokenService,
        {
          isBlocked: jest.fn().mockResolvedValue(false),
          registerSuccess: jest.fn(),
        } as unknown as LoginThrottleService,
        { registrar: jest.fn() } as unknown as AuditService,
      );
      const login = service.login({ email: user.email, senha: 'old-password' }, 'fixture');
      await checking;
      // The security change has committed, including revocation of all sessions then existing.
      user = {
        ...user,
        ...(change === 'password-reset'
          ? { senhaHash: 'new-hash' }
          : change === 'enable-2fa'
            ? { twoFactorEnabled: true, twoFactorSecret: 'new-secret' }
            : { role: 'CAIXA' }),
      };
      resume(true);
      await expect(login).rejects.toBeInstanceOf(UnauthorizedException);
      expect(tokens.issueRefreshToken).not.toHaveBeenCalled();
    },
  );
});
