import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { authenticator } from 'otplib';
import { RedisService } from '../src/redis/redis.service';
import { configureApp } from '../src/app.config';

jest.setTimeout(30000);

describe('2FA E2E', () => {
  let app: INestApplication;
  const testEmail = `e2e-2fa-${Date.now()}@test.com`;
  const testPassword = 'Str0ng!Pass1';
  let accessToken: string;
  let refreshToken: string;
  let twoFactorSecret: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    configureApp(app);
    await app.init();

    const redis = app.get(RedisService);
    await redis.flushall();
  });

  afterAll(async () => {
    await app.close();
  });

  it('should register and login a user', async () => {
    await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email: testEmail, password: testPassword, name: '2FA Test User' })
      .expect(201);

    const loginRes = await request(app.getHttpServer())
      .post('/auth/login')
      .set('User-Agent', 'Jest/1.0')
      .send({ email: testEmail, password: testPassword })
      .expect(200);

    accessToken = loginRes.body.accessToken;
    refreshToken = loginRes.body.refreshToken;
  });

  describe('POST /2fa/setup', () => {
    it('should return 2FA secret and QR code', async () => {
      const res = await request(app.getHttpServer())
        .post('/2fa/setup')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(201);

      expect(res.body).toHaveProperty('secret');
      expect(res.body).toHaveProperty('qrCodeUrl');
      twoFactorSecret = res.body.secret;
    });
  });

  describe('POST /2fa/verify', () => {
    it('should enable 2FA with valid TOTP code', async () => {
      const code = authenticator.generate(twoFactorSecret);
      const res = await request(app.getHttpServer())
        .post('/2fa/verify')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ code })
        .expect(201);

      expect(res.body).toHaveProperty('message');
    });

    it('should reject invalid TOTP code', async () => {
      await request(app.getHttpServer())
        .post('/2fa/verify')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ code: '000000' })
        .expect(400);
    });
  });

  describe('POST /2fa/challenge', () => {
    it('should require 2FA on login after enable', async () => {
      const redis = app.get(RedisService);
      await redis.flushall();

      const res = await request(app.getHttpServer())
        .post('/auth/login')
        .set('User-Agent', 'Jest/1.0')
        .send({ email: testEmail, password: testPassword })
        .expect(200);

      expect(res.body).toHaveProperty('requiresTwoFactor', true);
      expect(res.body).toHaveProperty('challengeToken');
    });

    it('should resolve 2FA challenge with valid code', async () => {
      const loginRes = await request(app.getHttpServer())
        .post('/auth/login')
        .set('User-Agent', 'Jest/1.0')
        .send({ email: testEmail, password: testPassword });

      const challengeToken = loginRes.body.challengeToken;
      const totpCode = authenticator.generate(twoFactorSecret);

      const res = await request(app.getHttpServer())
        .post('/2fa/challenge')
        .send({ challengeToken, code: totpCode })
        .expect(200);

      expect(res.body).toHaveProperty('accessToken');
      expect(res.body).toHaveProperty('refreshToken');
      accessToken = res.body.accessToken;
    });
  });

  describe('POST /2fa/disable', () => {
    it('should disable 2FA with valid password', async () => {
      const code = authenticator.generate(twoFactorSecret);
      const res = await request(app.getHttpServer())
        .post('/2fa/disable')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ password: testPassword, code })
        .expect(201);

      expect(res.body).toHaveProperty('message');
    });
  });
});
