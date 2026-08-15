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
      setSucesso(true);
      setTimeout(() => setSucesso(false), 3000);
    } finally {
      setFinalizando(false);
    }
  };