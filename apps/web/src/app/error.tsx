'use client';

import { useEffect } from 'react';
import Link from 'next/link';

/**
 * Error boundary global do Next.js. Captura erros não tratados em qualquer
 * rota dentro de `app/` e mostra uma página amigável em vez do stack trace.
 *
 * O Next chama esse componente automaticamente quando um erro é lançado
 * em um Server Component ou durante o render de um Client Component.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Em produção, enviar para o Sentry/Datadog aqui.
    if (process.env.NODE_ENV === 'production') {
      // eslint-disable-next-line no-console
      console.error('Unhandled UI error', error);
    } else {
      // eslint-disable-next-line no-console
      console.error('Unhandled UI error:', error);
    }
  }, [error]);

  return (
    <html>
      <body className="min-h-screen bg-[#060608] text-[#FAFAFA]">
        <div className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-6 text-center">
          <p className="text-5xl">⚠️</p>
          <h1 className="mt-4 text-2xl font-semibold">Algo deu errado</h1>
          <p className="mt-2 text-sm text-[#A1A1AA]">
            Encontramos um problema inesperado. Você pode tentar recarregar a página ou voltar para o início.
          </p>
          {error.digest && (
            <p className="mt-3 font-mono text-xs text-[#71717A]">ID do erro: {error.digest}</p>
          )}
          <div className="mt-6 flex gap-3">
            <button
              onClick={() => reset()}
              className="rounded-lg bg-[#6366F1] px-4 py-2 text-sm font-medium text-[#09090B] hover:bg-[#818CF8]"
            >
              Tentar de novo
            </button>
            <Link
              href="/dashboard"
              className="rounded-lg border border-[rgba(255,255,255,0.10)] px-4 py-2 text-sm font-medium text-[#D4D4D8] hover:bg-[#18181F]"
            >
              Ir para o início
            </Link>
          </div>
        </div>
      </body>
    </html>
  );
}
