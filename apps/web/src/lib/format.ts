/**
 * Formatadores de input — para uso com React onChange.
 * Mantêm o cursor simples (não preservam posição) — suficiente para máscaras
 * comuns de CNPJ, telefone, etc.
 */

export function soDigitos(v: string): string {
  return v.replace(/\D/g, '');
}

export function maskCnpj(v: string): string {
  const d = soDigitos(v).slice(0, 14);
  return d
    .replace(/^(\d{2})(\d)/, '$1.$2')
    .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1/$2')
    .replace(/(\d{4})(\d)/, '$1-$2');
}

export function maskTelefone(v: string): string {
  const d = soDigitos(v).slice(0, 11);
  if (d.length <= 10) {
    return d
      .replace(/^(\d{2})(\d)/, '($1) $2')
      .replace(/(\d{4})(\d)/, '$1-$2');
  }
  return d.replace(/^(\d{2})(\d{5})(\d)/, '($1) $2-$3');
}

export function maskCpf(v: string): string {
  const d = soDigitos(v).slice(0, 11);
  return d
    .replace(/^(\d{3})(\d)/, '$1.$2')
    .replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1-$2');
}

const moedaFmt = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
});

export function formatarMoeda(v: number | string): string {
  const n = typeof v === 'string' ? Number(v) : v;
  return moedaFmt.format(Number.isFinite(n) ? n : 0);
}

const dataFmt = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
});

const dataHoraFmt = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

export function formatarData(iso: string | Date): string {
  const d = typeof iso === 'string' ? new Date(iso) : iso;
  return dataFmt.format(d);
}

export function formatarDataHora(iso: string | Date): string {
  const d = typeof iso === 'string' ? new Date(iso) : iso;
  return dataHoraFmt.format(d);
}

export function formatarHora(iso: string | Date): string {
  const d = typeof iso === 'string' ? new Date(iso) : iso;
  return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}