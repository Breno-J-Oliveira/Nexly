import { expect, test, type Page } from '@playwright/test';

// Fluxo crítico: baixa automática de estoque ao concluir um agendamento.
// Base: apps/api/prisma/seed.ts
//   - Serviço "Escova Progressiva" consome "Shampoo Profissional 1L" (1x) e
//     "Óleo Reparador 100ml" (1x) — feature central do Nexly.
//   - "Shampoo Profissional 1L" começa com estoque 30.

const PRODUTO = 'Shampoo Profissional 1L';
const CLIENTE = 'Maria Oliveira';
const PROFISSIONAL = 'Ana Silva';
const SERVICO = 'Escova Progressiva';

function formatarDatetimeLocal(d: Date): string {
  const pad = (n: number): string => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours(),
  )}:${pad(d.getMinutes())}`;
}

async function lerEstoque(page: Page, produto: string): Promise<number> {
  const row = page.locator('tbody tr').filter({ hasText: produto }).first();
  const texto = (await row.locator('td').nth(3).textContent()) ?? '0';
  return Number(texto.replace(/\D/g, ''));
}

async function selecionarOpcao(page: Page, nth: number, texto: string): Promise<void> {
  const select = page.locator('select').nth(nth);
  const option = select.locator('option').filter({ hasText: texto }).first();
  const value = await option.getAttribute('value');
  if (!value) throw new Error(`Opção "${texto}" não encontrada`);
  await select.selectOption(value);
}

test('concluir agendamento baixa o estoque automaticamente', async ({ page }) => {
  // Estabelece a sessão (o storageState tem o cookie de refresh) e carrega a Shell.
  await page.goto('/dashboard');
  await expect(page.getByRole('link', { name: 'Estoque' })).toBeVisible();

  // 1. Lê o estoque atual do produto
  await page.getByRole('link', { name: 'Estoque' }).click();
  await expect(page.locator('tbody tr').filter({ hasText: PRODUTO }).first()).toBeVisible();
  const antes = await lerEstoque(page, PRODUTO);
  expect(antes).toBeGreaterThan(0);

  // 2. Cria um agendamento (Escova Progressiva consome 1x o produto)
  await page.getByRole('link', { name: 'Agenda' }).click();
  await page.getByRole('button', { name: '+ Novo agendamento' }).click();

  // Step 1: cliente
  await page.getByRole('button', { name: CLIENTE }).click();
  await page.getByRole('button', { name: 'Próximo' }).click();

  // Step 2: profissional + serviço
  await selecionarOpcao(page, 0, PROFISSIONAL);
  await selecionarOpcao(page, 1, SERVICO);
  await page.getByRole('button', { name: 'Próximo' }).click();

  // Step 3: horário futuro (hoje, +1h) + salvar
  // Obs.: rodando após ~22:40 o dia "estoura" para amanhã e a agenda (visão de hoje)
  // não exibe. Num smoke test em dev/CI (horário comercial) isso não ocorre.
  const dataHora = new Date(Date.now() + 60 * 60 * 1000);
  dataHora.setSeconds(0, 0);
  await page.locator('input[type="datetime-local"]').fill(formatarDatetimeLocal(dataHora));
  await page.getByRole('button', { name: 'Salvar' }).click();

  // 3. Confirma e conclui o novo agendamento
  const novo = page.locator('div.group').filter({ hasText: SERVICO }).filter({ hasText: CLIENTE });
  await expect(novo.first()).toBeVisible();
  await novo.getByRole('button', { name: 'Confirmar' }).click();
  await novo.getByRole('button', { name: 'Concluir' }).click();
  await expect(page.getByText('Serviço concluído!')).toBeVisible();

  // 4. Verifica a baixa no estoque
  await page.getByRole('link', { name: 'Estoque' }).click();
  await expect(page.locator('tbody tr').filter({ hasText: PRODUTO }).first()).toBeVisible();
  await expect.poll(async () => lerEstoque(page, PRODUTO)).toBe(antes - 1);
});
