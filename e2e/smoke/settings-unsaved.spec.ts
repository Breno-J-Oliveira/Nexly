import { expect, test, Page } from '../fixtures';

// Dublês da API para falhas e respostas demoradas; nenhuma configuração real é alterada.
async function settings(page: Page, origin: string) {
  let saved = {
    nome: 'Negócio de teste',
    cnpj: '',
    fusoHorario: 'America/Sao_Paulo',
    lembretesAtivos: false,
    templateLembrete: '',
    horarios: { seg: { abre: '09:00', aberto: true, fecha: '19:00' } },
  };
  const control = {
    fail: false,
    gate: null as Promise<void> | null,
    writes: [] as { method: string; body: Record<string, unknown> }[],
  };
  await page.route('**/api/**', async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const headers = {
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Credentials': 'true',
      'Access-Control-Allow-Headers': 'authorization,content-type',
      'Access-Control-Allow-Methods': 'GET,POST,PUT,PATCH,OPTIONS',
    };
    if (request.method() === 'OPTIONS') return route.fulfill({ status: 204, headers });
    if (url.pathname === '/api/auth/refresh')
      return route.fulfill({
        headers,
        json: {
          accessToken: 'ui-fixture-only',
          usuario: {
            id: 'settings-user',
            empresaId: 'settings-company',
            nome: 'Pessoa de teste',
            email: 'test@example.test',
            role: 'ADMIN',
          },
        },
      });
    if (url.pathname.startsWith('/api/experiencia'))
      return route.fulfill({
        headers,
        json: { modulos: ['agenda', 'clientes'], diasDeUso: 0, pedirRecomendacao: false },
      });
    if (
      url.pathname === '/api/configuracoes' ||
      url.pathname === '/api/configuracoes/notificacoes'
    ) {
      if (request.method() !== 'GET') {
        const body = request.postDataJSON();
        control.writes.push({ method: request.method(), body });
        if (control.gate) await control.gate;
        if (control.fail)
          return route.fulfill({ status: 503, headers, json: { message: 'Falha simulada' } });
        saved = { ...saved, ...body };
        return route.fulfill({ headers, json: { ok: true } });
      }
      return route.fulfill({ headers, json: saved });
    }
    if (url.pathname === '/api/whatsapp/status')
      return route.fulfill({
        headers,
        json: { enabled: false, provider: 'none', mode: 'disabled' },
      });
    return route.fulfill({ headers, json: [] });
  });
  await page.goto('/configuracoes');
  await expect(page.getByLabel('Nome do negócio *', { exact: true })).toHaveValue(
    'Negócio de teste',
  );
  return control;
}

test('configurações distinguem seções pendentes e permitem cancelar a saída sem perder dados', async ({
  page,
  baseURL,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await settings(page, baseURL!);
  const pending = page.getByRole('status').filter({ hasText: 'Alterações não salvas em:' });
  const name = page.getByLabel('Nome do negócio *', { exact: true });
  await expect(pending).toHaveCount(0);
  await name.fill('Nome alterado');
  await expect(pending).toContainText('Perfil do Negócio');
  await name.fill('Negócio de teste');
  await expect(pending).toHaveCount(0);
  await name.fill('Nome alterado');
  await page.getByRole('button', { name: 'Horário de Funcionamento', exact: true }).click();
  const monday = page.getByRole('switch', { name: 'Atendimento: Segunda', exact: true });
  await monday.click();
  await expect(pending).toContainText('Horário de Funcionamento');
  await monday.click();
  await expect(pending).not.toContainText('Horário de Funcionamento');
  await page
    .getByLabel('Fuso horário do estabelecimento', { exact: true })
    .selectOption('America/Manaus');
  await expect(pending).toContainText('Perfil do Negócio, Horário de Funcionamento');
  await page.getByRole('button', { name: 'Perfil do Negócio', exact: true }).click();
  await expect(name).toHaveValue('Nome alterado');
  await page.getByRole('button', { name: 'Salvar alterações', exact: true }).click();
  await expect(pending).toContainText('Alterações não salvas em: Horário de Funcionamento.');
  await expect(pending).not.toContainText('Perfil do Negócio');
  const unload = page.waitForEvent('dialog');
  // A navegação será cancelada: não esperar o evento de carregamento de outra página.
  const reload = page.evaluate(() => window.location.reload());
  const unloadDialog = await unload;
  expect(unloadDialog.type()).toBe('beforeunload');
  await unloadDialog.dismiss();
  await reload;
  await expect(pending).toContainText('Horário de Funcionamento');
  await test.info().attach('configuracoes-pendentes-mobile', {
    body: await page.screenshot({ path: 'test-results/manual/settings-unsaved-mobile.png' }),
    contentType: 'image/png',
  });
  const cancel = page.waitForEvent('dialog').then(async (dialog) => {
    expect(dialog.type()).toBe('confirm');
    await dialog.dismiss();
  });
  await page
    .getByRole('navigation', { name: 'Seções de configurações' })
    .getByRole('link', { name: 'Usuários', exact: true })
    .click();
  await cancel;
  await expect(page).toHaveURL(/\/configuracoes$/);
  await expect(name).toHaveValue('Nome alterado');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  const leave = page.waitForEvent('dialog').then((dialog) => dialog.accept());
  await page
    .getByRole('navigation', { name: 'Seções de configurações' })
    .getByRole('link', { name: 'Usuários', exact: true })
    .click();
  await leave;
  await expect(page).toHaveURL(/\/usuarios$/);
});

test('falha de salvamento preserva edição e notificações são enviadas em uma única gravação', async ({
  page,
  baseURL,
}) => {
  const control = await settings(page, baseURL!);
  const pending = page.getByRole('status').filter({ hasText: 'Alterações não salvas em:' });
  const name = page.getByLabel('Nome do negócio *', { exact: true });
  await name.fill('Edição preservada');
  control.fail = true;
  let release = () => {};
  control.gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  try {
    await page.getByRole('button', { name: 'Salvar alterações', exact: true }).click();
    await expect(name).toBeDisabled();
    await expect.poll(() => control.writes.length).toBe(1);
    release();
    await expect(name).toBeEnabled();
    await expect(
      page.getByText(
        'Não foi possível salvar o perfil. Suas alterações foram mantidas; tente novamente.',
        { exact: true },
      ),
    ).toBeVisible();
    await expect(name).toHaveValue('Edição preservada');
    await expect(pending).toBeVisible();
    control.fail = false;
    control.gate = null;
    await page.getByRole('button', { name: 'Salvar alterações', exact: true }).click();
    await expect(pending).toHaveCount(0);
    expect(
      await page.evaluate(() =>
        window.dispatchEvent(new Event('beforeunload', { cancelable: true })),
      ),
    ).toBe(true);
    await page.getByRole('main').getByRole('button', { name: 'Notificações', exact: true }).click();
    await page.getByRole('switch', { name: 'Lembretes automáticos de WhatsApp' }).click();
    await expect(pending).toContainText('Notificações');
    const before = control.writes.length;
    await page.getByRole('button', { name: 'Salvar notificações', exact: true }).click();
    await expect(pending).toHaveCount(0);
    expect(control.writes.slice(before)).toHaveLength(1);
    expect(control.writes[before]).toMatchObject({
      method: 'PUT',
      body: {
        lembretesAtivos: true,
        notificacoes: expect.any(Object),
        templateLembrete: expect.any(String),
      },
    });
  } finally {
    release();
  }
});
