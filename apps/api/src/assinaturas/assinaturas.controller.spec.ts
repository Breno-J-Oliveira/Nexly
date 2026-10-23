import { INestApplication, ValidationPipe } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import { Request, Response, NextFunction } from 'express';
import { registerRequestBodyParsers } from '../common/middleware/request-body-parsers';
import { HttpExceptionFilter } from '../common/filters/http-exception.filter';
import request from 'supertest';
import { AssinaturasController } from './assinaturas.controller';
import { AssinaturasService } from './assinaturas.service';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { tenantStorage } from '../database/tenant-context';

describe('Fronteiras HTTP de assinaturas', () => {
  let app: INestApplication;
  const service = {
    status: jest.fn().mockResolvedValue({ ambiente: 'test' }),
    checkout: jest.fn().mockResolvedValue({ url: 'https://checkout.stripe.com/test' }),
    portal: jest.fn(),
    webhook: jest.fn().mockResolvedValue({ received: true }),
  };
  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers: [AssinaturasController],
      providers: [
        { provide: AssinaturasService, useValue: service },
        { provide: APP_GUARD, useClass: PermissionsGuard },
      ],
    }).compile();
    app = module.createNestApplication({ bodyParser: false });
    registerRequestBodyParsers(app, '');
    app.use((req: Request, _res: Response, next: NextFunction) => {
      const role = String(req.headers['test-role'] ?? '');
      if (role)
        req.user = {
          id: 'u1',
          empresaId: 'e1',
          email: 'test@example.com',
          role,
        } as Request['user'];
      tenantStorage.run({ tenantId: 'e1', userId: 'u1', email: 'test@example.com', role }, next);
    });
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
    );
    app.useGlobalFilters(new HttpExceptionFilter());
    await app.init();
  });
  afterAll(async () => {
    await app.close();
  });
  beforeEach(() => jest.clearAllMocks());

  it('mantém erros de JSON e tamanho como 400 e 413 com o filtro real', async () => {
    await request(app.getHttpServer())
      .post('/assinaturas/checkout')
      .set('Content-Type', 'application/json')
      .send('{invalid')
      .expect(400);
    await request(app.getHttpServer())
      .post('/assinaturas/webhook')
      .set('Content-Type', 'application/json')
      .send(JSON.stringify({ text: 'a'.repeat(120_000) }))
      .expect(413);
    expect(service.webhook).not.toHaveBeenCalled();
    expect(service.checkout).not.toHaveBeenCalled();
  });

  it.each(['br', 'gzip', 'deflate'])(
    'rejeita webhook comprimido com %s antes de chamar o serviço',
    async (encoding) => {
      await request(app.getHttpServer())
        .post('/assinaturas/webhook')
        .set('Content-Type', 'application/json')
        .set('Content-Encoding', encoding)
        .send('{"id":"evt_compressed"}')
        .expect(415);
      expect(service.webhook).not.toHaveBeenCalled();
    },
  );

  it.each(['GESTOR', 'PROFISSIONAL', 'RECEPCIONISTA', 'CAIXA'])(
    'nega operações de cobrança para %s',
    async (role) => {
      await request(app.getHttpServer()).get('/assinaturas').set('test-role', role).expect(403);
      await request(app.getHttpServer())
        .post('/assinaturas/checkout')
        .set('test-role', role)
        .send({ plano: 'BASIC' })
        .expect(403);
      await request(app.getHttpServer())
        .post('/assinaturas/portal')
        .set('test-role', role)
        .send({})
        .expect(403);
      await request(app.getHttpServer())
        .post('/assinaturas/atualizar-status')
        .set('test-role', role)
        .send({})
        .expect(403);
      expect(service.checkout).not.toHaveBeenCalled();
    },
  );

  it('rejeita preço, tenant e retorno controlados pelo cliente', async () => {
    await request(app.getHttpServer())
      .post('/assinaturas/checkout')
      .set('test-role', 'ADMIN')
      .send({ plano: 'BASIC', empresaId: 'other', price: 1, return_url: 'https://example.com' })
      .expect(400);
    expect(service.checkout).not.toHaveBeenCalled();
  });

  it('admin contrata usando o tenant do contexto', async () => {
    await request(app.getHttpServer())
      .post('/assinaturas/checkout')
      .set('test-role', 'ADMIN')
      .send({ plano: 'PRO' })
      .expect(200);
    expect(service.checkout).toHaveBeenCalledWith('e1', 'PRO');
  });

  it('webhook dispensa login, preserva bytes e exige assinatura', async () => {
    const payload = '{ "id": "evt_1", "data": {} }';
    await request(app.getHttpServer())
      .post('/assinaturas/webhook')
      .set('Content-Type', 'application/json')
      .set('stripe-signature', 'test-signature')
      .send(payload)
      .expect(200);
    expect(service.webhook).toHaveBeenCalledWith(Buffer.from(payload), 'test-signature');
    await request(app.getHttpServer())
      .post('/assinaturas/webhook')
      .send({ id: 'no_signature' })
      .expect(400);
  });
});
