'use client';

import Link from 'next/link';
import { Icon } from '@/components/ui/Icon';
import { useApi } from '@/lib/useApi';
import { useWorkspace } from '@/lib/workspace';

type Alert = { id: string; titulo: string; quantidade: number; href: string; modulo: string };

export function DashboardAlerts({
  stockCount,
  agenda,
  financeiro,
}: {
  stockCount: number;
  agenda: boolean;
  financeiro: boolean;
}) {
  const { profile } = useWorkspace();
  const enabled = agenda || financeiro;
  const result = useApi<{ alertas: Alert[] }>('/dashboard/alertas', { immediate: enabled });
  const alerts = (enabled ? (result.data?.alertas ?? []) : []).filter(
    (alert) =>
      profile.modulos.some((module) => module === alert.modulo) &&
      (alert.modulo === 'relatorios' ? financeiro : alert.modulo === 'agenda' && agenda),
  );
  return (
    <section
      aria-labelledby="dashboard-alerts"
      className="mb-6 rounded-xl border border-white/10 bg-[#111116] p-5 sm:p-6"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="dashboard-alerts" className="flex items-center gap-3 text-base font-medium">
          <Icon name="bell" color="#A1A1AA" />
          Precisa da sua atenção
        </h2>
        {enabled && (
          <button
            type="button"
            disabled={result.loading}
            onClick={() => void result.refetch()}
            className="min-h-10 rounded px-2 text-xs text-[#A1A1AA] hover:text-white disabled:opacity-50"
          >
            {result.loading ? 'Atualizando…' : 'Atualizar alertas'}
          </button>
        )}
      </div>
      {stockCount > 0 || alerts.length > 0 ? (
        <ul className="mt-3 grid gap-x-8 sm:grid-cols-2">
          {stockCount > 0 && (
            <AlertItem
              href="#alertas-estoque"
              titulo="Produtos com estoque baixo"
              quantidade={stockCount}
            />
          )}
          {alerts.map((alert) => (
            <AlertItem key={alert.id} {...alert} />
          ))}
        </ul>
      ) : !result.error && !result.loading ? (
        <p className="mt-2 text-sm leading-6 text-[#A1A1AA]">
          Tudo em dia nos itens verificados. As próximas pendências aparecem aqui.
        </p>
      ) : null}
      {enabled && result.error && (
        <p role="status" className="mt-3 text-sm leading-6 text-amber-200">
          Não foi possível consultar as pendências de agenda e contas. Use “Atualizar alertas” para
          tentar novamente.
        </p>
      )}
      {enabled && result.loading && (
        <p role="status" className="mt-2 text-xs text-[#A1A1AA]">
          Consultando pendências…
        </p>
      )}
    </section>
  );
}

function AlertItem({
  href,
  titulo,
  quantidade,
}: {
  href: string;
  titulo: string;
  quantidade: number;
}) {
  return (
    <li>
      <Link
        href={href}
        className="flex min-h-16 items-center gap-3 border-t border-white/[0.06] py-3 text-sm hover:text-[#C7D2FE]"
      >
        <span className="flex h-8 min-w-8 shrink-0 items-center justify-center rounded-lg bg-amber-400/10 px-2 text-xs font-semibold text-amber-200">
          {quantidade}
        </span>
        <span className="flex-1 leading-6">{titulo}</span>
        <span aria-hidden="true" className="text-[#A1A1AA]">
          ↗
        </span>
      </Link>
    </li>
  );
}
