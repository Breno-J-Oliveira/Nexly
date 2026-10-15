import { UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { AuthGuard } from './auth.guard';
import { PrismaService } from '../../database/prisma.service';

describe('AuthGuard', () => {
  let guard: AuthGuard;
  let jwtService: { verifyAsync: jest.Mock };
  let reflector: { getAllAndOverride: jest.Mock };
  let prisma: { client: { authSession: { findUnique: jest.Mock } } };
  const sid = '00000000-0000-4000-8000-000000000001';

  beforeEach(() => {
    jwtService = { verifyAsync: jest.fn() };
    reflector = { getAllAndOverride: jest.fn().mockReturnValue(false) };
    prisma = { client: { authSession: { findUnique: jest.fn() } } };
    guard = new AuthGuard(
      jwtService as unknown as JwtService,
      reflector as unknown as Reflector,
      prisma as unknown as PrismaService,
    );
  });

  function makeContext(authHeader?: string) {
    return {
      getHandler: () => ({}),
      getClass: () => ({}),
      switchToHttp: () => ({
        getRequest: () => ({ headers: { authorization: authHeader } }),
      }),
    } as never;
  }

  it('acesso a rota protegida sem token retorna 401', async () => {
    await expect(guard.canActivate(makeContext(undefined))).rejects.toThrow(UnauthorizedException);
  });

  it('acesso a rota protegida com token expirado retorna 401', async () => {
    jwtService.verifyAsync.mockRejectedValue(new Error('jwt expired'));

    await expect(guard.canActivate(makeContext('Bearer token-expirado'))).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('acesso a rota pública é permitido sem token', async () => {
    reflector.getAllAndOverride.mockReturnValue(true);

    await expect(guard.canActivate(makeContext(undefined))).resolves.toBe(true);
  });

  it('token temporário 2FA não acessa rotas de negócio', async () => {
    jwtService.verifyAsync.mockResolvedValue({ sub: 'u1', scope: '2fa' });
    await expect(guard.canActivate(makeContext('Bearer challenge'))).rejects.toThrow(
      UnauthorizedException,
    );
    expect(prisma.client.authSession.findUnique).not.toHaveBeenCalled();
  });

  it('usuário desativado não usa JWT já emitido', async () => {
    jwtService.verifyAsync.mockResolvedValue({ sub: 'u1', sid, empresaId: 'e1', role: 'ADMIN' });
    prisma.client.authSession.findUnique.mockResolvedValue({
      usuarioId: 'u1',
      revogado: false,
      expiresAt: new Date(Date.now() + 60000),
      usuario: { id: 'u1', empresaId: 'e1', ativo: false },
    });
    await expect(guard.canActivate(makeContext('Bearer access'))).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('usa papel atual e exige assinatura RS256', async () => {
    jwtService.verifyAsync.mockResolvedValue({ sub: 'u1', sid, empresaId: 'e1', role: 'ADMIN' });
    const usuario = {
      id: 'u1',
      empresaId: 'e1',
      ativo: true,
      role: 'CAIXA',
      email: 'u@x.com',
      nome: 'U',
    };
    prisma.client.authSession.findUnique.mockResolvedValue({
      usuarioId: 'u1',
      revogado: false,
      expiresAt: new Date(Date.now() + 60000),
      usuario,
    });
    const request = { headers: { authorization: 'Bearer access' }, user: undefined as unknown };
    const context = {
      getHandler: () => ({}),
      getClass: () => ({}),
      switchToHttp: () => ({ getRequest: () => request }),
    };
    await expect(guard.canActivate(context as never)).resolves.toBe(true);
    expect(request.user).toMatchObject({ role: 'CAIXA' });
    expect(jwtService.verifyAsync).toHaveBeenCalledWith('access', { algorithms: ['RS256'] });
  });

  it('empresa do JWT deve corresponder à conta atual', async () => {
    jwtService.verifyAsync.mockResolvedValue({ sub: 'u1', sid, empresaId: 'e2', role: 'ADMIN' });
    prisma.client.authSession.findUnique.mockResolvedValue({
      usuarioId: 'u1',
      revogado: false,
      expiresAt: new Date(Date.now() + 60000),
      usuario: { id: 'u1', empresaId: 'e1', ativo: true },
    });
    await expect(guard.canActivate(makeContext('Bearer access'))).rejects.toThrow(
      UnauthorizedException,
    );
  });
  it.each(['missing', 'revoked', 'expired', 'foreign'])('recusa sessão %s', async (state) => {
    jwtService.verifyAsync.mockResolvedValue({ sub: 'u1', sid, empresaId: 'e1', role: 'ADMIN' });
    prisma.client.authSession.findUnique.mockResolvedValue(
      state === 'missing'
        ? null
        : {
            usuarioId: state === 'foreign' ? 'u2' : 'u1',
            revogado: state === 'revoked',
            expiresAt: new Date(Date.now() + (state === 'expired' ? -1000 : 60000)),
            usuario: { id: 'u1', empresaId: 'e1', ativo: true },
          },
    );
    await expect(guard.canActivate(makeContext('Bearer old-access'))).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('JWT antigo sem vínculo de sessão exige renovação', async () => {
    jwtService.verifyAsync.mockResolvedValue({ sub: 'u1', empresaId: 'e1', role: 'ADMIN' });
    await expect(guard.canActivate(makeContext('Bearer legacy'))).rejects.toThrow(
      UnauthorizedException,
    );
    expect(prisma.client.authSession.findUnique).not.toHaveBeenCalled();
  });
});
