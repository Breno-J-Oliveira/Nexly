import { ReactNode } from 'react';

const colors: Record<string, string> = {
  AGENDADO: 'bg-blue-500/10 text-blue-400',
  CONFIRMADO: 'bg-amber-500/10 text-amber-400',
  CONCLUIDO: 'bg-emerald-500/10 text-emerald-400',
  CANCELADO: 'bg-zinc-700/40 text-zinc-500',
  ENTRADA: 'bg-emerald-500/10 text-emerald-400',
  SAIDA: 'bg-red-500/10 text-red-400',
};

export function Badge({ children, color }: { children: ReactNode; color?: string }) {
  const classes = colors[color ?? ''] ?? 'bg-zinc-800 text-zinc-400';
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${classes}`}
    >
      {children}
    </span>
  );
}
