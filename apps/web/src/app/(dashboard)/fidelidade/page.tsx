'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { formatarMoeda } from '@/lib/format';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';

interface ClienteFiel {
  id: string;
  nome: string;
  pontosFidelidade: number;
  totalGasto: number;
  ultimaVisita: string | null;
  tag: string | null;
}

interface SegmentoCliente {
  id: string;
  nome: string;
  segmento: string;
  gasto: number;
}

type Aba = 'ranking' | 'segmentos';

const SEGMENTOS: { key: string; label: string; emoji: string }[] = [
  { key: 'ativo', label: 'Ativos', emoji: '🟢' },
  { key: 'em_risco', label: 'Em Risco', emoji: '🟡' },
  { key: 'inativo', label: 'Inativos', emoji: '🔴' },
  { key: 'novo', label: 'Novos', emoji: '🔵' },
];

function tagCor(tag: string): string {
  if (tag === 'VIP') return '#EAB308';
  if (tag === 'frequente') return '#22C55E';
  return '#71717A';
}

export default function FidelidadePage() {
  const [aba, setAba] = useState<Aba>('ranking');
  const [dados, setDados] = useState<ClienteFiel[]>([]);
  const [segmentos, setSegmentos] = useState<SegmentoCliente[]>([]);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    setCarregando(true);
    Promise.all([
      api.get<ClienteFiel[]>('/fidelidade/ranking'),
      api.get<SegmentoCliente[]>('/fidelidade/segmentar'),
    ])
      .then(([r, s]) => {
        setDados(r.data);
        setSegmentos(s.data);
      })
      .catch(() => undefined)
      .finally(() => setCarregando(false));
  }, []);

  return (
    <div>
      <h2 className="text-xl font-semibold text-[#FAFAFA]">Fidelidade</h2>
      <p className="mt-1 text-sm text-[#71717A]">Programa de pontos e segmentação de clientes</p>

      <div className="mt-6 flex gap-3">
        {(['ranking', 'segmentos'] as Aba[]).map((t) => (
          <button
            key={t}
            onClick={() => setAba(t)}
            className="rounded-lg px-5 py-2 text-[13px] font-semibold transition-colors"
            style={{
              backgroundColor: aba === t ? '#6366F1' : '#111116',
              color: aba === t ? '#FAFAFA' : '#A1A1AA',
            }}
          >
            {t === 'ranking' ? 'Ranking' : 'Segmentos'}
          </button>
        ))}
      </div>

      {carregando ? (
        <div className="mt-6">
          <Skeleton variant="kpi" count={3} />
        </div>
      ) : (
        <>
          {aba === 'ranking' && (
            <div
              className="mt-6 overflow-x-auto rounded-xl"
              style={{ backgroundColor: '#111116', border: '1px solid rgba(255,255,255,0.06)' }}
            >
              {dados.length === 0 ? (
                <EmptyState
                  icon="star"
                  title="Nenhum cliente no ranking"
                  description="O ranking de fidelidade aparecerá quando houver vendas e agendamentos"
                />
              ) : (
                <table className="w-full text-left text-[13px]">
                  <thead style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                    <tr>
                      {['#', 'Cliente', 'Pontos', 'Gasto', 'Última Visita', 'Tag'].map((h, i) => (
                        <th key={i} className="px-4 py-3 font-medium text-[#71717A]">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {dados.map((c, i) => (
                      <tr key={c.id} className="border-b border-white/[0.04]">
                        <td className="px-4 py-3 text-[#A1A1AA]">{i + 1}</td>
                        <td className="px-4 py-3 font-medium text-[#FAFAFA]">{c.nome}</td>
                        <td className="px-4 py-3 font-bold text-[#818CF8]">{c.pontosFidelidade}</td>
                        <td className="px-4 py-3 text-[#22C55E]">{formatarMoeda(c.totalGasto)}</td>
                        <td className="px-4 py-3 text-[#71717A]">
                          {c.ultimaVisita ? new Date(c.ultimaVisita).toLocaleDateString('pt-BR') : '—'}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className="rounded-full px-2 py-0.5 text-[11px] font-semibold"
                            style={{
                              color: tagCor(c.tag || ''),
                              backgroundColor: 'rgba(255,255,255,0.04)',
                            }}
                          >
                            {c.tag || '—'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {aba === 'segmentos' && (
            <div className="mt-6 space-y-6">
              {SEGMENTOS.map((seg) => {
                const items = segmentos.filter((s) => s.segmento === seg.key);
                return (
                  <div key={seg.key}>
                    <h3 className="mb-3 text-[15px] font-bold text-[#FAFAFA]">
                      <span className="mr-2">{seg.emoji}</span>
                      {seg.label} ({items.length})
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {items.length === 0 ? (
                        <span className="text-[13px] text-[#71717A]">Nenhum cliente neste segmento</span>
                      ) : (
                        items.map((c) => (
                          <div
                            key={c.id}
                            className="rounded-lg border border-white/[0.06] bg-[#111116] px-4 py-2 text-[13px] text-[#FAFAFA]"
                          >
                            {c.nome} · {formatarMoeda(c.gasto)}
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
