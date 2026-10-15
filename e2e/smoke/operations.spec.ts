import { test, expect } from '@playwright/test';
import { PrismaClient } from '@prisma/client';
import { MODULE_IDS } from '@nexly/shared';
import { config } from 'dotenv';
import argon2 from 'argon2';
config({ path: 'apps/api/.env' });
test.use({ storageState: { cookies: [], origins: [] } });

test('six operational modules persist and complete their workflows', async ({ page }) => {
  test.setTimeout(180000);
  page.setDefaultTimeout(15000);
  test.skip(
    !['localhost', '127.0.0.1'].includes(
      new URL(process.env.DATABASE_URL || 'http://unavailable').hostname,
    ),
    'Fixtures somente no banco local',
  );
  const prisma = new PrismaClient();
  const suffix = Date.now();
  const senha = 'TesteSeguro123!';
  const futuro = new Date(Date.now() + 15 * 86400000);
  const dataFutura = `${futuro.getFullYear()}-${String(futuro.getMonth() + 1).padStart(2, '0')}-${String(futuro.getDate()).padStart(2, '0')}T10:00`;
  const company = await prisma.empresa.create({
    data: {
      nome: 'TESTE operacoes navegador',
      cnpj: `e2e-ops-${suffix}`,
      modulos: MODULE_IDS,
      usuarios: {
        create: {
          nome: 'TESTE operador',
          email: `e2e-ops-${suffix}@example.test`,
          senhaHash: await argon2.hash(senha),
          role: 'ADMIN',
        },
      },
    },
    include: { usuarios: true },
  });
  try {
    const cliente = await prisma.cliente.create({
      data: { empresaId: company.id, nome: 'TESTE contato navegador', telefone: '11999999999' },
    });
    const profissional = await prisma.profissional.create({
      data: { empresaId: company.id, nome: 'TESTE profissional navegador' },
    });
    const servico = await prisma.servico.create({
      data: { empresaId: company.id, nome: 'TESTE consulta navegador', duracaoMin: 30, preco: 100 },
    });
    await page.goto('/login');
    await page.getByLabel('E-mail', { exact: true }).fill(company.usuarios[0]!.email);
    await page.getByLabel('Senha', { exact: true }).fill(senha);
    await page.getByRole('button', { name: 'Entrar no painel', exact: true }).click();
    await page.waitForURL('**/dashboard');
    async function goto(path: string) {
      await page.goto(path);
      await expect(page.getByRole('navigation', { name: 'Menu principal' })).toBeAttached();
      await expect(page.getByRole('button', { name: 'Novo registro', exact: true })).toBeVisible();
    }
    const dialog = page.getByRole('dialog');
    async function start() {
      await page.getByRole('button', { name: 'Novo registro', exact: true }).click();
      await expect(dialog).toBeVisible();
    }
    async function save() {
      await dialog.getByRole('button', { name: 'Salvar', exact: true }).click();
      await expect(dialog).toHaveCount(0);
    }
    await goto('/filiais');
    await start();
    await dialog.getByLabel('Nome da filial', { exact: true }).fill('Unidade teste');
    await dialog.getByLabel('Endereço', { exact: true }).fill('Rua teste, 123');
    await save();
    await expect(page.getByRole('heading', { name: 'Unidade teste', exact: true })).toBeVisible();
    const filial = await prisma.filial.findFirstOrThrow({ where: { empresaId: company.id } });
    await goto('/tarefas');
    await start();
    await dialog.getByLabel('Título', { exact: true }).fill('Preparar sala');
    await dialog.getByLabel('Descrição', { exact: true }).fill('Conferir materiais');
    await dialog.getByLabel('Filial', { exact: true }).selectOption(filial.id);
    await dialog.getByLabel('Responsável', { exact: true }).selectOption(company.usuarios[0]!.id);
    await save();
    await page.getByRole('button', { name: 'Editar', exact: true }).click();
    await dialog.getByLabel('Situação', { exact: true }).selectOption('CONCLUIDA');
    await save();
    await expect(page.getByRole('article').getByText('Concluída', { exact: true })).toBeVisible();
    await page.getByLabel('Filtrar situação', { exact: true }).selectOption('PENDENTE');
    await expect(page.getByRole('heading', { name: 'Preparar sala', exact: true })).toHaveCount(0);
    await page.getByLabel('Filtrar situação', { exact: true }).selectOption('CONCLUIDA');
    await expect(page.getByRole('heading', { name: 'Preparar sala', exact: true })).toBeVisible();
    await goto('/documentos');
    await start();
    await dialog.getByLabel('Título', { exact: true }).fill('Procedimento de teste');
    await dialog
      .getByLabel('Conteúdo', { exact: true })
      .fill(
        'Conferir sala antes do atendimento. <script>window.documentoInjetado=true</script>\n' +
          Array.from(
            { length: 100 },
            (_, i) => `Etapa ${i + 1}: conferir materiais e registrar a rotina.`,
          ).join('\n'),
      );
    await save();
    await page.getByRole('button', { name: 'Visualizar / PDF', exact: true }).click();
    await expect(dialog.locator('article')).toContainText('<script>');
    expect(
      await page.evaluate(() =>
        Boolean((window as Window & { documentoInjetado?: boolean }).documentoInjetado),
      ),
    ).toBe(false);
    let printed = false;
    page.on('dialog', (d) => void d.dismiss());
    await page.exposeFunction('recordPrint', () => {
      printed = true;
    });
    await page.evaluate(() => {
      window.print = () => {
        void (window as Window & { recordPrint: () => Promise<void> }).recordPrint();
      };
    });
    await dialog.getByRole('button', { name: 'Imprimir / Salvar PDF', exact: true }).click();
    await expect.poll(() => printed).toBe(true);
    await page.emulateMedia({ media: 'print' });
    await page.screenshot({ path: 'docs/documento-print.png', fullPage: true });
    const pdf = await page.pdf({ path: 'docs/documento-teste.pdf', format: 'A4' });
    expect((pdf.toString('latin1').match(/\/Type\s*\/Page\b/g) || []).length).toBeGreaterThan(1);
    await page.emulateMedia({ media: 'screen' });
    await dialog.getByRole('button', { name: 'Fechar janela', exact: true }).click();
    await goto('/marketing');
    await page.emulateMedia({ media: 'print' });
    await expect(
      page.getByRole('heading', { name: 'Marketing', exact: true }).first(),
    ).toBeVisible();
    await page.emulateMedia({ media: 'screen' });
    await start();
    await dialog.getByLabel('Título', { exact: true }).fill('Campanha teste');
    await dialog
      .getByLabel('Mensagem (use {nome} para personalizar)', { exact: true })
      .fill('Olá {nome}, confira a agenda.');
    await dialog.getByLabel('Situação', { exact: true }).selectOption('ATIVA');
    await save();
    await page.getByText('Registrar ou revogar autorização de marketing', { exact: true }).click();
    await page.getByLabel('Cliente', { exact: true }).selectOption(cliente.id);
    await page
      .getByLabel('Origem e data da autorização ou revogação', { exact: true })
      .fill('Autorização explícita presencial em teste');
    await page.getByLabel('Cliente autorizou receber campanhas', { exact: true }).check();
    await page.getByRole('button', { name: 'Registrar autorização', exact: true }).click();
    await expect(page.getByText('Autorização registrada.', { exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Preparar contatos', exact: true }).click();
    await expect(
      dialog.getByRole('link', { name: 'Revisar no WhatsApp', exact: true }),
    ).toHaveAttribute('href', /^https:\/\/wa\.me\/5511999999999\?text=/);
    await dialog.getByRole('button', { name: 'Fechar janela', exact: true }).click();
    await goto('/automacao');
    await start();
    await dialog.getByLabel('Título', { exact: true }).fill('Abertura automática');
    await dialog.getByLabel('Próxima execução', { exact: true }).fill(dataFutura);
    await save();
    const auto = await prisma.automacao.findFirstOrThrow({ where: { empresaId: company.id } });
    await prisma.automacao.update({
      where: { id: auto.id },
      data: { proximaExecucao: new Date(Date.now() - 60000) },
    });
    await page.getByRole('button', { name: 'Verificar execuções agora', exact: true }).click();
    await expect.poll(() => prisma.tarefa.count({ where: { automacaoId: auto.id } })).toBe(1);
    await goto('/recorrencias');
    await start();
    await dialog.getByLabel('Título', { exact: true }).fill('Consultas semanais');
    await dialog.getByLabel('Cliente', { exact: true }).selectOption(cliente.id);
    await dialog.getByLabel('Profissional', { exact: true }).selectOption(profissional.id);
    await dialog.getByLabel('Serviço', { exact: true }).selectOption(servico.id);
    await dialog.getByLabel('Primeiro atendimento', { exact: true }).fill(dataFutura);
    await dialog.getByRole('button', { name: 'Criar todos os atendimentos', exact: true }).click();
    await expect(dialog).toHaveCount(0);
    expect(await prisma.agendamento.count({ where: { empresaId: company.id } })).toBe(4);
    await page.getByRole('button', { name: 'Cancelar futuros', exact: true }).click();
    await dialog.getByRole('button', { name: 'Confirmar', exact: true }).click();
    await expect(dialog).toHaveCount(0);
    expect(
      await prisma.agendamento.count({ where: { empresaId: company.id, status: 'CANCELADO' } }),
    ).toBe(4);
    for (const path of [
      '/marketing',
      '/tarefas',
      '/recorrencias',
      '/automacao',
      '/filiais',
      '/documentos',
    ]) {
      await page.setViewportSize({ width: 390, height: 844 });
      await goto(path);
      await expect(page.getByText('Carregando registros…', { exact: true })).toHaveCount(0);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      );
      await page.screenshot({ path: `docs/operacoes-${path.slice(1)}-mobile.png`, fullPage: true });
    }
  } finally {
    await prisma.agendamento.deleteMany({ where: { empresaId: company.id } });
    await prisma.servico.deleteMany({ where: { empresaId: company.id } });
    await prisma.profissional.deleteMany({ where: { empresaId: company.id } });
    await prisma.cliente.deleteMany({ where: { empresaId: company.id } });
    await prisma.empresa.delete({ where: { id: company.id } });
    await prisma.$disconnect();
  }
});
