'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { env } from '@/lib/env';

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

interface EmpresaInfo {
  nome: string;
  logo: string | null;
}

interface EmpresaComHorarios {
  empresa: EmpresaInfo;
  horarios: Record<string, { abre: string; fecha: string }>;
}

interface Servico {
  id: string;
  nome: string;
  duracaoMin: number;
  preco: number;
}

interface Profissional {
  id: string;
  nome: string;
  especialidade: string | null;
}

interface Disponibilidade {
  slots: string[];
}

interface ConfirmacaoResp {
  agendamentoId: string;
  mensagem: string;
}

type Step = 1 | 2 | 3 | 4 | 5;

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

const API = env.NEXT_PUBLIC_API_URL;

const API_DOWN = Symbol('apiDown');

async function getJson<T>(url: string): Promise<T | typeof API_DOWN> {
  try {
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) return API_DOWN;
    return (await res.json()) as T;
  } catch {
    return API_DOWN;
  }
}

function formatarMoeda(v: number): string {
  return `R$ ${v.toFixed(2)}`;
}

function maskTelefone(v: string): string {
  const d = v.replace(/\D/g, '').slice(0, 11);
  if (d.length <= 10) {
    return d
      .replace(/^(\d{2})(\d)/, '($1) $2')
      .replace(/(\d{4})(\d)/, '$1-$2');
  }
  return d.replace(/^(\d{2})(\d{5})(\d)/, '($1) $2-$3');
}

function formatarDataBR(data: string): string {
  const [y, m, d] = data.split('-');
  return `${d}/${m}/${y}`;
}

function formatarHora(h: string): string {
  return h;
}

function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/* ------------------------------------------------------------------ */
/* Sub-componentes                                                     */
/* ------------------------------------------------------------------ */

function Stepper({ step }: { step: Step }) {
  return (
    <div className="flex items-center justify-center gap-1">
      {[1, 2, 3, 4, 5].map((n) => {
        const done = n < step;
        const current = n === step;
        return (
          <div key={n} className="flex items-center">
            {n > 1 && (
              <div className="h-px w-6 sm:w-8" style={{ backgroundColor: done || current ? '#6366F1' : '#27272A' }} />
            )}
            <div
              className="flex h-7 w-7 items-center justify-center rounded-full text-[12px] font-semibold transition-colors"
              style={
                current
                  ? { backgroundColor: '#6366F1', color: '#FFFFFF' }
                  : done
                    ? { backgroundColor: '#22C55E', color: '#FFFFFF' }
                    : { backgroundColor: '#18181F', color: '#71717A', border: '1px solid rgba(255,255,255,0.08)' }
              }
            >
              {done ? (
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 6L9 17l-5-5" />
                </svg>
              ) : (
                n
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function IniciaisAvatar({ nome }: { nome: string }) {
  const parts = nome.trim().split(/\s+/).filter(Boolean);
  const first = parts[0] ?? '';
  const last = parts[parts.length - 1] ?? '';
  const iniciais = parts.length >= 2 ? first.charAt(0) + last.charAt(0) : first.slice(0, 2);
  return (
    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-[12px] font-semibold" style={{ backgroundColor: '#6366F1', color: '#FFFFFF' }}>
      {iniciais.toUpperCase()}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Calendário                                                          */
/* ------------------------------------------------------------------ */

function Mes({ offset, selecionado, onSelecionar }: { offset: number; selecionado: string; onSelecionar: (iso: string) => void }) {
  const hoje = new Date();
  const base = new Date(hoje.getFullYear(), hoje.getMonth() + offset, 1);
  const primeiroDiaSemana = base.getDay();
  const diasNoMes = new Date(base.getFullYear(), base.getMonth() + 1, 0).getDate();
  const diasMesAnterior = new Date(base.getFullYear(), base.getMonth(), 0).getDate();
  const hojeIso = toISODate(hoje);

  const cells: (string | null)[] = [];
  for (let i = 0; i < primeiroDiaSemana; i++) cells.push(`prev:${diasMesAnterior - i}`);
  for (let d = 1; d <= diasNoMes; d++) cells.push(`cur:${d}`);
  while (cells.length % 7 !== 0) cells.push(null);

  const ws = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];

  return (
    <div>
      <div className="mb-1 grid grid-cols-7 gap-1">
        {ws.map((w, i) => (
          <div key={i} className="pb-1 text-center text-[11px] font-medium uppercase" style={{ color: '#71717A' }}>
            {w}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((cell, i) => {
          if (!cell) return <div key={i} className="h-9" />;
          if (cell.startsWith('prev')) {
            return (
              <div key={i} className="flex h-9 items-center justify-center rounded-lg text-[13px]" style={{ color: '#27272A' }}>
                {cell.split(':')[1]}
              </div>
            );
          }
          const dNum = Number(cell.split(':')[1]);
          const dt = new Date(base.getFullYear(), base.getMonth(), dNum);
          const iso = toISODate(dt);
          const passado = iso < hojeIso;
          const ehHoje = iso === hojeIso;
          const sel = iso === selecionado;

          return (
            <button
              key={i}
              disabled={passado}
              onClick={() => onSelecionar(iso)}
              className="flex h-9 items-center justify-center rounded-lg text-[13px] font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40"
              style={
                sel
                  ? { backgroundColor: '#6366F1', color: '#FFFFFF' }
                  : ehHoje
                    ? { color: '#FAFAFA', boxShadow: 'inset 0 0 0 1px #6366F1' }
                    : { color: '#A1A1AA', backgroundColor: 'transparent' }
              }
            >
              {dNum}
            </button>
          );
        })}
      </div>
    </div>
  );
}
/* ------------------------------------------------------------------ */
/* Componente principal                                                */
/* ------------------------------------------------------------------ */

export default function BookingPage() {
  const { token } = useParams<{ token: string }>();

  const [empresa, setEmpresa] = useState<EmpresaInfo | null>(null);
  const [erro, setErro] = useState(false);

  const [servicos, setServicos] = useState<Servico[]>([]);
  const [profissionais, setProfissionais] = useState<Profissional[]>([]);

  const [step, setStep] = useState<Step>(1);
  const [servicoId, setServicoId] = useState<string>('');
  const [profissionalId, setProfissionalId] = useState<string>('');
  const [data, setData] = useState<string>('');
  const [mesOffset, setMesOffset] = useState(0);
  const [slots, setSlots] = useState<string[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [horario, setHorario] = useState<string>('');

  const [nome, setNome] = useState('');
  const [telefone, setTelefone] = useState('');
  const [email, setEmail] = useState('');
  const [confirmando, setConfirmando] = useState(false);
  const [sucesso, setSucesso] = useState(false);

  /* Carrega empresa no mount */
  useEffect(() => {
    getJson<EmpresaComHorarios>(`${API}/api/booking/${token}`).then((r) => {
      if (r === API_DOWN) {
        setErro(true);
        return;
      }
      setEmpresa(r.empresa);
    });
  }, [token]);

  /* Carrega serviços no mount */
  useEffect(() => {
    getJson<Servico[]>(`${API}/api/booking/${token}/servicos`).then((r) => {
      if (r !== API_DOWN) setServicos(r);
    });
  }, [token]);

  /* Carrega profissionais quando entra no step 2 */
  useEffect(() => {
    if (step === 2) {
      getJson<Profissional[]>(`${API}/api/booking/${token}/profissionais`).then((r) => {
        if (r !== API_DOWN) setProfissionais(r);
      });
    }
  }, [step, token]);

  /* Busca disponibilidade quando entra no step 4 */
  useEffect(() => {
    if (step === 4 && servicoId && data) {
      setSlotsLoading(true);
      setHorario('');
      getJson<Disponibilidade>(
        `${API}/api/booking/${token}/disponibilidade?servicoId=${servicoId}&data=${data}`,
      ).then((r) => {
        setSlots(r !== API_DOWN ? r.slots : []);
        setSlotsLoading(false);
      });
    }
  }, [step, servicoId, data, token]);

  const servicoSelecionado = useMemo(() => servicos.find((s) => s.id === servicoId), [servicos, servicoId]);
  const profissionalSelecionado = useMemo(
    () => (profissionalId === 'qualquer' ? null : profissionais.find((p) => p.id === profissionalId)),
    [profissionais, profissionalId],
  );

  const podeProximo: Record<Step, boolean> = {
    1: servicoId !== '',
    2: profissionalId !== '',
    3: data !== '',
    4: horario !== '',
    5: true,
  };

  const resetar = useCallback(() => {
    setStep(1);
    setServicoId('');
    setProfissionalId('');
    setData('');
    setHorario('');
    setSlots([]);
    setMesOffset(0);
    setNome('');
    setTelefone('');
    setEmail('');
    setSucesso(false);
  }, []);

  const confirmar = useCallback(async () => {
    if (!servicoId || !horario || !data || !nome || !telefone) return;
    setConfirmando(true);
    const dataHora = `${data}T${horario}:00`;
    try {
      const res = await fetch(`${API}/api/booking/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clienteNome: nome,
          clienteTelefone: telefone,
          clienteEmail: email || undefined,
          servicoId,
          profissionalId: profissionalId === 'qualquer' ? undefined : profissionalId,
          dataHora,
        }),
        cache: 'no-store',
      });
      if (res.ok) {
        setSucesso(true);
      }
    } catch {
      // mantém na tela atual
    } finally {
      setConfirmando(false);
    }
  }, [servicoId, horario, data, nome, telefone, email, profissionalId, token]);

  /* ------------------------- telas de borda ------------------------ */

  const telaErro = (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full" style={{ backgroundColor: 'rgba(239,68,68,0.12)' }}>
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <path d="M12 8v4M12 16h.01" />
        </svg>
      </div>
      <h1 className="mt-5 text-lg font-semibold" style={{ color: '#FAFAFA' }}>
        Link de agendamento inválido ou expirado.
      </h1>
      <p className="mt-1 text-sm" style={{ color: '#A1A1AA' }}>
        Verifique o endereço e tente novamente.
      </p>
    </div>
  );

  if (erro) return telaErro;
/* ------------------------- sucesso ------------------------------ */

  if (sucesso) {
    return (
      <div className="flex min-h-screen flex-col px-4 py-8" style={{ backgroundColor: '#0C0C10' }}>
        <div className="mx-auto w-full max-w-md">
          <div className="flex flex-col items-center py-10 text-center">
            <div
              style={{ animation: 'bookCheck 400ms ease-out' }}
              className="flex h-16 w-16 items-center justify-center rounded-full"
            >
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" style={{ color: '#22C55E' }}>
                <circle cx="12" cy="12" r="11" fill="rgba(34,197,94,0.15)" stroke="#22C55E" strokeWidth="2" />
                <path d="M8 12l3 3 5-6" stroke="#22C55E" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
              </svg>
            </div>
            <h1 className="mt-6 text-[22px] font-semibold" style={{ color: '#FAFAFA' }}>
              Agendamento confirmado!
            </h1>
            <p className="mt-1 text-sm" style={{ color: '#A1A1AA' }}>
              Você receberá uma confirmação no WhatsApp.
            </p>

            <div className="mt-6 w-full rounded-xl p-5" style={{ backgroundColor: '#111116', border: '1px solid rgba(99,102,241,0.30)' }}>
              <div className="flex justify-between py-1 text-sm">
                <span style={{ color: '#71717A' }}>Serviço</span>
                <span style={{ color: '#FAFAFA' }}>{servicoSelecionado?.nome}</span>
              </div>
              <div className="flex justify-between py-1 text-sm">
                <span style={{ color: '#71717A' }}>Profissional</span>
                <span style={{ color: '#FAFAFA' }}>{profissionalSelecionado?.nome ?? 'Qualquer'}</span>
              </div>
              <div className="flex justify-between py-1 text-sm">
                <span style={{ color: '#71717A' }}>Data</span>
                <span style={{ color: '#FAFAFA' }}>{formatarDataBR(data)}</span>
              </div>
              <div className="flex justify-between py-1 text-sm">
                <span style={{ color: '#71717A' }}>Horário</span>
                <span style={{ color: '#FAFAFA' }}>{formatarHora(horario)}</span>
              </div>
              <div className="flex justify-between border-t py-1 pt-3 text-sm" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
                <span style={{ color: '#71717A' }}>Total</span>
                <span className="font-semibold" style={{ color: '#818CF8' }}>{formatarMoeda(servicoSelecionado?.preco ?? 0)}</span>
              </div>
            </div>

            <button
              onClick={resetar}
              className="mt-6 h-11 w-full rounded-md font-medium transition-opacity hover:opacity-90"
              style={{ backgroundColor: '#6366F1', color: '#FAFAFA' }}
            >
              Fazer outro agendamento
            </button>
          </div>
        </div>
      </div>
    );
  }
/* --------------------------- render ------------------------------ */

  const refData = new Date();
  const labelMes = new Date(refData.getFullYear(), refData.getMonth() + mesOffset, 1).toLocaleDateString('pt-BR', {
    month: 'long',
    year: 'numeric',
  });

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#0C0C10' }}>
      {/* Header fixo */}
      <header
        className="fixed inset-x-0 top-0 z-20 flex h-14 items-center border-b px-4"
        style={{ backgroundColor: 'rgba(12,12,16,0.90)', backdropFilter: 'blur(8px)', borderColor: 'rgba(255,255,255,0.06)' }}
      >
        <div className="mx-auto flex w-full max-w-md items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-lg text-[13px] font-semibold" style={{ backgroundColor: '#6366F1', color: '#FFFFFF' }}>
            {empresa?.logo ? <img src={empresa.logo} alt="" className="h-full w-full object-cover" /> : ((empresa?.nome ?? 'N').charAt(0) || 'N').toUpperCase()}
          </div>
          <span className="text-[15px] font-semibold" style={{ color: '#FAFAFA' }}>{empresa?.nome ?? 'Agendamento'}</span>
        </div>
      </header>

      <main className="mx-auto w-full max-w-md px-4 pb-16 pt-20">
        <div className="mb-6">
          <Stepper step={step} />
        </div>

        {/* STEP 1 — Serviço */}
        {step === 1 && (
          <section>
            <h2 className="text-lg font-semibold" style={{ color: '#FAFAFA' }}>Escolha o serviço</h2>
            <p className="mt-1 text-sm" style={{ color: '#A1A1AA' }}>Selecione o que você deseja agendar</p>
            {servicos.length === 0 ? (
              <div className="mt-4 space-y-3">
                <div className="h-16 rounded-xl skeleton-shimmer" />
                <div className="h-16 rounded-xl skeleton-shimmer" />
                <div className="h-16 rounded-xl skeleton-shimmer" />
              </div>
            ) : (
              <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                {servicos.map((s) => {
                  const sel = s.id === servicoId;
                  return (
                    <button
                      key={s.id}
                      onClick={() => setServicoId(s.id)}
                      className="rounded-xl p-4 text-left transition-colors"
                      style={sel ? { backgroundColor: 'rgba(99,102,241,0.08)', border: '1px solid #6366F1' } : { backgroundColor: '#111116', border: '1px solid rgba(255,255,255,0.06)' }}
                    >
                      <div className="text-[15px] font-bold" style={{ color: '#FAFAFA' }}>{s.nome}</div>
                      <div className="mt-1 flex items-center justify-between">
                        <span className="text-sm" style={{ color: '#71717A' }}>{s.duracaoMin} min</span>
                        <span className="text-sm font-semibold" style={{ color: '#818CF8' }}>{formatarMoeda(s.preco)}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
            <div className="mt-6">
              <button
                disabled={!podeProximo[1]}
                onClick={() => setStep(2)}
                className="h-11 w-full rounded-md font-medium transition-opacity disabled:cursor-not-allowed disabled:opacity-40 enabled:hover:opacity-90"
                style={{ backgroundColor: '#6366F1', color: '#FAFAFA' }}
              >
                Próximo →
              </button>
            </div>
          </section>
        )}
{/* STEP 2 — Profissional */}
        {step === 2 && (
          <section>
            <h2 className="text-lg font-semibold" style={{ color: '#FAFAFA' }}>Escolha o profissional</h2>
            <p className="mt-1 text-sm" style={{ color: '#A1A1AA' }}>Quem você prefere atender</p>
            <div className="mt-4 space-y-3">
              <button
                onClick={() => setProfissionalId('qualquer')}
                className="flex w-full items-center gap-3 rounded-xl p-4 transition-colors"
                style={profissionalId === 'qualquer' ? { backgroundColor: 'rgba(99,102,241,0.08)', border: '1px solid #6366F1' } : { backgroundColor: '#111116', border: '1px solid rgba(255,255,255,0.06)' }}
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg" style={{ backgroundColor: '#18181F', color: '#71717A' }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                    <circle cx="9" cy="7" r="4" />
                  </svg>
                </div>
                <div className="text-left">
                  <div className="text-[15px] font-semibold" style={{ color: '#FAFAFA' }}>Qualquer profissional</div>
                  <div className="text-sm" style={{ color: '#71717A' }}>Primeiro disponível</div>
                </div>
              </button>

              {profissionais.length === 0 ? (
                <div className="space-y-3">
                  <div className="h-16 rounded-xl skeleton-shimmer" />
                  <div className="h-16 rounded-xl skeleton-shimmer" />
                </div>
              ) : (
                profissionais.map((p) => {
                  const sel = p.id === profissionalId;
                  return (
                    <button
                      key={p.id}
                      onClick={() => setProfissionalId(p.id)}
                      className="flex w-full items-center gap-3 rounded-xl p-4 text-left transition-colors"
                      style={sel ? { backgroundColor: 'rgba(99,102,241,0.08)', border: '1px solid #6366F1' } : { backgroundColor: '#111116', border: '1px solid rgba(255,255,255,0.06)' }}
                    >
                      <IniciaisAvatar nome={p.nome} />
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-[15px] font-semibold" style={{ color: '#FAFAFA' }}>{p.nome}</div>
                        {p.especialidade && <div className="truncate text-sm" style={{ color: '#71717A' }}>{p.especialidade}</div>}
                      </div>
                    </button>
                  );
                })
              )}
            </div>
            <div className="mt-6 flex gap-3">
              <button
                onClick={() => setStep(1)}
                className="h-11 w-24 rounded-md border font-medium transition-colors hover:bg-white/5"
                style={{ borderColor: 'rgba(255,255,255,0.10)', color: '#A1A1AA' }}
              >
                ← Voltar
              </button>
              <button
                disabled={!podeProximo[2]}
                onClick={() => setStep(3)}
                className="h-11 flex-1 rounded-md font-medium transition-opacity disabled:cursor-not-allowed disabled:opacity-40 enabled:hover:opacity-90"
                style={{ backgroundColor: '#6366F1', color: '#FAFAFA' }}
              >
                Próximo →
              </button>
            </div>
          </section>
        )}
{/* STEP 3 — Data */}
        {step === 3 && (
          <section>
            <h2 className="text-lg font-semibold" style={{ color: '#FAFAFA' }}>Escolha a data</h2>
            <p className="mt-1 text-sm" style={{ color: '#A1A1AA' }}>Selecione o melhor dia</p>
            <div className="mt-4 rounded-xl p-4" style={{ backgroundColor: '#111116', border: '1px solid rgba(255,255,255,0.06)' }}>
              <div className="mb-3 flex items-center justify-between">
                <button
                  onClick={() => setMesOffset((o) => Math.max(0, o - 1))}
                  disabled={mesOffset === 0}
                  className="flex h-8 w-8 items-center justify-center rounded-md transition-colors disabled:opacity-30"
                  style={{ color: '#A1A1AA' }}
                  aria-label="Mês anterior"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M15 18l-6-6 6-6" />
                  </svg>
                </button>
                <span className="text-sm font-semibold capitalize" style={{ color: '#FAFAFA' }}>{labelMes}</span>
                <button
                  onClick={() => setMesOffset((o) => o + 1)}
                  className="flex h-8 w-8 items-center justify-center rounded-md transition-colors"
                  style={{ color: '#A1A1AA' }}
                  aria-label="Próximo mês"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9 18l6-6-6-6" />
                  </svg>
                </button>
              </div>
              <Mes offset={mesOffset} selecionado={data} onSelecionar={setData} />
            </div>
            <div className="mt-6 flex gap-3">
              <button
                onClick={() => setStep(2)}
                className="h-11 w-24 rounded-md border font-medium transition-colors hover:bg-white/5"
                style={{ borderColor: 'rgba(255,255,255,0.10)', color: '#A1A1AA' }}
              >
                ← Voltar
              </button>
              <button
                disabled={!podeProximo[3]}
                onClick={() => setStep(4)}
                className="h-11 flex-1 rounded-md font-medium transition-opacity disabled:cursor-not-allowed disabled:opacity-40 enabled:hover:opacity-90"
                style={{ backgroundColor: '#6366F1', color: '#FAFAFA' }}
              >
                Próximo →
              </button>
            </div>
          </section>
        )}
{/* STEP 4 — Horário */}
        {step === 4 && (
          <section>
            <h2 className="text-lg font-semibold" style={{ color: '#FAFAFA' }}>Escolha o horário</h2>
            <p className="mt-1 text-sm" style={{ color: '#A1A1AA' }}>{formatarDataBR(data)}</p>

            {slotsLoading ? (
              <div className="mt-4 grid grid-cols-3 gap-2">
                <div className="h-10 rounded-lg skeleton-shimmer" />
                <div className="h-10 rounded-lg skeleton-shimmer" />
                <div className="h-10 rounded-lg skeleton-shimmer" />
                <div className="h-10 rounded-lg skeleton-shimmer" />
                <div className="h-10 rounded-lg skeleton-shimmer" />
                <div className="h-10 rounded-lg skeleton-shimmer" />
              </div>
            ) : slots.length === 0 ? (
              <div className="mt-6 rounded-xl p-6 text-center" style={{ backgroundColor: '#111116', border: '1px solid rgba(255,255,255,0.06)' }}>
                <p className="text-sm" style={{ color: '#A1A1AA' }}>
                  Nenhum horário disponível para esta data. Escolha outro dia.
                </p>
                <button
                  onClick={() => setStep(3)}
                  className="mt-4 h-11 w-full rounded-md border font-medium transition-colors hover:bg-white/5"
                  style={{ borderColor: 'rgba(255,255,255,0.10)', color: '#A1A1AA' }}
                >
                  ← Voltar
                </button>
              </div>
            ) : (
              <div className="mt-4 grid grid-cols-3 gap-2">
                {slots.map((h) => {
                  const sel = h === horario;
                  return (
                    <button
                      key={h}
                      onClick={() => setHorario(h)}
                      className="h-10 rounded-lg text-sm font-medium transition-colors"
                      style={sel ? { backgroundColor: '#6366F1', color: '#FFFFFF' } : { backgroundColor: '#18181F', color: '#A1A1AA', border: '1px solid rgba(255,255,255,0.06)' }}
                    >
                      {h}
                    </button>
                  );
                })}
              </div>
            )}

            <div className="mt-6 flex gap-3">
              <button
                onClick={() => setStep(3)}
                className="h-11 w-24 rounded-md border font-medium transition-colors hover:bg-white/5"
                style={{ borderColor: 'rgba(255,255,255,0.10)', color: '#A1A1AA' }}
              >
                ← Voltar
              </button>
              <button
                disabled={!podeProximo[4]}
                onClick={() => setStep(5)}
                className="h-11 flex-1 rounded-md font-medium transition-opacity disabled:cursor-not-allowed disabled:opacity-40 enabled:hover:opacity-90"
                style={{ backgroundColor: '#6366F1', color: '#FAFAFA' }}
              >
                Próximo →
              </button>
            </div>
          </section>
        )}
{/* STEP 5 — Dados + confirmação */}
        {step === 5 && (
          <section>
            <h2 className="text-lg font-semibold" style={{ color: '#FAFAFA' }}>Seus dados</h2>
            <p className="mt-1 text-sm" style={{ color: '#A1A1AA' }}>Preencha para confirmar</p>

            <div className="mt-4 rounded-xl p-5" style={{ backgroundColor: '#111116', border: '1px solid rgba(99,102,241,0.30)' }}>
              <div className="flex justify-between py-1 text-sm">
                <span style={{ color: '#71717A' }}>Serviço</span>
                <span style={{ color: '#FAFAFA' }}>{servicoSelecionado?.nome}</span>
              </div>
              <div className="flex justify-between py-1 text-sm">
                <span style={{ color: '#71717A' }}>Profissional</span>
                <span style={{ color: '#FAFAFA' }}>{profissionalSelecionado?.nome ?? 'Qualquer'}</span>
              </div>
              <div className="flex justify-between py-1 text-sm">
                <span style={{ color: '#71717A' }}>Data e hora</span>
                <span style={{ color: '#FAFAFA' }}>{formatarDataBR(data)} · {formatarHora(horario)}</span>
              </div>
              <div className="flex justify-between border-t py-1 pt-3 text-sm" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
                <span style={{ color: '#71717A' }}>Preço</span>
                <span className="font-semibold" style={{ color: '#818CF8' }}>{formatarMoeda(servicoSelecionado?.preco ?? 0)}</span>
              </div>
            </div>

            <div className="mt-4 space-y-3">
              <div>
                <label className="mb-1 block text-sm" style={{ color: '#A1A1AA' }}>Seu nome completo</label>
                <input
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  placeholder="Ex: Maria Silva"
                  className="h-11 w-full rounded-md border bg-transparent px-3 text-sm outline-none transition-colors focus:border-[#6366F1]"
                  style={{ borderColor: 'rgba(255,255,255,0.10)', color: '#FAFAFA' }}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm" style={{ color: '#A1A1AA' }}>WhatsApp</label>
                <input
                  value={telefone}
                  onChange={(e) => setTelefone(maskTelefone(e.target.value))}
                  placeholder="(00) 00000-0000"
                  inputMode="tel"
                  className="h-11 w-full rounded-md border bg-transparent px-3 text-sm outline-none transition-colors focus:border-[#6366F1]"
                  style={{ borderColor: 'rgba(255,255,255,0.10)', color: '#FAFAFA' }}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm" style={{ color: '#A1A1AA' }}>E-mail <span style={{ color: '#71717A' }}>(opcional)</span></label>
                <input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="voce@email.com"
                  type="email"
                  className="h-11 w-full rounded-md border bg-transparent px-3 text-sm outline-none transition-colors focus:border-[#6366F1]"
                  style={{ borderColor: 'rgba(255,255,255,0.10)', color: '#FAFAFA' }}
                />
              </div>
            </div>

            <div className="mt-6 flex gap-3">
              <button
                onClick={() => setStep(4)}
                className="h-11 w-24 rounded-md border font-medium transition-colors hover:bg-white/5"
                style={{ borderColor: 'rgba(255,255,255,0.10)', color: '#A1A1AA' }}
              >
                ← Voltar
              </button>
              <button
                disabled={confirmando || !nome || !telefone}
                onClick={confirmar}
                className="h-12 flex-1 rounded-md font-medium transition-opacity disabled:cursor-not-allowed disabled:opacity-40 enabled:hover:opacity-90"
                style={{ backgroundColor: '#6366F1', color: '#FAFAFA' }}
              >
                {confirmando ? 'Confirmando…' : 'Confirmar agendamento'}
              </button>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
