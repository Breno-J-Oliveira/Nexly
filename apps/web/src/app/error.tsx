'use client';

import { useEffect } from 'react';
import Link from 'next/link';

/** Erros de uma rota preservam o layout raiz e oferecem recuperação explícita. */
export default function RouteError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    // O detalhe permanece no console de desenvolvimento; a interface nunca exibe stack traces.
    if (process.env.NODE_ENV !== 'production') console.error('Unhandled UI error:', error);
  }, [error]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#060608] px-5 py-16 text-white">
      <div className="w-full max-w-xl rounded-2xl border border-white/10 bg-[#111116] p-7 sm:p-10">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#818CF8]">
          Vamos retomar
        </p>
        <h1 className="mt-5 text-3xl font-semibold tracking-[-0.04em]">Algo deu errado</h1>
        <p className="mt-4 text-sm leading-7 text-[#A1A1AA]">
          Não foi possível exibir esta página. Tente carregá-la novamente ou volte para o início.
        </p>
        {error.digest && (
          <p className="mt-4 break-all font-mono text-xs text-[#A1A1AA]">
            ID do erro: {error.digest}
          </p>
        )}
        <div className="mt-7 flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            onClick={() => retry()}
            className="rounded-xl bg-[#6366F1] px-5 py-3.5 text-sm font-semibold text-[#FAFAFA] hover:bg-[#4F46E5]"
          >
            Tentar de novo
          </button>
          <Link
            href="/"
            className="rounded-xl border border-white/15 px-5 py-3.5 text-center text-sm font-medium hover:bg-white/5"
          >
            Ir para o início
          </Link>
        </div>
        <p className="mt-6 text-xs leading-6 text-[#A1A1AA]">
          Se o problema continuar,{' '}
          <Link href="/suporte" className="rounded text-[#818CF8] underline underline-offset-4">
            fale com o suporte
          </Link>{' '}
          e informe a página em que aconteceu.
        </p>
      </div>
    </main>
  );
}
