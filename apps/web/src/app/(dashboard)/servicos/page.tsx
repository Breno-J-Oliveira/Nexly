'use client';
import { useWorkspace } from '@/lib/workspace';

import { hasPermission } from '@nexly/shared';
import { useAuth } from '@/lib/auth';

import { ResponsiveDetailPanel } from '@/components/ui/ResponsiveDetailPanel';
import { MetricGrid } from '@/components/ui/MetricGrid';
import { Icon } from '@/components/ui/Icon';
import { PageToolbar } from '@/components/ui/PageToolbar';
import { Modal } from '@/components/ui/Modal';
import { InsumoModal } from './InsumoModal';

import { useCallback, useEffect, useRef, useState, useMemo } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { api } from '@/lib/api';
import { useApi } from '@/lib/useApi';
import { ErrorState } from '@/components/ui/ErrorState';
import { parseApiError } from '@/lib/errors';
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
  const { profile, enabled } = useWorkspace();
  const { user } = useAuth();
  const podeCriar = hasPermission(user?.role, 'servicos:create');
  const podeEditar = hasPermission(user?.role, 'servicos:update');
  const podeExcluir = hasPermission(user?.role, 'servicos:delete');
  const podeCriarProduto = enabled('/produtos') && hasPermission(user?.role, 'estoque:create');
  const [detalhesAbertos, setDetalhesAbertos] = useState(false);
  const [busca, setBusca] = useState('');
  const {
    data: lista,
    loading: carregando,
    error: erroCarga,
    refetch: carregar,
  } = useApi<Servico[]>('/servicos');
  const servicos = useMemo(() => lista ?? [], [lista]);
  const [selecionadoId, setSelecionadoId] = useState<string | null>(null);
  const selecionado = servicos.find((s) => s.id === selecionadoId) || null;
  const [insumos, setInsumos] = useState<Insumo[]>([]);
  const pedidoInsumos = useRef(0);
  const [carregandoInsumos, setCarregandoInsumos] = useState(false);
  const [erroInsumos, setErroInsumos] = useState(false);

  const [modalInsumoAberto, setModalInsumoAberto] = useState(false);
  const [modalServicoAberto, setModalServicoAberto] = useState(false);
  const [editandoServicoId, setEditandoServicoId] = useState<string | null>(null);
  const [formServico, setFormServico] = useState({ nome: '', duracaoMin: '', preco: '' });

  const [salvandoServico, setSalvandoServico] = useState(false);
  const [erroServico, setErroServico] = useState('');
  const [salvandoInsumo, setSalvandoInsumo] = useState(false);

  const selecionar = useCallback(
    async (s: Servico, abrir = true): Promise<void> => {
      if (abrir) setDetalhesAbertos(true);
      setSelecionadoId(s.id);
      const pedido = ++pedidoInsumos.current;
      if (!podeEditar) {
        setInsumos([]);
        setCarregandoInsumos(false);
        setErroInsumos(false);
        return;
      }
      setInsumos([]);
      setCarregandoInsumos(true);
      setErroInsumos(false);
      try {
        const r = await api.get<Insumo[]>(`/servicos/${s.id}/insumos`);
        if (pedido === pedidoInsumos.current) setInsumos(r.data);
      } catch {
        if (pedido === pedidoInsumos.current) setErroInsumos(true);
      } finally {
        if (pedido === pedidoInsumos.current) setCarregandoInsumos(false);
      }
    },
    [podeEditar],
  );

  useEffect(() => {
    if (!selecionado && servicos[0]) void selecionar(servicos[0], false);
  }, [servicos, selecionado, selecionar]);

  const salvarServico = async (): Promise<void> => {
    if (salvandoServico) return;
    setSalvandoServico(true);
    setErroServico('');
    try {
      const payload = {
        nome: formServico.nome.trim(),
        duracaoMin: Number(formServico.duracaoMin),
        preco: Number(formServico.preco),
      };
      const { data: salvo } = editandoServicoId
        ? await api.put<Servico>(`/servicos/${editandoServicoId}`, payload)
        : await api.post<Servico>('/servicos', payload);

      toastSuccess(editandoServicoId ? 'Serviço atualizado' : 'Serviço cadastrado');
      setModalServicoAberto(false);
      if (!editandoServicoId) setBusca('');
      setFormServico({ nome: '', duracaoMin: '', preco: '' });
      setEditandoServicoId(null);
      await carregar();
      if (!editandoServicoId) void selecionar(salvo);
    } catch (error) {
      setErroServico(parseApiError(error).message);
    } finally {
      setSalvandoServico(false);
    }
  };

  const excluirServico = async (s: Servico): Promise<void> => {
    if (!confirm(`Excluir o serviço "${s.nome}"?`)) return;
    try {
      await api.delete(`/servicos/${s.id}`);
      toastSuccess('Serviço excluído');
      await carregar();
      if (selecionado?.id === s.id) setSelecionadoId(null);
    } catch (e) {
      const err = e as { response?: { data?: { message?: string } } };
      toastError(err?.response?.data?.message || 'Erro ao excluir serviço');
    }
  };

  const remover = async (pid: string): Promise<void> => {
    if (!selecionado || salvandoInsumo) return;
    setSalvandoInsumo(true);
    try {
      await api.delete(`/servicos/${selecionado.id}/insumos/${pid}`);
      await selecionar(selecionado);
    } catch (error) {
      toastError(parseApiError(error).message);
    } finally {
      setSalvandoInsumo(false);
    }
  };

  const servicosFiltrados = servicos.filter((s) =>
    s.nome.toLocaleLowerCase('pt-BR').includes(busca.toLocaleLowerCase('pt-BR')),
  );

  return (
    <div>
      <PageToolbar>
        <div className="page-heading with-search flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-[#FAFAFA]">
              {profile.preferencias?.nomeServico ?? 'Serviços'}
            </h2>
            <p className="mt-1 text-sm text-[#A1A1AA]">
              Cadastre o que você oferece e os materiais usados em cada atendimento.
            </p>
          </div>
          <div className="toolbar-actions flex flex-wrap items-center gap-3">
            <div className="toolbar-search">
              <Input
                aria-label="Buscar serviço"
                placeholder="Buscar..."
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
              />
            </div>
            {podeCriar && (
              <Button
                className="toolbar-primary"
                onClick={() => {
                  setEditandoServicoId(null);
                  setFormServico({ nome: '', duracaoMin: '', preco: '' });
                  setErroServico('');
                  setModalServicoAberto(true);
                }}
              >
                + Novo serviço
              </Button>
            )}
          </div>
        </div>
      </PageToolbar>

      <div className="hidden md:block">
        <MetricGrid
          items={[
            { label: 'Total de Serviços', value: servicos.length },
            {
              label: 'Preço Médio',
              value: new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
                servicos.length
                  ? servicos.reduce((sum, s) => sum + Number(s.preco), 0) / servicos.length
                  : 0,
              ),
            },
            {
              label: 'Duração Média',
              value: `${servicos.length ? Math.round(servicos.reduce((sum, s) => sum + s.duracaoMin, 0) / servicos.length) : 0} min`,
            },
            {
              label: 'Maior preço',
              value: new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
                servicos.reduce((maximo, servico) => Math.max(maximo, Number(servico.preco)), 0),
              ),
              note: 'No catálogo atual',
            },
          ]}
        />
      </div>
      {erroCarga ? (
        <ErrorState message={erroCarga} onRetry={() => void carregar()} />
      ) : carregando ? (
        <p className="mt-8 text-sm text-[#A1A1AA]">Carregando…</p>
      ) : servicos.length === 0 ? (
        <EmptyState
          icon="scissors"
          title="Nenhum serviço cadastrado"
          description="Adicione serviços para usar na agenda e relatórios"
          action={
            podeCriar && (
              <Button
                onClick={() => {
                  setEditandoServicoId(null);
                  setFormServico({ nome: '', duracaoMin: '', preco: '' });
                  setErroServico('');
                  setModalServicoAberto(true);
                }}
              >
                + Novo serviço
              </Button>
            )
          }
        />
      ) : (
        <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_300px]">
          <div className="min-w-0">
            <div className="space-y-3 md:hidden">
              {servicosFiltrados.map((s) => (
                <button
                  key={s.id}
                  onClick={() => void selecionar(s)}
                  className="flex w-full items-center gap-3 rounded-xl border border-white/10 bg-[#111116] p-4 text-left"
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#18181F]">
                    <Icon name="scissors" color="#818CF8" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <strong className="line-clamp-2 break-words text-sm" title={s.nome}>
                      {s.nome}
                    </strong>
                    <span className="mt-1 block text-xs text-[#71717A]">{s.duracaoMin} min</span>
                  </span>
                  <span className="shrink-0 text-sm font-semibold">
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
                      Number(s.preco),
                    )}
                  </span>
                </button>
              ))}
            </div>
            <div className="hidden min-w-0 overflow-x-auto rounded-xl border border-white/10 bg-[#111116] md:block">
              <table className="w-full text-left">
                <thead>
                  <tr>
                    {['Serviço', 'Duração', 'Preço', 'Ações'].map((h) => (
                      <th key={h} className="px-4 py-3">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {servicosFiltrados.map((s) => (
                    <tr key={s.id} className={selecionado?.id === s.id ? 'bg-[#6366F1]/10' : ''}>
                      <td className="px-4 py-4">
                        <button
                          className="text-left font-medium text-[#FAFAFA] hover:text-[#818CF8]"
                          onClick={() => void selecionar(s)}
                        >
                          {s.nome}
                        </button>
                      </td>
                      <td className="whitespace-nowrap px-4 py-4 text-[#A1A1AA]">
                        {s.duracaoMin} min
                      </td>
                      <td className="whitespace-nowrap px-4 py-4">
                        {new Intl.NumberFormat('pt-BR', {
                          style: 'currency',
                          currency: 'BRL',
                        }).format(Number(s.preco))}
                      </td>
                      <td className="px-4 py-4">
                        {podeEditar && (
                          <button
                            className="text-xs text-[#818CF8]"
                            onClick={() => {
                              setEditandoServicoId(s.id);
                              setFormServico({
                                nome: s.nome,
                                duracaoMin: String(s.duracaoMin),
                                preco: String(s.preco),
                              });
                              setErroServico('');
                              setModalServicoAberto(true);
                            }}
                          >
                            Editar
                          </button>
                        )}
                        {podeExcluir && (
                          <button
                            className="ml-3 text-xs text-red-400"
                            onClick={() => void excluirServico(s)}
                          >
                            Excluir
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {servicosFiltrados.length === 0 && (
              <EmptyState
                icon="scissors"
                title="Nenhum serviço encontrado"
                description="Tente outro nome na busca"
              />
            )}
          </div>

          <ResponsiveDetailPanel
            title="Detalhes do Serviço"
            open={detalhesAbertos}
            onClose={() => setDetalhesAbertos(false)}
          >
            {selecionado ? (
              <>
                <p className="mb-5 hidden text-sm font-medium md:block text-[#A1A1AA]">
                  Detalhes do Serviço
                </p>
                <div className="mb-5 flex flex-col items-center gap-3 border-b border-white/10 pb-5 text-center">
                  <span className="flex h-16 w-16 items-center justify-center rounded-full bg-[#6366F1]/10">
                    <Icon name="scissors" color="#818CF8" />
                  </span>
                  <h3 className="font-semibold">{selecionado.nome}</h3>
                  <p className="text-xs text-[#71717A]">{selecionado.duracaoMin} minutos</p>
                </div>
                <p className="mb-4 text-sm text-[#D4D4D8]">
                  Valor:{' '}
                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
                    Number(selecionado.preco),
                  )}
                </p>
                {podeEditar && (
                  <>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h3 className="font-semibold text-[#FAFAFA]">Materiais usados no serviço</h3>
                      <Button
                        onClick={() => {
                          setDetalhesAbertos(false);
                          setModalInsumoAberto(true);
                        }}
                      >
                        Adicionar insumo
                      </Button>
                    </div>
                    <div className="mt-3 space-y-2">
                      {carregandoInsumos && (
                        <p role="status" className="text-sm text-[#A1A1AA]">
                          Carregando insumos…
                        </p>
                      )}
                      {erroInsumos && (
                        <p role="alert" className="text-sm text-red-400">
                          Não foi possível carregar os insumos.{' '}
                          <button
                            className="underline"
                            onClick={() => void selecionar(selecionado)}
                          >
                            Tentar novamente
                          </button>
                        </p>
                      )}
                      {!carregandoInsumos && !erroInsumos && insumos.length === 0 && (
                        <p className="text-sm text-[#A1A1AA]">
                          Adicione os produtos que saem do estoque quando o atendimento é concluído.
                        </p>
                      )}
                      {insumos.map((i) => (
                        <div
                          key={i.produtoId}
                          className="flex items-center justify-between rounded-lg border border-[rgba(255,255,255,0.08)] px-3 py-2"
                        >
                          <span className="text-sm font-medium text-[#FAFAFA]">
                            {i.produto.nome}
                          </span>
                          <div className="flex items-center gap-3">
                            <span className="text-sm text-[#A1A1AA]">{i.quantidade} un.</span>
                            <button
                              disabled={salvandoInsumo}
                              aria-label={`Remover insumo ${i.produto.nome}`}
                              onClick={() => void remover(i.produtoId)}
                              className="text-red-400"
                            >
                              ✕
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </>
            ) : (
              <p className="text-sm text-[#A1A1AA]">
                Selecione um serviço para configurar insumos.
              </p>
            )}
          </ResponsiveDetailPanel>
        </div>
      )}

      {modalInsumoAberto && selecionado && (
        <InsumoModal
          servico={selecionado}
          insumos={insumos}
          podeCriarProduto={podeCriarProduto}
          onClose={() => {
            setModalInsumoAberto(false);
            setDetalhesAbertos(true);
          }}
          onSaved={() => {
            setModalInsumoAberto(false);
            void selecionar(selecionado);
          }}
        />
      )}

      {modalServicoAberto && (
        <Modal
          open
          title={editandoServicoId ? 'Editar serviço' : 'Novo serviço'}
          onClose={() => {
            if (!salvandoServico) setModalServicoAberto(false);
          }}
        >
          <form
            className="mt-4 space-y-3"
            onSubmit={(event) => {
              event.preventDefault();
              void salvarServico();
            }}
          >
            <Input
              label="Nome do serviço"
              required
              minLength={2}
              maxLength={120}
              value={formServico.nome}
              onChange={(e) => setFormServico({ ...formServico, nome: e.target.value })}
              placeholder="Ex: Corte de cabelo"
            />
            <Input
              label="Duração (minutos)"
              required
              min={5}
              max={480}
              step={1}
              type="number"
              value={formServico.duracaoMin}
              onChange={(e) => setFormServico({ ...formServico, duracaoMin: e.target.value })}
              placeholder="60"
            />
            <Input
              label="Valor cobrado (R$)"
              required
              min={0}
              max={99999999.99}
              type="number"
              step="0.01"
              value={formServico.preco}
              onChange={(e) => setFormServico({ ...formServico, preco: e.target.value })}
              placeholder="0,00"
            />
            {erroServico && (
              <p role="alert" className="text-sm text-red-300">
                {erroServico}
              </p>
            )}
            <div className="flex gap-2">
              <Button
                type="button"
                disabled={salvandoServico}
                variant="secondary"
                onClick={() => setModalServicoAberto(false)}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                loading={salvandoServico}
                disabled={!formServico.nome || !formServico.duracaoMin || !formServico.preco}
              >
                {editandoServicoId ? 'Salvar alterações' : 'Cadastrar serviço'}
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
