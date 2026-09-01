import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { RedisService } from '../src/redis/redis.service';
import { configureApp } from '../src/app.config';

jest.setTimeout(30000);

describe('Auth E2E', () => {
  let app: INestApplication;
  const testEmail = `e2e-auth-${Date.now()}@test.com`;
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

  describe('POST /auth/register', () => {
    it('should register a new user (anti-enumeration: returns generic message)', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/register')
        .send({ email: testEmail, password: testPassword, name: 'E2E Test User' })
        .expect(201);

      expect(res.body).toHaveProperty('message');
      expect(res.body.message).toContain('verification link');
    });

    it('should return same message for duplicate email (anti-enumeration)', async () => {
      // Use unique email to avoid rate limit collision with previous test
      const uniqueEmail = `e2e-dup-${Date.now()}@test.com`;
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({ email: uniqueEmail, password: testPassword, name: 'First' })
        .expect(201);

      const res = await request(app.getHttpServer())
        .post('/auth/register')
        .send({ email: uniqueEmail, password: testPassword, name: 'Duplicate' })
        .expect(201);

      expect(res.body).toHaveProperty('message');
      expect(res.body.message).toContain('verification link');
    });

    it('should reject weak password', async () => {
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({ email: `weak-${Date.now()}@test.com`, password: '123', name: 'Weak' })
        .expect(400);
    });
  });

  describe('POST /auth/login', () => {
    it('should login with valid credentials', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/login')
        .set('User-Agent', 'Jest/1.0')
        .send({ email: testEmail, password: testPassword })
        .expect(200);

      expect(res.body).toHaveProperty('accessToken');
      expect(res.body).toHaveProperty('refreshToken');
      accessToken = res.body.accessToken;
      refreshToken = res.body.refreshToken;
    });

    it('should return 409 IDEMPOTENCY_KEY_CONFLICT when same Idempotency-Key but different bodies are sent', async () => {
      const idemKey = `idem-${Date.now()}-login-conflict-1`;

      const first = await request(app.getHttpServer())
        .post('/auth/login')
        .set('Idempotency-Key', idemKey)
        .send({ email: testEmail, password: testPassword })
        .expect(200);

      expect(first.body).toHaveProperty('accessToken');

      await request(app.getHttpServer())
        .post('/auth/login')
        .set('Idempotency-Key', idemKey)
        .send({ email: testEmail, password: 'WrongPassword123!' })
        .expect(409)
        .expect((res) => {
          expect(res.body).toHaveProperty('code', 'IDEMPOTENCY_KEY_CONFLICT');
        });
    });

    it('should replay cached response when same Idempotency-Key and identical body are sent', async () => {
      const idemKey = `idem-${Date.now()}-login-replay-1`;

      const first = await request(app.getHttpServer())
        .post('/auth/login')
        .set('Idempotency-Key', idemKey)
        .send({ email: testEmail, password: testPassword })
        .expect(200);

      expect(first.headers['idempotent-replay']).toBeUndefined();

      const second = await request(app.getHttpServer())
        .post('/auth/login')
        .set('Idempotency-Key', idemKey)
        .send({ email: testEmail, password: testPassword })
        .expect(200);

      expect(second.headers['idempotent-replay']).toBe('true');
      expect(second.body).toHaveProperty('accessToken');
      expect(second.body).toHaveProperty('refreshToken');
    });

    it('should reject invalid password', async () => {
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: testEmail, password: 'WrongPassword123!' })
        .expect(401);
    });

    it('should reject non-existent user', async () => {
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'nonexistent@test.com', password: testPassword })
        .expect(401);
    });
  });

  describe('POST /auth/refresh', () => {
    it('should refresh tokens', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ refreshToken })
        .expect(200);

      expect(res.body).toHaveProperty('accessToken');
      expect(res.body).toHaveProperty('refreshToken');
      accessToken = res.body.accessToken;
      refreshToken = res.body.refreshToken;
    });

    it('should reject invalid refresh token', async () => {
      await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ refreshToken: 'invalid-token' })
        .expect(400);
    });
  });

  describe('GET /auth/me', () => {
    it('should return user profile with valid token', async () => {
      const res = await request(app.getHttpServer())
        .get('/auth/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(res.body).toHaveProperty('id');
      expect(res.body.email).toBe(testEmail);
    });

    it('should reject without token', async () => {
      await request(app.getHttpServer())
        .get('/auth/me')
        .expect(401);
    });

    it('should reject with invalid token', async () => {
      await request(app.getHttpServer())
        .get('/auth/me')
        .set('Authorization', 'Bearer invalid.jwt.token')
        .expect(401);
    });
  });

  describe('POST /auth/logout', () => {
    it('should logout successfully', async () => {
      await request(app.getHttpServer())
        .post('/auth/logout')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ refreshToken })
        .expect(201);
    });

    it('should reject refresh token after logout', async () => {
      await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ refreshToken })
        .expect(401);
    });
  });
});
