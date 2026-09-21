'use client';

import { StatusAgendamento } from '@nexly/shared';
import { Suspense, useCallback, useEffect, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { api } from '@/lib/api';
import { toastSuccess } from '@/components/ui/Toaster';
import { AgendamentoModal } from './AgendamentoModal';
import { EmptyState } from '@/components/ui/EmptyState';
import { Icon } from '@/components/ui/Icon';
import { AgendaSemana } from './AgendaSemana';

interface Agendamento {
  id: string;
  dataHora: string;
  status: StatusAgendamento;
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

function dataISO(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export default function AgendaPage() {
  return (
    <Suspense fallback={<p className="text-sm text-[#A1A1AA]">Carregando...</p>}>
      <AgendaContent />
    </Suspense>
  );
}

function AgendaContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [data, setData] = useState<Date>(new Date());
  const [view, setView] = useState<'lista' | 'semana'>('lista');
  const [agendamentos, setAgendamentos] = useState<Agendamento[]>([]);
  const [profissionais, setProfissionais] = useState<Profissional[]>([]);
  const [modalAberto, setModalAberto] = useState(false);
  const [carregando, setCarregando] = useState(true);

  const profissionalId = searchParams.get('profissionalId') ?? '';
  const statusParam = searchParams.get('status');
  const status = STATUS_CHIPS.some((c) => c.value === statusParam)
    ? (statusParam as StatusAgendamento)
    : null;

  useEffect(() => {
    api
      .get<Profissional[]>('/profissionais')
      .then((r) => setProfissionais(r.data))
      .catch(() => undefined);
  }, []);

  const atualizarFiltro = (patch: {
    profissionalId?: string;
    status?: StatusAgendamento | '';
  }): void => {
    const params = new URLSearchParams(searchParams.toString());
    if (patch.profissionalId !== undefined) {
      if (patch.profissionalId) params.set('profissionalId', patch.profissionalId);
      else params.delete('profissionalId');
    }
    if (patch.status !== undefined) {
      if (patch.status) params.set('status', patch.status);
      else params.delete('status');
    }
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname);
  };

  const carregar = useCallback(async () => {
    setCarregando(true);
    try {
      const res = await api.get<{ data: Agendamento[] }>('/agendamentos', {
        params: {
          data: dataISO(data),
          limit: 100,
          ...(profissionalId ? { profissionalId } : {}),
          ...(status ? { status } : {}),
        },
      });
      setAgendamentos(res.data.data);
    } finally {
      setCarregando(false);
    }
  }, [data, profissionalId, status]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  const mudarStatus = async (id: string, status: StatusAgendamento): Promise<void> => {
    await api.patch(`/agendamentos/${id}/status`, { status });
    toastSuccess(status === 'CONCLUIDO' ? 'Serviço concluído!' : status === 'CANCELADO' ? 'Agendamento cancelado' : 'Status atualizado!');
    await carregar();
  };

  const mudarDia = (delta: number): void => {
    const novo = new Date(data);
    novo.setDate(novo.getDate() + delta);
    setData(novo);
  };

  const profissionalNome = profissionais.find((p) => p.id === profissionalId)?.nome;
  const statusLabel = STATUS_CHIPS.find((c) => c.value === status)?.label;

  return (
    <div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-[#FAFAFA]">Agenda</h2>
          <p className="mt-1 text-sm text-[#A1A1AA]">
            {data.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
            {' · '}
            {agendamentos.length}{' '}
            {agendamentos.length === 1 ? 'agendamento' : 'agendamentos'}
            {profissionalNome ? ` · filtrado por ${profissionalNome}` : ''}
            {statusLabel ? ` · ${statusLabel}` : ''}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border border-[rgba(255,255,255,0.08)] bg-[#0C0C10] p-1">
            <button
              type="button"
              onClick={() => setView('lista')}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[13px] font-medium transition-colors ${view === 'lista' ? 'bg-[#6366F1] text-[#FAFAFA]' : 'text-[#A1A1AA] hover:text-[#FAFAFA]'}`}
            >
              <Icon name="list" size="xs" /> Lista
            </button>
            <button
              type="button"
              onClick={() => setView('semana')}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[13px] font-medium transition-colors ${view === 'semana' ? 'bg-[#6366F1] text-[#FAFAFA]' : 'text-[#A1A1AA] hover:text-[#FAFAFA]'}`}
            >
              <Icon name="table-cells" size="xs" /> Semana
            </button>
          </div>
          <Button onClick={() => setModalAberto(true)}>+ Novo agendamento</Button>
        </div>
      </div>

      {/* Filtros */}
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <select
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

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => atualizarFiltro({ status: '' })}
            className="rounded-full border px-3 py-1.5 text-[13px] font-medium transition-colors"
            style={
              status === null
                ? { backgroundColor: 'rgba(99,102,241,0.12)', color: '#A5B4FC', borderColor: 'rgba(99,102,241,0.4)' }
                : { backgroundColor: '#111116', color: '#A1A1AA', borderColor: 'rgba(255,255,255,0.10)' }
            }
          >
            Todos
          </button>
          {STATUS_CHIPS.map((chip) => (
            <button
              key={chip.value}
              type="button"
              onClick={() => atualizarFiltro({ status: chip.value })}
              className="rounded-full border px-3 py-1.5 text-[13px] font-medium transition-colors"
              style={
                status === chip.value
                  ? { backgroundColor: 'rgba(99,102,241,0.12)', color: '#A5B4FC', borderColor: 'rgba(99,102,241,0.4)' }
                  : { backgroundColor: '#111116', color: '#A1A1AA', borderColor: 'rgba(255,255,255,0.10)' }
              }
            >
              {chip.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-4 flex items-center gap-2">
        <Button variant="secondary" onClick={() => view === 'lista' ? mudarDia(-1) : setData(d => new Date(d.getFullYear(), d.getMonth(), d.getDate() - 7))}>
          <Icon name="chevron-left" size="xs" />
        </Button>
        <Button variant="secondary" onClick={() => setData(new Date())}>
          Hoje
        </Button>
        <Button variant="secondary" onClick={() => view === 'lista' ? mudarDia(1) : setData(d => new Date(d.getFullYear(), d.getMonth(), d.getDate() + 7))}>
          <Icon name="chevron-right" size="xs" />
        </Button>
      </div>

      {view === 'semana' ? (
        <div className="mt-6">
          <AgendaSemana dataInicio={data} onConcluir={() => void carregar()} />
        </div>
      ) : (
        <div className="mt-6 space-y-3">
          {carregando && <p className="text-sm text-[#A1A1AA]">Carregando...</p>}
          {!carregando && agendamentos.length === 0 && (
            <EmptyState
              icon="calendar-xmark"
              title="Nenhum agendamento para este dia"
              description="Crie o primeiro agendamento para comecar a atender"
              action={<Button onClick={() => setModalAberto(true)}>+ Novo agendamento</Button>}
            />
          )}
          {agendamentos.map((a) => (
            <div
              key={a.id}
              className="group flex items-center justify-between rounded-xl border border-[rgba(255,255,255,0.08)] bg-[#111116] p-4 transition-colors hover:border-[rgba(99,102,241,0.30)]"
            >
              <div className="flex items-center gap-4">
                <span className="text-lg font-semibold text-[#FAFAFA]">
                  {formatarHora(a.dataHora)}
                </span>
                <div>
                  <p className="font-medium text-[#FAFAFA]">{a.cliente.nome}</p>
                  <p className="text-sm text-[#A1A1AA]">
                    {a.servico.nome} · {a.profissional.nome}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Badge color={a.status}>{a.status}</Badge>
                {a.status === 'CONFIRMADO' && (
                  <Button
                    onClick={() => { void mudarStatus(a.id, 'CONCLUIDO'); }}
                    className="flex items-center gap-1.5 opacity-0 transition-opacity group-hover:opacity-100"
                  >
                    <Icon name="check" size="xs" /> Concluir
                  </Button>
                )}
                {a.status === 'AGENDADO' && (
                  <Button variant="secondary" onClick={() => { void mudarStatus(a.id, 'CONFIRMADO'); }}>
                    Confirmar
                  </Button>
                )}
                {(a.status === 'AGENDADO' || a.status === 'CONFIRMADO') && (
                  <Button variant="ghost" onClick={() => { void mudarStatus(a.id, 'CANCELADO'); }}>
                    Cancelar
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {modalAberto && (
        <AgendamentoModal
          onClose={() => setModalAberto(false)}
          onSuccess={() => {
            setModalAberto(false);
            void carregar();
          }}
        />
      )}
    </div>
  );
}
