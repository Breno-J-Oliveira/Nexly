'use client';

import { useCallback, useEffect, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { api } from '@/lib/api';
import { toastSuccess, toastError } from '@/components/ui/Toaster';
import { EmptyState } from '@/components/ui/EmptyState';

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
  const [carregando, setCarregando] = useState(true);

  const [modalInsumoAberto, setModalInsumoAberto] = useState(false);
  const [modalServicoAberto, setModalServicoAberto] = useState(false);
  const [editandoServicoId, setEditandoServicoId] = useState<string | null>(null);
  const [formServico, setFormServico] = useState({ nome: '', duracaoMin: '', preco: '' });

  const [produtoId, setProdutoId] = useState('');
  const [quantidade, setQuantidade] = useState('');
  const [buscaProduto, setBuscaProduto] = useState('');

  const carregar = useCallback(async () => {
    setCarregando(true);
    try {
      const [s, p] = await Promise.all([
        api.get<Servico[]>('/servicos'),
        api.get<{ data: Produto[] }>('/produtos', { params: { limit: 100 } }),
      ]);
      setServicos(s.data);
      setProdutos(p.data.data);
    } catch {
      toastError('Erro ao carregar dados');
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  const selecionar = async (s: Servico): Promise<void> => {
    setSelecionado(s);
    const r = await api.get<Insumo[]>(`/servicos/${s.id}/insumos`);
    setInsumos(r.data);
  };

  const salvarServico = async (): Promise<void> => {
    if (!formServico.nome || !formServico.duracaoMin || !formServico.preco) return;
    const payload = {
      nome: formServico.nome,
      duracaoMin: Number(formServico.duracaoMin),
      preco: Number(formServico.preco),
    };
    if (editandoServicoId) {
      await api.put(`/servicos/${editandoServicoId}`, payload);
      toastSuccess('Serviço atualizado');
    } else {
      await api.post('/servicos', payload);
      toastSuccess('Serviço criado');
    }
    setModalServicoAberto(false);
    setFormServico({ nome: '', duracaoMin: '', preco: '' });
    setEditandoServicoId(null);
    await carregar();
  };

  const excluirServico = async (s: Servico): Promise<void> => {
    if (!confirm(`Excluir o serviço "${s.nome}"?`)) return;
    try {
      await api.delete(`/servicos/${s.id}`);
      toastSuccess('Serviço excluído');
      if (selecionado?.id === s.id) setSelecionado(null);
      await carregar();
    } catch (e: any) {
      toastError(e?.response?.data?.message || 'Erro ao excluir serviço');
    }
  };

  const associar = async (): Promise<void> => {
    if (!selecionado || !produtoId || !quantidade) return;
    await api.post(`/servicos/${selecionado.id}/insumos`, {
      produtoId,
      quantidade: Number(quantidade),
    });
    toastSuccess('Insumo associado');
    setModalInsumoAberto(false);
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
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-[#FAFAFA]">Serviços</h2>
          <p className="mt-1 text-sm text-[#A1A1AA]">Cadastre serviços e configure insumos</p>
        </div>
        <Button onClick={() => { setEditandoServicoId(null); setFormServico({ nome: '', duracaoMin: '', preco: '' }); setModalServicoAberto(true); }}>+ Novo serviço</Button>
      </div>

      {carregando ? (
        <p className="mt-8 text-sm text-[#A1A1AA]">Carregando…</p>
      ) : servicos.length === 0 ? (
        <EmptyState
          icon="scissors"
          title="Nenhum serviço cadastrado"
          description="Adicione serviços para usar na agenda e relatórios"
          action={<Button onClick={() => { setEditandoServicoId(null); setFormServico({ nome: '', duracaoMin: '', preco: '' }); setModalServicoAberto(true); }}>+ Novo serviço</Button>}
        />
      ) : (
        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="space-y-2">
            {servicos.map((s) => (
              <div key={s.id} className="group">
                <button
                  onClick={() => void selecionar(s)}
                  className={`w-full rounded-lg border p-4 text-left ${
                    selecionado?.id === s.id
                      ? 'border-[#6366F1] bg-[rgba(99,102,241,0.10)]'
                      : 'border-[rgba(255,255,255,0.08)] bg-[#111116] hover:border-[rgba(255,255,255,0.10)]'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <p className="font-medium text-[#FAFAFA]">{s.nome}</p>
                    <div className="flex items-center gap-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100">
                      <button
                        onClick={(e) => { e.stopPropagation(); setEditandoServicoId(s.id); setFormServico({ nome: s.nome, duracaoMin: String(s.duracaoMin), preco: String(s.preco) }); setModalServicoAberto(true); }}
                        className="text-[13px] text-[#818CF8] hover:underline"
                      >
                        Editar
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); void excluirServico(s); }}
                        className="text-[13px] text-red-400 hover:underline"
                      >
                        Excluir
                      </button>
                    </div>
                  </div>
                  <p className="text-sm text-[#A1A1AA]">
                    {s.duracaoMin} min · {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(s.preco))}
                  </p>
                </button>
              </div>
            ))}
          </div>

        <div className="rounded-xl border border-[rgba(255,255,255,0.08)] bg-[#111116] p-5">
          {selecionado ? (
            <>
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-[#FAFAFA]">Insumos — {selecionado.nome}</h3>
                <Button onClick={() => setModalInsumoAberto(true)}>+ Insumo</Button>
              </div>
              <div className="mt-3 space-y-2">
                {insumos.length === 0 && (
                  <p className="text-sm text-[#A1A1AA]">Nenhum insumo configurado.</p>
                )}
                {insumos.map((i) => (
                  <div
                    key={i.produtoId}
                    className="flex items-center justify-between rounded-lg border border-[rgba(255,255,255,0.08)] px-3 py-2"
                  >
                    <span className="text-sm font-medium text-[#FAFAFA]">{i.produto.nome}</span>
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-[#A1A1AA]">{i.quantidade} un.</span>
                      <button onClick={() => void remover(i.produtoId)} className="text-red-400">
                        ✕
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <p className="text-sm text-[#A1A1AA]">Selecione um serviço para configurar insumos.</p>
          )}
        </div>
      </div>
      )}

      {modalInsumoAberto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-md rounded-2xl border border-[rgba(255,255,255,0.08)] bg-[#111116] p-6">
            <h3 className="font-semibold text-[#FAFAFA]">Adicionar insumo</h3>
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
                        ? 'bg-[rgba(99,102,241,0.10)] text-[#A5B4FC]'
                        : 'text-[#E4E4E7] hover:bg-[#18181F]'
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
                <Button variant="secondary" onClick={() => setModalInsumoAberto(false)}>
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

      {modalServicoAberto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-md rounded-2xl border border-[rgba(255,255,255,0.08)] bg-[#111116] p-6">
            <h3 className="font-semibold text-[#FAFAFA]">
              {editandoServicoId ? 'Editar serviço' : 'Novo serviço'}
            </h3>
            <div className="mt-4 space-y-3">
              <Input
                label="Nome"
                value={formServico.nome}
                onChange={(e) => setFormServico({ ...formServico, nome: e.target.value })}
                placeholder="Ex: Corte de cabelo"
              />
              <Input
                label="Duração (minutos)"
                type="number"
                value={formServico.duracaoMin}
                onChange={(e) => setFormServico({ ...formServico, duracaoMin: e.target.value })}
                placeholder="60"
              />
              <Input
                label="Preço (R$)"
                type="number"
                step="0.01"
                value={formServico.preco}
                onChange={(e) => setFormServico({ ...formServico, preco: e.target.value })}
                placeholder="0,00"
              />
              <div className="flex gap-2">
                <Button variant="secondary" onClick={() => setModalServicoAberto(false)}>
                  Cancelar
                </Button>
                <Button
                  onClick={() => void salvarServico()}
                  disabled={!formServico.nome || !formServico.duracaoMin || !formServico.preco}
                >
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
