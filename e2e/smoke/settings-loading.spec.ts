import { expect, test } from '../fixtures';

test('configurações aguardam os dados salvos e permitem recuperar falha de carregamento', async ({
  page,
  baseURL,
}) => {
  let attempts = 0;
  let releaseResponse: () => void = () => undefined;
  const responseGate = new Promise<void>((resolve) => {
    releaseResponse = resolve;
  });
  await page.route('**/api/configuracoes', async (route) => {
    attempts += 1;
    if (attempts > 1) await responseGate;
    await route.fulfill({
      status: attempts === 1 ? 503 : 200,
      headers: {
        'Access-Control-Allow-Origin': baseURL!,
        'Access-Control-Allow-Credentials': 'true',
      },
      json:
        attempts === 1
          ? { message: 'Indisponível' }
          : {
              nome: 'Negócio salvo',
              fusoHorario: 'America/Manaus',
              lembretesAtivos: true,
              telefone: '(11) 99999-1234',
            },
    });
  });
  try {
    await page.goto('/login');
    await page
      .getByLabel('E-mail', { exact: true })
      .fill(process.env.E2E_EMAIL || 'admin@nexly.com.br');
    await page.getByLabel('Senha', { exact: true }).fill(process.env.E2E_PASSWORD || 'nexly123');
    await page.getByRole('button', { name: 'Entrar no painel', exact: true }).click();
    await page.waitForURL('**/dashboard');
    await page.goto('/configuracoes');
    await expect(page.getByRole('main').getByRole('alert')).toContainText(
      'Não foi possível carregar as configurações',
    );
    await page.getByRole('button', { name: 'Horário de Funcionamento', exact: true }).click();
    await expect(page.getByLabel('Fuso horário do estabelecimento', { exact: true })).toHaveCount(
      0,
    );
    await expect(page.getByRole('button', { name: 'Salvar horários', exact: true })).toHaveCount(0);
    await page.getByRole('button', { name: 'Tentar novamente', exact: true }).click();
    await expect(
      page.getByRole('status').filter({ hasText: 'Carregando configurações' }),
    ).toBeVisible();
    await expect.poll(() => attempts).toBe(2);
    await expect(page.getByLabel('Fuso horário do estabelecimento', { exact: true })).toHaveCount(
      0,
    );
    releaseResponse();
    const timezone = page.getByLabel('Fuso horário do estabelecimento', { exact: true });
    await expect(timezone).toHaveValue('America/Manaus');
    await timezone.selectOption('America/Rio_Branco');
    await expect(timezone).toHaveValue('America/Rio_Branco');
  } finally {
    releaseResponse();
  }
});
