import { ReactNode } from 'react';

const colors: Record<string, string> = {
  AGENDADO: 'bg-[rgba(59,130,246,0.10)] text-[#60A5FA]',
  CONFIRMADO: 'bg-[rgba(234,179,8,0.10)] text-[#FACC15]',
  CONCLUIDO: 'bg-[rgba(34,197,94,0.10)] text-[#4ADE80]',
  CANCELADO: 'bg-[rgba(255,255,255,0.06)] text-[#71717A]',
  ENTRADA: 'bg-[rgba(34,197,94,0.10)] text-[#4ADE80]',
  SAIDA: 'bg-[rgba(239,68,68,0.10)] text-[#F87171]',
};

export function Badge({ children, color }: { children: ReactNode; color?: string }) {
  const classes = colors[color ?? ''] ?? 'bg-[#18181F] text-[#A1A1AA]';
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${classes}`}
    >
      {children}
    </span>
  );
}
