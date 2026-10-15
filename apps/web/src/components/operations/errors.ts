import { isAxiosError } from 'axios';
export function operationError(error: unknown): string {
  if (isAxiosError(error)) {
    const msg = error.response?.data?.message;
    return Array.isArray(msg)
      ? msg.join('. ')
      : typeof msg === 'string'
        ? msg
        : 'Não foi possível concluir a operação. Tente novamente.';
  }
  return 'Não foi possível concluir a operação. Tente novamente.';
}
