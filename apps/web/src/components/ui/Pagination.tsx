'use client';

import { Button } from './Button';

export function Pagination({
  page,
  total,
  limit,
  loading,
  onChange,
}: {
  page: number;
  total: number;
  limit: number;
  loading: boolean;
  onChange: (page: number) => void;
}) {
  return (
    <nav
      aria-label="Paginação"
      className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm text-[#A1A1AA]"
    >
      <span aria-live="polite">
        {total} {total === 1 ? 'resultado' : 'resultados'} · Página {page} de{' '}
        {Math.max(1, Math.ceil(total / limit))}
      </span>
      <div className="flex gap-2">
        <Button
          variant="secondary"
          disabled={loading || page <= 1}
          onClick={() => onChange(page - 1)}
        >
          Anterior
        </Button>
        <Button
          variant="secondary"
          disabled={loading || page * limit >= total}
          onClick={() => onChange(page + 1)}
        >
          Próxima
        </Button>
      </div>
    </nav>
  );
}
