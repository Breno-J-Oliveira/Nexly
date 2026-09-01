'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Tooltip } from '@/components/ui/Tooltip';
import { Input } from '@/components/ui/Input';
import { api } from '@/lib/api';
import { toastSuccess, toastError } from '@/components/ui/Toaster';

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
  const [formaPgto, setFormaPgto] = useState(DINHEIRO);

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
      setSucesso(true);
    toastSuccess('Venda concluída!');
      setTimeout(() => setSucesso(false), 3000);
    } finally {
      setFinalizando(false);
    }
  };

  return (
    <div className="flex h-[calc(100vh-8rem)] gap-6">
      <div className="flex flex-1 flex-col rounded-xl border border-zinc-800 bg-zinc-900 p-5">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-zinc-100">Produtos</h2>
          <span className="text-xs text-zinc-500" title="Total de produtos carregados">
            {resultados.length}{' '}
            {resultados.length === 1 ? 'resultado' : 'resultados'}
          </span>
        </div>
        <div className="mt-4 flex-1 overflow-y-auto">
          <Input
            placeholder="Buscar por nome ou SKU... (pressione /)"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
          />
          <div className="mt-4 space-y-2">
            {resultados.map((p) => (
              <div
                key={p.id}
                className="flex cursor-pointer items-center justify-between rounded-lg border border-zinc-800 bg-zinc-950 p-3 hover:bg-zinc-800"
                onClick={() => adicionar(p)}
              >
                <div>
                  <p className="font-medium text-zinc-100">{p.nome}</p>
                  <p className="text-xs text-zinc-500">Estoque: {p.estoqueAtual}</p>
                </div>
                <p className="font-semibold text-zinc-100">
                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
                    Number(p.preco),
                  )}
                </p>
              </div>
            ))}

            {/* Empty state: nenhuma busca iniciada */}
            {busca.trim().length < 2 && (
              <div className="rounded-lg border border-dashed border-zinc-800 bg-zinc-950/50 px-4 py-10 text-center">
                <p className="text-sm text-zinc-400">
                  Digite o nome ou SKU do produto para começar
                </p>
                <p className="mt-1 text-xs text-zinc-600">
                  A busca inicia automaticamente após 2 caracteres.
                </p>
              </div>
            )}

            {/* Empty state: busca sem resultado */}
            {busca.trim().length >= 2 && resultados.length === 0 && (
              <div className="rounded-lg border border-dashed border-zinc-800 bg-zinc-950/50 px-4 py-10 text-center">
                <p className="text-sm text-zinc-300">
                  Nenhum produto encontrado para “{busca.trim()}”
                </p>
                <p className="mt-1 text-xs text-zinc-600">
                  Verifique a grafia ou cadastre o produto em Estoque.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex w-96 flex-col rounded-xl border border-zinc-800 bg-zinc-900 p-5">
        <h2 className="text-xl font-semibold text-zinc-100">Venda Atual</h2>
        <div className="mt-4 flex-1 overflow-y-auto pr-2">
          {itens.length === 0 ? (
            <div className="rounded-lg border border-dashed border-zinc-800 bg-zinc-950/50 px-4 py-10 text-center">
              <p className="text-sm text-zinc-400">Nenhum produto no carrinho</p>
              <p className="mt-1 text-xs text-zinc-600">
                Busque um produto à esquerda para iniciar a venda.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {itens.map((item) => (
                <div
                  key={item.produto.id}
                  className="flex flex-col gap-2 rounded-lg border border-zinc-800 bg-zinc-950 p-3"
                >
                  <div className="flex justify-between">
                    <p className="font-medium text-zinc-100">{item.produto.nome}</p>
                    <p className="font-semibold text-zinc-100">
                      {new Intl.NumberFormat('pt-BR', {
                        style: 'currency',
                        currency: 'BRL',
                      }).format(Number(item.produto.preco) * item.quantidade)}
                    </p>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Tooltip text="Diminuir quantidade">
                        <Button
                          variant="ghost"
                          className="h-6 w-6 p-0 text-zinc-400"
                          onClick={() => mudarQuantidade(item.produto.id, -1)}
                        >
                          -
                        </Button>
                      </Tooltip>
                      <span className="text-sm text-zinc-100">{item.quantidade}</span>
                      <Tooltip text="Aumentar quantidade">
                        <Button
                          variant="ghost"
                          className="h-6 w-6 p-0 text-zinc-400"
                          onClick={() => mudarQuantidade(item.produto.id, 1)}
                        >
                          +
                        </Button>
                      </Tooltip>
                    </div>
                    <Tooltip text="Remover item do carrinho">
                      <Button
                        variant="danger"
                        className="h-6 px-2 text-xs"
                        onClick={() => remover(item.produto.id)}
                      >
                        Remover
                      </Button>
                    </Tooltip>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="mt-4 border-t border-zinc-800 pt-4">
          <div className="mb-4">
            <label className="mb-1 block text-sm font-medium text-zinc-300">
              Cliente (opcional)
            </label>
            <select
              className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
              value={clienteId}
              onChange={(e) => setClienteId(e.target.value)}
            >
              <option value="">Selecione um cliente...</option>
              {clientes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nome}
                </option>
              ))}
            </select>
          </div>
          <div className="mb-3"><label className="mb-1 block text-sm font-medium" style={{color:'#A1A1AA'}}>Forma de pagamento</label><select value={formaPgto} onChange={(e)=>setFormaPgto(e.target.value)} className="w-full rounded-lg border px-3 py-2 text-[13px]" style={{backgroundColor:'#111116',borderColor:'rgba(255,255,255,0.10)',color:'#FAFAFA'}}><option value="DINHEIRO">Dinheiro</option><option value="CARTAO_CREDITO">Cartao de Credito</option><option value="CARTAO_DEBITO">Cartao de Debito</option><option value="PIX">PIX</option></select></div><div className="mb-2 flex items-center gap-2"><label className="text-sm" style={{color:'#71717A'}}>Desconto R$</label><input type="number" value={desconto||\} onChange={e=>setDesconto(Number(e.target.value))} min={0} max={total} className="w-24 rounded-lg border px-2 py-1 text-sm" style={{backgroundColor:'#0C0C10',borderColor:'rgba(255,255,255,0.10)',color:'#FAFAFA'}} /></div><div className="flex justify-between text-lg font-bold text-zinc-100">
            <span>Total</span>
            <span>
              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(total)}
            </span>
          </div>
          <Tooltip
            text={
              itens.length === 0
                ? 'Adicione produtos ao carrinho primeiro'
                : sucesso
                  ? 'Venda registrada com sucesso'
                  : `Finaliza a venda dos ${itens.length} ${itens.length === 1 ? 'item' : 'itens'}`
            }
          >
            <Button
              className="mt-4 w-full"
              loading={finalizando}
              disabled={itens.length === 0}
              onClick={finalizar}
              variant="primary"
            >
              {sucesso ? 'Venda Finalizada!' : 'Finalizar Venda'}
            </Button>
          </Tooltip>
        </div>
      </div>
    </div>
  );
}
