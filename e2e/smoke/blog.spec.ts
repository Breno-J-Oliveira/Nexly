import { expect, test } from '../fixtures';

test.use({ storageState: { cookies: [], origins: [] } });

test('blog filters articles by theme and accent-insensitive search and recovers empty results', async ({
  page,
}) => {
  await page.goto('/blog');
  const articles = page.getByRole('region', { name: 'Um próximo passo para o seu negócio' });
  await expect(articles.getByRole('article')).toHaveCount(5);
  await page.getByRole('button', { name: 'Finanças', exact: true }).click();
  await expect(articles.getByRole('article')).toHaveCount(2);
  await page.getByLabel('Buscar no blog').fill('CONTRIBUICAO');
  await expect(articles.getByRole('article')).toHaveCount(1);
  await expect(articles.getByRole('heading', { name: /Quanto sobra/ })).toBeVisible();
  await page.getByLabel('Buscar no blog').fill('nenhumconteudodesseassunto');
  await expect(articles.getByRole('article')).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'Nenhum artigo por aqui ainda' })).toBeVisible();
  await page.getByRole('button', { name: 'Ver todos os artigos', exact: true }).click();
  await expect(articles.getByRole('article')).toHaveCount(5);
  await expect(page.getByLabel('Buscar no blog')).toHaveValue('');
});

for (const width of [390, 1440]) {
  test(`public blog and its articles support navigation and fit at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto('/blog');
    await expect(page).toHaveTitle('Blog — Nexly');
    await expect(page.getByRole('heading', { level: 1 })).toContainText(
      'Boas ideias para uma gestão melhor.',
    );
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await page.getByRole('link', { name: 'Ler o guia', exact: false }).click();
    await expect(page).toHaveURL(/\/blog\/como-reduzir-no-show-80-porcento$/);
    await expect(page.locator('main').getByRole('heading', { level: 1 })).toContainText(
      'Menos faltas',
    );
    await expect(page.locator('main')).not.toContainText('80%');
    await expect(page.getByRole('navigation', { name: 'Caminho da página' })).toBeVisible();
    await expect(page.getByText('Revisado em')).toContainText('18 de out');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await page.getByRole('link', { name: '← Todos os artigos' }).click();
    await expect(page).toHaveURL(/\/blog$/);
    await page.screenshot({ path: `test-results/manual/blog-${width}.png`, fullPage: true });
    if (width < 768) {
      const menu = page.getByRole('button', { name: 'Menu', exact: true });
      await menu.click();
      await expect(menu).toHaveAttribute('aria-expanded', 'true');
      await page.keyboard.press('Escape');
      await expect(menu).toBeFocused();
      await expect(menu).toHaveAttribute('aria-expanded', 'false');
      await menu.click();
      await page
        .getByRole('navigation', { name: 'Navegação principal no celular' })
        .getByRole('link', { name: 'Início', exact: true })
        .click();
      await expect(menu).toHaveAttribute('aria-expanded', 'false');
    } else {
      await page
        .getByRole('navigation', { name: 'Navegação principal', exact: true })
        .getByRole('link', { name: 'Início', exact: true })
        .click();
    }
    await expect(page).toHaveURL(/:\d+\/$/);
    expect(errors).toEqual([]);
  });
}

test('all articles render, retain their URLs and contain safe metadata and working internal links', async ({
  page,
}) => {
  const slugs = [
    '10-erros-gestao-estoque-saloes',
    'como-calcular-margem-servico-beleza',
    'como-reduzir-no-show-80-porcento',
    'gestao-comissoes-saloes-como-fazer-direito',
    'lgpd-clinicas-estetica-o-que-voce-precisa-saber',
  ];
  for (const slug of slugs) {
    const response = await page.goto(`/blog/${slug}`);
    expect(response?.status()).toBe(200);
    await expect(page.locator('h1')).toHaveCount(1);
    await expect(page.locator('main article').first()).toBeVisible();
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
      'href',
      new RegExp(`/blog/${slug}$`),
    );
    const article = await page
      .locator('script[type="application/ld+json"]')
      .evaluateAll((elements) =>
        elements
          .map((element) => JSON.parse(element.textContent || '{}'))
          .find((value) => value['@type'] === 'Article'),
      );
    expect(article.dateModified).toBe('2026-10-18');
    expect(article.headline).not.toContain('80%');
  }
  const source = page.getByRole('link', { name: 'Direitos dos titulares — ANPD', exact: true });
  await expect(source).toHaveAttribute('target', '_blank');
  await expect(source).toHaveAttribute('rel', 'noopener noreferrer');
  await page.goto('/blog/como-reduzir-no-show-80-porcento');
  const internal = page.getByRole('link', { name: 'recursos de agenda do Nexly', exact: true });
  await expect(internal).not.toHaveAttribute('target', '_blank');
  await internal.click();
  await expect(page).toHaveURL(/\/funcionalidades$/);
  expect((await page.goto('/blog/artigo-inexistente'))?.status()).toBe(404);
});
