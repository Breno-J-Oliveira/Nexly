import { expect, test } from '../fixtures';
import type { Route } from '@playwright/test';
import { MODULE_IDS } from '@nexly/shared';
const mockHeaders = (route: Route) => ({
  'Access-Control-Allow-Origin': route.request().headers().origin || 'http://localhost:3002',
  'Access-Control-Allow-Credentials': 'true',
});

test.use({ storageState: { cookies: [], origins: [] }, timezoneId: 'America/Sao_Paulo' });
test.beforeEach(async ({ page }) => {
  await page.goto('/login');
  await page
    .getByLabel('E-mail', { exact: true })
    .fill(process.env.E2E_EMAIL || 'admin@nexly.com.br');
  await page.getByLabel('Senha', { exact: true }).fill(process.env.E2E_PASSWORD || 'nexly123');
  await page.getByRole('button', { name: 'Entrar no painel', exact: true }).click();
  await page.waitForURL('**/dashboard');
});

test('fidelidade diferencia falha de lista vazia e recupera ranking e segmentos', async ({
  page,
}) => {
  let failing = true;
  await page.route('**/api/fidelidade/*', (route) =>
    route.fulfill({
      headers: mockHeaders(route),
      status: failing ? 503 : 200,
      json: failing
        ? { message: 'Indisponível' }
        : route.request().url().endsWith('ranking')
          ? [
              {
                id: 'test',
                nome: 'Cliente recuperado',
                pontosFidelidade: 20,
                totalGasto: 100,
                ultimaVisita: null,
                tag: null,
              },
            ]
          : [{ id: 'test', nome: 'Cliente recuperado', segmento: 'ativo', gasto: 100 }],
    }),
  );
  await page.goto('/fidelidade');
  await expect(page.getByRole('main').getByRole('alert')).toContainText(
    'Não foi possível carregar a fidelidade',
  );
  await expect(page.getByText('Nenhum cliente no ranking')).toHaveCount(0);
  failing = false;
  await page.getByRole('button', { name: 'Tentar novamente', exact: true }).click();
  await expect(page.getByRole('cell', { name: 'Cliente recuperado', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Segmentos', exact: true }).click();
  await expect(page.getByText('Cliente recuperado ·', { exact: false })).toBeVisible();
});

test('comissões preservam o dia local, rejeitam período invertido e descartam consulta antiga', async ({
  page,
}) => {
  let release: () => void = () => undefined;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  const requests: URL[] = [];
  await page.route('**/api/comissao/resumo?*', async (route) => {
    const url = new URL(route.request().url());
    requests.push(url);
    const old = url.searchParams.get('dataInicio')?.startsWith('2026-01-01');
    if (old) await gate;
    await route.fulfill({
      headers: mockHeaders(route),
      json: {
        profissionais: [
          {
            id: 'test',
            nome: old ? 'Resposta antiga' : 'Resposta atual',
            comissaoPercentual: 10,
            faturamento: 100,
            comissao: 10,
            totalServicos: 1,
          },
        ],
        total: { faturamento: 100, comissao: 10, servicos: 1 },
      },
    });
  });
  try {
    await page.goto('/comissao');
    await expect(page.getByRole('cell', { name: 'Resposta atual' })).toBeVisible();
    await page.getByLabel('Data inicial', { exact: true }).fill('2026-01-01');
    await expect
      .poll(() => requests.some((r) => r.searchParams.get('dataInicio')?.startsWith('2026-01-01')))
      .toBe(true);
    await page.getByLabel('Data inicial', { exact: true }).fill('2026-01-02');
    await page.getByLabel('Data final', { exact: true }).fill('2026-01-02');
    await expect(page.getByRole('cell', { name: 'Resposta atual' })).toBeVisible();
    await expect
      .poll(() => requests.at(-1)?.searchParams.get('dataFim'))
      .toBe('2026-01-03T02:59:59.999Z');
    release();
    await expect(page.getByRole('cell', { name: 'Resposta antiga' })).toHaveCount(0);
    const count = requests.length;
    await page.getByLabel('Data inicial', { exact: true }).fill('2026-02-01');
    await expect(page.getByRole('main').getByRole('alert')).toContainText(
      'a inicial deve ser anterior',
    );
    expect(requests).toHaveLength(count);
  } finally {
    release();
  }
});

test('cadastros auxiliares não perdem o erro quando a lista termina de carregar', async ({
  page,
}) => {
  let failing = true;
  let release: () => void = () => undefined;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route('**/api/operacoes/opcoes', (route) =>
    route.fulfill({
      headers: mockHeaders(route),
      status: failing ? 503 : 200,
      json: failing
        ? { message: 'Indisponível' }
        : { usuarios: [], filiais: [], clientes: [], profissionais: [], servicos: [] },
    }),
  );
  await page.route('**/api/operacoes/documentos?*', async (route) => {
    await gate;
    await route.fulfill({ headers: mockHeaders(route), json: { data: [], total: 0 } });
  });
  try {
    await page.route('**/api/experiencia/atividade', (route) =>
      route.fulfill({
        headers: mockHeaders(route),
        json: {
          preset: null,
          modulos: MODULE_IDS,
          diasDeUso: 0,
          podeRecomendar: false,
          pedirRecomendacao: false,
          depoimento: null,
        },
      }),
    );
    await page.goto('/documentos');
    await expect(page.getByRole('main').getByRole('alert')).toContainText('cadastros auxiliares');
    release();
    await expect(page.getByText('Carregando registros…', { exact: true })).toHaveCount(0);
    await expect(page.getByRole('main').getByRole('alert')).toContainText('cadastros auxiliares');
    await expect(page.getByRole('button', { name: 'Novo registro', exact: true })).toBeDisabled();
    failing = false;
    await page.getByRole('button', { name: 'Tentar novamente', exact: true }).click();
    await page.getByRole('button', { name: 'Novo registro', exact: true }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
  } finally {
    release();
  }
});

test('compras recuperam falhas e abrem sugestões em diálogo acessível sem perder dados', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  let failing = true;
  let posts = 0;
  await page.route('**/api/pedidos-compra', (route) => {
    if (route.request().method() === 'POST') {
      posts++;
      return route.fulfill({
        headers: mockHeaders(route),
        status: 422,
        json: { message: 'Produto indisponível para este pedido.' },
      });
    }
    return route.fulfill({
      headers: mockHeaders(route),
      status: failing ? 503 : 200,
      json: failing ? { message: 'Indisponível' } : [],
    });
  });
  await page.route('**/api/fornecedores', (route) =>
    route.fulfill({ headers: mockHeaders(route), json: [] }),
  );
  await page.route('**/api/pedidos-compra/sugestao', (route) =>
    route.fulfill({
      headers: mockHeaders(route),
      json: [{ produtoId: 'test', nome: 'Produto sugerido', quantidadeSugerida: 7 }],
    }),
  );
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/estoque/pedidos');
  await expect(page.getByRole('main').getByRole('alert')).toContainText(
    'Não foi possível carregar pedidos',
  );
  await expect(page.getByText('Nenhum pedido cadastrado.')).toHaveCount(0);
  failing = false;
  await page.getByRole('button', { name: 'Tentar novamente', exact: true }).click();
  await page.getByRole('button', { name: 'Sugestão automática', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Novo pedido', exact: true });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByLabel('Quantidade de Produto sugerido')).toHaveValue('7');
  await dialog.getByLabel('Quantidade de Produto sugerido').fill('0');
  await dialog.getByRole('button', { name: 'Criar pedido', exact: true }).click();
  await expect(page.getByText('Informe quantidades inteiras maiores que zero.')).toBeVisible();
  expect(posts).toBe(0);
  await dialog.getByLabel('Quantidade de Produto sugerido').fill('7');
  await dialog.getByRole('button', { name: 'Criar pedido', exact: true }).click();
  await expect(page.getByText('Produto indisponível para este pedido.')).toBeVisible();
  await expect(dialog.getByLabel('Quantidade de Produto sugerido')).toHaveValue('7');
  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
  expect(errors).toEqual([]);
});
