'use client';
import { useWorkspace } from '@/lib/workspace';
import { WorkspaceWelcome } from '@/components/WorkspaceWelcome';
import { DashboardAlerts } from '@/components/DashboardAlerts';

import Link from 'next/link';
import { Icon } from '@/components/ui/Icon';
import { useEffect, useState } from 'react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Skeleton } from '@/components/ui/Skeleton';
import { api } from '@/lib/api';
import { formatarMoeda } from '@/lib/format';
import { ErrorState } from '@/components/ui/ErrorState';

interface DashboardData {
  permissoes: { financeiro: boolean; agenda: boolean; estoque: boolean };
  agendamentosHoje: {
    total: number;
    AGENDADO: number;
    CONFIRMADO: number;
    CONCLUIDO: number;
    CANCELADO: number;
  };
  receitaMes: { atual: number; anterior: number; variacaoPercentual: number };
  ticketMedio: number;
  faturamentoHoje: number;
  taxaOcupacao: number;
  evolucaoVendasSemanal: { dia: string; total: number }[];
  topServicos: { nome: string; quantidade: number }[];
  topProdutos: { nome: string; quantidade: number }[];
  alertasEstoque: { id: string; nome: string; estoqueAtual: number; estoqueMinimo: number }[];
  proximosCompromissos: {
    id: string;
    horaInicio: string;
    horaFim: string | null;
    cliente: string;
    servico: string;
    profissional: string;
    status: string;
  }[];
}

const EMPTY_DASHBOARD: DashboardData = {
  permissoes: { financeiro: false, agenda: false, estoque: false },
  agendamentosHoje: { total: 0, AGENDADO: 0, CONFIRMADO: 0, CONCLUIDO: 0, CANCELADO: 0 },
  receitaMes: { atual: 0, anterior: 0, variacaoPercentual: 0 },
  ticketMedio: 0,
  faturamentoHoje: 0,
  taxaOcupacao: 0,
  evolucaoVendasSemanal: [],
  topServicos: [],
  topProdutos: [],
  alertasEstoque: [],
  proximosCompromissos: [],
};

const tooltipStyle = {
  background: '#18181F',
  border: '1px solid rgba(255,255,255,0.10)',
  borderRadius: 8,
  color: '#FAFAFA',
  fontSize: 13,
};

function formatHour(iso: string) {
  const d = new Date(iso);
  return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

function statusLabel(status: string) {
  switch (status) {
    case 'CONFIRMADO':
      return 'Confirmado';
    case 'CONCLUIDO':
      return 'Concluído';
    case 'CANCELADO':
      return 'Cancelado';
    default:
      return 'Agendado';
  }
}

function statusColor(status: string) {
  switch (status) {
    case 'CONFIRMADO':
      return { text: '#22C55E', bg: 'rgba(34,197,94,0.12)' };
    case 'CONCLUIDO':
      return { text: '#3B82F6', bg: 'rgba(59,130,246,0.12)' };
    case 'CANCELADO':
      return { text: '#EF4444', bg: 'rgba(239,68,68,0.12)' };
    default:
      return { text: '#EAB308', bg: 'rgba(234,179,8,0.12)' };
  }
}

export default function DashboardPage() {
  const { profile } = useWorkspace();
  const [dados, setDados] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [reload, setReload] = useState(0);
  const [produtosVencendo, setProdutosVencendo] = useState(0);
  const agendaAtiva = profile.modulos.includes('agenda') && Boolean(dados?.permissoes.agenda);
  const estoqueAtivo = profile.modulos.includes('estoque') && Boolean(dados?.permissoes.estoque);
  const financeiroAtivo =
    (profile.modulos.includes('relatorios') || profile.modulos.includes('vendas')) &&
    Boolean(dados?.permissoes.financeiro);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(false);
    api
      .get<DashboardData>('/dashboard')
      .then((r) => {
        if (active) setDados({ ...EMPTY_DASHBOARD, ...r.data });
      })
      .catch(() => {
        if (active) setError(true);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [reload]);

  useEffect(() => {
    let active = true;
    setProdutosVencendo(0);
    if (!estoqueAtivo || !dados?.permissoes.financeiro) return;
    api
      .get<unknown[]>('/export/produtos/vencendo', { params: { dias: 30 } })
      .then((r) => {
        if (active) setProdutosVencendo(Array.isArray(r.data) ? r.data.length : 0);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [estoqueAtivo, dados?.permissoes.financeiro]);

  if (error) return <ErrorState onRetry={() => setReload((value) => value + 1)} />;
  if (loading || !dados)
    return (
      <div aria-busy="true" aria-label="Carregando visão geral">
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <Skeleton variant="kpi" count={4} />
        </div>
        <div className="mt-6 h-72 rounded-xl skeleton-shimmer" />
      </div>
    );

  const kpis = [
    {
      visible: financeiroAtivo,
      label: 'FATURAMENTO HOJE',
      value: formatarMoeda(dados.faturamentoHoje),
      detail: 'Vendas registradas hoje',
    },
    {
      visible: agendaAtiva,
      label: 'ATENDIMENTOS HOJE',
      value: String(dados.agendamentosHoje.total),
      detail: dados.agendamentosHoje.CONFIRMADO + ' confirmados',
    },
    {
      visible: financeiroAtivo,
      label: 'TICKET MÉDIO',
      value: formatarMoeda(dados.ticketMedio),
      detail: 'Média das vendas do mês',
    },
    {
      visible: agendaAtiva,
      label: 'TAXA DE OCUPAÇÃO',
      value: dados.taxaOcupacao + '%',
      detail: 'Estimativa de horários ocupados',
    },
  ].filter((kpi) => kpi.visible);

  return (
    <div className="dashboard-overview">
      <details className="mb-6 border-b border-white/[0.06] pb-4">
        <summary className="cursor-pointer text-sm text-[#A1A1AA]">
          Seu Nexly · atalhos e primeiros passos
        </summary>
        <div className="mt-4">
          <WorkspaceWelcome />
        </div>
      </details>
      <dl className="grid grid-cols-2 gap-x-6 gap-y-7 pb-7 lg:grid-cols-4">
        {kpis.map((kpi) => (
          <div key={kpi.label} className="min-w-0 border-l border-white/10 pl-5">
            <dt className="text-[10px] font-medium tracking-wider text-[#A1A1AA]">{kpi.label}</dt>
            <dd className="mt-3 text-[clamp(1.35rem,2.4vw,1.9rem)] font-semibold tracking-tight text-[#FAFAFA]">
              {kpi.value}
              <span className="mt-2 block text-xs font-normal leading-5 tracking-normal text-[#A1A1AA]">
                {kpi.detail}
              </span>
            </dd>
          </div>
        ))}
      </dl>

      {(estoqueAtivo || agendaAtiva || financeiroAtivo) && (
        <DashboardAlerts
          stockCount={estoqueAtivo ? dados.alertasEstoque.length : 0}
          agenda={agendaAtiva}
          financeiro={
            profile.modulos.includes('relatorios') && Boolean(dados.permissoes.financeiro)
          }
        />
      )}

      <div
        className={
          financeiroAtivo && agendaAtiva
            ? 'grid min-w-0 gap-5 lg:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)]'
            : 'grid min-w-0 gap-5'
        }
      >
        {financeiroAtivo && (
          <section
            aria-labelledby="vendas-semana"
            className="min-w-0 rounded-xl border border-white/[0.06] bg-[#111116] p-5 sm:p-6"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 id="vendas-semana" className="text-base font-medium">
                  Movimento do negócio
                </h2>
                <p className="mt-1 text-xs leading-6 text-[#A1A1AA]">
                  Vendas por dia nos últimos 7 dias
                </p>
              </div>
              <span className="text-xs text-[#A1A1AA]">Valores em R$</span>
            </div>
            <div
              className="mt-5 h-64 overflow-hidden"
              role="img"
              aria-label="Gráfico de vendas por dia nos últimos 7 dias"
            >
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  accessibilityLayer
                  data={dados.evolucaoVendasSemanal}
                  margin={{ top: 12, right: 6, left: -20, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="gradVendas" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#A1A1AA" stopOpacity={0.16} />
                      <stop offset="100%" stopColor="#A1A1AA" stopOpacity={0.01} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    vertical={false}
                    strokeDasharray="3 5"
                    stroke="rgba(255,255,255,0.05)"
                  />
                  <XAxis
                    dataKey="dia"
                    tick={{ fontSize: 11, fill: '#A1A1AA' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    allowDecimals={false}
                    tick={{ fontSize: 11, fill: '#A1A1AA' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    contentStyle={tooltipStyle}
                    formatter={(value: number) => [formatarMoeda(value), 'Vendas']}
                  />
                  <Area
                    type="monotone"
                    dataKey="total"
                    stroke="#818CF8"
                    strokeWidth={2}
                    fill="url(#gradVendas)"
                    dot={false}
                    activeDot={{ r: 4 }}
                    isAnimationActive={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <details className="mt-3 border-t border-white/[0.06] pt-3">
              <summary className="cursor-pointer text-xs text-[#A1A1AA]">
                Consultar valores do gráfico
              </summary>
              <dl className="mt-3 grid grid-cols-2 gap-3 text-xs sm:grid-cols-4">
                {dados.evolucaoVendasSemanal.map((day, index) => (
                  <div key={day.dia + index}>
                    <dt className="text-[#A1A1AA]">{day.dia}</dt>
                    <dd className="mt-1">{formatarMoeda(day.total)}</dd>
                  </div>
                ))}
              </dl>
            </details>
          </section>
        )}

        {agendaAtiva && (
          <section
            aria-labelledby="proximos-compromissos"
            className="min-w-0 rounded-xl border border-white/[0.06] bg-[#111116] p-5 sm:p-6"
          >
            <div className="flex items-center justify-between gap-3">
              <h2 id="proximos-compromissos" className="text-base font-medium">
                Sua agenda hoje
              </h2>
              <Link
                href="/agenda"
                className="shrink-0 rounded py-2 text-xs text-[#818CF8] hover:text-white"
              >
                Ver agenda →
              </Link>
            </div>
            {dados.proximosCompromissos.length === 0 ? (
              <p className="py-10 text-sm leading-7 text-[#A1A1AA]">
                Nenhum compromisso para hoje. Seus próximos horários aparecem aqui.
              </p>
            ) : (
              <ul className="mt-3 divide-y divide-white/[0.06]">
                {dados.proximosCompromissos.slice(0, 4).map((c) => (
                  <li key={c.id} className="flex gap-4 py-4">
                    <time
                      dateTime={c.horaInicio}
                      className="pt-0.5 text-xs font-medium text-[#A1A1AA]"
                    >
                      {formatHour(c.horaInicio)}
                    </time>
                    <div className="min-w-0">
                      <p className="break-words text-sm font-medium">{c.cliente}</p>
                      <p className="mt-1 break-words text-xs leading-5 text-[#A1A1AA]">
                        {c.servico} · {c.profissional}
                      </p>
                      <p className="mt-2 text-[11px]" style={{ color: statusColor(c.status).text }}>
                        {statusLabel(c.status)}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
            {dados.proximosCompromissos.length > 4 && (
              <Link
                href="/agenda"
                className="mt-3 inline-flex min-h-11 items-center text-xs text-[#818CF8]"
              >
                Ver todos os compromissos →
              </Link>
            )}
          </section>
        )}
      </div>

      {estoqueAtivo && (
        <section
          id="alertas-estoque"
          aria-label="Atenção ao estoque"
          className="mt-5 scroll-mt-24 border-y border-white/[0.06] py-4"
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="flex items-center gap-2 text-sm font-medium">
              <Icon name="box-open" size="sm" color="#A1A1AA" />
              Atenção ao estoque
            </h2>
            <Link href="/estoque" className="rounded py-2 text-xs text-[#818CF8]">
              Ver estoque →
            </Link>
          </div>
          {dados.alertasEstoque.length === 0 ? (
            <p className="mt-1 text-xs leading-6 text-[#A1A1AA]">
              Nenhum alerta de estoque baixo no momento.
            </p>
          ) : (
            <details className="mt-2">
              <summary className="cursor-pointer text-xs leading-6 text-[#A1A1AA]">
                {dados.alertasEstoque.length}{' '}
                {dados.alertasEstoque.length === 1
                  ? 'item com estoque baixo'
                  : 'itens com estoque baixo'}{' '}
                · ver detalhes
              </summary>
              <ul className="mt-3 grid gap-3 sm:grid-cols-2">
                {dados.alertasEstoque.map((p) => (
                  <li
                    key={p.id}
                    className="flex min-w-0 justify-between gap-4 border-l border-amber-400/30 pl-3 text-xs leading-6"
                  >
                    <span className="break-words">{p.nome}</span>
                    <span className="shrink-0 text-[#A1A1AA]">{p.estoqueAtual} un.</span>
                  </li>
                ))}
              </ul>
            </details>
          )}
          {produtosVencendo > 0 && (
            <Link
              href="/produtos"
              className="mt-3 inline-flex min-h-11 items-center gap-2 text-xs text-amber-300"
            >
              <Icon name="triangle-exclamation" size="xs" />
              {produtosVencendo} {produtosVencendo === 1 ? 'produto vence' : 'produtos vencem'} em
              30 dias →
            </Link>
          )}
        </section>
      )}
    </div>
  );
}
