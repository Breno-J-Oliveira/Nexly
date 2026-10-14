const { chromium } = require('@playwright/test');
const fs = require('node:fs');
const path = require('node:path');
require('./check-local-env.cjs');

async function main() {
  const base = process.env.BASE_URL || 'http://localhost:3002';
  if (!['localhost', '127.0.0.1'].includes(new URL(base).hostname))
    throw new Error('Local preview only');
  const output = path.resolve('docs/ui-review');
  fs.mkdirSync(output, { recursive: true });
  const browser = await chromium.launch();
  try {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto(`${base}/login`);
    await page
      .getByLabel('E-mail', { exact: true })
      .fill(process.env.E2E_EMAIL || 'admin@nexly.com.br');
    await page.getByLabel('Senha', { exact: true }).fill(process.env.E2E_PASSWORD || 'nexly123');
    const submit = page.getByRole('button', { name: 'Entrar no painel' });
    await submit.waitFor();
    await page.waitForFunction(() => !document.querySelector('button[type="submit"]')?.disabled);
    await submit.click();
    await page.waitForURL('**/dashboard');
    const routes = (
      process.env.UI_ROUTES ||
      'dashboard,agenda,clientes,profissionais,servicos,estoque,pdv,vendas,relatorios,configuracoes,produtos,usuarios,comissao,fidelidade,estoque/pedidos'
    ).split(',');
    const results = [];
    for (const width of [1440, 390]) {
      await page.setViewportSize({ width, height: width === 390 ? 844 : 900 });
      for (const route of routes) {
        const response = await page.goto(`${base}/${route}`);
        await page.locator('body').waitFor();
        await page.waitForTimeout(900);
        await page.evaluate(() => document.fonts.ready);
        const overflow = await page.evaluate(
          () => document.documentElement.scrollWidth > innerWidth + 1,
        );
        const file = `${(route || 'home').replaceAll('/', '-')}-${width}.png`;
        await page.screenshot({
          path: path.join(output, file),
          fullPage: true,
          animations: 'disabled',
        });
        const redirected = new URL(page.url()).pathname !== `/${route}`;
        results.push({ route, width, status: response.status(), overflow, redirected });
        console.log(`${width} /${route}: HTTP ${response.status()}, overflow=${overflow}`);
      }
    }
    fs.writeFileSync(
      path.join(output, 'results.json'),
      JSON.stringify({ results, errors }, null, 2),
    );
    if (
      errors.length ||
      results.some((result) => result.overflow || result.redirected || result.status >= 400)
    )
      process.exitCode = 1;
  } finally {
    await browser.close();
  }
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
