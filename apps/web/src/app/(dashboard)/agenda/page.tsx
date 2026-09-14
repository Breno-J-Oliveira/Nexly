'use client';

import { StatusAgendamento } from '@nexly/shared';
import { useCallback, useEffect, useState } from 'react';
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
  const [data, setData] = useState<Date>(new Date());
  const [view, setView] = useState<'lista' | 'semana'>('lista');
  const [agendamentos, setAgendamentos] = useState<Agendamento[]>([]);
  const [modalAberto, setModalAberto] = useState(false);
  const [carregando, setCarregando] = useState(true);

  const carregar = useCallback(async () => {
    setCarregando(true);
    try {
      const res = await api.get<{ data: Agendamento[] }>('/agendamentos', {
        params: { data: dataISO(data), limit: 100 },
      });
      setAgendamentos(res.data.data);
    } finally {
      setCarregando(false);
    }
  }, [data]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  const mudarStatus = async (id: string, status: StatusAgendamento): Promise<void> => {
    await api.patch(`/agendamentos/${id}/status`, { status });
    toastSuccess(status === 'CONCLUIDO' ? 'Servico concluido!' : status === 'CANCELADO' ? 'Agendamento cancelado' : 'Status atualizado!');
    await carregar();
  };

  const mudarDia = (delta: number): void => {
    const novo = new Date(data);
    novo.setDate(novo.getDate() + delta);
    setData(novo);
  };

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
                    onClick={() => mudarStatus(a.id, 'CONCLUIDO')}
                    className="flex items-center gap-1.5 opacity-0 transition-opacity group-hover:opacity-100"
                  >
                    <Icon name="check" size="xs" /> Concluir
                  </Button>
                )}
                {a.status === 'AGENDADO' && (
                  <Button variant="secondary" onClick={() => mudarStatus(a.id, 'CONFIRMADO')}>
                    Confirmar
                  </Button>
                )}
                {(a.status === 'AGENDADO' || a.status === 'CONFIRMADO') && (
                  <Button variant="ghost" onClick={() => mudarStatus(a.id, 'CANCELADO')}>
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
