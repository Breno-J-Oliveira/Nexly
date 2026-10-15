'use client';

import { hasPermission } from '@nexly/shared';
import { useAuth } from '@/lib/auth';

import Link from 'next/link';
import { MetricGrid } from '@/components/ui/MetricGrid';
import { formatarMoeda } from '@/lib/format';
import { PageToolbar } from '@/components/ui/PageToolbar';

import { useCallback, useEffect, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { VencimentoAlert } from '@/components/ui/VencimentoAlert';
import { api } from '@/lib/api';

interface Produto {
  id: string;
  nome: string;
  sku: string;
  preco: number;
  estoqueAtual: number;
  estoqueMinimo: number;
  categoria?: string | null;
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
  const { user } = useAuth();
  const podeCriar = hasPermission(user?.role, 'estoque:create');
  const [busca, setBusca] = useState('');
  const [categoria, setCategoria] = useState('');
  const [erroEntrada, setErroEntrada] = useState('');
  const [salvando, setSalvando] = useState(false);
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
    setSalvando(true);
    setErroEntrada('');
    try {
      await api.post('/estoque/entrada', {
        produtoId: entradaProduto.id,
        quantidade: Number(quantidade),
        motivo: motivo || 'Entrada manual',
      });
      setQuantidade('');
      setMotivo('');
      await carregar();
    } catch {
      setErroEntrada('Não foi possível registrar a entrada. Confira os dados.');
    } finally {
      setSalvando(false);
    }
  };

  const status = (p: Produto): { label: string; color: string } => {
    if (p.estoqueAtual === 0) return { label: 'Zerado', color: 'bg-red-500/10 text-red-400' };
    if (p.estoqueAtual < p.estoqueMinimo)
      return { label: 'Baixo', color: 'bg-yellow-500/10 text-yellow-400' };
    return { label: 'OK', color: 'bg-green-500/10 text-green-400' };
  };

  return (
    <div>
      <PageToolbar>
        <div className="page-heading with-search flex items-center justify-between">
          <div>
            <h2 className="font-semibold">Estoque</h2>
            <p className="mt-1">Controle e acompanhamento de produtos e insumos</p>
          </div>
          <div className="toolbar-actions flex flex-wrap items-center gap-3">
            <div className="toolbar-search">
              <Input
                aria-label="Buscar produto"
                placeholder="Buscar produto..."
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
              />
            </div>
            {podeCriar && (
              <Link
                href="/produtos"
                className="toolbar-primary rounded-lg bg-[#6366F1] px-4 py-2 text-sm font-medium"
              >
                + Novo Produto
              </Link>
            )}
          </div>
        </div>
      </PageToolbar>
      <div
        className={`grid min-w-0 gap-6 ${podeCriar ? 'xl:grid-cols-[minmax(0,1fr)_340px]' : ''}`}
      >
        <div className="min-w-0">
          <MetricGrid
            items={[
              { label: 'Total de Produtos', value: resumo?.totalProdutos || 0 },
              { label: 'Valor em Estoque', value: formatarMoeda(resumo?.valorTotalEstoque || 0) },
              { label: 'Estoque Baixo', value: resumo?.produtosAbaixoDoMinimo || 0 },
              {
                label: 'Sem Estoque',
                value: produtos.filter((p) => p.estoqueAtual === 0).length,
                note: 'Na lista atual',
              },
            ]}
          />
          <div className="mb-6 flex flex-wrap gap-2">
            {[
              '',
              ...Array.from(
                new Set(produtos.map((p) => p.categoria).filter((c): c is string => !!c)),
              ),
            ].map((c) => (
              <button
                key={c}
                onClick={() => setCategoria(c)}
                className={`rounded-full border border-white/10 px-3 py-1 text-xs ${categoria === c ? 'bg-[#6366F1] text-white' : 'bg-[#18181F] text-[#A1A1AA]'}`}
              >
                {c || 'Todos'}
              </button>
            ))}
          </div>
          <VencimentoAlert />

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
                    {alertas.length}{' '}
                    {alertas.length === 1 ? 'produto precisa' : 'produtos precisam'} de reposição
                  </p>
                  <p className="mt-1 text-xs text-red-400/80">
                    Estoque atual abaixo do mínimo configurado.
                  </p>
                </div>
              </div>
              <ul className="mt-4 divide-y divide-red-900/40">
                {alertas.map((a) => (
                  <li key={a.id} className="flex items-center justify-between py-2 text-sm">
                    <div>
                      <p className="font-medium text-[#FAFAFA]">{a.nome}</p>
                      <p className="text-xs text-[#71717A]">{a.sku}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-red-300">
                        {a.estoqueAtual}{' '}
                        <span className="text-xs font-normal text-[#71717A]">
                          / mín. {a.estoqueMinimo}
                        </span>
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

          <div className="mt-6 overflow-x-auto rounded-xl border border-[rgba(255,255,255,0.08)] bg-[#111116]">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-[rgba(255,255,255,0.08)] bg-[#18181F]/50">
                <tr>
                  <th className="px-4 py-3 font-medium text-[#D4D4D8]">Produto</th>
                  <th className="px-4 py-3 font-medium text-[#D4D4D8]">SKU</th>
                  <th className="px-4 py-3 font-medium text-[#D4D4D8]">Preço</th>
                  <th className="px-4 py-3 font-medium text-[#D4D4D8]">Estoque</th>
                  <th className="px-4 py-3 font-medium text-[#D4D4D8]">Status</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-[rgba(255,255,255,0.08)]">
                {produtos
                  .filter(
                    (p) =>
                      p.nome.toLowerCase().includes(busca.toLowerCase()) &&
                      (!categoria || p.categoria === categoria),
                  )
                  .map((p) => {
                    const s = status(p);
                    return (
                      <tr key={p.id}>
                        <td className="px-4 py-3 font-medium text-[#FAFAFA]">{p.nome}</td>
                        <td className="px-4 py-3 text-[#A1A1AA]">{p.sku}</td>
                        <td className="px-4 py-3 text-[#E4E4E7]">
                          R$ {Number(p.preco).toFixed(2)}
                        </td>
                        <td className="px-4 py-3 text-[#FAFAFA]">{p.estoqueAtual}</td>
                        <td className="px-4 py-3">
                          <span className={`rounded-full px-2 py-0.5 text-xs ${s.color}`}>
                            {s.label}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {podeCriar && (
                            <Button variant="secondary" onClick={() => setEntradaProduto(p)}>
                              Dar entrada
                            </Button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </div>
        {podeCriar && (
          <aside className="detail-panel self-start">
            <h3 className="text-lg font-semibold">Registrar Entrada</h3>
            <div className="mt-6 space-y-4">
              <label className="block text-sm text-[#A1A1AA]">
                Produto
                <select
                  aria-label="Produto da entrada"
                  value={entradaProduto?.id || ''}
                  onChange={(e) => {
                    setEntradaProduto(produtos.find((p) => p.id === e.target.value) || null);
                    setErroEntrada('');
                  }}
                  className="mt-2 w-full rounded-lg border border-white/10 bg-[#18181F] px-3 py-2 text-sm text-white"
                >
                  <option value="">Selecione um produto</option>
                  {produtos.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nome}
                    </option>
                  ))}
                </select>
              </label>
              <Input
                label="Quantidade"
                type="number"
                min="1"
                step="1"
                value={quantidade}
                onChange={(e) => setQuantidade(e.target.value)}
              />
              <Input
                label="Observações / motivo"
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                placeholder="Ex: compra fornecedor"
              />
              {erroEntrada && (
                <p role="alert" className="text-sm text-red-400">
                  {erroEntrada}
                </p>
              )}
              <div className="flex flex-wrap gap-3 pt-4">
                <Button
                  variant="secondary"
                  onClick={() => {
                    setEntradaProduto(null);
                    setQuantidade('');
                    setMotivo('');
                  }}
                >
                  Cancelar
                </Button>
                <Button
                  onClick={() => void darEntrada()}
                  loading={salvando}
                  disabled={
                    !entradaProduto ||
                    !Number.isSafeInteger(Number(quantidade)) ||
                    Number(quantidade) <= 0
                  }
                >
                  Registrar Entrada
                </Button>
              </div>
            </div>
          </aside>
        )}
      </div>
    </div>
  );
}
