'use client';

import { StatusAgendamento } from '@nexly/shared';
import { useCallback, useEffect, useState } from 'react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { api } from '@/lib/api';
import { AgendamentoModal } from './AgendamentoModal';
import { EmptyState } from '@/components/ui/EmptyState';


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
  const [agendamentos, setAgendamentos] = useState<Agendamento[]>([]);
  const [modalAberto, setModalAberto] = useState(false);
  const [carregando, setCarregando] = useState(true);
  const [profissionais, setProfissionais] = useState<{ id: string; nome: string }[]>([]);
  const [profissionalId, setProfissionalId] = useState<string>('');

  const carregar = useCallback(async () => {
    setCarregando(true);
    try {
      const res = await api.get<{ data: Agendamento[] }>('/agendamentos', {
        params: { data: dataISO(data), limit: 100, profissionalId: profissionalId || undefined },
      });
      setAgendamentos(res.data.data);
    } finally {
      setCarregando(false);
    }
  }, [data, profissionalId]);

  useEffect(() => {
    api.get<{ data: { id: string; nome: string }[] }>('/profissionais').then(r => 
      setProfissionais(r.data.data || r.data)).catch(() => {});
  }, []);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  const mudarStatus = async (id: string, status: StatusAgendamento): Promise<void> => {
    await api.patch(`/agendamentos/${id}/status`, { status });
    await carregar();
  };

  const mudarDia = (delta: number): void => {
    const novo = new Date(data);
    novo.setDate(novo.getDate() + delta);
    setData(novo);
  };

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-zinc-100">Agenda</h2>
          <p className="mt-1 text-sm text-zinc-400">
            {data.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
            {' · '}
            {agendamentos.length}{' '}
            {agendamentos.length === 1 ? 'agendamento' : 'agendamentos'}
          </p>
        </div>
        <Button onClick={() => setModalAberto(true)}>+ Novo agendamento</Button>
      </div>

      <div className="mt-4 flex items-center gap-2">
        <Button variant="secondary" onClick={() => mudarDia(-1)}>
          ←
        </Button>
        <Button variant="secondary" onClick={() => setData(new Date())}>
          Hoje
        </Button>
        <Button variant="secondary" onClick={() => mudarDia(1)}>
          →
        </Button>
      </div>

      <div className="mt-6 space-y-3">
        {carregando && <p className="text-sm text-zinc-400">Carregando…</p>}
        {!carregando && agendamentos.length === 0 && (
          <EmptyState
            icon="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
            title="Nenhum agendamento para este dia"
            description="Crie o primeiro agendamento para comecar a atender"
            action={<Button onClick={() => setModalAberto(true)}>+ Novo agendamento</Button>}
          />
        )}
        {agendamentos.map((a) => (
          <div
            key={a.id}
            className="flex items-center justify-between rounded-xl border border-zinc-800 bg-zinc-900 p-4"
          >
            <div className="flex items-center gap-4">
              <span className="text-lg font-semibold text-zinc-100">
                {formatarHora(a.dataHora)}
              </span>
              <div>
                <p className="font-medium text-zinc-100">{a.cliente.nome}</p>
                <p className="text-sm text-zinc-400">
                  {a.servico.nome} · {a.profissional.nome}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Badge color={a.status}>{a.status}</Badge>
              {a.status === 'AGENDADO' && (
                <Button variant="secondary" onClick={() => mudarStatus(a.id, 'CONFIRMADO')}>
                  Confirmar
                </Button>
              )}
              {(a.status === 'AGENDADO' || a.status === 'CONFIRMADO') && (
                <>
                  <Button onClick={() => mudarStatus(a.id, 'CONCLUIDO')}>Concluir</Button>
                  <Button variant="ghost" onClick={() => mudarStatus(a.id, 'CANCELADO')}>
                    Cancelar
                  </Button>
                </>
              )}
            </div>
          </div>
        ))}
      </div>

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

