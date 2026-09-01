'use client';

import { useCallback, useEffect, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { api } from '@/lib/api';
import { toastSuccess } from '@/components/ui/Toaster';
import { Skeleton } from '@/components/ui/Skeleton';

interface Produto {
  id: string;
  nome: string;
  sku: string;
  preco: number;
  estoqueAtual: number;
  estoqueMinimo: number;
}
interface Resumo {
  totalProdutos: number;
  produtosAbaixoDoMinimo: number;
  valorTotalEstoque: number;
}
interface AlertaItem {
  id: string;
  nome: string;
  sku: string;
  estoqueAtual: number;
  estoqueMinimo: number;
}

export default function EstoquePage() {
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [resumo, setResumo] = useState<Resumo | null>(null);
  const [alertas, setAlertas] = useState<AlertaItem[]>([]);
  const [entradaProduto, setEntradaProduto] = useState<Produto | null>(null);
  const [quantidade, setQuantidade] = useState('');
  const [motivo, setMotivo] = useState('');

  const carregar = useCallback(async (): Promise<void> => {
    const [p, r, a] = await Promise.all([
      api.get<{ data: Produto[] }>('/produtos', { params: { limit: 100 } }),
      api.get<Resumo>('/estoque/resumo'),
      api.get<{ data: AlertaItem[] }>('/produtos/alerta', { params: { limit: 5 } }),
    ]);
    setProdutos(p.data.data);
    setResumo(r.data);
    setAlertas(a.data.data);
  }, []);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  const darEntrada = async (): Promise<void> => {
    if (!entradaProduto) return;
    await api.post('/estoque/entrada', {
      produtoId: entradaProduto.id,
      quantidade: Number(quantidade),
      motivo: motivo || 'Entrada manual',
    });
    setEntradaProduto(null);
    setQuantidade('');
    setMotivo('');
    await carregar();
  };

  const status = (p: Produto): { label: string; color: string } => {
    if (p.estoqueAtual === 0) return { label: 'Zerado', color: 'bg-red-500/10 text-red-700' };
    if (p.estoqueAtual < p.estoqueMinimo)
      return { label: 'Baixo', color: 'bg-yellow-100 text-yellow-700' };
    return { label: 'OK', color: 'bg-green-100 text-green-700' };
  };

  return (
    <div>
      <h2 className="text-xl font-semibold text-zinc-100">Estoque</h2>

      {/* Banner de produtos em alerta */}
      {alertas.length > 0 && (
        <div
          className="mt-6 rounded-xl border border-red-900/50 bg-red-950/30 p-5"
          role="alert"
          aria-live="polite"
        >
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-red-300">
                {alertas.length} {alertas.length === 1 ? 'produto precisa' : 'produtos precisam'}{' '}
                de reposição
              </p>
              <p className="mt-1 text-xs text-red-400/80">
                Estoque atual abaixo do mínimo configurado.
              </p>
            </div>
          </div>
          <ul className="mt-4 divide-y divide-red-900/40">
            {alertas.map((a) => (
              <li
                key={a.id}
                className="flex items-center justify-between py-2 text-sm"
              >
                <div>
                  <p className="font-medium text-zinc-100">{a.nome}</p>
                  <p className="text-xs text-zinc-500">{a.sku}</p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-red-300">
                    {a.estoqueAtual} <span className="text-xs font-normal text-zinc-500">/ mín. {a.estoqueMinimo}</span>
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      const full = produtos.find((p) => p.id === a.id);
                      if (full) setEntradaProduto(full);
                    }}
                    className="mt-1 text-xs text-red-400 hover:text-red-300 hover:underline"
                  >
                    Dar entrada
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
          <p className="text-sm text-zinc-400">Total de produtos</p>
          <p className="mt-1 text-2xl font-semibold text-zinc-100">
            {resumo?.totalProdutos ?? '—'}
          </p>
        </div>
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
          <p className="text-sm text-zinc-400">Valor em estoque</p>
          <p className="mt-1 text-2xl font-semibold text-zinc-100">
            R$ {(resumo?.valorTotalEstoque ?? 0).toFixed(2)}
          </p>
        </div>
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
          <p className="text-sm text-zinc-400">Em alerta</p>
          <p className="mt-1 text-2xl font-semibold text-red-400">
            {resumo?.produtosAbaixoDoMinimo ?? '—'}
          </p>
        </div>
      </div>

      <div className="mt-6 overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-zinc-800 bg-zinc-800/50">
            <tr>
              <th className="px-4 py-3 font-medium text-zinc-300">Produto</th>
              <th className="px-4 py-3 font-medium text-zinc-300">SKU</th>
              <th className="px-4 py-3 font-medium text-zinc-300">Preço</th>
              <th className="px-4 py-3 font-medium text-zinc-300">Estoque</th>
              <th className="px-4 py-3 font-medium text-zinc-300">Status</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800">
            {produtos.map((p) => {
              const s = status(p);
              return (
                <tr key={p.id}>
                  <td className="px-4 py-3 font-medium text-zinc-100">{p.nome}</td>
                  <td className="px-4 py-3 text-zinc-400">{p.sku}</td>
                  <td className="px-4 py-3 text-zinc-200">R$ {Number(p.preco).toFixed(2)}</td>
                  <td className="px-4 py-3 text-zinc-100">{p.estoqueAtual}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs ${s.color}`}>{s.label}</span>
                  </td>
                  <td className="px-4 py-3">
                    <Button variant="secondary" onClick={() => setEntradaProduto(p)}>
                      Dar entrada
                    </Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {entradaProduto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-zinc-900 p-6">
            <h3 className="font-semibold text-zinc-100">Dar entrada — {entradaProduto.nome}</h3>
            <div className="mt-4 space-y-3">
              <Input
                label="Quantidade"
                type="number"
                value={quantidade}
                onChange={(e) => setQuantidade(e.target.value)}
              />
              <Input
                label="Motivo"
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                placeholder="Ex: compra fornecedor"
              />
              <div className="flex gap-2">
                <Button variant="secondary" onClick={() => setEntradaProduto(null)}>
                  Cancelar
                </Button>
                <Button onClick={() => void darEntrada()} disabled={!quantidade}>
                  Confirmar
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
