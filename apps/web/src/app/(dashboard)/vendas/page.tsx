'use client';

import { Fragment, useEffect, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { api } from '@/lib/api';
import { EmptyState } from '@/components/ui/EmptyState';

import { formatarDataHora, formatarMoeda } from '@/lib/format';

interface ItemVenda {
  id: string;
  quantidade: number;
  precoUnitario: number;
  produto: { id: string; nome: string };
}
interface Venda {
  id: string;
  total: number;
  createdAt: string;
  cliente: { id: string; nome: string } | null;
  itens: ItemVenda[];
}

export default function VendasPage() {
  const [vendas, setVendas] = useState<Venda[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [expandida, setExpandida] = useState<string | null>(null);
  const [dataInicio, setDataInicio] = useState<string>('');
  const [dataFim, setDataFim] = useState<string>('');

  useEffect(() => {
    void carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function carregar(): Promise<void> {
    setCarregando(true);
    try {
      const params: Record<string, string> = { limit: '100' };
      if (dataInicio) params.dataInicio = new Date(dataInicio).toISOString();
      if (dataFim) params.dataFim = new Date(dataFim).toISOString();
      const res = await api.get<{ data: Venda[] }>('/vendas', { params });
      setVendas(res.data.data);
    } finally {
      setCarregando(false);
    }
  }

  const totalGeral = vendas.reduce((acc, v) => acc + Number(v.total), 0);
  const totalItens = vendas.reduce((acc, v) => acc + v.itens.length, 0);

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-[#FAFAFA]">Histórico de vendas</h2>
          <p className="mt-1 text-sm text-[#A1A1AA]">
            {vendas.length} {vendas.length === 1 ? 'venda' : 'vendas'} · {totalItens}{' '}
            {totalItens === 1 ? 'item' : 'itens'} ·{' '}
            <span className="font-semibold text-[#FAFAFA]">{formatarMoeda(totalGeral)}</span>
          </p>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap items-end gap-3 rounded-xl border border-[rgba(255,255,255,0.08)] bg-[#111116] p-4">
        <div>
          <label className="block text-xs text-[#71717A]">De</label>
          <input
            type="date"
            value={dataInicio}
            onChange={(e) => setDataInicio(e.target.value)}
            className="mt-1 rounded-lg border border-[rgba(255,255,255,0.10)] bg-[#111116] px-3 py-2 text-sm text-[#FAFAFA] focus:outline-none focus:ring-2 focus:ring-[#6366F1]"
          />
        </div>
        <div>
          <label className="block text-xs text-[#71717A]">Até</label>
          <input
            type="date"
            value={dataFim}
            onChange={(e) => setDataFim(e.target.value)}
            className="mt-1 rounded-lg border border-[rgba(255,255,255,0.10)] bg-[#111116] px-3 py-2 text-sm text-[#FAFAFA] focus:outline-none focus:ring-2 focus:ring-[#6366F1]"
          />
        </div>
        <Button onClick={() => void carregar()}>Filtrar</Button>
        <Button
          variant="secondary"
          onClick={() => {
            setDataInicio('');
            setDataFim('');
            setTimeout(() => void carregar(), 0);
          }}
        >
          Limpar
        </Button>
          <a
            href={(process.env.NEXT_PUBLIC_API_URL||"http://localhost:3001")+"/api/export/vendas/csv?dataInicio="+(dataInicio||"")+"&dataFim="+(dataFim||"")}
            target="_blank" rel="noopener"
            className="inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all"
            style={{backgroundColor:"#111116",border:"none",color:"#22C55E"}}
          >
            CSV
          </a>
      </div>

      <div className="mt-6 overflow-hidden rounded-xl border border-[rgba(255,255,255,0.08)] bg-[#111116]">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-[rgba(255,255,255,0.08)] bg-[#18181F]/40">
            <tr>
              <th className="px-4 py-3 font-medium text-[#A1A1AA]">Data</th>
              <th className="px-4 py-3 font-medium text-[#A1A1AA]">Cliente</th>
              <th className="px-4 py-3 font-medium text-[#A1A1AA]">Itens</th>
              <th className="px-4 py-3 font-medium text-[#A1A1AA]">Total</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-[rgba(255,255,255,0.08)]">
            {carregando && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-[#A1A1AA]">
                  Carregando…
                </td>
              </tr>
            )}
            {!carregando && vendas.length === 0 && (
                <tr><td colSpan={5} className="px-4 py-16">
                  <EmptyState
                    icon="receipt"
                    title="Nenhuma venda encontrada"
                    description="As vendas realizadas no PDV aparecerao aqui"
                  />
                </td></tr>
              )}
            {vendas.map((v) => {
              const aberto = expandida === v.id;
              return (
                <Fragment key={v.id}>
                  <tr className="hover:bg-[#18181F]/30">
                    <td className="px-4 py-3 text-[#E4E4E7]">{formatarDataHora(v.createdAt)}</td>
                    <td className="px-4 py-3 text-[#FAFAFA]">
                      {v.cliente?.nome ?? (
                        <span className="text-[#71717A]">Venda avulsa</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-[#D4D4D8]">{v.itens.length}</td>
                    <td className="px-4 py-3 font-medium text-[#FAFAFA]">
                      {formatarMoeda(v.total)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button
                        variant="ghost"
                        className="text-xs"
                        onClick={() => setExpandida(aberto ? null : v.id)}
                      >
                        {aberto ? 'Ocultar' : 'Detalhes'}
                      </Button>
                    </td>
                  </tr>
                  {aberto && (
                    <tr className="bg-[#18181F]/20">
                      <td colSpan={5} className="px-4 py-3">
                        <div className="space-y-1 pl-4 text-sm">
                          {v.itens.map((it) => (
                            <div
                              key={it.id}
                              className="flex items-center justify-between text-[#D4D4D8]"
                            >
                              <span>
                                {it.quantidade}× {it.produto.nome}
                              </span>
                              <span className="text-[#A1A1AA]">
                                {formatarMoeda(Number(it.precoUnitario) * it.quantidade)}
                              </span>
                            </div>
                          ))}
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}