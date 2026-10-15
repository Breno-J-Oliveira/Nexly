import { test as base, expect } from '@playwright/test';

// O navegador percorre muitas telas seguidas no mesmo IP do CI. Respeita o
// limite real da API; os testes específicos continuam verificando as cotas.
let nextRequestAt = 0;

export const test = base.extend<{ humanRequestPacing: void }>({
  humanRequestPacing: [
    async ({ page }, use) => {
      await page.route('**/api/**', async (route) => {
        const now = Date.now();
        const wait = Math.max(0, nextRequestAt - now);
        nextRequestAt = Math.max(now, nextRequestAt) + 300;
        if (wait > 0) await new Promise((resolve) => setTimeout(resolve, wait));
        await route.fallback();
      });
      await use();
      await page.unrouteAll({ behavior: 'wait' });
    },
    { auto: true },
  ],
});

export { expect };
