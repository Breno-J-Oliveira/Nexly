import { ReactNode } from 'react';

const colors: Record<string, string> = {
  AGENDADO: 'bg-blue-100 text-blue-700',
  CONFIRMADO: 'bg-yellow-100 text-yellow-700',
  CONCLUIDO: 'bg-green-100 text-green-700',
  CANCELADO: 'bg-gray-200 text-gray-500',
  ENTRADA: 'bg-green-100 text-green-700',
  SAIDA: 'bg-red-100 text-red-700',
};

export function Badge({ children, color }: { children: ReactNode; color?: string }) {
  const classes = colors[color ?? ''] ?? 'bg-gray-100 text-gray-600';
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${classes}`}
    >
      {children}
    </span>
  );
}
