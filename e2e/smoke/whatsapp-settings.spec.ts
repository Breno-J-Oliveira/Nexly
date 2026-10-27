import { expect, test } from '../fixtures';

test('configuração diferencia simulação, falha e envio aceito sem mensagens reais', async ({
  page,
  baseURL,
}) => {
  // Cada cenário reabre a página e descarta intencionalmente o toggle não salvo.
  page.on('dialog', async (dialog) => {
    expect(dialog.type()).toBe('beforeunload');
    await dialog.accept();
  });
  let mode: 'unconfigured' | 'simulation' | 'ready' = 'unconfigured';
  let sent = false;
  let submittedPhone = '';
  await page.route('**/api/whatsapp/status', (route) =>
    route.fulfill({
      headers: {
        'Access-Control-Allow-Origin': baseURL!,
        'Access-Control-Allow-Credentials': 'true',
      },
      json: { provider: 'test', mode, enabled: mode === 'ready' },
    }),
  );
  // Todo POST é interceptado: nenhum provedor externo recebe mensagens neste teste.
  await page.route('**/api/whatsapp/test', async (route) => {
    submittedPhone = route.request().postDataJSON().phone;
    await route.fulfill({
      headers: {
        'Access-Control-Allow-Origin': baseURL!,
        'Access-Control-Allow-Credentials': 'true',
      },
      json: { sent, simulated: mode === 'simulation' },
    });
  });
  await page.goto('/login');
  await page
    .getByLabel('E-mail', { exact: true })
    .fill(process.env.E2E_EMAIL || 'admin@nexly.com.br');
  await page.getByLabel('Senha', { exact: true }).fill(process.env.E2E_PASSWORD || 'nexly123');
  await page.getByRole('button', { name: 'Entrar no painel', exact: true }).click();
  await page.waitForURL('**/dashboard');
  const open = async () => {
    await page.goto('/configuracoes');
    await page.getByRole('main').getByRole('button', { name: 'Notificações', exact: true }).click();
    const toggle = page.getByRole('switch', { name: 'Lembretes automáticos de WhatsApp' });
    if ((await toggle.getAttribute('aria-checked')) === 'false') await toggle.click();
  };
  await open();
  await expect(page.getByText('Configuração incompleta', { exact: true })).toBeVisible();
  await page.getByLabel('Telefone para receber o teste', { exact: true }).fill('(11) 99999-1234');
  await expect(
    page.getByRole('button', { name: 'Enviar mensagem de teste', exact: true }),
  ).toBeDisabled();
  expect(submittedPhone).toBe('');

  mode = 'simulation';
  await open();
  await page.getByLabel('Telefone para receber o teste', { exact: true }).fill('123');
  await page.getByRole('button', { name: 'Simular mensagem de teste', exact: true }).click();
  await expect(page.getByRole('main').getByRole('alert')).toContainText('Informe o telefone');
  expect(submittedPhone).toBe('');
  await page.getByLabel('Telefone para receber o teste', { exact: true }).fill('(55) 99999-1234');
  await page.getByRole('button', { name: 'Simular mensagem de teste', exact: true }).click();
  await expect(
    page.getByText('Simulação concluída. Nenhuma mensagem foi enviada.', { exact: true }),
  ).toBeVisible();
  expect(submittedPhone).toBe('(55) 99999-1234');

  mode = 'ready';
  await open();
  await expect(
    page.getByText('Configurada — entrega ainda não verificada', { exact: true }),
  ).toBeVisible();
  await page.getByLabel('Telefone para receber o teste', { exact: true }).fill('(11) 99999-1234');
  await page.getByRole('button', { name: 'Enviar mensagem de teste', exact: true }).click();
  await expect(page.getByRole('main').getByRole('alert')).toContainText(
    'O provedor não aceitou o envio',
  );
  sent = true;
  await page.getByRole('button', { name: 'Enviar mensagem de teste', exact: true }).click();
  await expect(
    page.getByText('Envio aceito pelo provedor. Confira o recebimento no WhatsApp.', {
      exact: true,
    }),
  ).toBeVisible();
});
