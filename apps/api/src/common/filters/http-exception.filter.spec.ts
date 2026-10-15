import { Prisma } from '@prisma/client';
import {
  ArgumentsHost,
  BadRequestException,
  ConflictException,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { HttpExceptionFilter } from './http-exception.filter';

interface MockResponse {
  status: jest.Mock;
  json: jest.Mock;
}

function makeHost(
  req: { id?: string } = {},
  res: MockResponse = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  },
): ArgumentsHost {
  return {
    switchToHttp: () => ({
      getRequest: <T = unknown>() => req as unknown as T,
      getResponse: <T = unknown>() => res as unknown as T,
    }),
  } as unknown as ArgumentsHost;
}

describe('HttpExceptionFilter', () => {
  let filter: HttpExceptionFilter;
  let errorSpy: jest.SpyInstance;

  beforeEach(() => {
    filter = new HttpExceptionFilter();
    errorSpy = jest.spyOn(Logger.prototype, 'error').mockImplementation();
  });

  afterEach(() => {
    errorSpy.mockRestore();
  });

  it('extrai o `code` semântico e o propaga na resposta', () => {
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn().mockReturnThis() };
    const host = makeHost({}, res);

    filter.catch(
      new ConflictException({ code: 'BUSY_PROFESSIONAL', message: 'Profissional ocupado' }),
      host,
    );

    expect(res.status).toHaveBeenCalledWith(HttpStatus.CONFLICT);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 409,
        code: 'BUSY_PROFESSIONAL',
        message: 'Profissional ocupado',
        timestamp: expect.any(String),
      }),
    );
  });

  it('extrai `code` em BadRequestException também', () => {
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn().mockReturnThis() };
    const host = makeHost({}, res);

    filter.catch(
      new BadRequestException({ code: 'OUT_OF_STOCK', message: 'Saldo insuficiente' }),
      host,
    );

    expect(res.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ code: 'OUT_OF_STOCK', message: 'Saldo insuficiente' }),
    );
  });

  it('omite `code` quando a exceção não traz um', () => {
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn().mockReturnThis() };
    const host = makeHost({}, res);

    filter.catch(new HttpException('Erro qualquer', HttpStatus.FORBIDDEN), host);

    const body = res.json.mock.calls[0][0];
    expect(body).not.toHaveProperty('code');
    expect(body).toMatchObject({ statusCode: 403, message: 'Erro qualquer' });
  });

  it('preserva o requestId do request, quando presente', () => {
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn().mockReturnThis() };
    const host = makeHost({ id: 'req-abc' }, res);

    filter.catch(new ConflictException('Boom'), host);

    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ requestId: 'req-abc' }));
  });

  it('retorna 500 com mensagem genérica para erros não-HttpException', () => {
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn().mockReturnThis() };
    const host = makeHost({ id: 'req-xyz' }, res);

    filter.catch(new Error('Banco de dados caiu'), host);

    expect(res.status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
    const body = res.json.mock.calls[0][0];
    expect(body).toMatchObject({
      statusCode: 500,
      message: 'Erro interno do servidor',
      requestId: 'req-xyz',
    });
    expect(body).not.toHaveProperty('code');
    expect(errorSpy).toHaveBeenCalled();
  });
  it.each([
    ['P2002', 409],
    ['P2003', 409],
    ['P2025', 404],
    ['P2034', 409],
  ])('classifica %s sem expor SQL e dados privados', (code, status) => {
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    const error = new Prisma.PrismaClientKnownRequestError(
      'SQL com email privado e token secreto',
      { code: String(code), clientVersion: 'test', meta: { target: 'secret-column' } },
    );
    filter.catch(error, makeHost({}, res));
    expect(res.status).toHaveBeenCalledWith(status);
    expect(JSON.stringify(res.json.mock.calls)).not.toMatch(/SQL|secreto|secret-column|privado/);
    expect(errorSpy).not.toHaveBeenCalled();
  });

  it('nao registra dados da excecao inesperada em producao', () => {
    const previous = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    try {
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
      filter.catch(new Error('token-secreto-na-mensagem'), makeHost({ id: 'request-safe' }, res));
      expect(JSON.stringify(res.json.mock.calls)).not.toContain('token-secreto');
      expect(JSON.stringify(errorSpy.mock.calls)).not.toContain('token-secreto');
      expect(JSON.stringify(errorSpy.mock.calls)).toContain('request-safe');
    } finally {
      process.env.NODE_ENV = previous;
    }
  });
});
