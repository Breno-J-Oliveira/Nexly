'use client';

import { MetricGrid } from '@/components/ui/MetricGrid';
import { Icon } from '@/components/ui/Icon';
import { PageToolbar } from '@/components/ui/PageToolbar';

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
  const [busca, setBusca] = useState('');
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

  const selecionar = useCallback(async (s: Servico): Promise<void> => {
    setSelecionado(s);
    const r = await api.get<Insumo[]>(`/servicos/${s.id}/insumos`);
    setInsumos(r.data);
  }, []);

  useEffect(() => { if (!selecionado && servicos[0]) void selecionar(servicos[0]); }, [servicos, selecionado, selecionar]);

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
    } catch (e) {
      const err = e as { response?: { data?: { message?: string } } };
      toastError(err?.response?.data?.message || 'Erro ao excluir serviço');
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
      <PageToolbar><div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-[#FAFAFA]">Serviços</h2>
          <p className="mt-1 text-sm text-[#A1A1AA]">Cadastre serviços e configure insumos</p>
        </div>
        <div className="flex flex-wrap items-center gap-3"><Input aria-label="Buscar serviço" placeholder="Buscar..." value={busca} onChange={e => setBusca(e.target.value)} /><Button onClick={() => { setEditandoServicoId(null); setFormServico({ nome: '', duracaoMin: '', preco: '' }); setModalServicoAberto(true); }}>+ Novo serviço</Button></div>
      </div></PageToolbar>

      <div className="hidden md:block"><MetricGrid items={[
        { label: 'Total de Serviços', value: servicos.length },
        { label: 'Preço Médio', value: new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(servicos.length ? servicos.reduce((sum, s) => sum + Number(s.preco), 0) / servicos.length : 0) },
        { label: 'Duração Média', value: `${servicos.length ? Math.round(servicos.reduce((sum, s) => sum + s.duracaoMin, 0) / servicos.length) : 0} min` },
        { label: 'Produtos Disponíveis', value: produtos.length, note: 'Para associar aos serviços' },
      ]} /></div>
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
        <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_300px]">
          <div className="min-w-0">
          <div className="space-y-3 md:hidden">{servicos.filter(s => s.nome.toLowerCase().includes(busca.toLowerCase())).map(s => <button key={s.id} onClick={() => void selecionar(s)} className="flex w-full items-center gap-3 rounded-xl border border-white/10 bg-[#111116] p-4 text-left"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#18181F]"><Icon name="scissors" color="#818CF8" /></span><span className="min-w-0 flex-1"><strong className="block text-sm">{s.nome}</strong><span className="mt-1 block text-xs text-[#71717A]">{s.duracaoMin} min</span></span><span className="shrink-0 text-sm font-semibold">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(s.preco))}</span></button>)}</div>
          <div className="hidden min-w-0 overflow-x-auto rounded-xl border border-white/10 bg-[#111116] md:block">
            <table className="w-full text-left">
              <thead><tr>{['Serviço', 'Duração', 'Preço', 'Ações'].map(h => <th key={h} className="px-4 py-3">{h}</th>)}</tr></thead>
              <tbody>{servicos.filter(s => s.nome.toLocaleLowerCase('pt-BR').includes(busca.toLocaleLowerCase('pt-BR'))).map(s => <tr key={s.id} className={selecionado?.id === s.id ? 'bg-[#6366F1]/10' : ''}>
                <td className="px-4 py-4"><button className="text-left font-medium text-[#FAFAFA] hover:text-[#818CF8]" onClick={() => void selecionar(s)}>{s.nome}</button></td>
                <td className="whitespace-nowrap px-4 py-4 text-[#A1A1AA]">{s.duracaoMin} min</td>
                <td className="whitespace-nowrap px-4 py-4">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(s.preco))}</td>
                <td className="px-4 py-4"><button className="text-xs text-[#818CF8]" onClick={() => { setEditandoServicoId(s.id); setFormServico({ nome: s.nome, duracaoMin: String(s.duracaoMin), preco: String(s.preco) }); setModalServicoAberto(true); }}>Editar</button><button className="ml-3 text-xs text-red-400" onClick={() => void excluirServico(s)}>Excluir</button></td>
              </tr>)}</tbody>
            </table>
          </div>
          </div>

        <div className="rounded-xl border border-[rgba(255,255,255,0.08)] bg-[#111116] p-5">
          {selecionado ? (
            <>
              <p className="mb-5 text-sm font-medium text-[#A1A1AA]">Detalhes do Serviço</p>
              <div className="mb-5 flex flex-col items-center gap-3 border-b border-white/10 pb-5 text-center"><span className="flex h-16 w-16 items-center justify-center rounded-full bg-[#6366F1]/10"><Icon name="scissors" color="#818CF8" /></span><h3 className="font-semibold">{selecionado.nome}</h3><p className="text-xs text-[#71717A]">{selecionado.duracaoMin} minutos</p></div>
              <div className="flex flex-wrap items-center justify-between gap-2">
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
