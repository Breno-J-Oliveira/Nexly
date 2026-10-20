import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { expect, test } from '../fixtures';

test('convites são consumidos uma única vez sob concorrência e preservam função e empresa', async ({
  request,
}) => {
  test.setTimeout(120000);
  const api = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
  test.skip(
    !['localhost', '127.0.0.1'].includes(
      new URL(process.env.DATABASE_URL || 'http://unavailable').hostname,
    ) || !['localhost', '127.0.0.1'].includes(new URL(api).hostname),
    'Fixtures somente locais',
  );
  const db = new PrismaClient();
  const stamp = randomUUID();
  const company = await db.empresa.create({
    data: { nome: 'TESTE convite concorrente', cnpj: `invite-${stamp}` },
  });
  const email = `invite-${stamp}@example.test`;
  const invite = await db.conviteUsuario.create({
    data: {
      empresaId: company.id,
      email,
      role: 'RECEPCIONISTA',
      token: randomUUID(),
      expiresAt: new Date(Date.now() + 60000),
    },
  });
  const data = { token: invite.token, nome: 'Convidado teste', senha: 'ConviteLocal123!' };
  try {
    const details = await request.post(`${api}/api/auth/convite/detalhes`, {
      data: { token: invite.token },
    });
    expect(details.status()).toBe(200);
    expect(details.headers()['cache-control']).toBe('no-store');
    expect(await details.json()).toMatchObject({
      email,
      role: 'RECEPCIONISTA',
      empresaNome: company.nome,
    });
    const responses = await Promise.all(
      Array.from({ length: 6 }, () => request.post(`${api}/api/auth/aceitar-convite`, { data })),
    );
    expect(responses.filter((response) => response.status() === 201)).toHaveLength(1);
    expect(responses.every((response) => [201, 400, 409].includes(response.status()))).toBe(true);
    expect(await db.usuario.count({ where: { email } })).toBe(1);
    expect(await db.usuario.findUniqueOrThrow({ where: { email } })).toMatchObject({
      empresaId: company.id,
      role: 'RECEPCIONISTA',
    });
    expect((await db.conviteUsuario.findUniqueOrThrow({ where: { id: invite.id } })).usado).toBe(
      true,
    );
    expect(
      (
        await request.post(`${api}/api/auth/convite/detalhes`, { data: { token: invite.token } })
      ).status(),
    ).toBe(400);

    const expiredEmail = `expired-${stamp}@example.test`;
    const expired = await db.conviteUsuario.create({
      data: {
        empresaId: company.id,
        email: expiredEmail,
        role: 'CAIXA',
        token: randomUUID(),
        expiresAt: new Date(0),
      },
    });
    expect(
      (
        await request.post(`${api}/api/auth/aceitar-convite`, {
          data: { ...data, token: expired.token },
        })
      ).status(),
    ).toBe(400);
    expect(await db.usuario.count({ where: { email: expiredEmail } })).toBe(0);
    expect((await db.conviteUsuario.findUniqueOrThrow({ where: { id: expired.id } })).usado).toBe(
      false,
    );

    const invalid = await request.post(`${api}/api/auth/convite/detalhes`, {
      data: { token: 'x'.repeat(10000) },
    });
    expect(invalid.status()).toBe(400);
  } finally {
    await db.empresa.delete({ where: { id: company.id } });
    await db.$disconnect();
  }
});
