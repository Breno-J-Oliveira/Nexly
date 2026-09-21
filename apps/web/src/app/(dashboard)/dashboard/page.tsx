'use client';

import Link from 'next/link';
import { Icon } from '@/components/ui/Icon';
import { useEffect, useMemo, useState } from 'react';
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

interface DashboardData {
  agendamentosHoje: { total: number; AGENDADO: number; CONFIRMADO: number; CONCLUIDO: number; CANCELADO: number };
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
    case 'CONFIRMADO': return 'Confirmado';
    case 'CONCLUIDO': return 'Concluído';
    case 'CANCELADO': return 'Cancelado';
    default: return 'Agendado';
  }
}

function statusColor(status: string) {
  switch (status) {
    case 'CONFIRMADO': return { text: '#22C55E', bg: 'rgba(34,197,94,0.12)' };
    case 'CONCLUIDO': return { text: '#3B82F6', bg: 'rgba(59,130,246,0.12)' };
    case 'CANCELADO': return { text: '#EF4444', bg: 'rgba(239,68,68,0.12)' };
    default: return { text: '#EAB308', bg: 'rgba(234,179,8,0.12)' };
  }
}

export default function DashboardPage() {
  const [dados, setDados] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [produtosVencendo, setProdutosVencendo] = useState(0);

  useEffect(() => {
    api.get<DashboardData>('/dashboard')
      .then((r) => setDados(r.data))
      .catch(() => undefined)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    api
      .get<unknown[]>('/export/produtos/vencendo', { params: { dias: 30 } })
      .then((r) => setProdutosVencendo(Array.isArray(r.data) ? r.data.length : 0))
      .catch(() => undefined);
  }, []);

  const hoje = useMemo(() => {
    const d = new Date();
    const dias = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
    const meses = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
    return `${dias[d.getDay()]}, ${d.getDate()} de ${meses[d.getMonth()]} de ${d.getFullYear()}`;
  }, []);

  if (loading || !dados) {
    return (
      <div>
        <div className="h-7 w-40 rounded skeleton-shimmer" />
        <div className="mt-2 h-4 w-64 rounded skeleton-shimmer" />
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Skeleton variant="kpi" count={4} />
        </div>
        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="col-span-2 rounded-2xl p-5" style={{ backgroundColor: '#111116', border: '1px solid rgba(255,255,255,0.06)' }}>
            <div className="h-5 w-2/5 rounded skeleton-shimmer" />
            <div className="mt-4 h-64 rounded skeleton-shimmer" />
          </div>
          <div className="rounded-2xl p-5" style={{ backgroundColor: '#111116', border: '1px solid rgba(255,255,255,0.06)' }}>
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
    {
      label: 'FATURAMENTO HOJE',
      valor: formatarMoeda(dados.faturamentoHoje),
      trend: `${variacaoPositiva ? '+' : ''}${variacao.toFixed(1)}% vs ontem`,
      trendUp: variacaoPositiva,
      icon: (
        <Icon name="arrow-right-arrow-left" className="text-[#22C55E]" size="sm" />
      ),
      iconBg: 'rgba(34,197,94,0.12)',
    },
    {
      label: 'ATENDIMENTOS HOJE',
      valor: String(dados.agendamentosHoje.total),
      trend: `+${dados.agendamentosHoje.CONFIRMADO} agendados`,
      trendUp: true,
      icon: (
        <Icon name="users" className="text-[#818CF8]" size="sm" />
      ),
      iconBg: 'rgba(99,102,241,0.12)',
    },
    {
      label: 'TICKET MÉDIO',
      valor: formatarMoeda(dados.ticketMedio),
      trend: '-2.1% vs média',
      trendUp: false,
      icon: (
        <Icon name="money-bill-wave" className="text-[#F87171]" size="sm" />
      ),
      iconBg: 'rgba(248,113,113,0.12)',
    },
    {
      label: 'TAXA DE OCUPAÇÃO',
      valor: `${dados.taxaOcupacao}%`,
      trend: 'Ideal para quarta',
      trendUp: true,
      icon: (
        <Icon name="chart-line" className="text-[#EAB308]" size="sm" />
      ),
      iconBg: 'rgba(234,179,8,0.12)',
    },
  ];

  return (
    <div>
      <div className="flex flex-col gap-1">
        <h1 className="text-[22px] font-semibold" style={{ color: '#FAFAFA' }}>Painel Geral</h1>
        <p className="text-[13px]" style={{ color: '#71717A' }}>{hoje}</p>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((kpi) => (
          <div key={kpi.label} className="rounded-2xl border p-5" style={{ backgroundColor: '#111116', borderColor: 'rgba(255,255,255,0.06)' }}>
            <div className="flex items-start justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: '#71717A' }}>{kpi.label}</span>
              <div className="flex h-8 w-8 items-center justify-center rounded-lg" style={{ backgroundColor: kpi.iconBg }}>{kpi.icon}</div>
            </div>
            <div className="mt-4 text-[28px] font-semibold" style={{ color: '#FAFAFA' }}>{kpi.valor}</div>
            <div className="mt-1 inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-medium" style={{ color: kpi.trendUp ? '#22C55E' : '#F87171', backgroundColor: kpi.trendUp ? 'rgba(34,197,94,0.10)' : 'rgba(248,113,113,0.10)' }}>
              {kpi.trendUp ? (
                <Icon name="arrow-trend-up" size="xs" />
              ) : (
                <Icon name="arrow-trend-down" size="xs" />
              )}
              {kpi.trend}
            </div>
          </div>
        ))}
      </div>

      {produtosVencendo > 0 && (
        <Link
          href="/produtos"
          className="mt-4 flex items-center justify-between rounded-2xl border p-5 transition-colors hover:bg-white/[0.02]"
          style={{ borderColor: 'rgba(234,179,8,0.30)', backgroundColor: 'rgba(234,179,8,0.06)' }}
        >
          <div className="flex items-center gap-3">
            <div
              className="flex h-9 w-9 items-center justify-center rounded-full"
              style={{ backgroundColor: 'rgba(234,179,8,0.12)' }}
            >
              <Icon name="triangle-exclamation" className="text-[#EAB308]" size="sm" />
            </div>
            <div>
              <p className="text-[14px] font-semibold" style={{ color: '#EAB308' }}>
                {produtosVencendo}{' '}
                {produtosVencendo === 1 ? 'produto vence' : 'produtos vencem'} em 30 dias
              </p>
              <p className="text-[12px]" style={{ color: '#A1A1AA' }}>
                Clique para ver →
              </p>
            </div>
          </div>
        </Link>
      )}

      <div className="mt-6 rounded-2xl border p-5" style={{ backgroundColor: '#111116', borderColor: 'rgba(255,255,255,0.06)' }}>
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-[16px] font-semibold" style={{ color: '#FAFAFA' }}>Evolução de Vendas Semanal</h3>
            <p className="text-[13px]" style={{ color: '#71717A' }}>Receita acumulada dos últimos 7 dias</p>
          </div>
          <div className="flex items-center gap-2 rounded-lg border px-3 py-1.5 text-[12px]" style={{ borderColor: 'rgba(255,255,255,0.08)', color: '#A1A1AA' }}>
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: '#6366F1' }} />
            Faturamento (R$)
          </div>
        </div>
        <div className="mt-4 h-72">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={dados.evolucaoVendasSemanal} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="gradVendas" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366F1" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#6366F1" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
              <XAxis dataKey="dia" tick={{ fontSize: 12, fill: '#71717A' }} axisLine={false} tickLine={false} />
              <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: '#71717A' }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={tooltipStyle} formatter={(value: number) => [`R$ ${value}`, 'Faturamento']} />
              <Area type="monotone" dataKey="total" stroke="#6366F1" strokeWidth={2} fill="url(#gradVendas)" dot={{ r: 4, fill: '#6366F1', stroke: '#fff', strokeWidth: 2 }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="rounded-2xl border p-5 lg:col-span-2" style={{ backgroundColor: '#111116', borderColor: 'rgba(255,255,255,0.06)' }}>
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-[16px] font-semibold" style={{ color: '#FAFAFA' }}>Próximos Compromissos</h3>
              <p className="text-[13px]" style={{ color: '#71717A' }}>{dados.proximosCompromissos.length} agendamentos hoje</p>
            </div>
            <Link href="/agenda" className="rounded-lg border px-3 py-1.5 text-[12px] font-medium transition-colors hover:bg-white/5" style={{ borderColor: 'rgba(255,255,255,0.08)', color: '#A1A1AA' }}>
              Ver agenda
            </Link>
          </div>

          <div className="mt-4 space-y-3">
            {dados.proximosCompromissos.length === 0 ? (
              <p className="text-[13px]" style={{ color: '#71717A' }}>Nenhum compromisso para hoje.</p>
            ) : (
              dados.proximosCompromissos.map((c) => {
                const st = statusColor(c.status);
                return (
                  <div key={c.id} className="flex items-center justify-between rounded-xl border p-4" style={{ borderColor: 'rgba(255,255,255,0.06)', backgroundColor: '#18181F' }}>
                    <div className="flex items-center gap-4">
                      <div className="rounded-lg px-3 py-2 text-[12px] font-semibold" style={{ backgroundColor: 'rgba(99,102,241,0.12)', color: '#818CF8' }}>
                        {formatHour(c.horaInicio)} - {c.horaFim ? formatHour(c.horaFim) : '--:--'}
                      </div>
                      <div>
                        <div className="text-[14px] font-medium" style={{ color: '#FAFAFA' }}>{c.cliente}</div>
                        <div className="text-[12px]" style={{ color: '#71717A' }}>{c.servico} · {c.profissional}</div>
                      </div>
                    </div>
                    <div className="rounded-md px-2.5 py-1 text-[11px] font-semibold" style={{ color: st.text, backgroundColor: st.bg }}>
                      ● {statusLabel(c.status)}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div className="rounded-2xl border p-5" style={{ backgroundColor: '#111116', borderColor: 'rgba(255,255,255,0.06)' }}>
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-[16px] font-semibold" style={{ color: '#FAFAFA' }}>Alertas Operacionais</h3>
              <p className="text-[13px]" style={{ color: '#71717A' }}>{dados.alertasEstoque.length} itens requerem atenção</p>
            </div>
            {dados.alertasEstoque.length > 0 && (
              <span className="flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold" style={{ backgroundColor: '#EF4444', color: '#fff' }}>
                {dados.alertasEstoque.length}
              </span>
            )}
          </div>

          <div className="mt-4 space-y-3">
            {dados.alertasEstoque.length === 0 ? (
              <p className="text-[13px]" style={{ color: '#71717A' }}>Nenhum alerta no momento. 🎉</p>
            ) : (
              dados.alertasEstoque.slice(0, 4).map((p) => (
                <div key={p.id} className="rounded-xl border border-yellow-500/20 bg-yellow-500/5 p-4">
                  <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider" style={{ color: '#EAB308' }}>
                    <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: '#EAB308' }} />
                    Estoque baixo
                  </div>
                  <div className="mt-2 text-[14px] font-medium" style={{ color: '#FAFAFA' }}>{p.nome}</div>
                  <div className="mt-1 text-[12px]" style={{ color: '#A1A1AA' }}>Restam apenas {p.estoqueAtual} unidades no inventário.</div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
