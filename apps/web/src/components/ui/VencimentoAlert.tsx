'use client';

import { useApi } from '@/lib/useApi';
import { expiryLabel, formatExpiry } from '@/lib/expiry';
import { ErrorState } from './ErrorState';
import Link from 'next/link';

interface ProdutoVencendo {
  id: string;
  nome: string;
  sku: string;
  estoqueAtual: number;
  dataVencimento: string;
  lote: string | null;
}

export function VencimentoAlert() {
  const { data, error, loading, refetch } = useApi<{ data: ProdutoVencendo[]; total: number }>(
    '/produtos',
    { params: { vencendoEm: 30, limit: 8 } },
  );
  const produtos = data?.data ?? [];
  if (error)
    return (
      <ErrorState
        message="Não foi possível verificar as validades"
        onRetry={() => void refetch()}
      />
    );
  if (loading)
    return (
      <p className="text-sm text-[#A1A1AA]" role="status">
        Verificando validades…
      </p>
    );
  if (produtos.length === 0) return null;

  return (
    <div
      className="mt-6 rounded-xl border p-5"
      style={{ borderColor: 'rgba(234,179,8,0.30)', backgroundColor: 'rgba(234,179,8,0.06)' }}
      role="alert"
    >
      <p className="text-sm font-medium" style={{ color: '#EAB308' }}>
        {data?.total}{' '}
        {data?.total === 1
          ? 'produto vencido ou próximo de vencer'
          : 'produtos vencidos ou próximos de vencer'}{' '}
        (até 30 dias)
      </p>
      <ul className="mt-3 space-y-2">
        {produtos.slice(0, 8).map((p) => (
          <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 text-sm">
            <div>
              <span style={{ color: '#FAFAFA' }}>{p.nome}</span>
              <span className="ml-2" style={{ color: '#A1A1AA' }}>
                {p.sku}
              </span>
            </div>
            <span style={{ color: '#EAB308' }}>
              {formatExpiry(p.dataVencimento)} · {expiryLabel(p.dataVencimento)}
              <span className="ml-2" style={{ color: '#A1A1AA' }}>
                estoque: {p.estoqueAtual}
              </span>
            </span>
          </li>
        ))}
      </ul>
      {(data?.total ?? 0) > produtos.length && (
        <Link
          href="/produtos?vencendo=1"
          className="mt-3 inline-block text-sm text-[#C7D2FE] underline"
        >
          Ver todos os produtos com validade próxima
        </Link>
      )}
    </div>
  );
}
