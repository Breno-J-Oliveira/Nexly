import { Reflector } from '@nestjs/core';
import { PermissionsGuard } from './permissions.guard';

describe('PermissionsGuard', () => {
  const reflector = { getAllAndOverride: jest.fn() };
  const guard = new PermissionsGuard(reflector as unknown as Reflector);
  function context(path: string, method = 'GET', role = 'ADMIN') {
    return {
      getHandler: () => ({}),
      getClass: () => ({}),
      switchToHttp: () => ({ getRequest: () => ({ path, method, user: { role } }) }),
    } as never;
  }
  beforeEach(() => reflector.getAllAndOverride.mockReset().mockReturnValue(undefined));
  it('nega rota sem política inclusive para admin', () => {
    expect(guard.canActivate(context('/api/new-admin-endpoint'))).toBe(false);
  });
  it('permite somente as rotas pessoais explicitadas', () => {
    expect(guard.canActivate(context('/api/auth/me'))).toBe(true);
    expect(guard.canActivate(context('/api/auth/new-sensitive-operation', 'POST'))).toBe(false);
  });
  it('caixa não acessa relatório financeiro', () => {
    expect(guard.canActivate(context('/api/financeiro', 'GET', 'CAIXA'))).toBe(false);
    expect(guard.canActivate(context('/api/vendas', 'POST', 'CAIXA'))).toBe(true);
  });
  it('respeita papel declarado no controller', () => {
    reflector.getAllAndOverride.mockReturnValueOnce(false).mockReturnValueOnce(['ADMIN']);
    expect(guard.canActivate(context('/api/usuarios', 'GET', 'CAIXA'))).toBe(false);
  });
});
