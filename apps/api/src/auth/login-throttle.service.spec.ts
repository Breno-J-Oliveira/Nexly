import { LoginThrottleService } from './login-throttle.service';

describe('LoginThrottleService', () => {
  let service: LoginThrottleService;
  const KEY = 'user@x.com|127.0.0.1';

  beforeEach(() => {
    service = new LoginThrottleService();
  });

  it('isBlocked retorna false para chave nunca vista', () => {
    expect(service.isBlocked(KEY)).toBe(false);
  });

  it('bloqueia após MAX_ATTEMPTS (5) falhas', () => {
    for (let i = 0; i < 5; i++) {
      service.registerFailure(KEY);
    }
    expect(service.isBlocked(KEY)).toBe(true);
    expect(service.retryAfterSeconds(KEY)).toBeGreaterThan(0);
  });

  it('não bloqueia com 4 falhas (abaixo do limite)', () => {
    for (let i = 0; i < 4; i++) {
      service.registerFailure(KEY);
    }
    expect(service.isBlocked(KEY)).toBe(false);
  });

  it('registerSuccess limpa o bucket (volta a permitir)', () => {
    for (let i = 0; i < 5; i++) {
      service.registerFailure(KEY);
    }
    expect(service.isBlocked(KEY)).toBe(true);

    service.registerSuccess(KEY);
    expect(service.isBlocked(KEY)).toBe(false);
  });

  it('chaves diferentes têm buckets independentes', () => {
    const a = 'a@x.com|1.1.1.1';
    const b = 'b@x.com|1.1.1.1';
    for (let i = 0; i < 5; i++) service.registerFailure(a);
    expect(service.isBlocked(a)).toBe(true);
    expect(service.isBlocked(b)).toBe(false);
  });

  it('retryAfterSeconds retorna 0 quando não bloqueado', () => {
    expect(service.retryAfterSeconds(KEY)).toBe(0);
  });
});
