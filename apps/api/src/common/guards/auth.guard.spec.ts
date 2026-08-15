import { UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { AuthGuard } from './auth.guard';

describe('AuthGuard', () => {
  let guard: AuthGuard;
  let jwtService: { verifyAsync: jest.Mock };
  let reflector: { getAllAndOverride: jest.Mock };

  beforeEach(() => {
    jwtService = { verifyAsync: jest.fn() };
    reflector = { getAllAndOverride: jest.fn().mockReturnValue(false) };
    guard = new AuthGuard(jwtService as unknown as JwtService, reflector as unknown as Reflector);
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
});
