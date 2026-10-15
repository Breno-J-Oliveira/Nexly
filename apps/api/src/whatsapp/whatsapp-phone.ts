/** Telefone brasileiro local (DDD + número) ou com DDI 55. */
export const TELEFONE_WHATSAPP = /^(?:\d{10,11}|55\d{10,11})$/;

export function normalizarTelefoneWhatsapp(phone: string): string | null {
  const digits = phone.replace(/\D/g, '');
  if (!TELEFONE_WHATSAPP.test(digits)) return null;
  return digits.length <= 11 ? `55${digits}` : digits;
}
