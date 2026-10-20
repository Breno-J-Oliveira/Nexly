import { ServiceUnavailableException } from '@nestjs/common';

/** Origem pública usada em links compartilháveis; nunca usa o endereço interno da API. */
export function publicAppUrl(config: NodeJS.ProcessEnv = process.env): string {
  const production = config.NODE_ENV === 'production';
  const configured = config.PUBLIC_APP_URL || config.NEXT_PUBLIC_APP_URL;
  const candidate =
    configured ||
    config.CORS_ORIGIN?.split(',')
      .map((value) => value.trim())
      .find((value) => !production || value.startsWith('https://')) ||
    (!production ? 'http://localhost:3002' : '');
  try {
    const url = new URL(candidate);
    if (
      !['https:', 'http:'].includes(url.protocol) ||
      (production && url.protocol !== 'https:') ||
      url.username ||
      url.password ||
      url.search ||
      url.hash ||
      url.pathname !== '/' ||
      (production && ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname))
    )
      throw new Error('Invalid public origin');
    return url.origin;
  } catch {
    throw new ServiceUnavailableException(
      'O endereço público do Nexly precisa ser configurado para gerar convites.',
    );
  }
}
