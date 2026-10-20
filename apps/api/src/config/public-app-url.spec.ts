import { ServiceUnavailableException } from '@nestjs/common';
import { publicAppUrl } from './public-app-url';

describe('origem pública dos convites', () => {
  it('prioriza o endereço público e remove apenas a barra final', () => {
    expect(
      publicAppUrl({
        NODE_ENV: 'production',
        PUBLIC_APP_URL: 'https://nexly.example/',
        CORS_ORIGIN: 'https://other.example',
      }),
    ).toBe('https://nexly.example');
  });
  it('mantém compatibilidade com a configuração pública antiga', () => {
    expect(
      publicAppUrl({ NODE_ENV: 'production', NEXT_PUBLIC_APP_URL: 'https://nexly.example' }),
    ).toBe('https://nexly.example');
  });
  it('usa a origem HTTPS publicada do CORS quando não há variável de link', () => {
    expect(
      publicAppUrl({
        NODE_ENV: 'production',
        CORS_ORIGIN: 'http://localhost:3002, https://nexly-web.vercel.app',
      }),
    ).toBe('https://nexly-web.vercel.app');
  });
  it('permite o endereço local apenas fora de produção', () => {
    expect(publicAppUrl({ NODE_ENV: 'development' })).toBe('http://localhost:3002');
  });
  it.each([
    '',
    'http://nexly.example',
    'https://localhost',
    'https://127.0.0.1',
    'https://[::1]',
    'https://user:pass@nexly.example',
    'https://nexly.example/path',
    'https://nexly.example?token=x',
    'https://nexly.example#token=x',
    'javascript:alert(1)',
  ])('recusa origem inválida em produção: %s', (url) => {
    expect(() => publicAppUrl({ NODE_ENV: 'production', PUBLIC_APP_URL: url })).toThrow(
      ServiceUnavailableException,
    );
  });
});
