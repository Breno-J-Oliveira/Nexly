import { CallHandler, ExecutionContext, Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { of, throwError } from 'rxjs';
import { LoggingInterceptor } from './logging.interceptor';

interface MockRequest {
  headers: Record<string, string>;
  id?: string;
  method?: string;
  originalUrl?: string;
}
interface MockResponse {
  setHeader: jest.Mock;
  statusCode: number;
}

function makeContext(
  req: MockRequest = { headers: {}, method: 'GET', originalUrl: '/teste' },
  res: MockResponse = { setHeader: jest.fn(), statusCode: 200 },
): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: <T = unknown>() => req as unknown as T,
      getResponse: <T = unknown>() => res as unknown as T,
    }),
  } as unknown as ExecutionContext;
}

describe('LoggingInterceptor', () => {
  let interceptor: LoggingInterceptor;
  let logSpy: jest.SpyInstance;
  let errorSpy: jest.SpyInstance;

  beforeEach(() => {
    interceptor = new LoggingInterceptor();
    logSpy = jest.spyOn(Logger.prototype, 'log').mockImplementation();
    errorSpy = jest.spyOn(Logger.prototype, 'error').mockImplementation();
  });

  afterEach(() => {
    logSpy.mockRestore();
    errorSpy.mockRestore();
  });

  it('gera um X-Request-Id e o devolve no header', (done) => {
    const res = { setHeader: jest.fn(), statusCode: 200 };
    const req: MockRequest = { headers: {}, method: 'GET', originalUrl: '/teste' };
    const next: CallHandler = { handle: () => of('ok') };

    interceptor.intercept(makeContext(req, res), next).subscribe(() => {
      expect(res.setHeader).toHaveBeenCalledWith('X-Request-Id', expect.any(String));
      const id = res.setHeader.mock.calls[0][1] as string;
      expect(id).toMatch(/^[0-9a-f-]{36}$/); // UUID
      done();
    });
  });

  it('reusa o X-Request-Id do header recebido', (done) => {
    const recebido = randomUUID();
    const res = { setHeader: jest.fn(), statusCode: 200 };
    const req: MockRequest = { headers: { 'x-request-id': recebido }, method: 'GET', originalUrl: '/teste' };
    const next: CallHandler = { handle: () => of('ok') };

    interceptor.intercept(makeContext(req, res), next).subscribe(() => {
      expect(res.setHeader).toHaveBeenCalledWith('X-Request-Id', recebido);
      done();
    });
  });

  it('loga request bem-sucedido com método, status e duração', (done) => {
    const res = { setHeader: jest.fn(), statusCode: 201 };
    const req: MockRequest = { headers: {}, method: 'GET', originalUrl: '/teste' };
    const next: CallHandler = { handle: () => of({ id: 1 }) };

    interceptor.intercept(makeContext(req, res), next).subscribe(() => {
      expect(logSpy).toHaveBeenCalled();
      const mensagem = logSpy.mock.calls[0][0] as string;
      expect(mensagem).toMatch(/GET \/teste 201 \d+ms \[.+\]/);
      done();
    });
  });

  it('loga request com erro', (done) => {
    const res = { setHeader: jest.fn(), statusCode: 500 };
    const req: MockRequest = { headers: {}, method: 'POST', originalUrl: '/err' };
    const erro = new Error('boom');
    const next: CallHandler = { handle: () => throwError(() => erro) };

    interceptor.intercept(makeContext(req, res), next).subscribe({
      error: () => {
        expect(errorSpy).toHaveBeenCalled();
        const mensagem = errorSpy.mock.calls[0][0] as string;
        expect(mensagem).toContain('boom');
        done();
      },
    });
  });

  it('em produção, emite log no formato JSON', (done) => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    try {
      const res = { setHeader: jest.fn(), statusCode: 200 };
      const req: MockRequest = { headers: {}, method: 'POST', originalUrl: '/api/agendamentos' };
      const next: CallHandler = { handle: () => of({ id: 1 }) };

      interceptor.intercept(makeContext(req, res), next).subscribe(() => {
        expect(logSpy).toHaveBeenCalled();
        const mensagem = logSpy.mock.calls[0][0] as string;
        const parsed = JSON.parse(mensagem) as Record<string, unknown>;
        expect(parsed).toMatchObject({
          level: 'info',
          kind: 'http',
          method: 'POST',
          path: '/api/agendamentos',
          status: 200,
        });
        expect(typeof parsed.durationMs).toBe('number');
        expect(typeof parsed.requestId).toBe('string');
        done();
      });
    } finally {
      process.env.NODE_ENV = originalEnv;
    }
  });

  it('em produção, emite erro no formato JSON com a mensagem', (done) => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    try {
      const res = { setHeader: jest.fn(), statusCode: 500 };
      const req: MockRequest = { headers: {}, method: 'GET', originalUrl: '/x' };
      const next: CallHandler = { handle: () => throwError(() => new Error('boom')) };

      interceptor.intercept(makeContext(req, res), next).subscribe({
        error: () => {
          const mensagem = errorSpy.mock.calls[0][0] as string;
          const parsed = JSON.parse(mensagem) as Record<string, unknown>;
          expect(parsed).toMatchObject({
            level: 'error',
            kind: 'http',
            method: 'GET',
            path: '/x',
            status: 500,
            message: 'boom',
          });
          done();
        },
      });
    } finally {
      process.env.NODE_ENV = originalEnv;
    }
  });
});