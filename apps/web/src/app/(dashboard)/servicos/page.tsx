'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { api } from '@/lib/api';

interface Servico {
  id: string;
  nome: string;
  duracaoMin: number;
  preco: number;
}
interface Produto {
  id: string;
  nome: string;
}
interface Insumo {
  produtoId: string;
  quantidade: number;
  produto: Produto;
}

export default function ServicosPage() {
  const [servicos, setServicos] = useState<Servico[]>([]);
  const [selecionado, setSelecionado] = useState<Servico | null>(null);
  const [insumos, setInsumos] = useState<Insumo[]>([]);
  const [produtos, setProdutos] = useState<Produto[]>([]);

  const [modalAberto, setModalAberto] = useState(false);
  const [produtoId, setProdutoId] = useState('');
  const [quantidade, setQuantidade] = useState('');
  const [buscaProduto, setBuscaProduto] = useState('');

  useEffect(() => {
    api
      .get<Servico[]>('/servicos')
      .then((r) => setServicos(r.data))
      .catch(() => undefined);
    api
      .get<{ data: Produto[] }>('/produtos', { params: { limit: 100 } })
      .then((r) => setProdutos(r.data.data))
      .catch(() => undefined);
  }, []);

  const selecionar = async (s: Servico): Promise<void> => {
    setSelecionado(s);
    const r = await api.get<Insumo[]>(`/servicos/${s.id}/insumos`);
    setInsumos(r.data);
  };

  const associar = async (): Promise<void> => {
    if (!selecionado || !produtoId || !quantidade) return;
    await api.post(`/servicos/${selecionado.id}/insumos`, {
      produtoId,
      quantidade: Number(quantidade),
    });
    setModalAberto(false);
    setProdutoId('');
    setQuantidade('');
    setBuscaProduto('');
    await selecionar(selecionado);
  };

  const remover = async (pid: string): Promise<void> => {
    if (!selecionado) return;
    await api.delete(`/servicos/${selecionado.id}/insumos/${pid}`);
    await selecionar(selecionado);
  };

  const produtosFiltrados = produtos.filter((p) =>
    p.nome.toLowerCase().includes(buscaProduto.toLowerCase()),
  );


  return (
    <div>
      <h2 className="text-xl font-semibold text-gray-900">Serviços</h2>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="space-y-2">
          {servicos.map((s) => (
            <button
              key={s.id}
              onClick={() => void selecionar(s)}
              className={`w-full rounded-lg border p-4 text-left ${
                selecionado?.id === s.id
                  ? 'border-primary-500 bg-primary-50'
                  : 'border-gray-200 bg-white hover:border-gray-300'
              }`}
            >
              <p className="font-medium text-gray-900">{s.nome}</p>
              <p className="text-sm text-gray-500">
                {s.duracaoMin} min · R$ {Number(s.preco).toFixed(2)}
              </p>
            </button>
          ))}
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-4">
          {selecionado ? (
            <>
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-gray-900">Insumos — {selecionado.nome}</h3>
                <Button onClick={() => setModalAberto(true)}>+ Insumo</Button>
              </div>
              <div className="mt-3 space-y-2">
                {insumos.length === 0 && (
                  <p className="text-sm text-gray-500">Nenhum insumo configurado.</p>
                )}
                {insumos.map((i) => (
                  <div
                    key={i.produtoId}
                    className="flex items-center justify-between rounded-lg border border-gray-200 px-3 py-2"
                  >
                    <span className="text-sm font-medium text-gray-900">{i.produto.nome}</span>
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-gray-500">{i.quantidade} un.</span>
                      <button onClick={() => void remover(i.produtoId)} className="text-danger">
                        ✕
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <p className="text-sm text-gray-500">Selecione um serviço para configurar insumos.</p>
          )}
        </div>
      </div>

      {modalAberto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6">
            <h3 className="font-semibold text-gray-900">Adicionar insumo</h3>
            <div className="mt-4 space-y-3">
              <Input
                label="Buscar produto"
                value={buscaProduto}
                onChange={(e) => setBuscaProduto(e.target.value)}
                placeholder="Nome do produto"
              />
              <div className="max-h-40 space-y-1 overflow-y-auto">
                {produtosFiltrados.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => setProdutoId(p.id)}
                    className={`w-full rounded-lg px-3 py-2 text-left text-sm ${
                      produtoId === p.id
                        ? 'bg-primary-50 text-primary-700'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    {p.nome}
                  </button>
                ))}
              </div>
              <Input
                label="Quantidade"
                type="number"
                value={quantidade}
                onChange={(e) => setQuantidade(e.target.value)}
              />
              <div className="flex gap-2">
                <Button variant="secondary" onClick={() => setModalAberto(false)}>
                  Cancelar
                </Button>
                <Button onClick={() => void associar()} disabled={!produtoId || !quantidade}>
                  Adicionar
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

