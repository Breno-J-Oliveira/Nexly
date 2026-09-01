'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

interface ProfissionalComissao { id: string; nome: string; comissaoPercentual: number; faturamento: number; comissao: number; totalServicos: number; }
interface ResumoComissao { profissionais: ProfissionalComissao[]; total: { faturamento: number; comissao: number; servicos: number }; }

function fmt(v: number): string { return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v); }

export default function ComissaoPage() {
  const [dados, setDados] = useState<ResumoComissao | null>(null);
  const [inicio, setInicio] = useState(() => { const d = new Date(); d.setDate(1); return d.toISOString().slice(0, 10); });
  const [fim, setFim] = useState(() => new Date().toISOString().slice(0, 10));

  const carregar = async () => {
    const res = await api.get<ResumoComissao>('/comissao/resumo', { params: { dataInicio: inicio, dataFim: fim } });
    setDados(res.data);
  };

  useEffect(() => { void carregar(); }, [inicio, fim]);

  return (
    <div>
      <h2 className="text-xl font-semibold" style={{ color: '#FAFAFA' }}>Comissoes</h2>
      <p className="mt-1 text-sm" style={{ color: '#71717A' }}>Calculo de comissao por profissional no periodo</p>

      <div className="mt-4 flex gap-3">
        <input type="date" value={inicio} onChange={e => setInicio(e.target.value)} className="rounded-lg border px-3 py-2 text-[13px]" style={{ backgroundColor: '#111116', borderColor: 'rgba(255,255,255,0.10)', color: '#FAFAFA' }} />
        <span style={{ color: '#71717A', alignSelf: 'center' }}>ate</span>
        <input type="date" value={fim} onChange={e => setFim(e.target.value)} className="rounded-lg border px-3 py-2 text-[13px]" style={{ backgroundColor: '#111116', borderColor: 'rgba(255,255,255,0.10)', color: '#FAFAFA' }} />
      </div>

      {dados && (
        <div className="mt-4 grid grid-cols-3 gap-4">
          <div className="rounded-xl p-4" style={{ backgroundColor: '#111116', border: '1px solid rgba(255,255,255,0.06)' }}>
            <p className="text-xs" style={{ color: '#71717A' }}>Faturamento</p>
            <p className="mt-1 text-lg font-bold" style={{ color: '#FAFAFA' }}>{fmt(dados.total.faturamento)}</p>
          </div>
          <div className="rounded-xl p-4" style={{ backgroundColor: '#111116', border: '1px solid rgba(255,255,255,0.06)' }}>
            <p className="text-xs" style={{ color: '#71717A' }}>Total Comissoes</p>
            <p className="mt-1 text-lg font-bold" style={{ color: '#22C55E' }}>{fmt(dados.total.comissao)}</p>
          </div>
          <div className="rounded-xl p-4" style={{ backgroundColor: '#111116', border: '1px solid rgba(255,255,255,0.06)' }}>
            <p className="text-xs" style={{ color: '#71717A' }}>Servicos</p>
            <p className="mt-1 text-lg font-bold" style={{ color: '#818CF8' }}>{dados.total.servicos}</p>
          </div>
        </div>
      )}

      {dados && (
        <div className="mt-6 overflow-x-auto rounded-xl" style={{ backgroundColor: '#111116', border: '1px solid rgba(255,255,255,0.06)' }}>
          <table className="w-full text-left text-[13px]">
            <thead style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              <tr>
                <th className="px-4 py-3 font-medium" style={{ color: '#71717A' }}>Profissional</th>
                <th className="px-4 py-3 font-medium" style={{ color: '#71717A' }}>Comissao %</th>
                <th className="px-4 py-3 font-medium" style={{ color: '#71717A' }}>Servicos</th>
                <th className="px-4 py-3 font-medium" style={{ color: '#71717A' }}>Faturamento</th>
                <th className="px-4 py-3 font-medium" style={{ color: '#71717A' }}>Comissao</th>
              </tr>
            </thead>
            <tbody>
              {dados.profissionais.map(p => (
                <tr key={p.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <td className="px-4 py-3" style={{ color: '#FAFAFA' }}>{p.nome}</td>
                  <td className="px-4 py-3" style={{ color: '#818CF8' }}>{p.comissaoPercentual}%</td>
                  <td className="px-4 py-3" style={{ color: '#A1A1AA' }}>{p.totalServicos}</td>
                  <td className="px-4 py-3" style={{ color: '#FAFAFA' }}>{fmt(p.faturamento)}</td>
                  <td className="px-4 py-3 font-semibold" style={{ color: '#22C55E' }}>{fmt(p.comissao)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
