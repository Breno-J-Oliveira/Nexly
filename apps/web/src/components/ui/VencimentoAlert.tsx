'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

interface ProdutoVencendo {
  id: string;
  nome: string;
  sku: string;
  estoqueAtual: number;
  dataVencimento: string;
  lote: string | null;
}

export function VencimentoAlert() {
  const [produtos, setProdutos] = useState<ProdutoVencendo[]>([]);

  useEffect(() => {
    api.get<ProdutoVencendo[]>('/export/produtos/vencendo', { params: { dias: 30 } })
      .then((r) => setProdutos(Array.isArray(r.data) ? r.data : (r.data as any).data ?? []))
      .catch(() => undefined);
  }, []);

  if (produtos.length === 0) return null;

  return (
    <div
      className="mt-6 rounded-xl border p-5"
      style={{ borderColor: 'rgba(234,179,8,0.30)', backgroundColor: 'rgba(234,179,8,0.06)' }}
      role="alert"
    >
      <p className="text-sm font-medium" style={{ color: '#EAB308' }}>
        {produtos.length} {produtos.length === 1 ? 'produto vence' : 'produtos vencem'} em ate 30 dias
      </p>
      <ul className="mt-3 space-y-2">
        {produtos.slice(0, 8).map((p) => (
          <li key={p.id} className="flex items-center justify-between text-sm">
            <div>
              <span style={{ color: '#FAFAFA' }}>{p.nome}</span>
              <span className="ml-2" style={{ color: '#71717A' }}>{p.sku}</span>
            </div>
            <span style={{ color: '#EAB308' }}>
              {p.dataVencimento ? new Date(p.dataVencimento).toLocaleDateString('pt-BR') : '--'}
              <span className="ml-2" style={{ color: '#71717A' }}>estoque: {p.estoqueAtual}</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
