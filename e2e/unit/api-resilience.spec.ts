import { expect, test } from '@playwright/test';
import { AxiosError } from 'axios';
import { api } from '../../apps/web/src/lib/api';
import { parseApiError } from '../../apps/web/src/lib/errors';

test('consultas têm prazo limitado, exportações têm prazo maior e gravações não são repetidas', async () => {
  const requests: { method?: string; timeout?: number }[] = [];
  const adapter: NonNullable<Parameters<typeof api.request>[0]['adapter']> = async (config) => {
    requests.push({ method: config.method, timeout: config.timeout });
    return { config, data: {}, headers: {}, status: 200, statusText: 'OK' };
  };
  await api.get('/clientes', { adapter });
  await api.get('/export/vendas/csv', { adapter, responseType: 'blob' });
  await api.get('/clientes', { adapter, timeout: 5_000 });
  await api.post('/vendas', {}, { adapter });
  expect(requests).toEqual([
    { method: 'get', timeout: 20_000 },
    { method: 'get', timeout: 60_000 },
    { method: 'get', timeout: 5_000 },
    { method: 'post', timeout: 0 },
  ]);
});

test('erros de conexão e demora são legíveis e validações preservam as mensagens da API', () => {
  expect(
    parseApiError(new AxiosError('timeout of 20000ms exceeded', 'ECONNABORTED')).message,
  ).toContain('demorou para responder');
  expect(parseApiError(new AxiosError('Network Error', 'ERR_NETWORK')).message).toContain(
    'Confira sua conexão',
  );
  const error = new AxiosError('Request failed', 'ERR_BAD_REQUEST');
  error.response = {
    data: { message: ['Nome é obrigatório', 'Telefone inválido'], code: 'VALIDATION_ERROR' },
    status: 400,
    statusText: 'Bad Request',
    headers: {},
    config: { headers: {} } as never,
  };
  expect(parseApiError(error)).toMatchObject({
    message: 'Nome é obrigatório. Telefone inválido',
    statusCode: 400,
    code: 'VALIDATION_ERROR',
  });
  error.response.data = '<html>proxy unavailable</html>';
  expect(parseApiError(error).message).not.toContain('html');
});
