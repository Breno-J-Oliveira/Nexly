'use client';

import Link from 'next/link';
import { ResponsiveDetailPanel } from '@/components/ui/ResponsiveDetailPanel';
import { MetricGrid } from '@/components/ui/MetricGrid';
import { PageToolbar } from '@/components/ui/PageToolbar';

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
  formaPagamento?: string | null;
}

export default function VendasPage() {
  const [detalhesAbertos, setDetalhesAbertos] = useState(false);
  const [filtrosAbertos, setFiltrosAbertos] = useState(false);
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
  const totalItens = vendas.reduce((acc, v) => acc + v.itens.reduce((sum, item) => sum + item.quantidade, 0), 0);

  const selecionada = vendas.find(v => v.id === expandida) || vendas[0];

  return (
    <div>
      <PageToolbar><div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-[#FAFAFA]">Vendas</h2>
          <p className="mt-1 text-sm text-[#A1A1AA]">
            {vendas.length} {vendas.length === 1 ? 'venda' : 'vendas'} · {totalItens}{' '}
            {totalItens === 1 ? 'item' : 'itens'} ·{' '}
            <span className="font-semibold text-[#FAFAFA]">{formatarMoeda(totalGeral)}</span>
          </p>
        </div><div className="flex gap-3"><Button variant="secondary" aria-expanded={filtrosAbertos} onClick={() => setFiltrosAbertos(v => !v)}>Filtros</Button><Link href="/pdv" className="rounded-lg bg-[#6366F1] px-4 py-2 text-sm font-medium">+ Nova Venda</Link></div>
      </div></PageToolbar>

      {filtrosAbertos && <div className="mb-6 flex flex-wrap items-end gap-3 rounded-xl border border-[rgba(255,255,255,0.08)] bg-[#111116] p-4">
        <div>
          <label htmlFor="vendas-data-inicio" className="block text-xs text-[#71717A]">De</label>
          <input
            id="vendas-data-inicio"
            type="date"
            value={dataInicio}
            onChange={(e) => setDataInicio(e.target.value)}
            className="mt-1 rounded-lg border border-[rgba(255,255,255,0.10)] bg-[#111116] px-3 py-2 text-sm text-[#FAFAFA] focus:outline-none focus:ring-2 focus:ring-[#6366F1]"
          />
        </div>
        <div>
          <label htmlFor="vendas-data-fim" className="block text-xs text-[#71717A]">Até</label>
          <input
            id="vendas-data-fim"
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
      </div>}

      <MetricGrid items={[
        { label: 'Faturamento do Período', value: formatarMoeda(totalGeral) },
        { label: 'Total de Vendas', value: vendas.length },
        { label: 'Ticket Médio', value: formatarMoeda(vendas.length ? totalGeral / vendas.length : 0) },
        { label: 'Itens Vendidos', value: totalItens },
      ]} />
      <div className="grid min-w-0 gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
      <div className="min-w-0">
      <div className="space-y-3 md:hidden"><h3 className="mb-4 text-sm font-semibold">Últimas Transações</h3>{vendas.map(v => <button key={v.id} onClick={() => { setExpandida(v.id); setDetalhesAbertos(true); }} className="flex w-full justify-between gap-3 rounded-xl border border-white/10 bg-[#111116] p-4 text-left"><span className="min-w-0"><strong className="block text-sm">{v.cliente?.nome || 'Venda avulsa'}</strong><span className="mt-1 block text-xs text-[#71717A]">{formatarDataHora(v.createdAt)}</span><span className="block text-xs text-[#A1A1AA]">{v.itens.length} itens</span><span className="block text-xs text-[#71717A]">{v.formaPagamento || 'Não informada'}</span></span><span className="shrink-0 text-sm font-semibold">{formatarMoeda(v.total)}</span></button>)}</div>
      <div className="hidden overflow-x-auto rounded-xl border border-[rgba(255,255,255,0.08)] bg-[#111116] md:block">
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
                    description="As vendas realizadas no PDV aparecerão aqui"
                  />
                </td></tr>
              )}
            {vendas.map((v) => {
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
                        onClick={() => { setExpandida(v.id); setDetalhesAbertos(true); }}
                      >
                        Detalhes
                      </Button>
                    </td>
                  </tr>

                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
      </div>
        {selecionada && <ResponsiveDetailPanel title="Detalhes da Venda" open={detalhesAbertos} onClose={() => setDetalhesAbertos(false)}><div className="border-b border-white/10 pb-5 text-center"><span className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[#6366F1]/15 text-xl text-[#818CF8]">{(selecionada.cliente?.nome || 'V').slice(0, 1)}</span><h3 className="text-xl font-semibold">{selecionada.cliente?.nome || 'Venda avulsa'}</h3><p className="mt-2 text-xs text-[#71717A]">{formatarDataHora(selecionada.createdAt)}</p></div><p className="mb-3 mt-6 text-xs text-[#71717A]">ITENS DA VENDA</p><div className="space-y-3">{selecionada.itens.map(it => <div key={it.id} className="rounded-lg border border-white/10 bg-[#18181F] p-3"><p className="text-sm font-medium">{it.produto.nome}</p><div className="mt-2 flex justify-between text-xs text-[#A1A1AA]"><span>{it.quantidade} unidades</span><span>{formatarMoeda(Number(it.precoUnitario) * it.quantidade)}</span></div></div>)}</div><div className="mt-6 flex justify-between border-t border-white/10 pt-4 font-semibold"><span>Total</span><span className="text-[#818CF8]">{formatarMoeda(selecionada.total)}</span></div><Link href="/pdv" className="mt-6 block rounded-lg bg-[#6366F1] px-4 py-2 text-center text-sm font-medium">Nova Venda</Link></ResponsiveDetailPanel>}
      </div>
    </div>
  );
}
