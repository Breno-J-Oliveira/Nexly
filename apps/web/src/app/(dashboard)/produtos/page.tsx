'use client';

import { useCallback, useEffect, useState } from 'react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { api } from '@/lib/api';
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
          <h2 className="text-xl font-semibold text-zinc-100">Produtos</h2>
          <p className="mt-1 text-sm text-zinc-400">
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

      <div className="mt-6 overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-zinc-800 bg-zinc-800/40">
            <tr>
              <th className="px-4 py-3 font-medium text-zinc-400">Produto</th>
              <th className="px-4 py-3 font-medium text-zinc-400">SKU</th>
              <th className="px-4 py-3 font-medium text-zinc-400">Preço</th>
              <th className="px-4 py-3 font-medium text-zinc-400">Estoque</th>
              <th className="px-4 py-3 font-medium text-zinc-400">Status</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800">
            {carregando && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-zinc-400">
                  Carregando…
                </td>
              </tr>
            )}
            {!carregando && produtos.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-zinc-500">
                  Nenhum produto encontrado.
                </td>
              </tr>
            )}
            {produtos.map((p) => {
              const s = statusProduto(p);
              return (
                <tr key={p.id} className="hover:bg-zinc-800/30">
                  <td className="px-4 py-3 font-medium text-zinc-100">{p.nome}</td>
                  <td className="px-4 py-3 text-zinc-400">{p.sku}</td>
                  <td className="px-4 py-3 text-zinc-200">{moeda(p.preco)}</td>
                  <td className="px-4 py-3 text-zinc-100">{p.estoqueAtual}</td>
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
          <div className="w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
            <h3 className="text-lg font-semibold text-zinc-100">
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
          <div className="w-full max-w-lg rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-zinc-100">
                Histórico — {historicoProduto.nome}
              </h3>
              <button
                onClick={() => setHistoricoProduto(null)}
                className="text-zinc-400 hover:text-zinc-200"
              >
                ✕
              </button>
            </div>
            <p className="mt-1 text-xs text-zinc-500">
              SKU {historicoProduto.sku} · Estoque atual: {historicoProduto.estoqueAtual}
            </p>

            <div className="mt-4 max-h-96 space-y-2 overflow-y-auto">
              {carregandoHistorico && (
                <p className="text-center text-sm text-zinc-400">Carregando…</p>
              )}
              {!carregandoHistorico && movimentacoes.length === 0 && (
                <p className="py-8 text-center text-sm text-zinc-500">
                  Nenhuma movimentação registrada para este produto.
                </p>
              )}
              {movimentacoes.map((m) => {
                const entrada = m.tipo === 'ENTRADA';
                return (
                  <div
                    key={m.id}
                    className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-950 px-4 py-3"
                  >
                    <div className="flex items-center gap-3">
                      <Badge color={entrada ? 'ENTRADA' : 'SAIDA'}>
                        {entrada ? '+' : '−'} {m.quantidade}
                      </Badge>
                      <div>
                        <p className="text-sm text-zinc-200">{m.motivo}</p>
                        <p className="text-xs text-zinc-500">{formatarDataHora(m.createdAt)}</p>
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
