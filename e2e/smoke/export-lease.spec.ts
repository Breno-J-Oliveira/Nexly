import { expect, test } from '../fixtures';
import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'crypto';
import argon2 from 'argon2';
import Redis from 'ioredis';
import { config } from 'dotenv';

config({ path: 'apps/api/.env', quiet: true });

test('exportações usam a reserva Redis real por empresa e preservam os dados completos', async ({
  request,
  baseURL,
}) => {
  const database = new URL(process.env.DATABASE_URL || 'http://unavailable');
  const redisUrl = new URL(process.env.REDIS_URL || 'redis://localhost:6380');
  const local = (hostname: string) => ['localhost', '127.0.0.1'].includes(hostname);
  // GitHub Actions starts an isolated Redis service on 6379; local fixtures use 6380.
  const allowedRedisPort =
    redisUrl.port === '6380' || (process.env.CI === 'true' && redisUrl.port === '6379');
  test.skip(
    !local(database.hostname) ||
      !database.pathname.includes('test') ||
      !local(redisUrl.hostname) ||
      !allowedRedisPort,
    'Fixtures somente em PostgreSQL local de teste e Redis local 6380 (6379 somente no CI)',
  );
  const api = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
  expect(local(new URL(api).hostname)).toBe(true);
  const prisma = new PrismaClient();
  const redis = new Redis(redisUrl.toString(), { lazyConnect: true, maxRetriesPerRequest: 1 });
  const created: string[] = [];
  const keys: string[] = [];
  const password = 'ExportacaoDeTeste123!';
  const tenants: { id: string; clientId: string; headers: { Authorization: string } }[] = [];
  try {
    await redis.connect();
    for (let tenant = 0; tenant < 2; tenant++) {
      const stamp = randomUUID();
      const email = `export-lease-${stamp}@example.test`;
      const company = await prisma.empresa.create({
        data: {
          nome: 'TESTE reserva de exportação',
          cnpj: `export-${stamp}`,
          usuarios: {
            create: {
              nome: 'Administrador de teste',
              email,
              senhaHash: await argon2.hash(password),
              role: 'ADMIN',
            },
          },
          documentos: {
            create: { titulo: 'Documento integral', conteudo: 'conteudo completo '.repeat(1000) },
          },
        },
      });
      created.push(company.id);
      keys.push(`lgpd:export:lease:${company.id}`);
      const client = await prisma.cliente.create({
        data: { empresaId: company.id, nome: `Cliente ${stamp}` },
      });
      const login = await request.post(`${api}/api/auth/login`, {
        headers: { Origin: baseURL! },
        data: { email, senha: password },
      });
      expect(login.status()).toBe(200);
      tenants.push({
        id: company.id,
        clientId: client.id,
        headers: { Authorization: `Bearer ${(await login.json()).accessToken}` },
      });
    }
    const [a, b] = tenants;
    const owner = randomUUID();
    expect(await redis.set(keys[0], owner, 'EX', 900, 'NX')).toBe('OK');
    for (const path of ['/api/lgpd/exportar', `/api/lgpd/exportar/cliente/${a.clientId}`]) {
      const blocked = await request.get(`${api}${path}`, { headers: a.headers });
      expect(blocked.status()).toBe(429);
      expect((await blocked.json()).code).toBe('EXPORT_IN_PROGRESS');
      expect(await redis.get(keys[0])).toBe(owner);
    }
    // A's reservation cannot block B. Successful HTTP also exercises real Lua cleanup.
    const other = await request.get(`${api}/api/lgpd/exportar/cliente/${b.clientId}`, {
      headers: b.headers,
    });
    expect(other.status()).toBe(200);
    expect((await other.json()).empresaId).toBe(b.id);
    expect(await redis.get(keys[1])).toBeNull();
    expect(await redis.get(keys[0])).toBe(owner);
    await redis.del(keys[0]);
    const exported = await request.get(`${api}/api/lgpd/exportar`, { headers: a.headers });
    expect(exported.status()).toBe(200);
    const data = await exported.json();
    expect(data.empresaId).toBe(a.id);
    expect(data.clientes.map((client: { id: string }) => client.id)).toEqual([a.clientId]);
    expect(data.documentos).toHaveLength(1);
    expect(data.documentos[0].conteudo).toBe('conteudo completo '.repeat(1000));
    expect(await redis.get(keys[0])).toBeNull();
    // Failed export lookup must also release the reservation without exposing A's client.
    const denied = await request.get(`${api}/api/lgpd/exportar/cliente/${a.clientId}`, {
      headers: b.headers,
    });
    expect(denied.status()).toBe(404);
    expect(await redis.get(keys[1])).toBeNull();
  } finally {
    await Promise.allSettled(keys.map((key) => redis.del(key)));
    await redis.quit().catch(() => undefined);
    try {
      await prisma.cliente.deleteMany({ where: { empresaId: { in: created } } });
      await prisma.empresa.deleteMany({ where: { id: { in: created } } });
    } finally {
      await prisma.$disconnect();
    }
  }
});
