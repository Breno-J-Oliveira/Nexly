'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { api } from '@/lib/api';

interface Produto {
  id: string;
  nome: string;
  sku: string;
  preco: number;
  estoqueAtual: number;
}
interface Cliente {
  id: string;
  nome: string;
}
interface Item {
  produto: Produto;
  quantidade: number;
}

export default function PdvPage() {
  const [busca, setBusca] = useState('');
  const [resultados, setResultados] = useState<Produto[]>([]);
  const [itens, setItens] = useState<Item[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [clienteId, setClienteId] = useState('');
  const [finalizando, setFinalizando] = useState(false);
  const [sucesso, setSucesso] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => {
      if (busca.trim().length >= 2) {
        api
          .get<{ data: Produto[] }>('/produtos', { params: { search: busca, limit: 10 } })
          .then((r) => setResultados(r.data.data))
          .catch(() => setResultados([]));
      } else {
        setResultados([]);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [busca]);

  useEffect(() => {
    api
      .get<{ data: Cliente[] }>('/clientes', { params: { limit: 100 } })
      .then((r) => setClientes(r.data.data))
      .catch(() => undefined);
  }, []);

  const adicionar = (produto: Produto): void => {
    setItens((prev) => {
      const existente = prev.find((i) => i.produto.id === produto.id);
      if (existente) {
        return prev.map((i) =>
          i.produto.id === produto.id ? { ...i, quantidade: i.quantidade + 1 } : i,
        );
      }
      return [...prev, { produto, quantidade: 1 }];
    });
    setResultados([]);
    setBusca('');
  };

  const mudarQuantidade = (id: string, delta: number): void => {
    setItens((prev) =>
      prev.map((i) =>
        i.produto.id === id ? { ...i, quantidade: Math.max(1, i.quantidade + delta) } : i,
      ),
    );
  };

  const remover = (id: string): void => {
    setItens((prev) => prev.filter((i) => i.produto.id !== id));
  };

  const total = itens.reduce((acc, i) => acc + Number(i.produto.preco) * i.quantidade, 0);

  const finalizar = async (): Promise<void> => {
    setFinalizando(true);
    try {
      await api.post('/vendas', {
        clienteId: clienteId || undefined,
        itens: itens.map((i) => ({ produtoId: i.produto.id, quantidade: i.quantidade })),
      });
      setItens([]);
      setClienteId('');

  return (
    <div>
      <h2 className="text-xl font-semibold text-gray-900">PDV</h2>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div>
          <Input
            label="Buscar produto"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Nome ou SKU"
          />
          <div className="mt-3 space-y-2">
            {resultados.map((p) => (
              <button
                key={p.id}
                onClick={() => adicionar(p)}
                className="w-full rounded-lg border border-gray-200 bg-white p-3 text-left hover:border-primary-500"
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium text-gray-900">{p.nome}</span>
                  <span className="text-sm text-gray-500">R$ {Number(p.preco).toFixed(2)}</span>
                </div>
                <p className="text-xs text-gray-400">
                  SKU: {p.sku} · Estoque: {p.estoqueAtual}
                </p>
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <h3 className="font-semibold text-gray-900">Resumo da venda</h3>
          <div className="mt-3 space-y-2">
            {itens.map((i) => (
              <div key={i.produto.id} className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900">{i.produto.nome}</p>
                  <p className="text-xs text-gray-500">R$ {Number(i.produto.preco).toFixed(2)}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => mudarQuantidade(i.produto.id, -1)}
                    className="h-6 w-6 rounded border border-gray-300"
                  >
                    −
                  </button>
                  <span className="w-6 text-center text-sm">{i.quantidade}</span>
                  <button
                    onClick={() => mudarQuantidade(i.produto.id, 1)}
                    className="h-6 w-6 rounded border border-gray-300"
                  >
                    +
                  </button>
                  <button onClick={() => remover(i.produto.id)} className="text-danger">
                    ✕
                  </button>
                </div>
              </div>
            ))}
            {itens.length === 0 && (
              <p className="text-sm text-gray-400">Nenhum item adicionado.</p>
            )}
          </div>

          <div className="mt-4 border-t pt-3">
            <select
              value={clienteId}
              onChange={(e) => setClienteId(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            >
              <option value="">Venda avulsa (sem cliente)</option>
              {clientes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nome}
                </option>
              ))}
            </select>
          </div>

          <div className="mt-4 flex items-center justify-between">
            <span className="text-lg font-semibold text-gray-900">Total</span>
            <span className="text-2xl font-bold text-primary-600">R$ {total.toFixed(2)}</span>
          </div>

          <Button
            className="mt-4 w-full"
            onClick={() => void finalizar()}
            loading={finalizando}
            disabled={itens.length === 0}
          >
            Finalizar venda
          </Button>
          {sucesso && <p className="mt-2 text-sm text-success">Venda concluída com sucesso!</p>}
        </div>
      </div>
    </div>
  );
}

      setSucesso(true);
      setTimeout(() => setSucesso(false), 3000);
    } finally {
      setFinalizando(false);
    }
  };
