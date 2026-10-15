/** Validade é uma data de calendário; o fuso não pode mudar o dia cadastrado. */
export function expiryDays(iso: string, today = new Date()): number {
  const day = Date.parse(iso.slice(0, 10) + 'T00:00:00.000Z');
  const current = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
  return Math.round((day - current) / 86_400_000);
}

export function expiryLabel(iso: string): string {
  const days = expiryDays(iso);
  if (days < 0) return 'Vencido';
  if (days === 0) return 'Vence hoje';
  if (days === 1) return 'Vence amanhã';
  return `Vence em ${days} dias`;
}

export function formatExpiry(iso: string): string {
  return iso.slice(0, 10).split('-').reverse().join('/');
}
