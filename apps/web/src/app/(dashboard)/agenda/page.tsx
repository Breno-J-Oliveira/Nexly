'use client';

import { PageToolbar } from '@/components/ui/PageToolbar';

import { StatusAgendamento, type PendenciaEstoque } from '@nexly/shared';
import { Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { api } from '@/lib/api';
import { isCancel } from 'axios';
import { useAuth } from '@/lib/auth';
import { limitesCalendario, inicioDaSemana } from '@/lib/calendar';
import { Modal } from '@/components/ui/Modal';
import { toast, toastSuccess } from '@/components/ui/Toaster';
import { AgendamentoModal } from './AgendamentoModal';
import { EmptyState } from '@/components/ui/EmptyState';
import { Icon } from '@/components/ui/Icon';
import { AgendaSemana } from './AgendaSemana';

interface Agendamento {
  id: string;
  dataHora: string;
  status: StatusAgendamento;
  pendenciasEstoque?: PendenciaEstoque[];
  cliente: { nome: string };
  profissional: { nome: string };
  servico: { nome: string; preco: number };
}

interface Profissional {
  id: string;
  nome: string;
}

const STATUS_CHIPS: { value: StatusAgendamento; label: string }[] = [
  { value: StatusAgendamento.AGENDADO, label: 'Agendado' },
  { value: StatusAgendamento.CONFIRMADO, label: 'Confirmado' },
  { value: StatusAgendamento.CONCLUIDO, label: 'Concluído' },
  { value: StatusAgendamento.CANCELADO, label: 'Cancelado' },
];

function formatarHora(iso: string): string {
  return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

export default function AgendaPage() {
  return (
    <Suspense fallback={<p className="text-sm text-[#A1A1AA]">Carregando...</p>}>
      <AgendaContent />
    </Suspense>
  );
}

function AgendaContent() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (window.matchMedia('(max-width: 767px)').matches) setView('lista');
  }, []);
  const [data, setData] = useState<Date>(new Date());
  const [view, setView] = useState<'lista' | 'semana'>('semana');
  const [agendamentos, setAgendamentos] = useState<Agendamento[]>([]);
  const [profissionais, setProfissionais] = useState<Profissional[]>([]);
  const [modalAberto, setModalAberto] = useState(false);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');
  const [alterando, setAlterando] = useState<string | null>(null);
  const [cancelando, setCancelando] = useState<Agendamento | null>(null);
  const [painelInline, setPainelInline] = useState(false);
  const request = useRef<AbortController | null>(null);
  const { user } = useAuth();
  const podeEditar = ['ADMIN', 'GESTOR', 'RECEPCIONISTA'].includes(user?.role || '');
  useEffect(() => {
    const media = window.matchMedia('(min-width: 1280px)');
    const atualizar = () => setPainelInline(media.matches);
    atualizar();
    media.addEventListener('change', atualizar);
    return () => media.removeEventListener('change', atualizar);
  }, []);

  const profissionalId = searchParams.get('profissionalId') ?? '';
  const statusParam = searchParams.get('status');
  const status = STATUS_CHIPS.some((c) => c.value === statusParam)
    ? (statusParam as StatusAgendamento)
    : null;

  useEffect(() => {
    if (user?.role === 'PROFISSIONAL') return;
    api
      .get<Profissional[]>('/profissionais')
      .then((r) => setProfissionais(r.data))
      .catch(() => undefined);
  }, [user?.role]);

  const atualizarFiltro = (patch: {
    profissionalId?: string;
    status?: StatusAgendamento | '';
  }): void => {
    // A URL muda sincronamente, mesmo com duas alterações antes do próximo render.
    const params = new URLSearchParams(window.location.search);
    if (patch.profissionalId !== undefined) {
      if (patch.profissionalId) params.set('profissionalId', patch.profissionalId);
      else params.delete('profissionalId');
    }
    if (patch.status !== undefined) {
      if (patch.status) params.set('status', patch.status);
      else params.delete('status');
    }
    const query = params.toString();
    window.history.replaceState(
      null,
      '',
      (query ? `${pathname}?${query}` : pathname) + window.location.hash,
    );
  };

  const carregar = useCallback(async () => {
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    setCarregando(true);
    setErro('');
    setAgendamentos([]);
    try {
      const itens: Agendamento[] = [];
      let pagina = 1;
      let total = 0;
      do {
        const res = await api.get<{ data: Agendamento[]; total: number }>('/agendamentos', {
          signal: controller.signal,
          params: {
            ...limitesCalendario(data),
            limit: 500,
            page: pagina,
            ...(profissionalId ? { profissionalId } : {}),
            ...(status ? { status } : {}),
          },
        });
        itens.push(...res.data.data);
        total = res.data.total;
        pagina++;
        if (!res.data.data.length) break;
      } while (itens.length < total);
      if (!controller.signal.aborted) setAgendamentos(itens);
    } catch (error) {
      if (!isCancel(error)) setErro('Não foi possível carregar a agenda. Tente novamente.');
    } finally {
      if (!controller.signal.aborted) setCarregando(false);
    }
  }, [data, profissionalId, status]);

  useEffect(() => {
    void carregar();
    return () => request.current?.abort();
  }, [carregar]);

  const mudarStatus = async (id: string, status: StatusAgendamento): Promise<void> => {
    if (alterando) return;
    setAlterando(id);
    setErro('');
    try {
      const { data: atualizado } = await api.patch<Agendamento>(`/agendamentos/${id}/status`, {
        status,
      });
      if (status === 'CONCLUIDO' && atualizado.pendenciasEstoque?.length)
        toast.warning('Atendimento concluído. Há baixas de estoque pendentes para regularizar.');
      else
        toastSuccess(
          status === 'CONCLUIDO'
            ? 'Serviço concluído!'
            : status === 'CANCELADO'
              ? 'Agendamento cancelado'
              : 'Status atualizado!',
        );
      setCancelando(null);
      await carregar();
    } catch (error) {
      const response = error as { response?: { data?: { message?: string } } };
      setErro(
        response.response?.data?.message ??
          'Não foi possível alterar o agendamento. Tente novamente.',
      );
    } finally {
      setAlterando(null);
    }
  };

  const mudarDia = (delta: number): void => {
    const novo = new Date(data);
    novo.setDate(novo.getDate() + delta);
    setData(novo);
  };

  const primeiroDia = inicioDaSemana(data);
  const ultimoDia = new Date(primeiroDia);
  ultimoDia.setDate(ultimoDia.getDate() + 6);
  const profissionalNome = profissionais.find((p) => p.id === profissionalId)?.nome;
  const statusLabel = STATUS_CHIPS.find((c) => c.value === status)?.label;

  return (
    <div>
      <PageToolbar>
        <div className="page-heading agenda-heading flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-[#FAFAFA]">Agenda</h2>
            <p className="mt-1 text-sm text-[#A1A1AA]">
              {view === 'lista'
                ? data.toLocaleDateString('pt-BR', {
                    weekday: 'long',
                    day: 'numeric',
                    month: 'long',
                  })
                : `${primeiroDia.toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' })} – ${ultimoDia.toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' })}`}
              {' · '}
              {view === 'lista'
                ? `${agendamentos.length} ${agendamentos.length === 1 ? 'agendamento' : 'agendamentos'}`
                : 'Visão semanal'}
              {profissionalNome ? ` · filtrado por ${profissionalNome}` : ''}
              {statusLabel ? ` · ${statusLabel}` : ''}
            </p>
          </div>
          <div className="toolbar-actions flex flex-wrap items-center gap-2">
            <div className="toolbar-secondary flex rounded-lg border border-[rgba(255,255,255,0.08)] bg-[#0C0C10] p-1">
              <button
                type="button"
                aria-pressed={view === 'lista'}
                onClick={() => setView('lista')}
                className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[13px] font-medium transition-colors ${view === 'lista' ? 'bg-[#6366F1] text-[#FAFAFA]' : 'text-[#A1A1AA] hover:text-[#FAFAFA]'}`}
              >
                <Icon name="list" size="xs" /> Lista
              </button>
              <button
                type="button"
                aria-pressed={view === 'semana'}
                onClick={() => setView('semana')}
                className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[13px] font-medium transition-colors ${view === 'semana' ? 'bg-[#6366F1] text-[#FAFAFA]' : 'text-[#A1A1AA] hover:text-[#FAFAFA]'}`}
              >
                <Icon name="table-cells" size="xs" /> Semana
              </button>
            </div>
            {podeEditar && (
              <Button className="toolbar-primary" onClick={() => setModalAberto(true)}>
                + Novo agendamento
              </Button>
            )}
          </div>
        </div>
      </PageToolbar>

      {/* Filtros */}
      <div className="mt-4 flex flex-wrap items-center gap-3">
        {user?.role !== 'PROFISSIONAL' && (
          <select
            aria-label="Filtrar por profissional"
            value={profissionalId}
            onChange={(e) => atualizarFiltro({ profissionalId: e.target.value })}
            className="rounded-lg border border-[rgba(255,255,255,0.10)] bg-[#111116] px-3 py-2 text-sm text-[#FAFAFA] outline-none focus:ring-2 focus:ring-[#6366F1]/30"
          >
            <option value="">Todos os profissionais</option>
            {profissionais.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nome}
              </option>
            ))}
          </select>
        )}

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            aria-pressed={status === null}
            onClick={() => atualizarFiltro({ status: '' })}
            className="rounded-full border px-3 py-1.5 text-[13px] font-medium transition-colors"
            style={
              status === null
                ? {
                    backgroundColor: 'rgba(99,102,241,0.12)',
                    color: '#A5B4FC',
                    borderColor: 'rgba(99,102,241,0.4)',
                  }
                : {
                    backgroundColor: '#111116',
                    color: '#A1A1AA',
                    borderColor: 'rgba(255,255,255,0.10)',
                  }
            }
          >
            Todos
          </button>
          {STATUS_CHIPS.map((chip) => (
            <button
              key={chip.value}
              type="button"
              aria-pressed={status === chip.value}
              onClick={() => atualizarFiltro({ status: chip.value })}
              className="rounded-full border px-3 py-1.5 text-[13px] font-medium transition-colors"
              style={
                status === chip.value
                  ? {
                      backgroundColor: 'rgba(99,102,241,0.12)',
                      color: '#A5B4FC',
                      borderColor: 'rgba(99,102,241,0.4)',
                    }
                  : {
                      backgroundColor: '#111116',
                      color: '#A1A1AA',
                      borderColor: 'rgba(255,255,255,0.10)',
                    }
              }
            >
              {chip.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-4 flex items-center gap-2">
        <Button
          variant="secondary"
          aria-label={view === 'lista' ? 'Dia anterior' : 'Semana anterior'}
          onClick={() =>
            view === 'lista'
              ? mudarDia(-1)
              : setData((d) => new Date(d.getFullYear(), d.getMonth(), d.getDate() - 7))
          }
        >
          <Icon name="chevron-left" size="xs" />
        </Button>
        <Button variant="secondary" onClick={() => setData(new Date())}>
          Hoje
        </Button>
        <Button
          variant="secondary"
          aria-label={view === 'lista' ? 'Próximo dia' : 'Próxima semana'}
          onClick={() =>
            view === 'lista'
              ? mudarDia(1)
              : setData((d) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + 7))
          }
        >
          <Icon name="chevron-right" size="xs" />
        </Button>
      </div>

      {erro && (
        <div
          role="alert"
          className="mt-4 flex flex-wrap items-center gap-2 rounded-xl border border-red-400/30 p-4 text-sm text-red-200"
        >
          {erro}
          <Button variant="ghost" onClick={() => void carregar()}>
            Tentar novamente
          </Button>
        </div>
      )}
      <div className="flex min-w-0 flex-col gap-6 xl:flex-row">
        <div className="min-w-0 flex-1">
          {view === 'semana' ? (
            <div className="mt-6">
              <AgendaSemana
                dataInicio={data}
                profissionalId={profissionalId}
                status={status ?? undefined}
                onConcluir={() => void carregar()}
              />
            </div>
          ) : (
            <div className="mt-6 space-y-3">
              {carregando && <p className="text-sm text-[#A1A1AA]">Carregando...</p>}
              {!carregando && !erro && agendamentos.length === 0 && (
                <EmptyState
                  icon="calendar-xmark"
                  title="Nenhum agendamento para este dia"
                  description="Crie o primeiro agendamento para comecar a atender"
                  action={
                    podeEditar ? (
                      <Button onClick={() => setModalAberto(true)}>+ Novo agendamento</Button>
                    ) : undefined
                  }
                />
              )}
              {agendamentos.map((a) => (
                <div
                  key={a.id}
                  className="group flex flex-wrap items-center justify-between gap-4 rounded-xl border border-[rgba(255,255,255,0.08)] bg-[#111116] p-4 transition-colors hover:border-[rgba(99,102,241,0.30)]"
                >
                  <div className="flex min-w-0 items-center gap-4">
                    <span className="text-lg font-semibold text-[#FAFAFA]">
                      {formatarHora(a.dataHora)}
                    </span>
                    <div className="min-w-0 break-words">
                      <p className="font-medium text-[#FAFAFA]">{a.cliente.nome}</p>
                      <p className="text-sm text-[#A1A1AA]">
                        {a.servico.nome} · {a.profissional.nome}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    <Badge color={a.status}>{a.status}</Badge>
                    {!!a.pendenciasEstoque?.length && (
                      <span className="rounded-full bg-amber-500/10 px-3 py-1 text-xs font-medium text-amber-200">
                        Baixa de estoque pendente
                      </span>
                    )}
                    {podeEditar && a.status === 'CONFIRMADO' && (
                      <Button
                        disabled={alterando !== null}
                        loading={alterando === a.id}
                        onClick={() => {
                          void mudarStatus(a.id, 'CONCLUIDO');
                        }}
                        className="flex items-center gap-1.5 opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100"
                      >
                        <Icon name="check" size="xs" /> Concluir
                      </Button>
                    )}
                    {podeEditar && a.status === 'AGENDADO' && (
                      <Button
                        variant="secondary"
                        disabled={alterando !== null}
                        loading={alterando === a.id}
                        onClick={() => {
                          void mudarStatus(a.id, 'CONFIRMADO');
                        }}
                      >
                        Confirmar
                      </Button>
                    )}
                    {podeEditar && (a.status === 'AGENDADO' || a.status === 'CONFIRMADO') && (
                      <Button
                        variant="ghost"
                        disabled={alterando !== null}
                        onClick={() => setCancelando(a)}
                      >
                        Cancelar
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        {modalAberto && (
          <AgendamentoModal
            inline={painelInline}
            onClose={() => setModalAberto(false)}
            onSuccess={(horario) => {
              setModalAberto(false);
              if (horario) setData(new Date(horario));
              else void carregar();
            }}
          />
        )}
      </div>
      <Modal
        open={cancelando !== null}
        onClose={() => {
          if (!alterando) setCancelando(null);
        }}
        title="Cancelar agendamento"
      >
        <p className="text-sm text-[#D4D4D8]">
          Cancelar o atendimento de {cancelando?.cliente.nome}? O horário será liberado. O registro
          ficará no histórico.
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <Button
            variant="secondary"
            disabled={alterando !== null}
            onClick={() => setCancelando(null)}
          >
            Manter agendamento
          </Button>
          <Button
            variant="danger"
            loading={alterando !== null}
            onClick={() => {
              if (cancelando) void mudarStatus(cancelando.id, StatusAgendamento.CANCELADO);
            }}
          >
            Confirmar cancelamento
          </Button>
        </div>
      </Modal>
    </div>
  );
}
