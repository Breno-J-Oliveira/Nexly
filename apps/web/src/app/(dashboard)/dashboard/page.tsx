'use client';

import { useEffect, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { api } from '@/lib/api';

interface DashboardData {
  agendamentosHoje: { total: number };
  receitaMes: { atual: number; variacaoPercentual: number };
  ticketMedio: number;
  agendamentosPorDia: { data: string; total: number }[];
  topServicos: { nome: string; quantidade: number }[];
  alertasEstoque: { id: string; nome: string; estoqueAtual: number; estoqueMinimo: number }[];
}

function formatarMoeda(v: number): string {
  return `R$ ${v.toFixed(2)}`;
}

export default function DashboardPage() {
  const [dados, setDados] = useState<DashboardData | null>(null);

  useEffect(() => {
    api
      .get<DashboardData>('/dashboard')
      .then((r) => setDados(r.data))
      .catch(() => undefined);
  }, []);

  if (!dados) {
    return (
      <div>
        <h2 className="text-xl font-semibold text-gray-900">Dashboard</h2>
        <p className="mt-4 text-sm text-gray-500">Carregando…</p>
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

  return (
    <div>
      <h2 className="text-xl font-semibold text-gray-900">Dashboard</h2>
      <p className="mt-1 text-sm text-gray-500">Visão geral do seu negócio</p>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((kpi) => (
          <div key={kpi.label} className="rounded-xl border border-gray-200 bg-white p-5">
            <p className="text-sm text-gray-500">{kpi.label}</p>
            <p className="mt-1 text-2xl font-semibold text-gray-900">{kpi.valor}</p>
            {kpi.variacao && (
              <p className={`text-xs ${variacaoPositiva ? 'text-success' : 'text-danger'}`}>
                {kpi.variacao} vs mês anterior
              </p>
            )}
          </div>
        ))}
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <h3 className="font-semibold text-gray-900">Agendamentos concluídos (30 dias)</h3>
          <div className="mt-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={dados.agendamentosPorDia}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="data" tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Line type="monotone" dataKey="total" stroke="#6366f1" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <h3 className="font-semibold text-gray-900">Top 5 serviços</h3>
          <div className="mt-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dados.topServicos} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" allowDecimals={false} />
                <YAxis type="category" dataKey="nome" width={110} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="quantidade" fill="#6366f1" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="mt-6 rounded-xl border border-gray-200 bg-white p-5">
        <h3 className="font-semibold text-gray-900">Alertas de estoque</h3>
        {dados.alertasEstoque.length === 0 ? (
          <p className="mt-2 text-sm text-gray-500">Nenhum produto em estado crítico. 🎉</p>
        ) : (
          <div className="mt-3 space-y-2">
            {dados.alertasEstoque.map((p) => (
              <div
                key={p.id}
                className="flex items-center justify-between rounded-lg border border-red-100 bg-red-50 px-4 py-2"
              >
                <span className="text-sm font-medium text-gray-900">{p.nome}</span>
                <span className="text-sm text-danger">
                  {p.estoqueAtual} / mín. {p.estoqueMinimo}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

