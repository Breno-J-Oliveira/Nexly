'use client';

import { useEffect, useState } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Skeleton } from '@/components/ui/Skeleton';
import { VencimentoAlert } from '@/components/ui/VencimentoAlert';
import { api } from '@/lib/api';
import { formatarMoeda } from '@/lib/format';

interface DashboardData {
  agendamentosHoje: { total: number };
  receitaMes: { atual: number; variacaoPercentual: number };
  ticketMedio: number;
  agendamentosPorDia: { data: string; total: number }[];
  topServicos: { nome: string; quantidade: number }[];
  alertasEstoque: { id: string; nome: string; estoqueAtual: number; estoqueMinimo: number }[];
  vencimentosProximos?: { id: string; nome: string; sku?: string; dataVencimento: string }[];
}

interface FinanceiroData {
  receita: number;
  cmv: number;
  margemBruta: number;
  margemPercentual: number;
  ticketMedio: number;
}

const tooltipStyle = {
  background: '#18181b',
  border: '1px solid #3f3f46',
  borderRadius: 8,
  color: '#f4f4f5',
  fontSize: 13,
};

function corMargem(pct: number): string {
  if (pct >= 30) return '#22C55E';
  if (pct >= 15) return '#EAB308';
  return '#EF4444';
}

export default function DashboardPage() {
  const [dados, setDados] = useState<DashboardData | null>(null);
  const [financeiro, setFinanceiro] = useState<FinanceiroData | null>(null);
  const [finLoading, setFinLoading] = useState(true);

  useEffect(() => {
    api
      .get<DashboardData>('/dashboard')
      .then((r) => setDados(r.data))
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    const hoje = new Date();
    const inicio = new Date(hoje.getFullYear(), hoje.getMonth(), 1).toISOString();
    const fim = hoje.toISOString();
    api
      .get<FinanceiroData>('/financeiro/dre', { params: { inicio, fim } })
      .then((r) => setFinanceiro(r.data))
      .catch(() => setFinanceiro(null))
      .finally(() => setFinLoading(false));
  }, []);

  if (!dados) {
    return (
      <div>
        <h2 className="text-xl font-semibold" style={{ color: '#FAFAFA' }}>Dashboard</h2>
        <p className="mt-1 text-sm" style={{ color: '#71717A' }}>Visão geral do seu negócio</p>
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Skeleton variant="kpi" count={4} />
        </div>
        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="rounded-xl p-5" style={{ backgroundColor: '#111116', border: '1px solid rgba(255,255,255,0.06)' }}>
            <div className="h-5 w-2/5 rounded skeleton-shimmer" />
            <div className="mt-4 h-64 rounded skeleton-shimmer" />
          </div>
          <div className="rounded-xl p-5" style={{ backgroundColor: '#111116', border: '1px solid rgba(255,255,255,0.06)' }}>
            <div className="h-5 w-2/5 rounded skeleton-shimmer" />
            <div className="mt-4 h-64 rounded skeleton-shimmer" />
          </div>
        </div>
      </div>
    );
  }

  const variacao = dados.receitaMes.variacaoPercentual;
  const variacaoPositiva = variacao >= 0;

  const kpis = [
    { label: 'Agendamentos hoje', valor: String(dados.agendamentosHoje.total) },
    {
      label: 'Receita do mês',
      valor: formatarMoeda(dados.receitaMes.atual),
      variacao: `${variacaoPositiva ? '+' : ''}${variacao.toFixed(1)}%`,
    },
    { label: 'Ticket médio', valor: formatarMoeda(dados.ticketMedio) },
    { label: 'Produtos em alerta', valor: String(dados.alertasEstoque.length) },
  ];

  const margemPct = financeiro?.margemPercentual ?? 0;
  const cor = corMargem(margemPct);

  const finCards = [
    {
      label: 'CMV do mês',
      valor: formatarMoeda(financeiro?.cmv ?? 0),
      corValor: '#EF4444',
      sub: 'Custo de insumos consumidos',
      icon: 'trendingDown',
      iconBg: 'rgba(239,68,68,0.12)',
    },
    {
      label: 'Margem bruta',
      valor: formatarMoeda(financeiro?.margemBruta ?? 0),
      pct: `${margemPct.toFixed(0)}%`,
      corValor: cor,
      sub: 'Receita — CMV do mês',
      icon: 'trendingUp',
      iconBg: 'rgba(34,197,94,0.12)',
    },
    {
      label: 'Lucro estimado',
      valor: formatarMoeda(financeiro?.margemBruta ?? 0),
      corValor: cor,
      sub: 'Estimado. Não inclui custos fixos.',
      icon: 'trendingUp',
      iconBg: 'rgba(34,197,94,0.12)',
      info: true,
    },
  ];

  const vencendo = dados.vencimentosProximos ?? [];

  return (
    <div>
      <h2 className="text-xl font-semibold text-zinc-100">Dashboard</h2>
      <p className="mt-1 text-sm text-zinc-400">Visão geral do seu negócio</p>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((kpi) => (
          <div key={kpi.label} className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
            <p className="text-sm text-zinc-400">{kpi.label}</p>
            <p className="mt-1 text-2xl font-semibold text-zinc-100">{kpi.valor}</p>
            {kpi.variacao && (
              <p className={`text-xs ${variacaoPositiva ? 'text-emerald-400' : 'text-red-400'}`}>
                {kpi.variacao} vs mês anterior
              </p>
            )}
          </div>
        ))}
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {finLoading ? (
          <Skeleton variant="kpi" count={3} />
        ) : (
          finCards.map((c) => (
            <div key={c.label} className="relative rounded-xl border border-zinc-800 bg-zinc-900 p-5">
              <div className="absolute right-4 top-4 flex h-7 w-7 items-center justify-center rounded-full" style={{ backgroundColor: c.iconBg }}>
                {c.icon === 'trendingDown' ? (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={c.corValor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                    <path d="M23 6l-9.5 9.5-5-5L1 18" />
                    <path d="M17 18h6v-6" />
                  </svg>
                ) : (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={c.corValor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                    <path d="M23 6l-9.5 9.5-5-5L1 18" />
                    <path d="M17 6h6v6" />
                  </svg>
                )}
              </div>
              <p className="text-sm text-zinc-400">{c.label}</p>
              <p className="mt-1 flex items-baseline gap-1.5">
                <span className="text-2xl font-semibold" style={{ color: c.corValor }}>{c.valor}</span>
                {c.pct && <span className="text-sm text-zinc-400">({c.pct})</span>}
              </p>
              <p className="mt-1 flex items-center gap-1 text-xs text-zinc-400">
                {c.sub}
                {c.info && (
                  <span className="group relative inline-flex">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#71717A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10" />
                      <path d="M12 16v-4M12 8h.01" />
                    </svg>
                    <span className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 w-56 -translate-x-1/2 rounded-md px-3 py-2 text-[11px] leading-snug opacity-0 transition-opacity group-hover:opacity-100" style={{ backgroundColor: '#18181b', border: '1px solid #3f3f46', color: '#a1a1aa' }}>
                      Para calcular o lucro real, subtraia aluguel, salários e outros custos fixos do valor de margem bruta.
                    </span>
                  </span>
                )}
              </p>
            </div>
          ))
        )}
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
          <h3 className="font-semibold text-zinc-100">Agendamentos concluídos (30 dias)</h3>
<div className="mt-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={dados.agendamentosPorDia}>
                <defs>
                  <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366F1" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#6366F1" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                <XAxis
                  dataKey="data"
                  tick={{ fontSize: 11, fill: '#a1a1aa' }}
                  tickFormatter={(value: string) => {
                    const [, m, d] = value.split('-');
                    return `${d}/${m}`;
                  }}
                />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#a1a1aa' }} />
                <Tooltip contentStyle={tooltipStyle} />
                <Area type="monotone" dataKey="total" stroke="#6366F1" strokeWidth={2} fill="url(#grad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
          <h3 className="font-semibold text-zinc-100">Top 5 serviços</h3>
          <div className="mt-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dados.topServicos} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                <XAxis
                  type="number"
                  allowDecimals={false}
                  tick={{ fontSize: 11, fill: '#a1a1aa' }}
                />
                <YAxis
                  type="category"
                  dataKey="nome"
                  width={110}
                  tick={{ fontSize: 11, fill: '#a1a1aa' }}
                />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="quantidade" fill="#818cf8" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="mt-6 rounded-xl border border-zinc-800 bg-zinc-900 p-5">
        <h3 className="font-semibold text-zinc-100">Alertas de estoque</h3>
        {dados.alertasEstoque.length === 0 ? (
          <p className="mt-2 text-sm text-zinc-400">Nenhum produto em estado crítico. 🎉</p>
        ) : (
          <div className="mt-3 space-y-2">
            {dados.alertasEstoque.map((p) => (
              <div
                key={p.id}
                className="flex items-center justify-between rounded-lg border border-red-500/20 bg-red-500/5 px-4 py-2"
              >
                <span className="text-sm font-medium text-zinc-100">{p.nome}</span>
                <span className="text-sm text-red-400">
                  {p.estoqueAtual} / mín. {p.estoqueMinimo}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {vencendo.length > 0 && (
        <div className="mt-6 rounded-xl border border-yellow-500/20 bg-yellow-500/5 p-5">
          <h3 className="font-semibold text-zinc-100">Vencimentos próximos (30 dias)</h3>
          <div className="mt-3 space-y-2">
            {vencendo.map((p) => {
              const dias = Math.ceil(
                (new Date(p.dataVencimento).getTime() - new Date().getTime()) / 86400000,
              );
              const corDias = dias <= 7 ? '#EF4444' : '#EAB308';
              return (
                <div key={p.id} className="flex items-center justify-between rounded-lg px-4 py-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-zinc-100">{p.nome}</span>
                    {p.sku && <span className="text-sm text-zinc-500">{p.sku}</span>}
                  </div>
                  <span className="text-sm" style={{ color: corDias }}>
                    Vence em {dias} {dias === 1 ? 'dia' : 'dias'}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
