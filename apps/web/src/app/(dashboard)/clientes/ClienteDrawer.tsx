'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { api } from '@/lib/api';
import { AgendamentoModal } from '../agenda/AgendamentoModal';

interface Cliente {
  id: string;
  nome: string;
  createdAt?: string;
  observacoes?: string | null;
}

interface Metricas {
  totalVisitas: number;
  totalGasto: number;
  ticketMedio: number;
  frequenciaMediaDias: number;
  servicoFavorito: { id: string; nome: string } | null;
}

interface HistoricoItem {
  id: string;
  dataHora: string;
  status: 'CONCLUIDO' | 'CANCELADO';
  servico: { nome: string; preco: number };
  profissional: { nome: string };
}

interface Props {
  cliente: Cliente | null;
  onClose: () => void;
  onAtualizar?: () => void;
}

const brl = (v: number): string =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

function formatarData(d: string): string {
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return '—';
  const meses = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
  const dia = String(dt.getDate()).padStart(2, '0');
  const hora = String(dt.getHours()).padStart(2, '0');
  const min = String(dt.getMinutes()).padStart(2, '0');
  return `${dia} ${meses[dt.getMonth()]} ${dt.getFullYear()}, ${hora}:${min}`;
}

function formatarDesde(d: string | undefined): string {
  if (!d) return '—';
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return '—';
  const meses = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
  return `${meses[dt.getMonth()]} ${dt.getFullYear()}`;
}

function iniciais(nome: string): string {
  const partes = nome.trim().split(/\s+/).filter(Boolean);
  if (partes.length === 0) return '?';
  const primeira = partes[0]?.[0] ?? '';
  const segunda = partes.length > 1 ? (partes[partes.length - 1]?.[0] ?? '') : '';
  return (primeira + segunda).toUpperCase();
}

export function ClienteDrawer({ cliente, onClose, onAtualizar }: Props) {
  const [aba, setAba] = useState<'historico' | 'observacoes'>('historico');
  const [metricas, setMetricas] = useState<Metricas | null>(null);
  const [historico, setHistorico] = useState<HistoricoItem[]>([]);
  const [carregandoMetricas, setCarregandoMetricas] = useState(false);
  const [carregandoHistorico, setCarregandoHistorico] = useState(false);
  const [observacoes, setObservacoes] = useState(cliente?.observacoes ?? '');
  const [salvandoObs, setSalvandoObs] = useState(false);
  // Snapshot do cliente para o modal de agendamento (abre após fechar o drawer).
  const [agendandoPara, setAgendandoPara] = useState<Cliente | null>(null);

  const aberto = !!cliente;
  const id = cliente?.id;

  useEffect(() => {
    if (!aberto || !id) return;
    setObservacoes(cliente?.observacoes ?? '');
    setAba('historico');

    setCarregandoMetricas(true);
    setCarregandoHistorico(true);
    api
      .get<Metricas>(`/clientes/${id}/metricas`)
      .then((r) => setMetricas(r.data))
      .catch(() => undefined)
      .finally(() => setCarregandoMetricas(false));
    api
      .get<HistoricoItem[]>(`/clientes/${id}/historico`)
      .then((r) => setHistorico(r.data))
      .catch(() => undefined)
      .finally(() => setCarregandoHistorico(false));
  }, [aberto, id, cliente?.observacoes]);

  useEffect(() => {
    if (!aberto) setMetricas(null);
  }, [aberto]);

  const salvarObservacao = async (): Promise<void> => {
    if (!id) return;
    setSalvandoObs(true);
    try {
      await api.put(`/clientes/${id}`, { observacoes });
    } finally {
      setSalvandoObs(false);
    }
  };

  const frequenciaTexto =
    metricas && metricas.frequenciaMediaDias > 0
      ? metricas.frequenciaMediaDias >= 30
        ? `A cada ${Math.round(metricas.frequenciaMediaDias / 30)} ${metricas.frequenciaMediaDias >= 60 ? 'meses' : 'mês'}`
        : `A cada ${metricas.frequenciaMediaDias} ${metricas.frequenciaMediaDias === 1 ? 'dia' : 'dias'}`
      : '—';

  return (
    <>
      {/* Overlay */}
      {aberto && (
        <div
          className="fixed inset-0 bg-black/40"
          onClick={onClose}
          style={{ zIndex: 39 }}
        />
      )}

      {/* Drawer */}
      <div
        className="fixed right-0 top-0 flex h-screen w-[400px] flex-col bg-[#111116] transition-transform duration-200 ease-out"
        style={{
          borderLeft: '1px solid rgba(255,255,255,0.06)',
          zIndex: 40,
          transform: aberto ? 'translateX(0)' : 'translateX(100%)',
        }}
      >
        {cliente && (
          <>
            {/* Header */}
            <div className="flex items-center gap-3 border-b px-5 py-4" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
              <div
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold"
                style={{ backgroundColor: '#6366F1', color: '#FFFFFF' }}
              >
                {iniciais(cliente.nome)}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-base font-semibold" style={{ color: '#FAFAFA' }}>
                  {cliente.nome}
                </p>
                <p className="text-xs" style={{ color: '#71717A' }}>
                  Cliente desde {formatarDesde(cliente.createdAt)}
                </p>
              </div>
              <button
                onClick={onClose}
                aria-label="Fechar"
                className="flex h-8 w-8 items-center justify-center rounded-md transition-colors hover:bg-white/5"
                style={{ color: '#A1A1AA' }}
              >
                ✕
              </button>
            </div>

            {/* Conteúdo */}
            <div className="flex-1 overflow-y-auto px-5 py-4">
              {/* Stat boxes */}
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl p-4" style={{ backgroundColor: '#0C0C10', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <p className="text-xs" style={{ color: '#71717A' }}>Total de visitas</p>
                  <p className="mt-1 text-2xl font-semibold" style={{ color: '#FAFAFA' }}>
                    {carregandoMetricas ? '…' : metricas?.totalVisitas ?? 0}
                  </p>
                </div>
                <div className="rounded-xl p-4" style={{ backgroundColor: '#0C0C10', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <p className="text-xs" style={{ color: '#71717A' }}>Total gasto</p>
                  <p className="mt-1 text-2xl font-semibold" style={{ color: '#FAFAFA' }}>
                    {carregandoMetricas ? '…' : brl(metricas?.totalGasto ?? 0)}
                  </p>
                </div>
                <div className="rounded-xl p-4" style={{ backgroundColor: '#0C0C10', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <p className="text-xs" style={{ color: '#71717A' }}>Ticket médio</p>
                  <p className="mt-1 text-2xl font-semibold" style={{ color: '#FAFAFA' }}>
                    {carregandoMetricas ? '…' : brl(metricas?.ticketMedio ?? 0)}
                  </p>
                </div>
                <div className="rounded-xl p-4" style={{ backgroundColor: '#0C0C10', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <p className="text-xs" style={{ color: '#71717A' }}>Frequência</p>
                  <p className="mt-1 text-2xl font-semibold" style={{ color: '#FAFAFA' }}>
                    {carregandoMetricas ? '…' : frequenciaTexto}
                  </p>
                </div>
              </div>
              {/* Serviço favorito */}
              {!carregandoMetricas && metricas && metricas.totalVisitas > 0 && metricas.servicoFavorito && (
                <div
                  className="mt-4 flex items-center gap-2 rounded-xl px-4 py-3 text-sm"
                  style={{ backgroundColor: '#0C0C10', border: '1px solid rgba(255,255,255,0.06)' }}
                >
                  <span className="text-base">⭐</span>
                  <span style={{ color: '#71717A' }}>Serviço favorito:</span>
                  <span className="font-semibold" style={{ color: '#FAFAFA' }}>
                    {metricas.servicoFavorito.nome}
                  </span>
                </div>
              )}

              {/* Abas */}
              <div className="mt-5 flex border-b" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
                {(['historico', 'observacoes'] as const).map((t) => {
                  const ativa = aba === t;
                  return (
                    <button
                      key={t}
                      onClick={() => setAba(t)}
                      className="flex-1 py-2.5 text-sm font-medium capitalize transition-colors"
                      style={
                        ativa
                          ? { color: '#818CF8', borderBottom: '2px solid #6366F1' }
                          : { color: '#71717A', borderBottom: '2px solid transparent' }
                      }
                    >
                      {t === 'historico' ? 'Histórico' : 'Observações'}
                    </button>
                  );
                })}
              </div>

              <div className="mt-4">
                {aba === 'historico' ? (
                  <div className="space-y-3">
                    {carregandoHistorico ? (
                      <>
                        {[0, 1, 2].map((i) => (
                          <div key={i} className="h-16 rounded-xl skeleton-shimmer" />
                        ))}
                      </>
                    ) : historico.length === 0 ? (
                      <p className="py-6 text-center text-sm" style={{ color: '#71717A' }}>
                        Nenhum atendimento registrado ainda.
                      </p>
                    ) : (
                      historico.map((h) => (
                        <div
                          key={h.id}
                          className="rounded-xl p-4"
                          style={{ backgroundColor: '#0C0C10', border: '1px solid rgba(255,255,255,0.06)' }}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs" style={{ color: '#71717A' }}>
                              {formatarData(h.dataHora)}
                            </span>
                            <span
                              className="rounded-full px-2 py-0.5 text-[11px] font-semibold"
                              style={
                                h.status === 'CONCLUIDO'
                                  ? { backgroundColor: 'rgba(34,197,94,0.15)', color: '#22C55E' }
                                  : { backgroundColor: 'rgba(113,113,122,0.15)', color: '#A1A1AA' }
                              }
                            >
                              {h.status === 'CONCLUIDO' ? 'Concluído' : 'Cancelado'}
                            </span>
                          </div>
                          <p className="mt-1.5 text-[13px] font-semibold" style={{ color: '#FAFAFA' }}>
                            {h.servico.nome}
                          </p>
                          <div className="mt-0.5 flex items-center justify-between">
                            <span className="text-xs" style={{ color: '#71717A' }}>
                              {h.profissional.nome}
                            </span>
                            <span className="text-[13px] font-medium" style={{ color: '#FAFAFA' }}>
                              {brl(Number(h.servico.preco))}
                            </span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                ) : (
                  <div className="space-y-3">
                    <textarea
                      value={observacoes}
                      onChange={(e) => setObservacoes(e.target.value)}
                      placeholder="Anotações sobre o cliente (preferências, alergias, observações importantes)..."
                      className="w-full resize-none rounded-lg border px-3 py-2 text-sm outline-none transition-colors"
                      style={{
                        height: 120,
                        backgroundColor: '#0C0C10',
                        borderColor: 'rgba(255,255,255,0.10)',
                        color: '#FAFAFA',
                      }}
                    />
                    <Button
                      onClick={() => void salvarObservacao()}
                      loading={salvandoObs}
                      disabled={observacoes === (cliente.observacoes ?? '')}
                    >
                      Salvar observação
                    </Button>
                  </div>
                )}
              </div>
            </div>

            {/* Rodapé fixo */}
            <div className="border-t p-4" style={{ borderColor: 'rgba(255,255,255,0.06)', backgroundColor: '#111116' }}>
              <Button
                className="w-full"
                variant="primary"
                onClick={() => {
                  setAgendandoPara(cliente);
                  onClose();
                }}
              >
                + Novo agendamento para este cliente
              </Button>
            </div>
          </>
        )}
      </div>

      {agendandoPara && (
        <AgendamentoModal
          onClose={() => setAgendandoPara(null)}
          onSuccess={() => {
            setAgendandoPara(null);
            onAtualizar?.();
          }}
          clienteIdInicial={agendandoPara.id}
          clienteNomeInicial={agendandoPara.nome}
        />
      )}
    </>
  );
}
