'use client';

import Link from 'next/link';
import { hasPermission } from '@nexly/shared';
import { useAuth } from '@/lib/auth';
import { useApi } from '@/lib/useApi';
import { limitesCalendario } from '@/lib/calendar';
import { baixarBlob } from '@/lib/download';
import { Pagination } from '@/components/ui/Pagination';
import { ErrorState } from '@/components/ui/ErrorState';
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
  const { user } = useAuth();
  const podeExportar = hasPermission(user?.role, 'relatorios:read');
  const [pagina, setPagina] = useState(1);
  const [filtros, setFiltros] = useState<{ dataInicio?: string; dataFim?: string }>({});
  const [erro, setErro] = useState('');
  const [exportando, setExportando] = useState(false);
  const [expandida, setExpandida] = useState<string | null>(null);
  const [dataInicio, setDataInicio] = useState<string>('');
  const [dataFim, setDataFim] = useState<string>('');

  const {
    data,
    loading: carregando,
    error: erroCarga,
    refetch,
  } = useApi<{
    data: Venda[];
    total: number;
    resumo: { totalVendido: number; totalItens: number };
  }>('/vendas', { params: { ...filtros, page: pagina, limit: 25 } });
  const vendas = data?.data ?? [];
  const resumo = erroCarga ? null : data?.resumo;
  const totalGeral = resumo?.totalVendido ?? 0;
  const totalItens = resumo?.totalItens ?? 0;
  const totalVendas = data?.total ?? 0;
  useEffect(() => {
    const last = Math.max(1, Math.ceil(totalVendas / 25));
    if (!carregando && data && pagina > last) setPagina(last);
  }, [carregando, data, pagina, totalVendas]);

  const aplicarFiltros = () => {
    if (dataInicio && dataFim && dataInicio > dataFim) {
      setErro('A data inicial deve ser anterior ou igual à final.');
      return;
    }
    const next: { dataInicio?: string; dataFim?: string } = {};
    if (dataInicio) next.dataInicio = limitesCalendario(new Date(dataInicio + 'T12:00:00')).inicio;
    if (dataFim) next.dataFim = limitesCalendario(new Date(dataFim + 'T12:00:00')).fim;
    setErro('');
    setPagina(1);
    setFiltros(next);
  };
  const exportar = async () => {
    setExportando(true);
    setErro('');
    try {
      const result = await api.get<Blob>('/export/vendas/csv', {
        params: filtros,
        responseType: 'blob',
      });
      baixarBlob(result.data, 'vendas-nexly.csv');
    } catch {
      setErro('Não foi possível exportar as vendas. Tente novamente mais tarde.');
    } finally {
      setExportando(false);
    }
  };

  const selecionada = vendas.find((v) => v.id === expandida) || vendas[0];

  return (
    <div>
      <PageToolbar>
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-[#FAFAFA]">Vendas</h2>
            <p className="mt-1 text-sm text-[#A1A1AA]">
              {totalVendas} {totalVendas === 1 ? 'venda' : 'vendas'} · {totalItens}{' '}
              {totalItens === 1 ? 'item' : 'itens'} ·{' '}
              <span className="font-semibold text-[#FAFAFA]">{formatarMoeda(totalGeral)}</span>
            </p>
          </div>
          <div className="flex gap-3">
            <Button
              variant="secondary"
              aria-expanded={filtrosAbertos}
              onClick={() => setFiltrosAbertos((v) => !v)}
            >
              Filtros
            </Button>
            <Link href="/pdv" className="rounded-lg bg-[#6366F1] px-4 py-2 text-sm font-medium">
              + Nova Venda
            </Link>
          </div>
        </div>
      </PageToolbar>

      {filtrosAbertos && (
        <div className="mb-6 flex flex-wrap items-end gap-3 rounded-xl border border-[rgba(255,255,255,0.08)] bg-[#111116] p-4">
          <div>
            <label htmlFor="vendas-data-inicio" className="block text-xs text-[#A1A1AA]">
              De
            </label>
            <input
              id="vendas-data-inicio"
              type="date"
              value={dataInicio}
              onChange={(e) => setDataInicio(e.target.value)}
              className="mt-1 rounded-lg border border-[rgba(255,255,255,0.10)] bg-[#111116] px-3 py-2 text-sm text-[#FAFAFA] focus:outline-none focus:ring-2 focus:ring-[#6366F1]"
            />
          </div>
          <div>
            <label htmlFor="vendas-data-fim" className="block text-xs text-[#A1A1AA]">
              Até
            </label>
            <input
              id="vendas-data-fim"
              type="date"
              value={dataFim}
              onChange={(e) => setDataFim(e.target.value)}
              className="mt-1 rounded-lg border border-[rgba(255,255,255,0.10)] bg-[#111116] px-3 py-2 text-sm text-[#FAFAFA] focus:outline-none focus:ring-2 focus:ring-[#6366F1]"
            />
          </div>
          <Button onClick={aplicarFiltros}>Filtrar</Button>
          <Button
            variant="secondary"
            onClick={() => {
              setDataInicio('');
              setDataFim('');
              setPagina(1);
              setFiltros({});
              setErro('');
            }}
          >
            Limpar
          </Button>
          {podeExportar && (
            <Button
              variant="secondary"
              loading={exportando}
              title="As datas e horários do arquivo estão em UTC"
              onClick={() => void exportar()}
            >
              Exportar CSV (até 500 vendas)
            </Button>
          )}
        </div>
      )}

      {erro && (
        <p role="alert" className="my-4 text-sm text-red-300">
          {erro}
        </p>
      )}
      {erroCarga && <ErrorState message={erroCarga} onRetry={() => void refetch()} />}
      {carregando && (
        <p role="status" className="my-3 text-sm text-[#A1A1AA]">
          Carregando vendas…
        </p>
      )}
      <MetricGrid
        items={[
          { label: 'Total em Vendas', value: resumo ? formatarMoeda(totalGeral) : '—' },
          { label: 'Total de Vendas', value: data && !erroCarga ? totalVendas : '—' },
          {
            label: 'Ticket Médio',
            value: resumo ? formatarMoeda(totalVendas ? totalGeral / totalVendas : 0) : '—',
          },
          { label: 'Itens Vendidos', value: resumo ? totalItens : '—' },
        ]}
      />
      <div className="grid min-w-0 gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0">
          <div className="space-y-3 md:hidden">
            <h3 className="mb-4 text-sm font-semibold">Últimas Transações</h3>
            {!erroCarga &&
              vendas.map((v) => (
                <button
                  key={v.id}
                  onClick={() => {
                    setExpandida(v.id);
                    setDetalhesAbertos(true);
                  }}
                  className="flex w-full justify-between gap-3 rounded-xl border border-white/10 bg-[#111116] p-4 text-left"
                >
                  <span className="min-w-0">
                    <strong className="block text-sm">{v.cliente?.nome || 'Venda avulsa'}</strong>
                    <span className="mt-1 block text-xs text-[#A1A1AA]">
                      {formatarDataHora(v.createdAt)}
                    </span>
                    <span className="block text-xs text-[#A1A1AA]">{v.itens.length} itens</span>
                    <span className="block text-xs text-[#A1A1AA]">
                      {v.formaPagamento || 'Não informada'}
                    </span>
                  </span>
                  <span className="shrink-0 text-sm font-semibold">{formatarMoeda(v.total)}</span>
                </button>
              ))}
          </div>
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
                {!carregando && !erroCarga && vendas.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-16">
                      <EmptyState
                        icon="receipt"
                        title="Nenhuma venda encontrada"
                        description="As vendas realizadas no PDV aparecerão aqui"
                      />
                    </td>
                  </tr>
                )}
                {!erroCarga &&
                  vendas.map((v) => {
                    return (
                      <Fragment key={v.id}>
                        <tr className="hover:bg-[#18181F]/30">
                          <td className="px-4 py-3 text-[#E4E4E7]">
                            {formatarDataHora(v.createdAt)}
                          </td>
                          <td className="px-4 py-3 text-[#FAFAFA]">
                            {v.cliente?.nome ?? (
                              <span className="text-[#A1A1AA]">Venda avulsa</span>
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
                              onClick={() => {
                                setExpandida(v.id);
                                setDetalhesAbertos(true);
                              }}
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
          <Pagination
            page={pagina}
            total={totalVendas}
            limit={25}
            loading={carregando}
            onChange={setPagina}
          />
        </div>
        {selecionada && !erroCarga && (
          <ResponsiveDetailPanel
            title="Detalhes da Venda"
            open={detalhesAbertos}
            onClose={() => setDetalhesAbertos(false)}
          >
            <div className="border-b border-white/10 pb-5 text-center">
              <span className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[#6366F1]/15 text-xl text-[#818CF8]">
                {(selecionada.cliente?.nome || 'V').slice(0, 1)}
              </span>
              <h3 className="text-xl font-semibold">
                {selecionada.cliente?.nome || 'Venda avulsa'}
              </h3>
              <p className="mt-2 text-xs text-[#A1A1AA]">
                {formatarDataHora(selecionada.createdAt)}
              </p>
            </div>
            <p className="mb-3 mt-6 text-xs text-[#A1A1AA]">ITENS DA VENDA</p>
            <div className="space-y-3">
              {selecionada.itens.map((it) => (
                <div key={it.id} className="rounded-lg border border-white/10 bg-[#18181F] p-3">
                  <p className="text-sm font-medium">
                    {it.produto?.nome ?? 'Produto indisponível'}
                  </p>
                  <div className="mt-2 flex justify-between text-xs text-[#A1A1AA]">
                    <span>{it.quantidade} unidades</span>
                    <span>{formatarMoeda(Number(it.precoUnitario) * it.quantidade)}</span>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-6 flex justify-between border-t border-white/10 pt-4 font-semibold">
              <span>Total</span>
              <span className="text-[#818CF8]">{formatarMoeda(selecionada.total)}</span>
            </div>
            <Link
              href="/pdv"
              className="mt-6 block rounded-lg bg-[#6366F1] px-4 py-2 text-center text-sm font-medium"
            >
              Nova Venda
            </Link>
          </ResponsiveDetailPanel>
        )}
      </div>
    </div>
  );
}
