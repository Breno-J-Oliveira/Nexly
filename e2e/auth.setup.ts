import { chromium, expect, type FullConfig } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const STORAGE_STATE = path.join(process.cwd(), 'e2e', '.auth', 'user.json');

/**
 * Faz login uma única vez (conta demo do seed) e salva os cookies do contexto.
 * O refresh token vive em cookie HttpOnly (setado pela API em localhost:3001),
 * então o storageState guarda esse cookie e as specs reutilizam sem re-logar.
 */
export default async function globalSetup(_config: FullConfig): Promise<void> {
  const baseURL = process.env.BASE_URL || 'http://localhost:3002';
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();
  page.setDefaultTimeout(60_000);

  await page.goto(`${baseURL}/login`, { waitUntil: 'domcontentloaded', timeout: 120_000 });
  await expect(page.getByRole('button', { name: 'Entrar no painel' })).toBeEnabled({
    timeout: 60_000,
  });
  await page
    .getByLabel('E-mail', { exact: true })
    .fill(process.env.E2E_EMAIL || 'admin@nexly.com.br');
  await page.getByLabel('Senha', { exact: true }).fill(process.env.E2E_PASSWORD || 'nexly123');
  await page.getByRole('button', { name: 'Entrar no painel' }).click();
  await page.waitForURL('**/dashboard');

  fs.mkdirSync(path.dirname(STORAGE_STATE), { recursive: true });
  await context.storageState({ path: STORAGE_STATE });
  await browser.close();
}
