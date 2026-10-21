import { expect, test } from '../fixtures';

test.use({ storageState: { cookies: [], origins: [] } });

const example = {
  permissoes: { financeiro: true, agenda: true, estoque: true },
  agendamentosHoje: { total: 3, AGENDADO: 1, CONFIRMADO: 2, CONCLUIDO: 0, CANCELADO: 0 },
  receitaMes: { atual: 1800, anterior: 1600, variacaoPercentual: 12.5 },
  ticketMedio: 90,
  faturamentoHoje: 270,
  taxaOcupacao: 50,
  evolucaoVendasSemanal: [
    { dia: 'Seg', total: 100 },
    { dia: 'Ter', total: 170 },
  ],
  alertasEstoque: [
    {
      id: 'example-stock',
      nome: 'Produto de exemplo com estoque baixo',
      estoqueAtual: 2,
      estoqueMinimo: 5,
    },
  ],
  proximosCompromissos: [
    {
      id: 'example-appointment',
      horaInicio: '2026-10-21T12:00:00.000Z',
      horaFim: null,
      cliente: 'Cliente de exemplo',
      servico: 'Serviço de exemplo',
      profissional: 'Profissional de exemplo',
      status: 'CONFIRMADO',
    },
  ],
};

async function enter(page: import('@playwright/test').Page) {
  await page.goto('/login');
  await page
    .getByLabel('E-mail', { exact: true })
    .fill(process.env.E2E_EMAIL || 'admin@nexly.com.br');
  await page.getByLabel('Senha', { exact: true }).fill(process.env.E2E_PASSWORD || 'nexly123');
  await page.getByRole('button', { name: 'Entrar no painel', exact: true }).click();
  await page.waitForURL('**/dashboard');
}

test('visão geral mantém agenda, valores acessíveis e atalhos recolhíveis no celular', async ({
  page,
  baseURL,
}) => {
  await page.route('**/api/dashboard', (route) =>
    route.fulfill({
      headers: {
        'Access-Control-Allow-Origin': baseURL!,
        'Access-Control-Allow-Credentials': 'true',
      },
      json: example,
    }),
  );
  await page.route('**/api/export/produtos/vencendo*', (route) =>
    route.fulfill({
      headers: {
        'Access-Control-Allow-Origin': baseURL!,
        'Access-Control-Allow-Credentials': 'true',
      },
      json: [],
    }),
  );
  await enter(page);
  await expect(
    page.getByRole('heading', { name: 'Movimento do negócio', exact: true }),
  ).toBeVisible();
  await expect(page.getByText('Cliente de exemplo', { exact: true })).toBeVisible();
  await expect(page.getByText('Personalizar e conhecer recursos', { exact: true })).toBeHidden();
  await page.getByText('Seu Nexly · atalhos e primeiros passos', { exact: true }).click();
  await expect(page.getByText('Personalizar e conhecer recursos', { exact: true })).toBeVisible();
  await page.getByText('Seu Nexly · atalhos e primeiros passos', { exact: true }).click();
  await page.getByText('Consultar valores do gráfico', { exact: true }).click();
  await expect(page.getByText('R$ 170,00', { exact: true })).toBeVisible();
  await expect(page.getByText(example.alertasEstoque[0]!.nome, { exact: true })).toBeHidden();
  await page.getByText('1 item com estoque baixo · ver detalhes', { exact: true }).click();
  await expect(page.getByText(example.alertasEstoque[0]!.nome, { exact: true })).toBeVisible();
  for (const width of [390, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.evaluate(() => window.scrollTo({ top: 0, left: 0, behavior: 'instant' }));
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await page.screenshot({ path: `docs/clean-dashboard-${width}.png`, fullPage: true, animations: 'disabled' });
  }
});

test('visão geral não exibe indicadores financeiros quando a resposta restringe a permissão', async ({
  page,
  baseURL,
}) => {
  await page.route('**/api/dashboard', (route) =>
    route.fulfill({
      headers: {
        'Access-Control-Allow-Origin': baseURL!,
        'Access-Control-Allow-Credentials': 'true',
      },
      json: { ...example, permissoes: { financeiro: false, agenda: true, estoque: false } },
    }),
  );
  await enter(page);
  await expect(page.getByRole('heading', { name: 'Sua agenda hoje', exact: true })).toBeVisible();
  await expect(page.getByText('FATURAMENTO HOJE', { exact: true })).toHaveCount(0);
  await expect(page.getByText('TICKET MÉDIO', { exact: true })).toHaveCount(0);
  await expect(
    page.getByRole('heading', { name: 'Movimento do negócio', exact: true }),
  ).toHaveCount(0);
  await expect(page.getByRole('region', { name: 'Atenção ao estoque', exact: true })).toHaveCount(
    0,
  );
});
