import { expect, test } from '../fixtures';

test.use({ storageState: { cookies: [], origins: [] } });

test('prévia demonstra os módulos com clique e teclado sem acionar a operação real', async ({
  page,
}) => {
  const mutations: string[] = [];
  page.on('request', (request) => {
    // O provedor global verifica a sessão ao abrir a página; a demonstração não altera dados.
    if (
      request.url().includes('/api/') &&
      !request.url().endsWith('/api/auth/refresh') &&
      request.method() !== 'GET' &&
      request.method() !== 'OPTIONS'
    )
      mutations.push(request.url());
  });
  await page.goto('/');
  const preview = page.getByRole('tablist', { name: 'Explorar prévia do Nexly' });
  const overview = preview.getByRole('tab', { name: 'Visão geral' });
  await expect(overview).toHaveAttribute('aria-selected', 'true');
  await overview.focus();
  await page.keyboard.press('ArrowRight');
  await expect(preview.getByRole('tab', { name: 'Agenda', exact: true })).toBeFocused();
  await expect(page.getByRole('tabpanel')).toContainText('Marina Souza');
  await page.keyboard.press('End');
  await expect(preview.getByRole('tab', { name: 'Estoque', exact: true })).toBeFocused();
  await expect(page.getByRole('tabpanel')).toContainText('Óleo finalizador');
  await page.keyboard.press('ArrowRight');
  await expect(overview).toBeFocused();
  await preview.getByRole('tab', { name: 'Agenda', exact: true }).click();
  await expect(page.getByRole('tabpanel')).toContainText('Corte e finalização');
  await expect(
    page.getByText('Prévia interativa · dados de exemplo', { exact: true }),
  ).toBeVisible();
  expect(mutations).toEqual([]);
});

for (const width of [390, 1440]) {
  test(`páginas públicas cabem em ${width}px e oferecem navegação de retorno`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    for (const path of [
      '/',
      '/funcionalidades',
      '/precos',
      '/blog',
      '/suporte',
      '/termos',
      '/privacidade',
      '/login',
      '/cadastro',
      '/recuperar-senha',
      '/redefinir-senha',
    ]) {
      const response = await page.goto(path);
      expect(response?.status(), path).toBe(200);
      await expect(page.getByRole('heading', { level: 1 }), path).toHaveCount(1);
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
        path,
      ).toBe(true);
      expect(await page.locator('a[href="/"]:visible').count(), path).toBeGreaterThan(0);
      if (['/', '/login', '/precos', '/privacidade'].includes(path))
        await page.screenshot({
          path: `docs/redesign-${path === '/' ? 'inicio' : path.slice(1)}-${width}.png`,
          fullPage: true,
        });
    }
    expect(errors).toEqual([]);
  });
}
