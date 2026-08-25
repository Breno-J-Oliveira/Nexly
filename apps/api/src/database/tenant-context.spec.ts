import { InternalServerErrorException } from '@nestjs/common';
import { getTenantContext, getTenantIdOrFail, tenantStorage } from './tenant-context';

describe('tenant-context', () => {
  afterEach(() => {
    // Garante que o store está limpo entre testes
    expect(tenantStorage.getStore()).toBeUndefined();
  });

  describe('getTenantIdOrFail', () => {
    it('retorna o tenantId quando o contexto existe', () => {
      tenantStorage.run({ tenantId: 'e1', userId: 'u1', role: 'ADMIN', email: 'a@b.c' }, () => {
        expect(getTenantIdOrFail()).toBe('e1');
      });
    });

    it('lança InternalServerErrorException com code TENANT_CONTEXT_MISSING se vazio', () => {
      expect(() => getTenantIdOrFail()).toThrow(InternalServerErrorException);
      try {
        getTenantIdOrFail();
      } catch (e) {
        const err = e as InternalServerErrorException;
        const body = err.getResponse() as { code?: string; message?: string };
        expect(body.code).toBe('TENANT_CONTEXT_MISSING');
        expect(typeof body.message).toBe('string');
      }
    });

    it('lança quando o contexto existe mas tenantId é string vazia', () => {
      tenantStorage.run({ tenantId: '', userId: 'u1', role: 'ADMIN', email: 'a@b.c' }, () => {
        expect(() => getTenantIdOrFail()).toThrow(InternalServerErrorException);
      });
    });
  });

  it('getTenantContext retorna undefined fora de um run', () => {
    expect(getTenantContext()).toBeUndefined();
  });
});
