import { INestApplication, ValidationPipe } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import { raw, json, Request, Response, NextFunction } from 'express';
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
    app.use('/assinaturas/webhook', raw({ type: 'application/json' }));
    app.use(json());
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
    await app.init();
  });
  afterAll(async () => {
    await app.close();
  });
  beforeEach(() => jest.clearAllMocks());

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
