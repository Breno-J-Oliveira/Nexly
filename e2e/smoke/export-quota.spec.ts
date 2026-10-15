import { expect, test } from '../fixtures';
import { PrismaClient } from '@prisma/client';
import { config } from 'dotenv';
import argon2 from 'argon2';
config({ path: 'apps/api/.env', quiet: true });

test('limite de exportação é por conta e não bloqueia colegas nem controles de privacidade', async ({
  request,
  baseURL,
}) => {
  test.skip(
    !['localhost', '127.0.0.1'].includes(
      new URL(process.env.DATABASE_URL || 'http://unavailable').hostname,
    ),
    'Fixtures somente locais',
  );
  const p = new PrismaClient(),
    stamp = Date.now(),
    senha = 'ExportarSeguro123!';
  const empresa = await p.empresa.create({
    data: {
      nome: 'TESTE cotas de exportação',
      cnpj: `quota-${stamp}`,
      usuarios: {
        create: await Promise.all(
          [0, 1].map(async (index) => ({
            nome: `Teste ${index}`,
            email: `quota-${index}-${stamp}@example.test`,
            senhaHash: await argon2.hash(senha),
            role: 'ADMIN' as const,
          })),
        ),
      },
    },
    include: { usuarios: true },
  });
  const api = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
  const login = async (email: string) => {
    const r = await request.post(`${api}/api/auth/login`, {
      headers: { Origin: baseURL! },
      data: { email, senha },
    });
    expect(r.status()).toBe(200);
    return (await r.json()).accessToken as string;
  };
  try {
    const accessToken = await login(empresa.usuarios[0]!.email);
    const headers = { Authorization: `Bearer ${accessToken}`, Origin: baseURL! };
    for (let i = 0; i < 3; i++)
      expect((await request.get(`${api}/api/export/vendas/csv`, { headers })).status()).toBe(200);
    const limited = await request.get(`${api}/api/export/vendas/csv`, { headers });
    expect(limited.status()).toBe(429);
    expect(Number(limited.headers()['retry-after'])).toBeGreaterThan(0);
    for (let i = 0; i < 5; i++)
      expect((await request.get(`${api}/api/lgpd/status-exclusao`, { headers })).status()).toBe(
        200,
      );
    const other = await login(empresa.usuarios[1]!.email);
    expect(
      (
        await request.get(`${api}/api/export/vendas/csv`, {
          headers: { ...headers, Authorization: `Bearer ${other}` },
        })
      ).status(),
    ).toBe(200);
  } finally {
    await p.empresa.delete({ where: { id: empresa.id } });
    await p.$disconnect();
  }
});
