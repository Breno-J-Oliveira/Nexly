import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import argon2 from 'argon2';
import { expect, test } from '../fixtures';

test('refresh concorrente recupera um único sucessor e replay de ancestral revoga a sessão', async ({
  request,
  baseURL,
}) => {
  test.setTimeout(120000);
  const apiURL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
  test.skip(
    !['localhost', '127.0.0.1'].includes(
      new URL(process.env.DATABASE_URL || 'http://unavailable').hostname,
    ) || !['localhost', '127.0.0.1'].includes(new URL(apiURL).hostname),
    'Somente API e banco locais',
  );
  const db = new PrismaClient();
  const stamp = randomUUID();
  const senha = 'RefreshLocal123!';
  const email = `refresh-http-${stamp}@example.test`;
  const empresa = await db.empresa.create({
    data: {
      nome: 'TESTE refresh concorrente',
      cnpj: `refresh-http-${stamp}`,
      usuarios: {
        create: {
          nome: 'Teste de sessão',
          email,
          senhaHash: await argon2.hash(senha),
          role: 'ADMIN',
        },
      },
    },
    include: { usuarios: true },
  });
  const cookie = (header: string | undefined) => {
    const value = header?.match(/(?:^|,\s*)refreshToken=([^;]+)/)?.[1];
    if (!value) throw new Error('Cookie de refresh ausente');
    return `refreshToken=${value}`;
  };
  try {
    const login = await request.post(`${apiURL}/api/auth/login`, {
      headers: { Origin: baseURL! },
      data: { email, senha },
    });
    expect(login.status()).toBe(200);
    const { accessToken } = await login.json();
    const original = cookie(login.headers()['set-cookie']);
    const responses = await Promise.all(
      Array.from({ length: 6 }, () =>
        request.post(`${apiURL}/api/auth/refresh`, {
          headers: { Origin: baseURL!, Cookie: original },
          data: {},
        }),
      ),
    );
    expect(responses.every((r) => r.status() === 200)).toBe(true);
    const successors = new Set(responses.map((r) => cookie(r.headers()['set-cookie'])));
    expect(successors.size).toBe(1);
    const successor = [...successors][0]!;
    expect(successor === original).toBe(false);
    const usuarioId = empresa.usuarios[0]!.id;
    expect(await db.refreshToken.count({ where: { usuarioId, revogado: false } })).toBe(1);
    expect(await db.refreshToken.count({ where: { usuarioId } })).toBe(2);
    const session = await db.authSession.findFirstOrThrow({ where: { usuarioId } });
    expect(Boolean(session.lastRotationResponse)).toBe(true);
    expect(session.lastRotationResponse!.includes(successor.slice('refreshToken='.length))).toBe(
      false,
    );
    expect(
      (
        await request.post(`${apiURL}/api/auth/refresh`, {
          headers: { Origin: baseURL!, Cookie: successor },
          data: {},
        })
      ).status(),
    ).toBe(200);
    const replay = await request.post(`${apiURL}/api/auth/refresh`, {
      headers: { Origin: baseURL!, Cookie: original },
      data: {},
    });
    expect(replay.status()).toBe(401);
    expect((await db.authSession.findUniqueOrThrow({ where: { id: session.id } })).revogado).toBe(
      true,
    );
    expect(await db.refreshToken.count({ where: { usuarioId, revogado: false } })).toBe(0);
    expect(
      (
        await request.get(`${apiURL}/api/auth/me`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        })
      ).status(),
    ).toBe(401);
  } finally {
    await db.empresa.deleteMany({ where: { id: empresa.id } });
    await db.$disconnect();
  }
});
