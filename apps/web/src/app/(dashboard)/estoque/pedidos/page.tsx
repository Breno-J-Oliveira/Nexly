'use client';

import { useCallback, useEffect, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { api } from '@/lib/api';
import { toastSuccess } from '@/components/ui/Toaster';
import { formatarDataHora } from '@/lib/format';

interface Fornecedor {
  id: string;
  nome: string;
  cnpj: string | null;
  telefone: string | null;
  email: string | null;
}

interface Pedido {
  id: string;
  status: 'RASCUNHO' | 'ENVIADO' | 'RECEBIDO' | 'CANCELADO';
  fornecedor: { nome: string } | null;
  observacoes: string | null;
  criadoEm: string;
  itens: { id: string; produtoId: string; quantidade: number; produto: { nome: string; sku: string } }[];
}

interface ProdutoBusca {
  id: string;
  nome: string;
  sku: string;
}

interface Sugestao {
  produtoId: string;
  nome: string;
  quantidadeSugerida: number;
}

const STATUS_INFO: Record<
  'RASCUNHO' | 'ENVIADO' | 'RECEBIDO' | 'CANCELADO',
  { label: string; color: string; bg: string }
> = {
  RASCUNHO: { label: 'Rascunho', color: '#A1A1AA', bg: 'rgba(255,255,255,0.06)' },
  ENVIADO: { label: 'Enviado', color: '#60A5FA', bg: 'rgba(59,130,246,0.10)' },
  RECEBIDO: { label: 'Recebido', color: '#4ADE80', bg: 'rgba(34,197,94,0.10)' },
  CANCELADO: { label: 'Cancelado', color: '#F87171', bg: 'rgba(239,68,68,0.10)' },
};

export default function PedidosPage() {
  const [aba, setAba] = useState<'pedidos' | 'fornecedores'>('pedidos');
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([]);

  const [novoPedidoAberto, setNovoPedidoAberto] = useState(false);
  const [pedidoFornecedorId, setPedidoFornecedorId] = useState('');
  const [pedidoObservacoes, setPedidoObservacoes] = useState('');
  const [itensForm, setItensForm] = useState<
    { produtoId: string; nome: string; quantidade: number }[]
  >([]);
  const [buscaProduto, setBuscaProduto] = useState('');
  const [resultadosBusca, setResultadosBusca] = useState<ProdutoBusca[]>([]);
  const [salvando, setSalvando] = useState(false);

  const [fornecedorModal, setFornecedorModal] = useState(false);
  const [fornecedorForm, setFornecedorForm] = useState({
    nome: '',
    cnpj: '',
    telefone: '',
    email: '',
  });

  const carregar = useCallback(async () => {
    const [p, f] = await Promise.all([
      api.get<Pedido[]>('/pedidos-compra'),
      api.get<Fornecedor[]>('/fornecedores'),
    ]);
    setPedidos(Array.isArray(p.data) ? p.data : []);
    setFornecedores(Array.isArray(f.data) ? f.data : []);
  }, []);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  useEffect(() => {
    const t = setTimeout(() => {
      if (buscaProduto.trim().length >= 2) {
        api
          .get<{ data: ProdutoBusca[] }>('/produtos', {
            params: { search: buscaProduto, limit: 10 },
          })
          .then((r) => setResultadosBusca(r.data.data))
          .catch(() => setResultadosBusca([]));
      } else {
        setResultadosBusca([]);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [buscaProduto]);

  const carregarSugestoes = async (): Promise<void> => {
    const r = await api.get<Sugestao[]>('/pedidos-compra/sugestao');
    const s = Array.isArray(r.data) ? r.data : [];
    setItensForm(
      s.map((x) => ({ produtoId: x.produtoId, nome: x.nome, quantidade: x.quantidadeSugerida })),
    );
  };

  const adicionarItem = (p: ProdutoBusca): void => {
    setItensForm((prev) => {
      if (prev.find((i) => i.produtoId === p.id)) return prev;
      return [...prev, { produtoId: p.id, nome: p.nome, quantidade: 1 }];
    });
    setBuscaProduto('');
    setResultadosBusca([]);
  };

  const criarPedido = async (): Promise<void> => {
    if (itensForm.length === 0) return;
    setSalvando(true);
    try {
      await api.post('/pedidos-compra', {
        fornecedorId: pedidoFornecedorId || undefined,
        observacoes: pedidoObservacoes || undefined,
        itens: itensForm.map((i) => ({ produtoId: i.produtoId, quantidade: i.quantidade })),
      });
      setNovoPedidoAberto(false);
      setPedidoFornecedorId('');
      setPedidoObservacoes('');
      setItensForm([]);
      await carregar();
      toastSuccess('Pedido criado!');
    } finally {
      setSalvando(false);
    }
  };

  const enviarPedido = async (id: string): Promise<void> => {
    await api.patch(`/pedidos-compra/${id}/enviar`);
    await carregar();
    toastSuccess('Pedido enviado!');
  };

  const receberPedido = async (id: string): Promise<void> => {
    await api.patch(`/pedidos-compra/${id}/receber`);
    await carregar();
    toastSuccess('Pedido recebido — estoque atualizado!');
  };

  const cancelarPedido = async (id: string): Promise<void> => {
    await api.patch(`/pedidos-compra/${id}/cancelar`);
    await carregar();
  };

  const criarFornecedor = async (): Promise<void> => {
    await api.post('/fornecedores', {
      nome: fornecedorForm.nome,
      cnpj: fornecedorForm.cnpj || undefined,
      telefone: fornecedorForm.telefone || undefined,
      email: fornecedorForm.email || undefined,
    });
    setFornecedorModal(false);
    setFornecedorForm({ nome: '', cnpj: '', telefone: '', email: '' });
    await carregar();
    toastSuccess('Fornecedor criado!');
  };

  const excluirFornecedor = async (id: string): Promise<void> => {
    if (!confirm('Excluir fornecedor?')) return;
    await api.delete(`/fornecedores/${id}`);
    await carregar();
  };

  const totalPedidos = pedidos.length;
  const emRascunho = pedidos.filter((p) => p.status === 'RASCUNHO').length;
  const enviados = pedidos.filter((p) => p.status === 'ENVIADO').length;
  const recebidos = pedidos.filter((p) => p.status === 'RECEBIDO').length;

  const KPI = ({ label, value }: { label: string; value: number }) => (
    <div
      className="rounded-xl p-4"
      style={{ backgroundColor: '#111116', border: '1px solid rgba(255,255,255,0.06)' }}
    >
      <p className="text-xs" style={{ color: '#71717A' }}>
        {label}
      </p>
      <p className="mt-1 text-xl font-bold" style={{ color: '#FAFAFA' }}>
        {value}
      </p>
    </div>
  );

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold" style={{ color: '#FAFAFA' }}>
            Pedidos de compra
          </h2>
          <p className="mt-1 text-sm" style={{ color: '#71717A' }}>
            Gerencie fornecedores e pedidos de reposição
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant={aba === 'pedidos' ? 'primary' : 'secondary'}
            onClick={() => setAba('pedidos')}
          >
            Pedidos
          </Button>
          <Button
            variant={aba === 'fornecedores' ? 'primary' : 'secondary'}
            onClick={() => setAba('fornecedores')}
          >
            Fornecedores
          </Button>
        </div>
      </div>

      {aba === 'pedidos' && (
        <div className="mt-6">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <KPI label="Total de pedidos" value={totalPedidos} />
            <KPI label="Em rascunho" value={emRascunho} />
            <KPI label="Enviados" value={enviados} />
            <KPI label="Recebidos" value={recebidos} />
          </div>

          <div className="mt-4 flex gap-2">
            <Button onClick={() => setNovoPedidoAberto(true)}>+ Novo pedido</Button>
            <Button variant="secondary" onClick={() => void carregarSugestoes()}>
              Sugestão automática
            </Button>
          </div>

          <div
            className="mt-4 overflow-hidden rounded-xl"
            style={{ backgroundColor: '#111116', border: '1px solid rgba(255,255,255,0.06)' }}
          >
            <table className="w-full text-left text-[13px]">
              <thead style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                <tr>
                  <th className="px-4 py-3 font-medium" style={{ color: '#71717A' }}>Fornecedor</th>
                  <th className="px-4 py-3 font-medium" style={{ color: '#71717A' }}>Itens</th>
                  <th className="px-4 py-3 font-medium" style={{ color: '#71717A' }}>Status</th>
                  <th className="px-4 py-3 font-medium" style={{ color: '#71717A' }}>Data</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {pedidos.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center" style={{ color: '#71717A' }}>
                      Nenhum pedido cadastrado.
                    </td>
                  </tr>
                )}
                {pedidos.map((p) => {
                  const st = STATUS_INFO[p.status];
                  return (
                    <tr key={p.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                      <td className="px-4 py-3" style={{ color: '#FAFAFA' }}>
                        {p.fornecedor?.nome ?? '—'}
                      </td>
                      <td className="px-4 py-3" style={{ color: '#A1A1AA' }}>
                        {p.itens.reduce((acc, i) => acc + i.quantidade, 0)} un
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium"
                          style={{ backgroundColor: st.bg, color: st.color }}
                        >
                          {st.label}
                        </span>
                      </td>
                      <td className="px-4 py-3" style={{ color: '#A1A1AA' }}>
                        {formatarDataHora(p.criadoEm)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {p.status === 'RASCUNHO' && (
                          <Button
                            variant="ghost"
                            className="mr-1 text-xs"
                            onClick={() => void enviarPedido(p.id)}
                          >
                            Enviar
                          </Button>
                        )}
                        {p.status === 'ENVIADO' && (
                          <Button
                            variant="ghost"
                            className="mr-1 text-xs"
                            onClick={() => void receberPedido(p.id)}
                          >
                            Receber
                          </Button>
                        )}
                        {(p.status === 'RASCUNHO' || p.status === 'ENVIADO') && (
                          <Button
                            variant="ghost"
                            className="text-xs text-red-400"
                            onClick={() => void cancelarPedido(p.id)}
                          >
                            Cancelar
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
      )}

      {aba === 'fornecedores' && (
        <div className="mt-6">
          <div className="flex justify-end">
            <Button onClick={() => setFornecedorModal(true)}>+ Novo fornecedor</Button>
          </div>
          <div
            className="mt-4 overflow-hidden rounded-xl"
            style={{ backgroundColor: '#111116', border: '1px solid rgba(255,255,255,0.06)' }}
          >
            <table className="w-full text-left text-[13px]">
              <thead style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                <tr>
                  <th className="px-4 py-3 font-medium" style={{ color: '#71717A' }}>Nome</th>
                  <th className="px-4 py-3 font-medium" style={{ color: '#71717A' }}>CNPJ</th>
                  <th className="px-4 py-3 font-medium" style={{ color: '#71717A' }}>Telefone</th>
                  <th className="px-4 py-3 font-medium" style={{ color: '#71717A' }}>E-mail</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {fornecedores.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center" style={{ color: '#71717A' }}>
                      Nenhum fornecedor cadastrado.
                    </td>
                  </tr>
                )}
                {fornecedores.map((f) => (
                  <tr key={f.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                    <td className="px-4 py-3" style={{ color: '#FAFAFA' }}>{f.nome}</td>
                    <td className="px-4 py-3" style={{ color: '#A1A1AA' }}>{f.cnpj ?? '—'}</td>
                    <td className="px-4 py-3" style={{ color: '#A1A1AA' }}>{f.telefone ?? '—'}</td>
                    <td className="px-4 py-3" style={{ color: '#A1A1AA' }}>{f.email ?? '—'}</td>
                    <td className="px-4 py-3 text-right">
                      <Button
                        variant="ghost"
                        className="text-xs text-red-400"
                        onClick={() => void excluirFornecedor(f.id)}
                      >
                        Excluir
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {novoPedidoAberto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-md rounded-2xl border border-[rgba(255,255,255,0.08)] bg-[#111116] p-6">
            <h3 className="text-lg font-semibold text-[#FAFAFA]">Novo pedido</h3>
            <div className="mt-4 space-y-3">
              <div>
                <label className="mb-1 block text-sm font-medium text-[#A1A1AA]">
                  Fornecedor (opcional)
                </label>
                <select
                  value={pedidoFornecedorId}
                  onChange={(e) => setPedidoFornecedorId(e.target.value)}
                  className="w-full rounded-lg border border-[rgba(255,255,255,0.10)] bg-[#0C0C10] px-3 py-2 text-sm text-[#FAFAFA] outline-none"
                >
                  <option value="">Sem fornecedor</option>
                  {fornecedores.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.nome}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-[#A1A1AA]">
                  Buscar produto
                </label>
                <input
                  value={buscaProduto}
                  onChange={(e) => setBuscaProduto(e.target.value)}
                  placeholder="Digite para buscar..."
                  className="w-full rounded-lg border border-[rgba(255,255,255,0.10)] bg-[#0C0C10] px-3 py-2 text-sm text-[#FAFAFA] outline-none"
                />
                {resultadosBusca.length > 0 && (
                  <div className="mt-1 max-h-40 overflow-y-auto rounded-lg border border-[rgba(255,255,255,0.08)] bg-[#0C0C10]">
                    {resultadosBusca.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => adicionarItem(p)}
                        className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-[#18181F]"
                        style={{ color: '#FAFAFA' }}
                      >
                        <span>{p.nome}</span>
                        <span className="text-xs" style={{ color: '#71717A' }}>
                          {p.sku}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                {itensForm.map((item) => (
                  <div
                    key={item.produtoId}
                    className="flex items-center gap-2 rounded-lg border border-[rgba(255,255,255,0.08)] bg-[#0C0C10] px-3 py-2"
                  >
                    <span className="flex-1 truncate text-sm text-[#FAFAFA]">{item.nome}</span>
                    <input
                      type="number"
                      min={1}
                      value={item.quantidade}
                      onChange={(e) =>
                        setItensForm((prev) =>
                          prev.map((x) =>
                            x.produtoId === item.produtoId
                              ? { ...x, quantidade: Number(e.target.value) }
                              : x,
                          ),
                        )
                      }
                      className="w-16 rounded border border-[rgba(255,255,255,0.10)] bg-[#111116] px-2 py-1 text-sm text-[#FAFAFA]"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setItensForm((prev) => prev.filter((x) => x.produtoId !== item.produtoId))
                      }
                      className="text-[#A1A1AA] hover:text-[#FAFAFA]"
                    >
                      ✕
                    </button>
                  </div>
                ))}
                {itensForm.length === 0 && (
                  <p className="text-sm text-[#71717A]">Nenhum item adicionado.</p>
                )}
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-[#A1A1AA]">
                  Observações (opcional)
                </label>
                <textarea
                  value={pedidoObservacoes}
                  onChange={(e) => setPedidoObservacoes(e.target.value)}
                  rows={2}
                  className="w-full resize-none rounded-lg border border-[rgba(255,255,255,0.10)] bg-[#0C0C10] px-3 py-2 text-sm text-[#FAFAFA] outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button variant="secondary" onClick={() => setNovoPedidoAberto(false)}>
                  Cancelar
                </Button>
                <Button
                  onClick={() => void criarPedido()}
                  loading={salvando}
                  disabled={itensForm.length === 0}
                >
                  Criar pedido
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {fornecedorModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-sm rounded-2xl border border-[rgba(255,255,255,0.08)] bg-[#111116] p-6">
            <h3 className="text-lg font-semibold text-[#FAFAFA]">Novo fornecedor</h3>
            <div className="mt-4 space-y-3">
              <Input
                label="Nome"
                value={fornecedorForm.nome}
                onChange={(e) => setFornecedorForm({ ...fornecedorForm, nome: e.target.value })}
                placeholder="Nome do fornecedor"
              />
              <Input
                label="CNPJ (opcional)"
                value={fornecedorForm.cnpj}
                onChange={(e) => setFornecedorForm({ ...fornecedorForm, cnpj: e.target.value })}
              />
              <Input
                label="Telefone (opcional)"
                value={fornecedorForm.telefone}
                onChange={(e) => setFornecedorForm({ ...fornecedorForm, telefone: e.target.value })}
              />
              <Input
                label="E-mail (opcional)"
                value={fornecedorForm.email}
                onChange={(e) => setFornecedorForm({ ...fornecedorForm, email: e.target.value })}
              />
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="secondary" onClick={() => setFornecedorModal(false)}>
                  Cancelar
                </Button>
                <Button onClick={() => void criarFornecedor()} disabled={!fornecedorForm.nome}>
                  Salvar
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
