import { ExecutionContext, ForbiddenException, ServiceUnavailableException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PlatformRole } from '@prisma/client';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { PrismaService } from '../database/prisma.service';
import { PlatformAccessGuard, PlatformRequest } from './platform-access.guard';
import { PlatformRoles } from './platform-roles.decorator';
import { PLATFORM_ROLES_KEY } from './platform-roles.key';

class Controller {
  @PlatformRoles('OWNER')
  protectedMethod(this: void) {}

  bareMethod(this: void) {}
}

describe('Acesso à plataforma', () => {
  const member = {
    id: 'member-1',
    usuarioId: 'owner-1',
    ativo: true,
    papel: 'OWNER' as PlatformRole,
    usuario: { nome: 'Operador', email: 'owner@example.test', ativo: true, twoFactorEnabled: true },
  };
  const findUnique = jest.fn();
  const reflector = new Reflector();
  const guard = new PlatformAccessGuard(reflector, {
    client: { platformMember: { findUnique } },
  } as unknown as PrismaService);

  function context({ loggedIn = true, method = Controller.prototype.protectedMethod } = {}) {
    const request = {
      user: loggedIn ? { id: 'owner-1', sessionId: 'sessao-1', role: 'ADMIN' } : undefined,
      method: 'GET',
      path: '/api/platform/team',
    } as PlatformRequest;
    const ctx = {
      getHandler: () => method,
      getClass: () => Controller,
      switchToHttp: () => ({ getRequest: () => request }),
    } as unknown as ExecutionContext;
    return { request, ctx };
  }

  beforeEach(() => findUnique.mockReset().mockResolvedValue(member));

  it('permite delegar a decisão somente onde o guard de plataforma protege a rota', () => {
    const permissions = new PermissionsGuard(reflector);
    expect(permissions.canActivate(context().ctx)).toBe(true);
    const method = () => undefined;
    Reflect.defineMetadata(PLATFORM_ROLES_KEY, ['OWNER'], method);
    expect(permissions.canActivate(context({ method }).ctx)).toBe(false);
    expect(permissions.canActivate(context({ loggedIn: false }).ctx)).toBe(false);
  });

  it('nega sem sessão, sem política ou com papel inadequado', async () => {
    await expect(guard.canActivate(context({ loggedIn: false }).ctx)).resolves.toBe(false);
    await expect(
      guard.canActivate(context({ method: Controller.prototype.bareMethod }).ctx),
    ).resolves.toBe(false);
    expect(findUnique).not.toHaveBeenCalled();
    findUnique.mockResolvedValueOnce({ ...member, papel: 'VIEWER' });
    await expect(guard.canActivate(context().ctx)).resolves.toBe(false);
  });

  it.each([
    null,
    { ...member, ativo: false },
    { ...member, usuario: { ...member.usuario, ativo: false } },
  ])('nega ADMIN da empresa sem vínculo ativo de plataforma (%p)', async (record) => {
    findUnique.mockResolvedValueOnce(record);
    await expect(guard.canActivate(context().ctx)).resolves.toBe(false);
  });

  it('exige 2FA de um membro com o papel necessário', async () => {
    findUnique.mockResolvedValueOnce({
      ...member,
      usuario: { ...member.usuario, twoFactorEnabled: false },
    });
    await expect(guard.canActivate(context().ctx)).rejects.toMatchObject({
      constructor: ForbiddenException,
      response: { code: 'PLATFORM_2FA_REQUIRED' },
    });
  });

  it('carrega o acesso pelo ID autenticado e expõe somente campos do painel', async () => {
    const { ctx, request } = context();
    await expect(guard.canActivate(ctx)).resolves.toBe(true);
    expect(findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { usuarioId: 'owner-1' } }),
    );
    expect(request.platformMember).toEqual({
      id: 'member-1',
      usuarioId: 'owner-1',
      nome: 'Operador',
      email: 'owner@example.test',
      papel: 'OWNER',
    });
  });

  it('falha fechado quando o vínculo não pode ser consultado', async () => {
    findUnique.mockRejectedValueOnce(new Error('Banco temporariamente indisponível'));
    await expect(guard.canActivate(context().ctx)).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });
});
