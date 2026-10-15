'use client';

import { hasPermission } from '@nexly/shared';
import { useAuth } from '@/lib/auth';
import { toastSuccess, toastError } from '@/components/ui/Toaster';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { api } from '@/lib/api';
import { AgendamentoModal } from '../agenda/AgendamentoModal';

interface Cliente {
  id: string;
  nome: string;
  createdAt?: string;
  observacoes?: string | null;
  email?: string | null;
  telefone?: string | null;
}

interface Metricas {
  totalVisitas: number;
  totalGasto: number | null;
  ticketMedio: number | null;
  totalCompras: number | null;
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
  inline?: boolean;
}

const brl = (v: number): string =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

function formatarData(d: string): string {
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return '—';
  const meses = [
    'jan',
    'fev',
    'mar',
    'abr',
    'mai',
    'jun',
    'jul',
    'ago',
    'set',
    'out',
    'nov',
    'dez',
  ];
  const dia = String(dt.getDate()).padStart(2, '0');
  const hora = String(dt.getHours()).padStart(2, '0');
  const min = String(dt.getMinutes()).padStart(2, '0');
  return `${dia} ${meses[dt.getMonth()]} ${dt.getFullYear()}, ${hora}:${min}`;
}

function formatarDesde(d: string | undefined): string {
  if (!d) return '—';
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return '—';
  const meses = [
    'jan',
    'fev',
    'mar',
    'abr',
    'mai',
    'jun',
    'jul',
    'ago',
    'set',
    'out',
    'nov',
    'dez',
  ];
  return `${meses[dt.getMonth()]} ${dt.getFullYear()}`;
}

function iniciais(nome: string): string {
  const partes = nome.trim().split(/\s+/).filter(Boolean);
  if (partes.length === 0) return '?';
  const primeira = partes[0]?.[0] ?? '';
  const segunda = partes.length > 1 ? (partes[partes.length - 1]?.[0] ?? '') : '';
  return (primeira + segunda).toUpperCase();
}

export function ClienteDrawer({ cliente, onClose, onAtualizar, inline = false }: Props) {
  const { user } = useAuth();
  const podeEditar = hasPermission(user?.role, 'clientes:update');
  const podeAgendar = hasPermission(user?.role, 'agenda:create');
  const podeVerCompras = hasPermission(user?.role, 'vendas:read');
  const [erroMetricas, setErroMetricas] = useState(false);
  const [erroHistorico, setErroHistorico] = useState(false);
  const [tentativaDados, setTentativaDados] = useState(0);
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
    let active = true;
    const controller = new AbortController();

    setCarregandoMetricas(true);
    setMetricas(null);
    setErroMetricas(false);
    setCarregandoHistorico(true);
    setHistorico([]);
    setErroHistorico(false);
    api
      .get<Metricas>(`/clientes/${id}/metricas`, { signal: controller.signal })
      .then((r) => {
        if (active) setMetricas(r.data);
      })
      .catch(() => {
        if (active) setErroMetricas(true);
      })
      .finally(() => {
        if (active) setCarregandoMetricas(false);
      });
    api
      .get<HistoricoItem[]>(`/clientes/${id}/historico`, { signal: controller.signal })
      .then((r) => {
        if (active) setHistorico(r.data);
      })
      .catch(() => {
        if (active) setErroHistorico(true);
      })
      .finally(() => {
        if (active) setCarregandoHistorico(false);
      });
    return () => {
      active = false;
      controller.abort();
    };
  }, [aberto, id, tentativaDados]);
  useEffect(() => {
    setAba('historico');
  }, [id]);
  useEffect(() => {
    setObservacoes(cliente?.observacoes ?? '');
  }, [id, cliente?.observacoes]);

  useEffect(() => {
    if (!aberto) setMetricas(null);
  }, [aberto]);

  const salvarObservacao = async (): Promise<void> => {
    if (!id || !podeEditar || salvandoObs) return;
    setSalvandoObs(true);
    try {
      await api.put(`/clientes/${id}`, { observacoes });
      toastSuccess('Observações salvas');
      onAtualizar?.();
    } catch {
      toastError('Não foi possível salvar as observações. Tente novamente.');
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

  const conteudo = (
    <div
      className={
        inline
          ? 'flex h-[calc(100dvh-136px)] min-h-[620px] min-w-0 flex-col overflow-hidden rounded-xl bg-[#111116]'
          : 'flex max-h-[70dvh] min-w-0 flex-col'
      }
    >
      {cliente && (
        <>
          {/* Header */}
          <div
            className={`flex items-center gap-3 border-b px-5 py-5 ${inline ? 'flex-col text-center' : ''}`}
            style={{ borderColor: 'rgba(255,255,255,0.06)' }}
          >
            <div
              className={`flex shrink-0 items-center justify-center rounded-full font-semibold ${inline ? 'h-20 w-20 border-2 border-[#818CF8] text-xl' : 'h-10 w-10 text-sm'}`}
              style={{ backgroundColor: '#6366F1', color: '#FFFFFF' }}
            >
              {iniciais(cliente.nome)}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-base font-semibold" style={{ color: '#FAFAFA' }}>
                {cliente.nome}
              </p>
              <p className="text-xs" style={{ color: '#A1A1AA' }}>
                Cliente desde {formatarDesde(cliente.createdAt)}
              </p>
            </div>
          </div>

          {/* Conteúdo */}
          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
            {inline && (
              <div className="mb-5 space-y-2 text-[13px] text-[#A1A1AA]">
                <p className="mb-3 text-xs font-medium text-[#71717A]">INFORMAÇÕES DE CONTATO</p>
                <p className="break-all">Email: {cliente.email || 'Não informado'}</p>
                <p>Telefone: {cliente.telefone || 'Não informado'}</p>
                {podeVerCompras && (
                  <p>
                    Total em vendas: {metricas?.totalGasto != null ? brl(metricas.totalGasto) : '—'}
                  </p>
                )}
              </div>
            )}
            {/* Stat boxes */}
            <div className={inline ? 'hidden' : 'grid grid-cols-2 gap-3'}>
              <div
                className="rounded-xl p-4"
                style={{ backgroundColor: '#0C0C10', border: '1px solid rgba(255,255,255,0.06)' }}
              >
                <p className="text-xs" style={{ color: '#A1A1AA' }}>
                  Total de visitas
                </p>
                <p className="mt-1 text-2xl font-semibold" style={{ color: '#FAFAFA' }}>
                  {carregandoMetricas ? '…' : (metricas?.totalVisitas ?? '—')}
                </p>
              </div>
              {podeVerCompras && (
                <div
                  className="rounded-xl p-4"
                  style={{ backgroundColor: '#0C0C10', border: '1px solid rgba(255,255,255,0.06)' }}
                >
                  <p className="text-xs" style={{ color: '#A1A1AA' }}>
                    Total em vendas
                  </p>
                  <p className="mt-1 text-2xl font-semibold" style={{ color: '#FAFAFA' }}>
                    {carregandoMetricas
                      ? '…'
                      : metricas?.totalGasto != null
                        ? brl(metricas.totalGasto)
                        : '—'}
                  </p>
                </div>
              )}
              {podeVerCompras && (
                <div
                  className="rounded-xl p-4"
                  style={{ backgroundColor: '#0C0C10', border: '1px solid rgba(255,255,255,0.06)' }}
                >
                  <p className="text-xs" style={{ color: '#A1A1AA' }}>
                    Ticket por compra
                  </p>
                  <p className="mt-1 text-2xl font-semibold" style={{ color: '#FAFAFA' }}>
                    {carregandoMetricas
                      ? '…'
                      : metricas?.ticketMedio != null
                        ? brl(metricas.ticketMedio)
                        : '—'}
                  </p>
                </div>
              )}
              <div
                className="rounded-xl p-4"
                style={{ backgroundColor: '#0C0C10', border: '1px solid rgba(255,255,255,0.06)' }}
              >
                <p className="text-xs" style={{ color: '#A1A1AA' }}>
                  Frequência
                </p>
                <p className="mt-1 text-2xl font-semibold" style={{ color: '#FAFAFA' }}>
                  {carregandoMetricas ? '…' : frequenciaTexto}
                </p>
              </div>
            </div>
            {(erroMetricas || erroHistorico) && (
              <div role="alert" className="mt-4 text-sm text-red-300">
                Algumas informações não puderam ser carregadas.{' '}
                <Button variant="ghost" onClick={() => setTentativaDados((v) => v + 1)}>
                  Tentar novamente
                </Button>
              </div>
            )}
            {/* Serviço favorito */}
            {!carregandoMetricas &&
              metricas &&
              metricas.totalVisitas > 0 &&
              metricas.servicoFavorito && (
                <div
                  className="mt-4 flex items-center gap-2 rounded-xl px-4 py-3 text-sm"
                  style={{
                    backgroundColor: '#0C0C10',
                    border: '1px solid rgba(255,255,255,0.06)',
                  }}
                >
                  <span className="text-base">⭐</span>
                  <span style={{ color: '#A1A1AA' }}>Serviço favorito:</span>
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
                    aria-pressed={ativa}
                    onClick={() => setAba(t)}
                    className="flex-1 py-2.5 text-sm font-medium capitalize transition-colors"
                    style={
                      ativa
                        ? { color: '#818CF8', borderBottom: '2px solid #6366F1' }
                        : { color: '#A1A1AA', borderBottom: '2px solid transparent' }
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
                  ) : erroHistorico ? (
                    <p className="text-sm text-[#A1A1AA]">Histórico indisponível.</p>
                  ) : historico.length === 0 ? (
                    <p className="py-6 text-center text-sm" style={{ color: '#A1A1AA' }}>
                      Nenhum atendimento registrado ainda.
                    </p>
                  ) : (
                    historico.map((h) => (
                      <div
                        key={h.id}
                        className="rounded-xl p-4"
                        style={{
                          backgroundColor: '#0C0C10',
                          border: '1px solid rgba(255,255,255,0.06)',
                        }}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs" style={{ color: '#A1A1AA' }}>
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
                        <p
                          className="mt-1.5 text-[13px] font-semibold"
                          style={{ color: '#FAFAFA' }}
                        >
                          {h.servico.nome}
                        </p>
                        <div className="mt-0.5 flex items-center justify-between">
                          <span className="text-xs" style={{ color: '#A1A1AA' }}>
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
                    aria-label="Observações do cliente"
                    readOnly={!podeEditar}
                    maxLength={2000}
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
                  {podeEditar && (
                    <Button
                      onClick={() => void salvarObservacao()}
                      loading={salvandoObs}
                      disabled={observacoes === (cliente.observacoes ?? '')}
                    >
                      Salvar observação
                    </Button>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Rodapé fixo */}
          <div
            className="border-t p-4"
            style={{ borderColor: 'rgba(255,255,255,0.06)', backgroundColor: '#111116' }}
          >
            {podeAgendar && (
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
            )}
          </div>
        </>
      )}
    </div>
  );
  return (
    <>
      {inline ? (
        conteudo
      ) : (
        <Modal open={aberto} title="Detalhes do cliente" onClose={onClose} width="max-w-lg">
          {conteudo}
        </Modal>
      )}
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
