'use client';

import { useCallback, useEffect, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { api } from '@/lib/api';

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

export default function EstoquePage() {
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [resumo, setResumo] = useState<Resumo | null>(null);
  const [entradaProduto, setEntradaProduto] = useState<Produto | null>(null);
  const [quantidade, setQuantidade] = useState('');
  const [motivo, setMotivo] = useState('');

  const carregar = useCallback(async (): Promise<void> => {
    const [p, r] = await Promise.all([
      api.get<{ data: Produto[] }>('/produtos', { params: { limit: 100 } }),
      api.get<Resumo>('/estoque/resumo'),
    ]);
    setProdutos(p.data.data);
    setResumo(r.data);
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
    if (p.estoqueAtual === 0) return { label: 'Zerado', color: 'bg-red-100 text-red-700' };
    if (p.estoqueAtual < p.estoqueMinimo)
      return { label: 'Baixo', color: 'bg-yellow-100 text-yellow-700' };
    return { label: 'OK', color: 'bg-green-100 text-green-700' };
  };


  return (
    <div>
      <h2 className="text-xl font-semibold text-gray-900">Estoque</h2>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <p className="text-sm text-gray-500">Total de produtos</p>
          <p className="mt-1 text-2xl font-semibold text-gray-900">{resumo?.totalProdutos ?? '—'}</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <p className="text-sm text-gray-500">Valor em estoque</p>
          <p className="mt-1 text-2xl font-semibold text-gray-900">
            R$ {(resumo?.valorTotalEstoque ?? 0).toFixed(2)}
          </p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <p className="text-sm text-gray-500">Em alerta</p>
          <p className="mt-1 text-2xl font-semibold text-danger">
            {resumo?.produtosAbaixoDoMinimo ?? '—'}
          </p>
        </div>
      </div>

      <div className="mt-6 overflow-hidden rounded-xl border border-gray-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-gray-200 bg-gray-50">
            <tr>
              <th className="px-4 py-3 font-medium text-gray-600">Produto</th>
              <th className="px-4 py-3 font-medium text-gray-600">SKU</th>
              <th className="px-4 py-3 font-medium text-gray-600">Preço</th>
              <th className="px-4 py-3 font-medium text-gray-600">Estoque</th>
              <th className="px-4 py-3 font-medium text-gray-600">Status</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {produtos.map((p) => {
              const s = status(p);
              return (
                <tr key={p.id}>
                  <td className="px-4 py-3 font-medium text-gray-900">{p.nome}</td>
                  <td className="px-4 py-3 text-gray-500">{p.sku}</td>
                  <td className="px-4 py-3 text-gray-700">R$ {Number(p.preco).toFixed(2)}</td>
                  <td className="px-4 py-3 text-gray-900">{p.estoqueAtual}</td>
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6">
            <h3 className="font-semibold text-gray-900">Dar entrada — {entradaProduto.nome}</h3>
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
