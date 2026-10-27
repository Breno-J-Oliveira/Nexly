import { expect, test } from '../fixtures';
import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'crypto';
import argon2 from 'argon2';
import { config } from 'dotenv';

config({ path: 'apps/api/.env', quiet: true });

test('primeiros acessos concorrentes preservam um link público por empresa', async ({
  request,
  baseURL,
}) => {
  const database = new URL(process.env.DATABASE_URL || 'http://unavailable');
  test.skip(
    !['localhost', '127.0.0.1'].includes(database.hostname) || !database.pathname.includes('test'),
    'Fixtures somente em banco local de teste',
  );
  const api = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
  expect(['localhost', '127.0.0.1']).toContain(new URL(api).hostname);
  const prisma = new PrismaClient();
  const created: string[] = [];
  const links: string[] = [];
  const password = 'AgendaDeTeste123!';
  try {
    for (let tenant = 0; tenant < 2; tenant++) {
      const stamp = randomUUID();
      const email = `booking-link-${stamp}@example.test`;
      const company = await prisma.empresa.create({
        data: {
          nome: 'TESTE criação concorrente de link',
          cnpj: `link-${stamp}`,
          usuarios: {
            create: {
              nome: 'Gestor de teste',
              email,
              senhaHash: await argon2.hash(password),
              role: 'ADMIN',
            },
          },
        },
      });
      created.push(company.id);
      const login = await request.post(`${api}/api/auth/login`, {
        headers: { Origin: baseURL! },
        data: { email, senha: password },
      });
      expect(login.status()).toBe(200);
      const headers = { Authorization: `Bearer ${(await login.json()).accessToken}` };
      const responses = await Promise.all(
        Array.from({ length: 12 }, () =>
          request.get(`${api}/api/configuracoes/link-agendamento`, { headers }),
        ),
      );
      const tokens: string[] = [];
      for (const response of responses) {
        expect(response.status()).toBe(200);
        tokens.push((await response.json()).token);
      }
      expect(new Set(tokens).size).toBe(1);
      const saved = await prisma.empresa.findUniqueOrThrow({ where: { id: company.id } });
      expect(tokens.every((token) => token === saved.bookingToken)).toBe(true);
      expect(saved.bookingToken).toMatch(/^[a-f0-9]{32}$/);
      const later = await request.get(`${api}/api/configuracoes/link-agendamento`, { headers });
      expect((await later.json()).token).toBe(saved.bookingToken);
      links.push(saved.bookingToken!);
    }
    expect(new Set(links).size).toBe(2);
    const persisted = await prisma.empresa.findMany({ where: { id: { in: created } } });
    expect(persisted.map((company) => company.bookingToken).sort()).toEqual([...links].sort());
  } finally {
    await prisma.empresa.deleteMany({ where: { id: { in: created } } });
    await prisma.$disconnect();
  }
});
