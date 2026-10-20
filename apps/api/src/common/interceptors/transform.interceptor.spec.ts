import { ExecutionContext } from '@nestjs/common';
import { lastValueFrom, of } from 'rxjs';
import { TransformInterceptor } from './transform.interceptor';
import { Role } from '@nexly/shared';

const context = (role?: Role) =>
  ({
    switchToHttp: () => ({ getRequest: () => ({ user: role ? { role } : undefined }) }),
  }) as ExecutionContext;

it('não serializa a resposta cifrada de rotação nem credenciais aninhadas', async () => {
  const result = await lastValueFrom(
    new TransformInterceptor().intercept(context(Role.ADMIN), {
      handle: () =>
        of({
          id: 'session',
          lastRotationResponse: 'encrypted-credential',
          usuario: { nome: 'Pessoa', senhaHash: 'hash', twoFactorSecret: 'secret' },
        }),
    }),
  );
  expect(result).toEqual({ id: 'session', usuario: { nome: 'Pessoa' } });
});

it.each([Role.RECEPCIONISTA, Role.PROFISSIONAL, Role.CAIXA, undefined])(
  'oculta percentuais inclusive em relações para papel %s',
  async (role) => {
    const result = await lastValueFrom(
      new TransformInterceptor().intercept(context(role), {
        handle: () =>
          of({
            comissaoPercentualAplicada: 25,
            profissional: { nome: 'Pessoa', comissaoPercentual: 30 },
            rows: [{ comissaoPercentual: 40 }],
          }),
      }),
    );
    expect(result).toEqual({ profissional: { nome: 'Pessoa' }, rows: [{}] });
  },
);

it.each([Role.ADMIN, Role.GESTOR])(
  'preserva percentuais para papel autorizado %s',
  async (role) => {
    const result = await lastValueFrom(
      new TransformInterceptor().intercept(context(role), {
        handle: () =>
          of({
            comissaoPercentualAplicada: 25,
            profissional: { comissaoPercentual: 30 },
            senhaHash: 'secret',
          }),
      }),
    );
    expect(result).toEqual({
      comissaoPercentualAplicada: 25,
      profissional: { comissaoPercentual: 30 },
    });
  },
);
