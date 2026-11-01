import { expect, test } from '../fixtures';

test.use({ storageState: { cookies: [], origins: [] } });

test('navegação mobile fecha, retém foco e volta ao desktop sem conteúdo inerte', async ({
  page,
}) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/login');
  await page
    .getByLabel('E-mail', { exact: true })
    .fill(process.env.E2E_EMAIL || 'admin@nexly.com.br');
  await page.getByLabel('Senha', { exact: true }).fill(process.env.E2E_PASSWORD || 'nexly123');
  await page.getByRole('button', { name: 'Entrar no painel' }).click();
  await page.waitForURL('**/dashboard');
  const sidebar = page.locator('#workspace-navigation');
  await expect(sidebar).toBeHidden();
  await expect(sidebar).toHaveJSProperty('inert', true);
  for (let tab = 0; tab < 6; tab++) {
    await page.keyboard.press('Tab');
    expect(await sidebar.evaluate((el) => el.contains(document.activeElement))).toBe(false);
  }
  const opener = page.getByRole('button', { name: 'Abrir menu', exact: true });
  await opener.click();
  await expect(sidebar).toHaveAttribute('aria-modal', 'true');
  await expect(page.getByRole('button', { name: 'Fechar menu', exact: true })).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  expect(await sidebar.evaluate((el) => el.contains(document.activeElement))).toBe(true);
  await page.keyboard.press('Escape');
  await expect(sidebar).toBeHidden();
  await expect(opener).toBeFocused();
  await opener.click();
  await expect(sidebar).toHaveAttribute('aria-modal', 'true');
  await page.keyboard.press('Control+k');
  const shortcutDialog = page.getByRole('dialog', { name: 'Ir para uma página', exact: true });
  await expect(shortcutDialog).toBeVisible();
  await expect(sidebar).toBeHidden();
  await expect(shortcutDialog.getByRole('combobox')).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(shortcutDialog).toHaveCount(0);
  // Resize with the mobile dialog still open: its close button disappears on desktop.
  await opener.click();
  await expect(page.getByRole('button', { name: 'Fechar menu', exact: true })).toBeFocused();
  await page.setViewportSize({ width: 1440, height: 900 });
  await expect(sidebar).not.toHaveAttribute('aria-modal', 'true');
  await expect(sidebar.getByRole('button', { name: /^Buscar páginas/ })).toBeFocused();
  await expect(page.locator('#main-content').locator('..')).toHaveJSProperty('inert', false);
  await page.setViewportSize({ width: 375, height: 812 });
  await expect(sidebar).toHaveAttribute('aria-modal', 'true');
  await expect(page.getByRole('button', { name: 'Fechar menu', exact: true })).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(sidebar).toBeHidden();
  await expect(opener).toBeFocused();
  await page.setViewportSize({ width: 1440, height: 900 });
  await expect(sidebar).toBeVisible();
  await expect(sidebar).toHaveJSProperty('inert', false);
  const search = sidebar.getByRole('button', { name: /^Buscar páginas/ });
  await search.click();
  const query = page.getByRole('combobox', { name: 'Buscar página', exact: true });
  await query.fill('assinatura');
  await expect(page.getByRole('option', { name: /Plano e assinatura/ })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
});

test('Documentos permite criar sem carregar cadastros auxiliares indisponíveis', async ({
  page,
}) => {
  // O cenário verifica opções auxiliares, independentemente da seleção salva no seed.
  await page.route('**/api/experiencia/atividade', async (route) => {
    const response = await route.fetch();
    const profile = await response.json();
    await route.fulfill({
      response,
      json: { ...profile, modulos: [...new Set([...(profile.modulos ?? []), 'documentos'])] },
    });
  });
  await page.goto('/login');
  await page
    .getByLabel('E-mail', { exact: true })
    .fill(process.env.E2E_EMAIL || 'admin@nexly.com.br');
  await page.getByLabel('Senha', { exact: true }).fill(process.env.E2E_PASSWORD || 'nexly123');
  await page.getByRole('button', { name: 'Entrar no painel' }).click();
  await page.waitForURL('**/dashboard');
  let optionsRequests = 0;
  await page.route('**/operacoes/opcoes**', (route) => {
    optionsRequests++;
    return route.fulfill({
      status: 503,
      contentType: 'application/json',
      body: '{"message":"Indisponível"}',
    });
  });
  await page.goto('/documentos');
  const create = page.getByRole('button', { name: 'Novo registro', exact: true });
  await expect(create).toBeEnabled();
  await create.click();
  const form = page.getByRole('dialog', { name: 'Criar — Documentos', exact: true });
  await expect(form).toBeVisible();
  await page.keyboard.press('Control+k');
  await expect(page.getByRole('dialog', { name: 'Ir para uma página', exact: true })).toHaveCount(
    0,
  );
  expect(await form.evaluate((el) => el.contains(document.activeElement))).toBe(true);
  expect(optionsRequests).toBe(0);
});
