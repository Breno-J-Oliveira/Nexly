import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { RedisService } from '../src/redis/redis.service';
import { configureApp } from '../src/app.config';

jest.setTimeout(30000);

describe('Integration: register â†’ login â†’ protected route â†’ logout', () => {
  let app: INestApplication;
  const testEmail = `e2e-integration-${Date.now()}@test.com`;
  const testPassword = 'Str0ng!Pass1';
  let accessToken: string;
  let refreshToken: string;

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

  it('Step 1: Register', async () => {
    const res = await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email: testEmail, password: testPassword, name: 'Integration User' })
      .expect(201);

    expect(res.body).toHaveProperty('message');
    expect(res.body.message).toContain('verification link');
  });

  it('Step 2: Login', async () => {
    const res = await request(app.getHttpServer())
      .post('/auth/login')
      .set('User-Agent', 'Jest/1.0')
      .send({ email: testEmail, password: testPassword })
      .expect(200);

    expect(res.body.accessToken).toBeDefined();
    expect(res.body.refreshToken).toBeDefined();
    accessToken = res.body.accessToken;
    refreshToken = res.body.refreshToken;
  });

  it('Step 3: Access protected route (GET /auth/me)', async () => {
    const res = await request(app.getHttpServer())
      .get('/auth/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(res.body.email).toBe(testEmail);
  });

  it('Step 4: Access sessions (GET /sessions)', async () => {
    const res = await request(app.getHttpServer())
      .get('/sessions')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
  });

  it('Step 5: Refresh token', async () => {
    const res = await request(app.getHttpServer())
      .post('/auth/refresh')
      .send({ refreshToken })
      .expect(200);

    expect(res.body.accessToken).toBeDefined();
    accessToken = res.body.accessToken;
    refreshToken = res.body.refreshToken;
  });

  it('Step 6: Access protected route with new token', async () => {
    await request(app.getHttpServer())
      .get('/auth/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);
  });

  it('Step 7: Logout', async () => {
    await request(app.getHttpServer())
      .post('/auth/logout')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ refreshToken })
      .expect(201);
  });

  it('Step 8: Verify token is revoked after logout', async () => {
    await request(app.getHttpServer())
      .post('/auth/refresh')
      .send({ refreshToken })
      .expect(401);
  });
});
