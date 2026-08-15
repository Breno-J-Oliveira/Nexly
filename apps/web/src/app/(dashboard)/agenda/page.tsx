'use client';

import { StatusAgendamento } from '@nexly/shared';
import { useCallback, useEffect, useState } from 'react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { api } from '@/lib/api';
import { AgendamentoModal } from './AgendamentoModal';

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
          <h2 className="text-xl font-semibold text-gray-900">Agenda</h2>
          <p className="mt-1 text-sm text-gray-500">
            {data.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
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
        {carregando && <p className="text-sm text-gray-500">Carregando…</p>}
        {!carregando && agendamentos.length === 0 && (
          <div className="rounded-xl border border-dashed border-gray-300 p-8 text-center">
            <p className="text-sm text-gray-500">Nenhum agendamento para este dia.</p>
          </div>
        )}
        {agendamentos.map((a) => (
          <div
            key={a.id}
            className="flex items-center justify-between rounded-xl border border-gray-200 bg-white p-4"
          >
            <div className="flex items-center gap-4">
              <span className="text-lg font-semibold text-gray-900">{formatarHora(a.dataHora)}</span>
              <div>
                <p className="font-medium text-gray-900">{a.cliente.nome}</p>
                <p className="text-sm text-gray-500">
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
