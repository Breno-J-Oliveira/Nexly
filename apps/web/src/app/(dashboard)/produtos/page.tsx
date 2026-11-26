'use client';

import { hasPermission } from '@nexly/shared';
import { useAuth } from '@/lib/auth';

import { PageToolbar } from '@/components/ui/PageToolbar';

import { useEffect, useState } from 'react';
import { useApi } from '@/lib/useApi';
import { useDebouncedValue } from '@/lib/useDebouncedValue';
import { expiryDays, expiryLabel } from '@/lib/expiry';
import { Pagination } from '@/components/ui/Pagination';
import { Modal } from '@/components/ui/Modal';
import { ErrorState } from '@/components/ui/ErrorState';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { ProdutoForm, type ProdutoCadastro as Produto } from '@/components/ProdutoForm';
import { api } from '@/lib/api';
import { toastSuccess, toastError } from '@/components/ui/Toaster';
import { formatarDataHora } from '@/lib/format';

interface Movimentacao {
  id: string;
  produtoId: string;
  tipo: 'ENTRADA' | 'SAIDA';
  quantidade: number;
  motivo: string;
  agendamentoId: string | null;
  createdAt: string;
}

function vencimentoInfo(
  p: Produto,
): { label: string; tone: 'warning' | 'danger' | 'vencido' } | null {
  if (!p.dataVencimento) return null;
  const dias = expiryDays(p.dataVencimento);
  if (dias < 0) return { label: 'Vencido', tone: 'vencido' };
  if (dias <= 30)
    return { label: expiryLabel(p.dataVencimento), tone: dias <= 7 ? 'danger' : 'warning' };
  return null;
}

function statusProduto(p: Produto): { label: string; color: string } {
  if (p.estoqueAtual === 0) return { label: 'Zerado', color: 'SAIDA' };
  if (p.estoqueAtual < p.estoqueMinimo) return { label: 'Baixo', color: 'CONFIRMADO' };
  return { label: 'OK', color: 'CONCLUIDO' };
}

const moeda = (v: number): string =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

export default function ProdutosPage() {
  const { user } = useAuth();
  const podeCriar = hasPermission(user?.role, 'estoque:create');
  const podeEditar = hasPermission(user?.role, 'estoque:update');
  const podeExcluir = hasPermission(user?.role, 'estoque:delete');
  const [pagina, setPagina] = useState(1);
  const [busca, setBusca] = useState('');
  const [modalAberto, setModalAberto] = useState(false);
  const [produtoEdicao, setProdutoEdicao] = useState<Produto>();
  const [salvando, setSalvando] = useState(false);

  // ── Histórico de movimentações ────────────────────────────
  const [historicoProduto, setHistoricoProduto] = useState<Produto | null>(null);
  const [filtroVencendo, setFiltroVencendo] = useState(false);
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get('vencendo') === '1')
      setFiltroVencendo(true);
  }, []);

  const search = useDebouncedValue(busca.trim());
  const {
    data,
    loading: carregando,
    error: erroCarga,
    refetch: carregar,
  } = useApi<{ data: Produto[]; total: number }>('/produtos', {
    params: { page: pagina, limit: 25, search, vencendoEm: filtroVencendo ? 30 : undefined },
  });
  const produtos = data?.data ?? [];
  const totalProdutos = data?.total ?? 0;
  const history = useApi<Movimentacao[]>(`/estoque/historico/${historicoProduto?.id ?? ''}`, {
    immediate: !!historicoProduto,
  });
  const movimentacoes = history.data ?? [];
  const carregandoHistorico = history.loading;
  useEffect(() => {
    if (!carregando && data && pagina > Math.max(1, Math.ceil(data.total / 25)))
      setPagina(Math.max(1, Math.ceil(data.total / 25)));
  }, [carregando, data, pagina]);

  const abrirNovo = (): void => {
    setProdutoEdicao(undefined);
    setModalAberto(true);
  };

  const abrirEdicao = (p: Produto): void => {
    setProdutoEdicao(p);
    setModalAberto(true);
  };

  const excluir = async (p: Produto): Promise<void> => {
    if (!confirm(`Excluir o produto "${p.nome}"?`)) return;
    try {
      await api.delete(`/produtos/${p.id}`);
      toastSuccess('Produto removido');
      await carregar();
    } catch {
      toastError('Não foi possível remover o produto. Ele pode estar em uso.');
    }
  };

  return (
    <div>
      <PageToolbar>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold text-[#FAFAFA]">Produtos</h2>
            <p className="mt-1 text-sm text-[#A1A1AA]">
              Controle de produtos e estoque · {totalProdutos}{' '}
              {totalProdutos === 1 ? 'cadastrado' : 'cadastrados'}
            </p>
          </div>
          {podeCriar && <Button onClick={abrirNovo}>+ Novo produto</Button>}
        </div>
      </PageToolbar>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <div className="w-full max-w-md sm:flex-1">
          <Input
            aria-label="Buscar por nome ou código"
            placeholder="Buscar por nome ou código..."
            value={busca}
            onChange={(e) => {
              setBusca(e.target.value);
              setPagina(1);
            }}
          />
        </div>
        <button
          type="button"
          aria-pressed={filtroVencendo}
          onClick={() => {
            setFiltroVencendo((v) => !v);
            setPagina(1);
          }}
          className="rounded-lg border px-3 py-2 text-[13px] font-medium transition-colors"
          style={{
            borderColor: filtroVencendo ? '#6366F1' : 'rgba(255,255,255,0.10)',
            color: filtroVencendo ? '#818CF8' : '#A1A1AA',
            backgroundColor: filtroVencendo ? 'rgba(99,102,241,0.10)' : '#111116',
          }}
        >
          Vencidos e próximos de vencer
        </button>
      </div>

      {erroCarga && <ErrorState message={erroCarga} onRetry={() => void carregar()} />}
      <div className="mt-6 overflow-x-auto rounded-xl border border-[rgba(255,255,255,0.08)] bg-[#111116]">
        <table className="block w-full text-left text-sm md:table">
          <thead className="hidden border-b md:table-header-group border-[rgba(255,255,255,0.08)] bg-[#18181F]/40">
            <tr>
              <th className="px-4 py-3 font-medium text-[#A1A1AA]">Produto</th>
              <th className="px-4 py-3 font-medium text-[#A1A1AA]">Código</th>
              <th className="px-4 py-3 font-medium text-[#A1A1AA]">Preço</th>
              <th className="px-4 py-3 font-medium text-[#A1A1AA]">Estoque</th>
              <th className="px-4 py-3 font-medium text-[#A1A1AA]">Status</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="block divide-y md:table-row-group divide-[rgba(255,255,255,0.08)]">
            {carregando && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-[#A1A1AA]">
                  Carregando…
                </td>
              </tr>
            )}
            {!carregando && !erroCarga && produtos.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-[#A1A1AA]">
                  Nenhum produto encontrado.
                </td>
              </tr>
            )}
            {!carregando &&
              !erroCarga &&
              produtos.map((p) => {
                const s = statusProduto(p);
                const venc = vencimentoInfo(p);
                return (
                  <tr
                    key={p.id}
                    className="grid grid-cols-2 gap-3 p-4 hover:bg-[#18181F]/30 md:table-row md:p-0"
                  >
                    <td className="col-span-2 font-medium text-[#FAFAFA] md:px-4 md:py-3">
                      {p.nome}
                    </td>
                    <td className="col-span-2 text-[#A1A1AA] md:px-4 md:py-3">
                      <span className="md:hidden">Código: </span>
                      {p.sku}
                    </td>
                    <td className="text-[#E4E4E7] md:px-4 md:py-3">
                      <span className="mr-2 text-[#A1A1AA] md:hidden">Preço</span>
                      {moeda(p.preco)}
                    </td>
                    <td className="text-[#FAFAFA] md:px-4 md:py-3">
                      <span className="mr-2 text-[#A1A1AA] md:hidden">Estoque</span>
                      {p.estoqueAtual}
                    </td>
                    <td className="col-span-2 md:px-4 md:py-3">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <Badge color={s.color}>{s.label}</Badge>
                        {venc && (
                          <span
                            className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium"
                            style={{
                              backgroundColor:
                                venc.tone === 'warning'
                                  ? 'rgba(234,179,8,0.10)'
                                  : 'rgba(239,68,68,0.10)',
                              color: venc.tone === 'warning' ? '#EAB308' : '#EF4444',
                            }}
                          >
                            {venc.label}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="col-span-2 flex flex-wrap gap-1 md:table-cell md:px-4 md:py-3 md:text-right">
                      <Button
                        variant="ghost"
                        className="mr-1 text-xs"
                        onClick={() => setHistoricoProduto(p)}
                      >
                        Histórico
                      </Button>
                      {podeEditar && (
                        <Button
                          variant="ghost"
                          className="mr-1 text-xs"
                          onClick={() => abrirEdicao(p)}
                        >
                          Editar
                        </Button>
                      )}
                      {podeExcluir && (
                        <Button
                          variant="ghost"
                          className="text-xs text-red-400"
                          onClick={() => void excluir(p)}
                        >
                          Excluir
                        </Button>
                      )}
                    </td>
                  </tr>
                );
              })}
          </tbody>
        </table>
      </div>

      <Pagination
        page={pagina}
        total={totalProdutos}
        limit={25}
        loading={carregando}
        onChange={setPagina}
      />
      <Modal
        open={modalAberto}
        title={produtoEdicao ? 'Editar produto' : 'Novo produto'}
        onClose={() => {
          if (!salvando) setModalAberto(false);
        }}
      >
        <ProdutoForm
          produto={produtoEdicao}
          onCancel={() => setModalAberto(false)}
          onSavingChange={setSalvando}
          onSaved={() => {
            setModalAberto(false);
            toastSuccess(produtoEdicao ? 'Produto atualizado' : 'Produto cadastrado');
            void carregar();
          }}
        />
      </Modal>

      {historicoProduto && (
        <Modal
          open
          title={`Histórico — ${historicoProduto.nome}`}
          onClose={() => setHistoricoProduto(null)}
          width="max-w-lg"
        >
          <p className="mt-1 text-xs text-[#A1A1AA]">
            Código {historicoProduto.sku} · Estoque atual: {historicoProduto.estoqueAtual}
          </p>

          <div className="mt-4 max-h-96 space-y-2 overflow-y-auto">
            {carregandoHistorico && (
              <p className="text-center text-sm text-[#A1A1AA]">Carregando…</p>
            )}
            {history.error && (
              <ErrorState message={history.error} onRetry={() => void history.refetch()} />
            )}
            {!carregandoHistorico && !history.error && movimentacoes.length === 0 && (
              <p className="py-8 text-center text-sm text-[#A1A1AA]">
                Nenhuma movimentação registrada para este produto.
              </p>
            )}
            {!carregandoHistorico &&
              !history.error &&
              movimentacoes.map((m) => {
                const entrada = m.tipo === 'ENTRADA';
                return (
                  <div
                    key={m.id}
                    className="flex items-center justify-between rounded-lg border border-[rgba(255,255,255,0.08)] bg-[#060608] px-4 py-3"
                  >
                    <div className="flex items-center gap-3">
                      <Badge color={entrada ? 'ENTRADA' : 'SAIDA'}>
                        {entrada ? '+' : '−'} {m.quantidade}
                      </Badge>
                      <div>
                        <p className="text-sm text-[#E4E4E7]">{m.motivo}</p>
                        <p className="text-xs text-[#A1A1AA]">{formatarDataHora(m.createdAt)}</p>
                      </div>
                    </div>
                    <span
                      className={`text-sm font-medium ${
                        entrada ? 'text-emerald-400' : 'text-red-400'
                      }`}
                    >
                      {entrada ? 'Entrada' : 'Saída'}
                    </span>
                  </div>
                );
              })}
          </div>
        </Modal>
      )}
    </div>
  );
}
