import { cookieOriginGuard } from './cookie-origin';

describe('Proteção de origem de cookies', () => {
  const guard = cookieOriginGuard(['https://app.nexly.test']);
  function request(origin?: string, cookie?: string, path = '/api/auth/refresh') {
    const next = jest.fn();
    const response = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    guard({ method: 'POST', path, headers: { origin, cookie } } as never, response as never, next);
    return { next, response };
  }
  it('permite refresh da origem configurada', () => {
    expect(request('https://app.nexly.test', 'refreshToken=test').next).toHaveBeenCalled();
  });
  it('bloqueia origem externa mesmo com cookie válido', () => {
    const result = request('https://attacker.test', 'refreshToken=test');
    expect(result.response.status).toHaveBeenCalledWith(403);
    expect(result.next).not.toHaveBeenCalled();
  });
  it('bloqueia cookie sem origem e origem null', () => {
    expect(request(undefined, 'refreshToken=test').response.status).toHaveBeenCalledWith(403);
    expect(request('null', 'refreshToken=test').response.status).toHaveBeenCalledWith(403);
  });
  it('preserva requests sem sessão e endpoints com bearer', () => {
    expect(request().next).toHaveBeenCalled();
    expect(request(undefined, undefined, '/api/vendas').next).toHaveBeenCalled();
  });

  it.each(['/api/auth/refresh/', '/API/AUTH/REFRESH', '/api/auth/login', '/api/auth/register'])(
    'bloqueia origem externa em %s',
    (path) => {
      expect(
        request('https://attacker.test', undefined, path).response.status,
      ).toHaveBeenCalledWith(403);
    },
  );
});
