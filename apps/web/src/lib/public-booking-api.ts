export class BookingApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

export async function bookingRequest<T>(url: string, options: RequestInit = {}): Promise<T> {
  const controller = new AbortController();
  const abort = () => controller.abort();
  options.signal?.addEventListener('abort', abort, { once: true });
  if (options.signal?.aborted) abort();
  const timeout = setTimeout(abort, 15000);
  try {
    const res = await fetch(url, { cache: 'no-store', ...options, signal: controller.signal });
    if (!res.ok) {
      let message = 'Não foi possível conectar ao estabelecimento. Tente novamente.';
      if (res.status === 400) message = 'Revise os dados informados e o horário selecionado.';
      if (res.status === 404) message = 'Link de agendamento inválido ou indisponível.';
      if (res.status === 409)
        message = 'Esse horário acabou de ser reservado. Escolha outro horário.';
      if (res.status === 429)
        message = 'Muitas solicitações. Aguarde um momento antes de tentar novamente.';
      throw new BookingApiError(res.status, message);
    }
    return (await res.json()) as T;
  } finally {
    clearTimeout(timeout);
    options.signal?.removeEventListener('abort', abort);
  }
}

export function mensagemErro(error: unknown): string {
  return error instanceof BookingApiError
    ? error.message
    : 'Não foi possível conectar. Verifique sua conexão e tente novamente.';
}
