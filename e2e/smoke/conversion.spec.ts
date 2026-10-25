import { expect, test } from '../fixtures';

test.use({ storageState: { cookies: [], origins: [] } });

test('segmento da landing prepara o cadastro e permite escolher outro modelo', async ({ page }) => {
  await page.goto('/');
  await page
    .getByRole('region', { name: 'Segmentos atendidos' })
    .getByRole('link', { name: /Petshops/ })
    .click();
  await expect(page).toHaveURL(/\/cadastro\?segmento=petshop$/);
  await page.getByLabel('E-mail', { exact: true }).fill('segmento@example.test');
  await page.getByLabel('Senha', { exact: true }).fill('TesteSeguro123!');
  await page.getByRole('button', { name: 'Continuar', exact: true }).click();
  await expect(page.getByLabel('Segmento', { exact: true })).toHaveValue('petshop');
  await page.getByLabel('Nome da empresa', { exact: true }).fill('Negócio de teste');
  await page.getByRole('button', { name: 'Continuar', exact: true }).click();
  await expect(page.getByLabel('Modelo do negócio')).toHaveValue('petshop');
  await page.getByRole('button', { name: 'Voltar', exact: true }).click();
  await page.getByLabel('Segmento', { exact: true }).selectOption('psicologia');
  await page.getByRole('button', { name: 'Continuar', exact: true }).click();
  await expect(page.getByLabel('Modelo do negócio')).toHaveValue('psicologia');
  await page.goto('/precos');
  const enterprise = page
    .getByRole('article')
    .filter({ has: page.getByRole('heading', { name: 'Empresarial', exact: true }) });
  await expect(enterprise).toContainText('Até 100 profissionais ativos');
  await expect(enterprise).toContainText('R$ 199');
});

test('funcionalidades navegam por clique, teclado e link direto sem executar operações', async ({
  page,
}) => {
  const mutations: string[] = [];
  page.on('request', (request) => {
    if (
      request.url().includes('/api/') &&
      !request.url().endsWith('/auth/refresh') &&
      ['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method())
    )
      mutations.push(request.url());
  });
  await page.goto('/funcionalidades#pdv');
  const carousel = page.getByRole('region', { name: 'Funcionalidades do Nexly', exact: true });
  await expect(carousel.getByRole('tab', { name: 'PDV', exact: true })).toHaveAttribute(
    'aria-selected',
    'true',
  );
  await expect(carousel.getByRole('tabpanel')).toContainText('monte o carrinho');
  const tabs = carousel.getByRole('tab');
  await expect(tabs).toHaveCount(19);
  for (const tab of await tabs.all()) {
    await tab.click();
    await expect(carousel.getByRole('tabpanel')).toContainText('Como funciona');
    await expect(carousel.getByRole('tabpanel').getByRole('listitem')).toHaveCount(3);
    await expect(
      carousel.getByRole('tabpanel').getByRole('link', { name: 'Quero organizar meu negócio' }),
    ).toHaveAttribute('href', '/cadastro');
  }
  await tabs.last().focus();
  await page.keyboard.press('ArrowRight');
  await expect(tabs.first()).toBeFocused();
  await page.keyboard.press('End');
  await expect(tabs.last()).toBeFocused();
  await carousel.getByRole('button', { name: 'Próximo: Funcionalidades do Nexly' }).click();
  await expect(carousel.getByRole('tabpanel')).toContainText('Agenda');
  expect(mutations).toEqual([]);
});

test('carrossel do blog permite explorar todos os artigos e abrir o selecionado', async ({
  page,
}) => {
  await page.goto('/blog');
  await expect(page.getByRole('link', { name: '← Página inicial', exact: true })).toHaveCount(0);
  const carousel = page.getByRole('region', { name: 'Artigos em destaque', exact: true });
  const tabs = carousel.getByRole('tab');
  await expect(tabs).toHaveCount(5);
  const links = new Set<string>();
  for (const tab of await tabs.all()) {
    await tab.click();
    const link = carousel.getByRole('link', { name: 'Ler o guia' });
    links.add((await link.getAttribute('href'))!);
  }
  expect(links.size).toBe(5);
  const selected = await carousel.getByRole('link', { name: 'Ler o guia' }).getAttribute('href');
  await carousel.getByRole('link', { name: 'Ler o guia' }).click();
  await expect(page).toHaveURL(new RegExp(`${selected}$`));
});

for (const width of [320, 390, 1440]) {
  test(`cadastro e carrosséis têm espaço e não vazam a tela em ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/cadastro');
    const steps = page.getByRole('navigation', { name: 'Etapas do cadastro' });
    const mode = page.getByRole('link', { name: 'Criar Conta', exact: true });
    await expect(steps).toBeVisible();
    const a = (await steps.boundingBox())!,
      b = (await mode.boundingBox())!;
    expect(a.y - b.y - b.height).toBeGreaterThanOrEqual(24);
    await expect(steps.getByRole('listitem')).toHaveCount(4);
    for (const path of ['/', '/funcionalidades#estoque', '/blog', '/precos']) {
      await page.goto(path);
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
        path,
      ).toBe(true);
      if (path === '/precos')
        await expect(page.getByText('Seu próximo passo', { exact: true })).toHaveCount(0);
    }
  });
}
