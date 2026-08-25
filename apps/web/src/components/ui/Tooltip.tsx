'use client';

import { ReactNode, useState } from 'react';

interface TooltipProps {
  text: string;
  children: ReactNode;
}

/**
 * Tooltip minimalista baseado em hover/focus. Sem deps externas.
 * Usa CSS `group` para não precisar de JS de posicionamento.
 */
export function Tooltip({ text, children }: TooltipProps) {
  const [open, setOpen] = useState(false);
  return (
    <span
      className="group relative inline-flex"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
    >
      {children}
      {open && (
        <span
          role="tooltip"
          className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-2 -translate-x-1/2 whitespace-nowrap rounded bg-zinc-800 px-2 py-1 text-xs text-zinc-100 shadow-lg ring-1 ring-zinc-700"
        >
          {text}
        </span>
      )}
    </span>
  );
}
