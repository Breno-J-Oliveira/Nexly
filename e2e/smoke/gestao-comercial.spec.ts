import { test, expect } from '../fixtures';
import { PrismaClient } from '@prisma/client';
import { MODULE_IDS } from '@nexly/shared';
import { randomUUID, createHash } from 'node:crypto';
import argon2 from 'argon2';
test.use({ storageState: { cookies: [], origins: [] } });
test('novas áreas funcionam com dados reais e preservam saldos no navegador', async ({ page }) => {
  test.setTimeout(240000);
  page.setDefaultTimeout(15000);
  test.skip(
    !['localhost', '127.0.0.1'].includes(
      new URL(process.env.DATABASE_URL ?? 'http://indisponivel').hostname,
    ),
    'Somente fixtures locais',
  );
  const p = new PrismaClient(),
    id = randomUUID(),
    email = `comercial-ui-${id}@example.test`,
    senha = 'ComercialTeste123!';
  const empresa = await p.empresa.create({
    data: {
      nome: 'TESTE comercial navegador',
      cnpj: id,
      modulos: MODULE_IDS,
      usuarios: {
        create: {
          nome: 'TESTE administrador',
          email,
          senhaHash: await argon2.hash(senha),
          role: 'ADMIN',
        },
      },
    },
    include: { usuarios: true },
  });
  const empresaId = empresa.id;
  const falhas: string[] = [];
  page.on('response', (r) => {
    if (r.url().includes('/api/') && r.status() >= 500)
      falhas.push(`${r.status()} ${new URL(r.url()).pathname}`);
  });
  try {
    const produto = await p.produto.create({
      data: {
        empresaId,
        nome: 'Produto comercial',
        sku: id,
        preco: 25,
        custoAtual: 10,
        estoqueAtual: 5,
      },
    });
    const filial = await p.filial.create({
      data: { empresaId, nome: 'Unidade comercial', endereco: 'Rua de teste, 100' },
    });
    await page.goto('/login');
    await page.getByLabel('E-mail', { exact: true }).fill(email);
    await page.getByLabel('Senha', { exact: true }).fill(senha);
    await page.getByRole('button', { name: 'Entrar no painel', exact: true }).click();
    await page.waitForURL('**/dashboard');
    await page.getByText('Seu Nexly · atalhos e primeiros passos', { exact: true }).click();
    await expect(page.getByRole('heading', { name: /Seus primeiros passos/ })).toBeVisible();
    await page.goto('/meu-nexly');
    await page.getByLabel('Segmento do negócio').selectOption('psicologia');
    await page.getByRole('button', { name: 'Salvar preferências', exact: true }).click();
    await expect(
      page.getByRole('status').filter({ hasText: 'Preferências atualizadas' }),
    ).toBeVisible();
    await expect(
      page
        .getByRole('navigation', { name: 'Menu principal' })
        .getByRole('link', { name: 'Pacientes', exact: true }),
    ).toBeVisible();
    await page.goto('/importar');
    await page.getByLabel('Arquivo CSV').setInputFiles({
      name: 'invalido.csv',
      mimeType: 'text/csv',
      buffer: Buffer.from('senha\nvalor\n'),
    });
    await page.getByRole('button', { name: 'Analisar arquivo', exact: true }).click();
    await expect(page.getByRole('alert').filter({ hasText: 'Inclua a coluna nome' })).toBeVisible();
    await expect(page.getByRole('status').filter({ hasText: 'Prévia preparada' })).toHaveCount(0);
    await page.getByLabel('Arquivo CSV').setInputFiles({
      name: 'clientes.csv',
      mimeType: 'text/csv',
      buffer: Buffer.from(
        'nome;email\nAna Comercial;ana@example.test\nAna Duplicada;ana@example.test\nBia Comercial;bia@example.test\n',
      ),
    });
    await page.getByRole('button', { name: 'Analisar arquivo', exact: true }).click();
    await expect(
      page.getByText(/3 linhas analisadas · 2 novos cadastros · 1 duplicados/),
    ).toBeVisible();
    await page.getByRole('button', { name: 'Importar 2 cadastros', exact: true }).click();
    await expect(
      page.getByRole('button', { name: 'Importação concluída', exact: true }),
    ).toBeDisabled();
    expect(await p.cliente.count({ where: { empresaId } })).toBe(2);
    await page.goto('/estoque/filiais');
    await page.getByLabel('Destino', { exact: true }).selectOption(filial.id);
    await page.getByLabel('Produto', { exact: true }).selectOption(produto.id);
    await page.getByLabel(/Quantidade \(disponível/).fill('3');
    await page.getByLabel('Motivo', { exact: true }).fill('Distribuição inicial para a filial');
    await page.getByRole('button', { name: 'Confirmar transferência', exact: true }).click();
    await expect(
      page.getByRole('status').filter({ hasText: 'Transferência concluída' }),
    ).toBeVisible();
    expect((await p.produto.findUniqueOrThrow({ where: { id: produto.id } })).estoqueAtual).toBe(2);
    await page.goto('/pdv');
    await page.getByLabel('Estoque da venda').selectOption(filial.id);
    await page.getByRole('button', { name: /Produto comercial Estoque: 3/ }).click();
    await page.getByRole('button', { name: 'Finalizar Venda', exact: true }).click();
    await page.getByLabel('Já recebi o valor total').check();
    await page.getByRole('button', { name: /^Finalizar —/ }).click();
    await expect(page.getByText('Venda finalizada!', { exact: false }).first()).toBeVisible();
    await expect.poll(() => p.venda.count({ where: { empresaId } })).toBe(1);
    await page.goto('/vendas');
    await page.getByRole('button', { name: 'Estornar venda', exact: true }).click();
    const estorno = page.getByRole('dialog', { name: 'Estornar venda' });
    await estorno
      .getByLabel('Motivo do estorno')
      .fill('Cliente devolveu o produto e recebeu o reembolso');
    await estorno.getByRole('button', { name: 'Confirmar estorno', exact: true }).click();
    await expect(estorno).toHaveCount(0);
    await expect
      .poll(async () =>
        Number(
          (await p.saldoFilial.findFirstOrThrow({ where: { empresaId, filialId: filial.id } }))
            .quantidade,
        ),
      )
      .toBe(3);
    await page.goto('/financeiro');
    await page.getByRole('button', { name: 'Nova conta', exact: true }).click();
    const dialog = page.getByRole('dialog', { name: 'Nova conta' });
    await dialog.getByLabel('Descrição', { exact: true }).fill('Aluguel comercial');
    await dialog.getByLabel('Valor (R$)', { exact: true }).fill('12.50');
    await dialog.getByRole('button', { name: 'Criar conta', exact: true }).click();
    await expect(dialog).toHaveCount(0);
    const conta = page.locator('details').filter({ hasText: 'Aluguel comercial' });
    await conta.locator('summary').click();
    await conta.getByRole('button', { name: 'Registrar pagamento', exact: true }).click();
    const pagar = page.getByRole('dialog', { name: 'Registrar pagamento' });
    await pagar.getByLabel('Valor pago (R$)', { exact: true }).fill('5');
    await pagar.getByRole('button', { name: 'Confirmar pagamento', exact: true }).click();
    await expect(pagar).toHaveCount(0);
    await expect(conta).toContainText('PARCIAL');
    await expect(page.getByText('A receber', { exact: true })).toBeVisible();
    await page.screenshot({ path: 'docs/financeiro-comercial-desktop.png', fullPage: true });
    await page.goto('/operacao');
    await page.getByLabel('Tipo', { exact: true }).selectOption('HOMOLOGACAO');
    await page
      .getByLabel('Referência do relatório ou execução')
      .fill('Teste local automatizado com fixture descartável');
    await page
      .getByLabel('O que foi verificado')
      .fill('Navegação, importação, transferência, venda, estorno e pagamento parcial.');
    await page.getByRole('button', { name: 'Registrar evidência', exact: true }).click();
    await expect(
      page.getByRole('status').filter({ hasText: 'Evidência registrada' }),
    ).toBeVisible();
    await page.goto('/historico');
    await expect(page.getByText('Nenhum evento com estes filtros.')).toHaveCount(0);
    await expect(page.locator('details').first()).toBeVisible();
    await page.setViewportSize({ width: 390, height: 844 });
    for (const path of [
      '/financeiro',
      '/estoque/filiais',
      '/importar',
      '/historico',
      '/operacao',
      '/meu-nexly',
    ]) {
      await page.goto(path);
      await expect(page.getByRole('navigation', { name: 'Menu principal' })).toBeAttached();
      await expect(page.locator('main')).toBeVisible();
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
        path + ' sem overflow',
      ).toBe(true);
    }
    await page.goto('/financeiro');
    await expect(page.getByText('A receber', { exact: true })).toBeVisible();
    await page.screenshot({ path: 'docs/financeiro-comercial-mobile.png', fullPage: true });
    const token = randomUUID().replaceAll('-', '') + randomUUID().replaceAll('-', '');
    await p.recuperacaoSenha.create({
      data: {
        usuarioId: empresa.usuarios[0]!.id,
        tokenHash: createHash('sha256').update(token).digest('hex'),
        expiresAt: new Date(Date.now() + 60000),
      },
    });
    await page.goto('/redefinir-senha#token=' + token);
    await expect(page.getByLabel('Nova senha', { exact: true })).toBeVisible();
    await expect(page).toHaveURL(/\/redefinir-senha$/);
    await page.getByLabel('Nova senha', { exact: true }).fill('NovaSenhaComercial123!');
    await page.getByLabel('Confirme a nova senha', { exact: true }).fill('NovaSenhaComercial123!');
    await page.getByRole('button', { name: 'Salvar nova senha', exact: true }).click();
    await expect(page.getByRole('status').filter({ hasText: 'Senha alterada' })).toBeVisible();
    expect(falhas).toEqual([]);
  } finally {
    await p.lancamentoFinanceiro.deleteMany({ where: { empresaId } });
    await p.itemVenda.deleteMany({ where: { venda: { empresaId } } });
    await p.venda.deleteMany({ where: { empresaId } });
    await p.movimentacaoEstoque.deleteMany({ where: { empresaId } });
    await p.saldoFilial.deleteMany({ where: { empresaId } });
    await p.produto.deleteMany({ where: { empresaId } });
    await p.cliente.deleteMany({ where: { empresaId } });
    await p.empresa.delete({ where: { id: empresaId } });
    await p.$disconnect();
  }
});
