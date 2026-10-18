import { expect, test } from '../fixtures';
import { MODULE_IDS } from '@nexly/shared';
import type { Route } from '@playwright/test';
const headers = (route: Route) => ({
  'Access-Control-Allow-Origin': route.request().headers().origin || 'http://localhost:3002',
  'Access-Control-Allow-Credentials': 'true',
});

test.use({ storageState: { cookies: [], origins: [] } });
test.beforeEach(async ({ page }) => {
  await page.goto('/login');
  await page
    .getByLabel('E-mail', { exact: true })
    .fill(process.env.E2E_EMAIL || 'admin@nexly.com.br');
  await page.getByLabel('Senha', { exact: true }).fill(process.env.E2E_PASSWORD || 'nexly123');
  await page.getByRole('button', { name: 'Entrar no painel', exact: true }).click();
  await page.waitForURL('**/dashboard');
  await expect(
    page.getByRole('navigation', { name: 'Menu principal', exact: true }),
  ).toBeAttached();
});

test('busca rápida aceita acentos, teclado e celular; conexão perdida tem orientação', async ({
  page,
  context,
}) => {
  await page.keyboard.press('Control+k');
  const dialog = page.getByRole('dialog', { name: 'Ir para uma página' });
  const search = dialog.getByRole('combobox', { name: 'Buscar página' });
  await expect(search).toBeFocused();
  await search.press('Tab');
  await expect(dialog.getByRole('button', { name: 'Fechar janela' })).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(search).toBeFocused();
  await search.fill('comissoes');
  await expect(dialog.getByRole('option', { name: /Comissões/ })).toBeVisible();
  await search.press('Enter');
  await expect(page).toHaveURL(/\/comissao$/);
  await page.setViewportSize({ width: 390, height: 844 });
  const trigger = page
    .getByRole('navigation', { name: 'Navegação mobile' })
    .getByRole('button', { name: 'Buscar páginas' });
  await trigger.click();
  await search.fill('nao-existe-123');
  await expect(dialog.getByText('Nenhuma página encontrada. Tente outro nome.')).toBeVisible();
  await search.fill('estoque');
  await search.press('ArrowDown');
  await expect(dialog.getByRole('option', { selected: true })).toContainText('Pedidos');
  await page.screenshot({ path: 'docs/comercial-busca-mobile.png', fullPage: true });
  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
  await expect(trigger).toBeFocused();
  try {
    await context.setOffline(true);
    await expect(
      page.getByRole('status').filter({ hasText: 'Você está sem conexão' }),
    ).toBeVisible();
  } finally {
    await context.setOffline(false);
  }
  await expect(page.getByText('Você está sem conexão', { exact: true })).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('edição preserva rascunho ao fechar e exclusão da última página volta para registros existentes', async ({
  page,
}) => {
  await page.route('**/api/experiencia/atividade', (route) =>
    route.fulfill({
      headers: headers(route),
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
  let deleted = false;
  await page.route('**/api/operacoes/documentos?*', (route) => {
    const last = new URL(route.request().url()).searchParams.get('page') === '2';
    return route.fulfill({
      headers: headers(route),
      json: {
        total: deleted ? 50 : 51,
        data:
          last && deleted
            ? []
            : [
                {
                  id: last ? 'last' : 'first',
                  titulo: last ? 'Último documento' : 'Primeiro documento',
                  versao: 1,
                },
              ],
      },
    });
  });
  await page.route('**/api/operacoes/documentos/last', (route) => {
    deleted = true;
    return route.fulfill({ headers: headers(route), json: { ok: true } });
  });
  await page.goto('/documentos');
  await page.getByRole('button', { name: 'Novo registro', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Título', { exact: true }).fill('Rascunho importante');
  await page.keyboard.press('Escape');
  await expect(dialog).toHaveAttribute('aria-label', 'Descartar alterações?');
  await expect(dialog.getByRole('button', { name: 'Continuar editando' })).toBeFocused();
  await dialog.getByRole('button', { name: 'Continuar editando' }).click();
  await expect(dialog.getByLabel('Título', { exact: true })).toHaveValue('Rascunho importante');
  await dialog.getByRole('button', { name: 'Voltar', exact: true }).click();
  await dialog.getByRole('button', { name: 'Descartar alterações', exact: true }).click();
  await expect(dialog).toHaveCount(0);
  await page.getByRole('button', { name: 'Próxima', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Último documento' })).toBeVisible();
  await page.getByRole('button', { name: 'Excluir', exact: true }).click();
  await dialog.getByRole('button', { name: 'Confirmar', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Primeiro documento' })).toBeVisible();
  await expect(page.getByText('50 registro(s) · página 1')).toBeVisible();
});
