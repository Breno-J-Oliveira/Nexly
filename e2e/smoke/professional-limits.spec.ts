import { PrismaClient, Plano } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import argon2 from 'argon2';
import { expect, test } from '../fixtures';

for (const [plano, limite] of [
  [Plano.FREE, 1],
  [Plano.BASIC, 2],
  [Plano.PRO, 10],
  [Plano.ENTERPRISE, 100],
] as const) {
  test(`limite ${plano} é aplicado pela API com concorrência e isolamento`, async ({
    request,
    page,
    baseURL,
  }) => {
    test.setTimeout(120000);
    test.skip(
      !['localhost', '127.0.0.1'].includes(
        new URL(process.env.DATABASE_URL || 'http://unavailable').hostname,
      ),
      'Fixtures somente no banco local',
    );
    const apiURL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
    test.skip(!['localhost', '127.0.0.1'].includes(new URL(apiURL).hostname), 'Somente API local');
    const db = new PrismaClient();
    const stamp = randomUUID();
    const senha = 'TesteLocalProfissional123!';
    const email = `professional-quota-${stamp}@example.test`;
    const empresa = await db.empresa.create({
      data: {
        nome: 'TESTE limites de profissionais',
        cnpj: `quota-${stamp}`,
        plano,
        usuarios: {
          create: {
            nome: 'Administrador teste',
            email,
            senhaHash: await argon2.hash(senha),
            role: 'ADMIN',
          },
        },
      },
    });
    let outraEmpresaId: string | undefined;
    try {
      const ativosAntes = limite - 1;
      await db.profissional.createMany({
        data: [
          ...Array.from({ length: ativosAntes }, (_, i) => ({
            empresaId: empresa.id,
            nome: `Existente ${i}`,
            ativo: true,
          })),
          ...Array.from({ length: 3 }, (_, i) => ({
            empresaId: empresa.id,
            nome: `Inativo ${i}`,
            ativo: false,
          })),
        ],
      });
      const outra = await db.empresa.create({
        data: {
          nome: 'Outra empresa de teste',
          cnpj: `quota-other-${stamp}`,
        },
      });
      outraEmpresaId = outra.id;
      await db.profissional.create({ data: { empresaId: outra.id, nome: 'Outro profissional' } });
      const login = await request.post(`${apiURL}/api/auth/login`, {
        headers: { Origin: baseURL! },
        data: { email, senha },
      });
      expect(login.status()).toBe(200);
      const { accessToken } = await login.json();
      const headers = { Authorization: `Bearer ${accessToken}`, Origin: baseURL! };
      const results = await Promise.all(
        Array.from({ length: 6 }, (_, i) =>
          request.post(`${apiURL}/api/profissionais`, {
            headers,
            data: { nome: `Concorrente ${i}` },
          }),
        ),
      );
      expect(results.filter((r) => r.status() === 201)).toHaveLength(1);
      for (const result of results.filter((r) => r.status() !== 201)) {
        expect(result.status()).toBe(403);
        expect((await result.json()).code).toBe('PROFESSIONAL_LIMIT_REACHED');
      }
      const expectedCount = ativosAntes + 1;
      const quotaResponse = await request.get(`${apiURL}/api/profissionais/limites`, { headers });
      expect(quotaResponse.status()).toBe(200);
      expect(await quotaResponse.json()).toEqual({
        plano,
        ativos: expectedCount,
        limite,
        podeAdicionar: false,
      });
      expect(await db.profissional.count({ where: { empresaId: outra.id, ativo: true } })).toBe(1);
      if (plano === Plano.FREE) {
        // Simula cadastros anteriores à regra: nenhum registro deve ser removido.
        await db.profissional.createMany({
          data: [
            { empresaId: empresa.id, nome: 'Legado um' },
            { empresaId: empresa.id, nome: 'Legado dois' },
          ],
        });
        const listResponse = await request.get(`${apiURL}/api/profissionais`, { headers });
        expect(listResponse.status()).toBe(200);
        const list = await listResponse.json();
        expect(list).toHaveLength(3);
        const edited = await request.put(`${apiURL}/api/profissionais/${list[0].id}`, {
          headers,
          data: { nome: 'Nome atualizado' },
        });
        expect(edited.status()).toBe(200);
        await page.setViewportSize({ width: 390, height: 844 });
        await page.goto('/login?next=%2Fprofissionais');
        await page.getByLabel('E-mail', { exact: true }).fill(email);
        await page.getByLabel('Senha', { exact: true }).fill(senha);
        await page.getByRole('button', { name: 'Entrar no painel', exact: true }).click();
        await expect(page).toHaveURL(/\/profissionais$/);
        await expect(page.getByRole('region', { name: 'Uso do plano' })).toContainText(
          '3 profissionais ativos de 1 permitido',
        );
        await expect(
          page.getByRole('button', { name: '+ Novo profissional', exact: true }),
        ).toBeDisabled();
        await expect(page.getByRole('link', { name: 'Ver planos e assinatura →' })).toBeVisible();
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
          true,
        );
        await page.screenshot({
          path: 'test-results/manual/profissionais-limite-390.png',
          fullPage: true,
        });
        for (const item of list)
          expect(
            (await request.delete(`${apiURL}/api/profissionais/${item.id}`, { headers })).status(),
          ).toBe(200);
        expect(
          (
            await request.post(`${apiURL}/api/profissionais`, {
              headers,
              data: { nome: 'Nova vaga liberada' },
            })
          ).status(),
        ).toBe(201);
      }
    } finally {
      await db.profissional.deleteMany({
        where: { empresaId: { in: [empresa.id, ...(outraEmpresaId ? [outraEmpresaId] : [])] } },
      });
      await db.empresa.deleteMany({
        where: { id: { in: [empresa.id, ...(outraEmpresaId ? [outraEmpresaId] : [])] } },
      });
      await db.$disconnect();
    }
  });
}
