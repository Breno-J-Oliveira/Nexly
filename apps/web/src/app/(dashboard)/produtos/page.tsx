'use client';

import { useCallback, useEffect, useState } from 'react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { api } from '@/lib/api';
import { toastSuccess } from '@/components/ui/Toaster';
import { Skeleton } from '@/components/ui/Skeleton';
import { formatarDataHora } from '@/lib/format';

interface Produto {
  id: string;
  nome: string;
  sku: string;
  preco: number;
  estoqueAtual: number;
  estoqueMinimo: number;
  categoria: string | null;
}

interface Movimentacao {
  id: string;
  produtoId: string;
  tipo: 'ENTRADA' | 'SAIDA';
  quantidade: number;
  motivo: string;
  agendamentoId: string | null;
  createdAt: string;
}

interface FormState {
  nome: string;
  sku: string;
  preco: string;
  estoqueAtual: string;
  estoqueMinimo: string;
  categoria: string;
}

const vazio: FormState = {
  nome: '',
  sku: '',
  preco: '',
  estoqueAtual: '0',
  estoqueMinimo: '5',
  categoria: '',
};

function statusProduto(p: Produto): { label: string; color: string } {
  if (p.estoqueAtual === 0) return { label: 'Zerado', color: 'SAIDA' };
  if (p.estoqueAtual < p.estoqueMinimo) return { label: 'Baixo', color: 'CONFIRMADO' };
  return { label: 'OK', color: 'CONCLUIDO' };
}

const moeda = (v: number): string =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

export default function ProdutosPage() {
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [busca, setBusca] = useState('');
  const [carregando, setCarregando] = useState(true);
  const [modalAberto, setModalAberto] = useState(false);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(vazio);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  // ── Histórico de movimentações ────────────────────────────
  const [historicoProduto, setHistoricoProduto] = useState<Produto | null>(null);
  const [movimentacoes, setMovimentacoes] = useState<Movimentacao[]>([]);
  const [carregandoHistorico, setCarregandoHistorico] = useState(false);
  const [totalProdutos, setTotalProdutos] = useState(0);

  const carregar = useCallback(async (search?: string) => {
    setCarregando(true);
    try {
      const res = await api.get<{ data: Produto[]; total: number }>('/produtos', {
        params: { limit: 100, search },
      });
      setProdutos(res.data.data);
      setTotalProdutos(res.data.total);
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  useEffect(() => {
    const t = setTimeout(() => void carregar(busca || undefined), 300);
    return () => clearTimeout(t);
  }, [busca, carregar]);

  const abrirNovo = (): void => {
    setEditandoId(null);
    setForm(vazio);
    setErro(null);
    setModalAberto(true);
  };

  const abrirEdicao = (p: Produto): void => {
    setEditandoId(p.id);
    setForm({
      nome: p.nome,
      sku: p.sku,
      preco: String(p.preco),
      estoqueAtual: '0',
      estoqueMinimo: String(p.estoqueMinimo),
      categoria: p.categoria ?? '',
    });
    setErro(null);
    setModalAberto(true);
  };

  const abrirHistorico = async (p: Produto): Promise<void> => {
    setHistoricoProduto(p);
    setMovimentacoes([]);
    setCarregandoHistorico(true);
    try {
      const res = await api.get<Movimentacao[]>(`/estoque/historico/${p.id}`);
      setMovimentacoes(res.data);
    } finally {
      setCarregandoHistorico(false);
    }
  };

  const salvar = async (): Promise<void> => {
    setSalvando(true);
    setErro(null);
    try {
      if (editandoId) {
        await api.put(`/produtos/${editandoId}`, {
          nome: form.nome,
          preco: Number(form.preco),
          estoqueMinimo: Number(form.estoqueMinimo),
          categoria: form.categoria || undefined,
        });
      } else {
        await api.post('/produtos', {
          nome: form.nome,
          sku: form.sku,
          preco: Number(form.preco),
          estoqueAtual: Number(form.estoqueAtual),
          estoqueMinimo: Number(form.estoqueMinimo),
          categoria: form.categoria || undefined,
        });
      }
      setModalAberto(false);
    toastSuccess(editandoId ? 'Produto atualizado!' : 'Produto criado!');
      await carregar(busca || undefined);
    } catch (e) {
      const err = e as { response?: { data?: { message?: string } } };
      setErro(err?.response?.data?.message ?? 'Erro ao salvar produto');
    } finally {
      setSalvando(false);
    }
  };

  const excluir = async (p: Produto): Promise<void> => {
    if (!confirm(`Excluir o produto "${p.nome}"?`)) return;
    await api.delete(`/produtos/${p.id}`);
    await carregar(busca || undefined);
  };

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-[#FAFAFA]">Produtos</h2>
          <p className="mt-1 text-sm text-[#A1A1AA]">
            Controle de produtos e estoque · {totalProdutos}{' '}
            {totalProdutos === 1 ? 'cadastrado' : 'cadastrados'}
          </p>
        </div>
        <Button onClick={abrirNovo}>+ Novo produto</Button>
      </div>

      <div className="mt-6 max-w-md">
        <Input
          placeholder="Buscar por nome ou SKU..."
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
        />
      </div>

      <div className="mt-6 overflow-hidden rounded-xl border border-[rgba(255,255,255,0.08)] bg-[#111116]">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-[rgba(255,255,255,0.08)] bg-[#18181F]/40">
            <tr>
              <th className="px-4 py-3 font-medium text-[#A1A1AA]">Produto</th>
              <th className="px-4 py-3 font-medium text-[#A1A1AA]">SKU</th>
              <th className="px-4 py-3 font-medium text-[#A1A1AA]">Preço</th>
              <th className="px-4 py-3 font-medium text-[#A1A1AA]">Estoque</th>
              <th className="px-4 py-3 font-medium text-[#A1A1AA]">Status</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-[rgba(255,255,255,0.08)]">
            {carregando && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-[#A1A1AA]">
                  Carregando…
                </td>
              </tr>
            )}
            {!carregando && produtos.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-[#71717A]">
                  Nenhum produto encontrado.
                </td>
              </tr>
            )}
            {produtos.map((p) => {
              const s = statusProduto(p);
              return (
                <tr key={p.id} className="hover:bg-[#18181F]/30">
                  <td className="px-4 py-3 font-medium text-[#FAFAFA]">{p.nome}</td>
                  <td className="px-4 py-3 text-[#A1A1AA]">{p.sku}</td>
                  <td className="px-4 py-3 text-[#E4E4E7]">{moeda(p.preco)}</td>
                  <td className="px-4 py-3 text-[#FAFAFA]">{p.estoqueAtual}</td>
                  <td className="px-4 py-3">
                    <Badge color={s.color}>{s.label}</Badge>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Button variant="ghost" className="mr-1 text-xs" onClick={() => void abrirHistorico(p)}>
                      Histórico
                    </Button>
                    <Button variant="ghost" className="mr-1 text-xs" onClick={() => abrirEdicao(p)}>
                      Editar
                    </Button>
                    <Button
                      variant="ghost"
                      className="text-xs text-red-400"
                      onClick={() => void excluir(p)}
                    >
                      Excluir
                    </Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {modalAberto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-md rounded-2xl border border-[rgba(255,255,255,0.08)] bg-[#111116] p-6">
            <h3 className="text-lg font-semibold text-[#FAFAFA]">
              {editandoId ? 'Editar produto' : 'Novo produto'}
            </h3>
            <div className="mt-4 space-y-3">
              <Input
                label="Nome"
                value={form.nome}
                onChange={(e) => setForm({ ...form, nome: e.target.value })}
                placeholder="Nome do produto"
              />
              <Input
                label="SKU"
                value={form.sku}
                onChange={(e) => setForm({ ...form, sku: e.target.value })}
                placeholder="Código único"
                disabled={!!editandoId}
              />
              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="Preço"
                  type="number"
                  min={0}
                  step="0.01"
                  value={form.preco}
                  onChange={(e) => setForm({ ...form, preco: e.target.value })}
                  placeholder="0.00"
                />
                {!editandoId && (
                  <Input
                    label="Estoque inicial"
                    type="number"
                    min={0}
                    value={form.estoqueAtual}
                    onChange={(e) => setForm({ ...form, estoqueAtual: e.target.value })}
                  />
                )}
              </div>
              <Input
                label="Quantidade mínima"
                type="number"
                min={0}
                value={form.estoqueMinimo}
                onChange={(e) => setForm({ ...form, estoqueMinimo: e.target.value })}
              />
              <Input
                label="Categoria"
                value={form.categoria}
                onChange={(e) => setForm({ ...form, categoria: e.target.value })}
                placeholder="Ex: coloração, cosmético"
              />
              {erro && <p className="text-sm text-red-400">{erro}</p>}
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="secondary" onClick={() => setModalAberto(false)}>
                  Cancelar
                </Button>
                <Button
                  onClick={() => void salvar()}
                  loading={salvando}
                  disabled={!form.nome || !form.sku || !form.preco}
                >
                  Salvar
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {historicoProduto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-lg rounded-2xl border border-[rgba(255,255,255,0.08)] bg-[#111116] p-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-[#FAFAFA]">
                Histórico — {historicoProduto.nome}
              </h3>
              <button
                onClick={() => setHistoricoProduto(null)}
                className="text-[#A1A1AA] hover:text-[#E4E4E7]"
              >
                ✕
              </button>
            </div>
            <p className="mt-1 text-xs text-[#71717A]">
              SKU {historicoProduto.sku} · Estoque atual: {historicoProduto.estoqueAtual}
            </p>

            <div className="mt-4 max-h-96 space-y-2 overflow-y-auto">
              {carregandoHistorico && (
                <p className="text-center text-sm text-[#A1A1AA]">Carregando…</p>
              )}
              {!carregandoHistorico && movimentacoes.length === 0 && (
                <p className="py-8 text-center text-sm text-[#71717A]">
                  Nenhuma movimentação registrada para este produto.
                </p>
              )}
              {movimentacoes.map((m) => {
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
                        <p className="text-xs text-[#71717A]">{formatarDataHora(m.createdAt)}</p>
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
          </div>
        </div>
      )}
    </div>
  );
}
