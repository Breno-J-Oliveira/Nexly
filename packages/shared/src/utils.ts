export function validarCnpj(cnpj: string): boolean {
  const digits = cnpj.replace(/\D/g, '');
  if (digits.length !== 14) return false;
  if (/^(\d)\1{13}$/.test(digits)) return false;

  const calc = (len: number): number => {
    let sum = 0;
    let pos = len - 7;
    for (let i = 0; i < len; i++) {
      sum += Number(digits[i]) * pos;
      pos--;
      if (pos < 2) pos = 9;
    }
    const rest = sum % 11;
    return rest < 2 ? 0 : 11 - rest;
  };

  const d1 = calc(12);
  const d2 = calc(13);
  return d1 === Number(digits[12]) && d2 === Number(digits[13]);
}

export function formatarCnpj(cnpj: string): string {
  const digits = cnpj.replace(/\D/g, '');
  if (digits.length !== 14) return cnpj;
  return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12)}`;
}
