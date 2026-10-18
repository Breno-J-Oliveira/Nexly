'use client';
import Link from 'next/link';
import { useApi } from '@/lib/useApi';
import { useWorkspace } from '@/lib/workspace';
import type { Inicio } from './PreferenciasNegocio';
export function PrimeirosPassos() {
  const remote = useApi<Inicio>('/gestao/inicio'),
    { enabled } = useWorkspace();
  const etapas = remote.data?.etapas.filter((e) => enabled(e.href)) ?? [];
  if (!remote.data || remote.error || remote.data.primeiroAcessoDispensado || !etapas.length)
    return null;
  const completos = etapas.filter((e) => e.concluida).length;
  return (
    <div className="mt-5 border-t border-white/10 pt-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-sm font-semibold">
          Seus primeiros passos · {completos} de {etapas.length}
        </h3>
        <Link className="text-xs text-[#A5B4FC]" href="/meu-nexly">
          Preferências do guia
        </Link>
      </div>
      <progress
        aria-label="Progresso da configuração inicial"
        className="mt-3 h-2 w-full accent-indigo-400"
        value={completos}
        max={etapas.length}
      />
      <ol className="mt-3 grid gap-2 sm:grid-cols-2">
        {etapas.map((e) => (
          <li key={e.id}>
            <Link
              className="flex min-h-11 items-center gap-3 rounded-lg border border-white/10 px-3 py-2 text-sm hover:border-indigo-400/50"
              href={e.href}
            >
              <span
                aria-hidden="true"
                className={e.concluida ? 'text-emerald-300' : 'text-[#A1A1AA]'}
              >
                {e.concluida ? '✓' : '○'}
              </span>
              <span>{e.nome}</span>
              <span className="sr-only">{e.concluida ? 'Concluído' : 'Pendente'}</span>
            </Link>
          </li>
        ))}
      </ol>
    </div>
  );
}
