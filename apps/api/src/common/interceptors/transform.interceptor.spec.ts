import { ExecutionContext } from '@nestjs/common';
import { lastValueFrom, of } from 'rxjs';
import { TransformInterceptor } from './transform.interceptor';

it('não serializa a resposta cifrada de rotação nem credenciais aninhadas', async () => {
  const result = await lastValueFrom(
    new TransformInterceptor().intercept({} as ExecutionContext, {
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
