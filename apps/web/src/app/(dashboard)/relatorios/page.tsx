'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

function fmt(v: number): string { return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v); }

interface DRE { periodo: { dataInicio: string; dataFim: string }; receitaBruta: number; descontos: number; receitaLiquida: number; cmv: number; margemBruta: number; margemPercentual: number; qtdVendas: number; ticketMedio: number; }
interface Fluxo { periodo: { dataInicio: string; dataFim: string }; fluxo: { data: string; entradas: number; total: number; saldoAcumulado: number }[]; saldoFinal: number; }

export default function RelatoriosPage() {
  const [aba, setAba] = useState('dre');
  const [dre, setDre] = useState<DRE | null>(null);
  const [fluxo, setFluxo] = useState<Fluxo | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [inicio, setInicio] = useState(() => { const d = new Date(); d.setDate(1); return d.toISOString().slice(0, 10); });
  const [fim, setFim] = useState(() => new Date().toISOString().slice(0, 10));

  useEffect(() => {
    setCarregando(true);
    const params = { dataInicio: inicio, dataFim: fim };
    Promise.allSettled([
      api.get('/financeiro/dre', { params }),
      api.get('/financeiro/fluxo-caixa', { params }),
    ])
      .then(([rDre, rFluxo]) => {
        if (rDre.status === 'fulfilled') setDre(rDre.value.data);
        if (rFluxo.status === 'fulfilled') setFluxo(rFluxo.value.data);
      })
      .finally(() => setCarregando(false));
  }, [inicio, fim]);

  const tabs = ['dre', 'fluxo'];
  const tabLabels: Record<string, string> = { dre: 'DRE', fluxo: 'Fluxo de Caixa' };

  const KPI = ({ label, value, color }: { label: string; value: string; color?: string }) => (
    <div className="rounded-xl p-5" style={{ backgroundColor: '#111116', border: '1px solid rgba(255,255,255,0.06)' }}>
      <p className="text-xs" style={{ color: '#71717A' }}>{label}</p>
      <p className="mt-1 text-xl font-bold" style={{ color: color || '#FAFAFA' }}>{value}</p>
    </div>
  );

  return (
    <div>
      <h2 className="text-xl font-semibold" style={{ color: '#FAFAFA' }}>Relatórios</h2>
      <p className="mt-1 text-sm" style={{ color: '#71717A' }}>
        Análise financeira do período selecionado
      </p>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <input type="date" value={inicio} onChange={(e) => setInicio(e.target.value)} className="rounded-lg border px-3 py-2 text-[13px]" style={{ backgroundColor: '#111116', borderColor: 'rgba(255,255,255,0.10)', color: '#FAFAFA' }} />
        <span style={{ color: '#71717A' }}>até</span>
        <input type="date" value={fim} onChange={(e) => setFim(e.target.value)} className="rounded-lg border px-3 py-2 text-[13px]" style={{ backgroundColor: '#111116', borderColor: 'rgba(255,255,255,0.10)', color: '#FAFAFA' }} />

        {tabs.map((t) => (
          <button key={t} onClick={() => setAba(t)} className="rounded-lg px-4 py-2 text-[13px] font-semibold transition-colors" style={{ backgroundColor: aba === t ? '#6366F1' : '#111116', color: aba === t ? '#FAFAFA' : '#A1A1AA', border: '1px solid ' + (aba === t ? '#6366F1' : 'rgba(255,255,255,0.10)') }}>{tabLabels[t]}</button>
        ))}
      </div>

      {carregando && (
        <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-[86px] animate-pulse rounded-xl" style={{ backgroundColor: '#111116', border: '1px solid rgba(255,255,255,0.06)' }} />
          ))}
        </div>
      )}

      {!carregando && aba === 'dre' && (
        !dre ? (
          <p className="mt-6 text-sm" style={{ color: '#71717A' }}>Não foi possível carregar o DRE do período.</p>
        ) : (
          <div className="mt-6">
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <KPI label="Receita Bruta" value={fmt(dre.receitaBruta)} />
              <KPI label="Receita Líquida" value={fmt(dre.receitaLiquida)} color="#22C55E" />
              <KPI label="Descontos" value={fmt(dre.descontos)} color="#EF4444" />
              <KPI label="Ticket Médio" value={fmt(dre.ticketMedio)} />
            </div>
            <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3">
              <KPI label="CMV" value={fmt(dre.cmv)} color="#EAB308" />
              <KPI label="Margem Bruta" value={fmt(dre.margemBruta)} color={dre.margemBruta >= 0 ? '#22C55E' : '#EF4444'} />
              <KPI label="Margem %" value={(dre.margemPercentual ?? 0).toFixed(1) + '%'} color={(dre.margemPercentual ?? 0) >= 0 ? '#22C55E' : '#EF4444'} />
            </div>
            <p className="mt-4 text-xs" style={{ color: '#52525B' }}>
              {dre.qtdVendas} {dre.qtdVendas === 1 ? 'venda' : 'vendas'} no período
            </p>
          </div>
        )
      )}

      {!carregando && aba === 'fluxo' && (
        !fluxo ? (
          <p className="mt-6 text-sm" style={{ color: '#71717A' }}>Não foi possível carregar o fluxo de caixa.</p>
        ) : (
          <div className="mt-6">
            <KPI label="Saldo Final" value={fmt(fluxo.saldoFinal)} color={fluxo.saldoFinal >= 0 ? '#22C55E' : '#EF4444'} />
            <div className="mt-4 overflow-x-auto rounded-xl" style={{ backgroundColor: '#111116', border: '1px solid rgba(255,255,255,0.06)' }}>
              <table className="w-full text-left text-[13px]">
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                    <th className="px-4 py-3 font-medium" style={{ color: '#71717A' }}>Data</th>
                    <th className="px-4 py-3 font-medium" style={{ color: '#71717A' }}>Vendas</th>
                    <th className="px-4 py-3 font-medium" style={{ color: '#71717A' }}>Total</th>
                    <th className="px-4 py-3 font-medium" style={{ color: '#71717A' }}>Saldo Acum.</th>
                  </tr>
                </thead>
                <tbody>
                  {fluxo.fluxo.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-4 py-8 text-center" style={{ color: '#71717A' }}>
                        Nenhuma movimentação no período.
                      </td>
                    </tr>
                  )}
                  {fluxo.fluxo.map((f) => (
                    <tr key={f.data} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                      <td className="px-4 py-3" style={{ color: '#FAFAFA' }}>{new Date(f.data + 'T00:00:00').toLocaleDateString('pt-BR')}</td>
                      <td className="px-4 py-3" style={{ color: '#818CF8' }}>{f.entradas}</td>
                      <td className="px-4 py-3" style={{ color: '#22C55E' }}>{fmt(f.total)}</td>
                      <td className="px-4 py-3 font-semibold" style={{ color: f.saldoAcumulado >= 0 ? '#22C55E' : '#EF4444' }}>{fmt(f.saldoAcumulado)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )
      )}
    </div>
  );
}
