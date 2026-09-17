'use client';

import { StatusAgendamento } from '@nexly/shared';
import { useEffect, useMemo, useState } from 'react';
import { api } from '@/lib/api';
import { Icon } from '@/components/ui/Icon';
import { toastSuccess } from '@/components/ui/Toaster';

interface Agendamento {
  id: string;
  dataHora: string;
  dataHoraFim: string | null;
  status: StatusAgendamento;
  cliente: { nome: string };
  profissional: { nome: string };
  servico: { nome: string; duracaoMin: number; preco: number };
}

interface Props {
  dataInicio: Date;
  profissionalId?: string;
  onConcluir?: (id: string) => void;
}

const DIAS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab'];
const HORA_INICIO = 7;
const HORA_FIM = 20;
const SLOT_MINUTOS = 30;

function dataISO(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function addDias(d: Date, dias: number): Date {
  const novo = new Date(d);
  novo.setDate(novo.getDate() + dias);
  return novo;
}

function horaDecimal(iso: string): number {
  const d = new Date(iso);
  return d.getHours() + d.getMinutes() / 60;
}

function duracaoMin(inicio: string, fim: string | null): number {
  if (fim) {
    return (new Date(fim).getTime() - new Date(inicio).getTime()) / 60000;
  }
  return 30;
}

function statusColor(status: StatusAgendamento): { bg: string; border: string; text: string } {
  switch (status) {
    case 'CONFIRMADO':
      return { bg: 'rgba(34,197,94,0.12)', border: 'rgba(34,197,94,0.30)', text: '#22C55E' };
    case 'CONCLUIDO':
      return { bg: 'rgba(59,130,246,0.12)', border: 'rgba(59,130,246,0.30)', text: '#3B82F6' };
    case 'CANCELADO':
      return { bg: 'rgba(239,68,68,0.12)', border: 'rgba(239,68,68,0.30)', text: '#EF4444' };
    default:
      return { bg: 'rgba(234,179,8,0.12)', border: 'rgba(234,179,8,0.30)', text: '#EAB308' };
  }
}

export function AgendaSemana({ dataInicio, profissionalId, onConcluir }: Props) {
  const [agendamentos, setAgendamentos] = useState<Agendamento[]>([]);
  const [carregando, setCarregando] = useState(true);

  const diasSemana = useMemo(() => {
    const inicioSemana = new Date(dataInicio);
    inicioSemana.setDate(inicioSemana.getDate() - inicioSemana.getDay());
    return Array.from({ length: 7 }).map((_, i) => addDias(inicioSemana, i));
  }, [dataInicio]);

  const carregar = async () => {
    setCarregando(true);
    try {
      const primeiro = diasSemana[0];
      const ultimo = diasSemana[6];
      if (!primeiro || !ultimo) return;
      const res = await api.get<{ data: Agendamento[] }>('/agendamentos', {
        params: {
          data: dataISO(primeiro),
          dataFim: dataISO(ultimo),
          limit: 500,
          profissionalId: profissionalId || undefined,
        },
      });
      setAgendamentos(res.data.data);
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => {
    void carregar();
  }, [diasSemana[0]?.toISOString(), profissionalId]);

  const concluir = async (id: string) => {
    await api.patch(`/agendamentos/${id}/status`, { status: 'CONCLUIDO' });
    toastSuccess('Serviço concluído!');
    void carregar();
    onConcluir?.(id);
  };

  const slots = useMemo(() => {
    const lista: number[] = [];
    for (let h = HORA_INICIO; h <= HORA_FIM; h += SLOT_MINUTOS / 60) {
      lista.push(h);
    }
    return lista;
  }, []);

  const agendamentosPorDia = useMemo(() => {
    const map: Record<number, Agendamento[]> = {};
    for (let i = 0; i < 7; i++) map[i] = [];
    for (const a of agendamentos) {
      const dia = new Date(a.dataHora).getDay();
      map[dia]!.push(a);
    }
    return map;
  }, [agendamentos]);

  return (
    <div className="overflow-hidden rounded-2xl border border-[rgba(255,255,255,0.08)] bg-[#111116]">
      <div className="grid grid-cols-8 border-b border-[rgba(255,255,255,0.08)]">
        <div className="p-3 text-[12px] font-semibold uppercase tracking-wider text-[#71717A]">Hora</div>
        {diasSemana.map((d, i) => (
          <div key={i} className="p-3 text-center text-[13px] font-medium text-[#A1A1AA]">
            <span className="hidden sm:inline">{DIAS[d.getDay()]} </span>
            <span>{String(d.getDate()).padStart(2, '0')}/{String(d.getMonth() + 1).padStart(2, '0')}</span>
          </div>
        ))}
      </div>

      <div className="relative grid grid-cols-8" style={{ height: `${slots.length * 64}px` }}>
        {slots.map((hora, idx) => (
          <div
            key={hora}
            className="absolute left-0 right-0 border-t border-[rgba(255,255,255,0.05)]"
            style={{ top: `${idx * 64}px` }}
          >
            <span className="absolute -top-2 left-2 text-[11px] text-[#71717A]">
              {String(Math.floor(hora)).padStart(2, '0')}:{String(Math.round((hora % 1) * 60)).padStart(2, '0')}
            </span>
          </div>
        ))}

        {slots.map((hora, idx) => (
          <div
            key={`hora-${hora}`}
            className="col-start-1 border-r border-[rgba(255,255,255,0.05)]"
            style={{ gridRow: idx + 1, height: '64px' }}
          />
        ))}

        {diasSemana.map((_, diaIdx) => (
          <div
            key={`dia-${diaIdx}`}
            className="relative border-r border-[rgba(255,255,255,0.05)]"
            style={{ gridColumn: diaIdx + 2, gridRow: `1 / span ${slots.length}` }}
          >
            {agendamentosPorDia[diaIdx]!.map((a) => {
              const inicio = horaDecimal(a.dataHora);
              const duracao = duracaoMin(a.dataHora, a.dataHoraFim);
              const top = (inicio - HORA_INICIO) * (60 / SLOT_MINUTOS) * 64;
              const height = (duracao / SLOT_MINUTOS) * 64;
              const colors = statusColor(a.status);

              return (
                <div
                  key={a.id}
                  className="group absolute left-1 right-1 rounded-lg border p-2 text-[11px] transition-opacity hover:opacity-90"
                  style={{
                    top: `${top}px`,
                    height: `${Math.max(height, 28)}px`,
                    backgroundColor: colors.bg,
                    borderColor: colors.border,
                    color: colors.text,
                  }}
                >
                  <div className="truncate font-medium text-[#FAFAFA]">{a.cliente.nome}</div>
                  <div className="truncate text-[10px] opacity-80">{a.servico.nome}</div>
                  <div className="truncate text-[10px] opacity-70">{a.profissional.nome}</div>
                  {a.status === 'CONFIRMADO' && (
                    <button
                      onClick={() => void concluir(a.id)}
                      className="mt-1 flex w-full items-center justify-center gap-1 rounded bg-[#22C55E] px-1.5 py-0.5 text-[10px] font-semibold text-white opacity-0 transition-opacity hover:bg-[#16A34A] group-hover:opacity-100"
                    >
                      <Icon name="check" size="xs" /> Concluir
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {carregando && (
        <div className="p-6 text-center text-sm text-[#A1A1AA]">Carregando agenda da semana...</div>
      )}
    </div>
  );
}
