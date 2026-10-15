'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import Image from 'next/image';
import { BookingApiError, bookingRequest as getJson, mensagemErro } from '@/lib/public-booking-api';
import { formatarMoeda } from '@/lib/format';
import { env } from '@/lib/env';
import { Icon } from '@/components/ui/Icon';

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

interface EmpresaInfo {
  nome: string;
  logo: string | null;
  fusoHorario: string;
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
  instantes: Record<string, string>;
}

type Step = 1 | 2 | 3 | 4 | 5;

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

const API = env.NEXT_PUBLIC_API_URL;

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
    <div role="progressbar" aria-label="Etapas do agendamento" aria-valuemin={1} aria-valuemax={5} aria-valuenow={step} className="flex items-center justify-center gap-1">
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
                <Icon name="check" className="text-white" size="xs" />
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

function Mes({ offset, selecionado, onSelecionar, hojeIso }: { offset: number; selecionado: string; onSelecionar: (iso: string) => void; hojeIso: string }) {
  const hoje = new Date(`${hojeIso}T12:00:00`);
  const base = new Date(hoje.getFullYear(), hoje.getMonth() + offset, 1);
  const primeiroDiaSemana = base.getDay();
  const diasNoMes = new Date(base.getFullYear(), base.getMonth() + 1, 0).getDate();
  const diasMesAnterior = new Date(base.getFullYear(), base.getMonth(), 0).getDate();

  const cells: (string | null)[] = [];
  for (let i = 0; i < primeiroDiaSemana; i++) cells.push(`prev:${diasMesAnterior - primeiroDiaSemana + i + 1}`);
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
              aria-label={`Selecionar ${formatarDataBR(iso)}`}
              aria-pressed={sel}
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

  const stepHeading = useRef<HTMLHeadingElement>(null);

  const [empresa, setEmpresa] = useState<EmpresaInfo | null>(null);
  const [erro, setErro] = useState('');
  const [carregando, setCarregando] = useState(true);
  const [tentativa, setTentativa] = useState(0);
  const [erroEtapa, setErroEtapa] = useState('');
  const [instantes, setInstantes] = useState<Record<string, string>>({});
  const [profissionaisLoading, setProfissionaisLoading] = useState(false);

  const [servicos, setServicos] = useState<Servico[]>([]);
  const [profissionais, setProfissionais] = useState<Profissional[]>([]);

  const [step, setStep] = useState<Step>(1);
  useEffect(() => {
    if (step !== 1) stepHeading.current?.focus();
  }, [step]);
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

  useEffect(() => {
    const controller = new AbortController();
    setCarregando(true);
    setErro('');
    void Promise.all([
      getJson<EmpresaComHorarios>(`${API}/api/booking/${token}`, { signal: controller.signal }),
      getJson<Servico[]>(`${API}/api/booking/${token}/servicos`, { signal: controller.signal }),
    ])
      .then(([info, lista]) => {
        if (controller.signal.aborted) return;
        setEmpresa(info.empresa);
        setServicos(lista);
      })
      .catch((error) => {
        if (!controller.signal.aborted) setErro(mensagemErro(error));
      })
      .finally(() => {
        if (!controller.signal.aborted) setCarregando(false);
      });
    return () => controller.abort();
  }, [token, tentativa]);

  useEffect(() => {
    if (step !== 2) return;
    const controller = new AbortController();
    setProfissionaisLoading(true);
    setErroEtapa('');
    void getJson<Profissional[]>(`${API}/api/booking/${token}/profissionais`, {
      signal: controller.signal,
    })
      .then((lista) => {
        if (!controller.signal.aborted) setProfissionais(lista);
      })
      .catch((error) => {
        if (!controller.signal.aborted) setErroEtapa(mensagemErro(error));
      })
      .finally(() => {
        if (!controller.signal.aborted) setProfissionaisLoading(false);
      });
    return () => controller.abort();
  }, [step, token, tentativa]);

  useEffect(() => {
    if (step !== 4 || !servicoId || !data) return;
    const controller = new AbortController();
    setSlotsLoading(true);
    setHorario('');
    setSlots([]);
    setInstantes({});
    setErroEtapa('');
    const params = new URLSearchParams({ servicoId, data });
    if (profissionalId && profissionalId !== 'qualquer')
      params.set('profissionalId', profissionalId);
    void getJson<Disponibilidade>(`${API}/api/booking/${token}/disponibilidade?${params}`, {
      signal: controller.signal,
    })
      .then((result) => {
        if (!controller.signal.aborted) {
          setSlots(result.slots);
          setInstantes(result.instantes ?? {});
        }
      })
      .catch((error) => {
        if (!controller.signal.aborted) setErroEtapa(mensagemErro(error));
      })
      .finally(() => {
        if (!controller.signal.aborted) setSlotsLoading(false);
      });
    return () => controller.abort();
  }, [step, servicoId, profissionalId, data, token, tentativa]);

  const servicoSelecionado = useMemo(() => servicos.find((s) => s.id === servicoId), [servicos, servicoId]);
  const profissionalSelecionado = useMemo(
    () => (profissionalId === 'qualquer' ? null : profissionais.find((p) => p.id === profissionalId)),
    [profissionais, profissionalId],
  );

  const podeProximo: Record<Step, boolean> = {
    1: !carregando && !!servicoSelecionado,
    2: !profissionaisLoading && !erroEtapa && profissionais.length > 0 && profissionalId !== '',
    3: data !== '',
    4: !slotsLoading && !erroEtapa && horario !== '',
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
    setErroEtapa('');
  }, []);

  const confirmar = useCallback(async () => {
    if (
      confirmando ||
      !servicoId ||
      !horario ||
      !data ||
      nome.trim().length < 2 ||
      telefone.replace(/\D/g, '').length < 10
    )
      return;
    const dataHora = instantes[horario];
    if (!dataHora) {
      setErroEtapa('Consulte novamente os horários disponíveis.');
      setStep(4);
      return;
    }
    setConfirmando(true);
    setErroEtapa('');
    try {
      await getJson(`${API}/api/booking/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clienteNome: nome.trim(),
          clienteTelefone: telefone,
          clienteEmail: email.trim() || undefined,
          servicoId,
          profissionalId: profissionalId === 'qualquer' ? undefined : profissionalId,
          dataHora,
        }),
      });
      setSucesso(true);
    } catch (error) {
      setErroEtapa(
        error instanceof BookingApiError
          ? error.message
          : 'Não foi possível confirmar a reserva. Verifique com o estabelecimento antes de tentar novamente.',
      );
    } finally {
      setConfirmando(false);
    }
  }, [
    confirmando,
    servicoId,
    horario,
    data,
    nome,
    telefone,
    email,
    profissionalId,
    token,
    instantes,
  ]);

  /* ------------------------- telas de borda ------------------------ */

  const telaErro = (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full" style={{ backgroundColor: 'rgba(239,68,68,0.12)' }}>
        <Icon name="circle-exclamation" className="text-[#EF4444]" size="lg" />
      </div>
      <h1 className="mt-5 text-lg font-semibold" style={{ color: '#FAFAFA' }}>
        {erro}
      </h1>
      <p className="mt-1 text-sm" style={{ color: '#A1A1AA' }}>
        Verifique o endereço ou tente carregar novamente.
      </p>
      <button type="button" className="mt-5 rounded-xl bg-[#6366F1] px-5 py-3 text-sm text-white" onClick={() => setTentativa(v=>v+1)}>Tentar novamente</button>
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
              <Icon name="circle-check" className="text-[#22C55E]" size="2x" />
            </div>
            <h1 className="mt-6 text-[22px] font-semibold" style={{ color: '#FAFAFA' }}>
              Agendamento confirmado!
            </h1>
            <p className="mt-1 text-sm" style={{ color: '#A1A1AA' }}>
              Sua reserva foi registrada. Guarde os detalhes abaixo.
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

  const fusoHorario = empresa?.fusoHorario || 'America/Sao_Paulo';
  const hojePartes = new Intl.DateTimeFormat('en-CA', {
    timeZone: fusoHorario,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());
  const hojeIso = ['year', 'month', 'day']
    .map((type) => hojePartes.find((part) => part.type === type)?.value)
    .join('-');
  const refData = new Date(`${hojeIso}T12:00:00`);
  const labelMes = new Date(
    refData.getFullYear(),
    refData.getMonth() + mesOffset,
    1,
  ).toLocaleDateString('pt-BR', {
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
            {empresa?.logo ? <Image src={empresa.logo} unoptimized width={32} height={32} alt="" className="h-full w-full object-cover" /> : ((empresa?.nome ?? 'N').charAt(0) || 'N').toUpperCase()}
          </div>
          <span className="text-[15px] font-semibold" style={{ color: '#FAFAFA' }}>{empresa?.nome ?? 'Agendamento'}</span>
        </div>
      </header>

      <main className="mx-auto w-full max-w-md px-4 pb-16 pt-20">
        <div className="mb-6">
          <Stepper step={step} />
        </div>

        <p className="mb-4 text-center text-xs text-[#A1A1AA]">Horários do estabelecimento: {fusoHorario.replace('America/','').replaceAll('_',' ')}</p>
        {erroEtapa&&<div role="alert" className="mb-5 rounded-xl border border-red-400/20 bg-red-500/5 p-4 text-sm text-red-200"><p>{erroEtapa}</p><button type="button" disabled={confirmando} onClick={()=>{if(step===5)setStep(4);else setTentativa(v=>v+1);}} className="mt-3 font-medium underline">{step===5?'Escolher outro horário':'Tentar novamente'}</button></div>}
        {/* STEP 1 — Serviço */}
        {step === 1 && (
          <section>
            <h2 ref={stepHeading} tabIndex={-1} className="text-lg font-semibold outline-none" style={{ color: '#FAFAFA' }}>Escolha o serviço</h2>
            <p className="mt-1 text-sm" style={{ color: '#A1A1AA' }}>Selecione o que você deseja agendar</p>
            {carregando ? (
              <div className="mt-4 space-y-3">
                <div className="h-16 rounded-xl skeleton-shimmer" />
                <div className="h-16 rounded-xl skeleton-shimmer" />
                <div className="h-16 rounded-xl skeleton-shimmer" />
              </div>
            ) : servicos.length===0 ? <p role="status" className="mt-5 rounded-xl border border-white/10 p-5 text-sm text-[#A1A1AA]">Este estabelecimento ainda não disponibilizou serviços para agendamento online.</p> : (
              <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                {servicos.map((s) => {
                  const sel = s.id === servicoId;
                  return (
                    <button
                      key={s.id}
                      aria-pressed={sel}
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
            <h2 ref={stepHeading} tabIndex={-1} className="text-lg font-semibold outline-none" style={{ color: '#FAFAFA' }}>Escolha o profissional</h2>
            <p className="mt-1 text-sm" style={{ color: '#A1A1AA' }}>Quem você prefere atender</p>
            <div className="mt-4 space-y-3">
              <button
                disabled={profissionaisLoading || profissionais.length===0 || !!erroEtapa}
                onClick={() => setProfissionalId('qualquer')}
                className="flex w-full items-center gap-3 rounded-xl p-4 transition-colors"
                style={profissionalId === 'qualquer' ? { backgroundColor: 'rgba(99,102,241,0.08)', border: '1px solid #6366F1' } : { backgroundColor: '#111116', border: '1px solid rgba(255,255,255,0.06)' }}
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg" style={{ backgroundColor: '#18181F', color: '#71717A' }}>
                  <Icon name="user" size="sm" />
                </div>
                <div className="text-left">
                  <div className="text-[15px] font-semibold" style={{ color: '#FAFAFA' }}>Qualquer profissional</div>
                  <div className="text-sm" style={{ color: '#71717A' }}>Primeiro disponível</div>
                </div>
              </button>

              {profissionaisLoading ? (
                <div className="space-y-3">
                  <div className="h-16 rounded-xl skeleton-shimmer" />
                  <div className="h-16 rounded-xl skeleton-shimmer" />
                </div>
              ) : profissionais.length===0 ? <p role="status" className="text-sm text-[#A1A1AA]">Nenhum profissional disponível para agendamento online.</p> : (
                profissionais.map((p) => {
                  const sel = p.id === profissionalId;
                  return (
                    <button
                      key={p.id}
                      aria-pressed={sel}
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
            <h2 ref={stepHeading} tabIndex={-1} className="text-lg font-semibold outline-none" style={{ color: '#FAFAFA' }}>Escolha a data</h2>
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
                  <Icon name="chevron-left" size="sm" />
                </button>
                <span className="text-sm font-semibold capitalize" style={{ color: '#FAFAFA' }}>{labelMes}</span>
                <button
                  onClick={() => setMesOffset((o) => o + 1)}
                  className="flex h-8 w-8 items-center justify-center rounded-md transition-colors"
                  style={{ color: '#A1A1AA' }}
                  aria-label="Próximo mês"
                >
                  <Icon name="chevron-right" size="sm" />
                </button>
              </div>
              <Mes offset={mesOffset} selecionado={data} onSelecionar={setData} hojeIso={hojeIso} />
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
            <h2 ref={stepHeading} tabIndex={-1} className="text-lg font-semibold outline-none" style={{ color: '#FAFAFA' }}>Escolha o horário</h2>
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
            ) : erroEtapa ? null : slots.length === 0 ? (
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
                      aria-pressed={sel}
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
          <form aria-busy={confirmando} onSubmit={(event)=>{event.preventDefault();void confirmar();}}>
            <h2 ref={stepHeading} tabIndex={-1} className="text-lg font-semibold outline-none" style={{ color: '#FAFAFA' }}>Seus dados</h2>
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
                <label htmlFor="booking-nome" className="mb-1 block text-sm" style={{ color: '#A1A1AA' }}>Seu nome completo</label>
                <input
                  id="booking-nome"
                  autoComplete="name" required minLength={2} maxLength={120} disabled={confirmando}
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  placeholder="Ex: Maria Silva"
                  className="h-11 w-full rounded-md border bg-transparent px-3 text-sm outline-none transition-colors focus:border-[#6366F1]"
                  style={{ borderColor: 'rgba(255,255,255,0.10)', color: '#FAFAFA' }}
                />
              </div>
              <div>
                <label htmlFor="booking-telefone" className="mb-1 block text-sm" style={{ color: '#A1A1AA' }}>WhatsApp</label>
                <input
                  id="booking-telefone"
                  autoComplete="tel-national" type="tel" required minLength={14} maxLength={15} disabled={confirmando}
                  value={telefone}
                  onChange={(e) => setTelefone(maskTelefone(e.target.value))}
                  placeholder="(00) 00000-0000"
                  inputMode="tel"
                  className="h-11 w-full rounded-md border bg-transparent px-3 text-sm outline-none transition-colors focus:border-[#6366F1]"
                  style={{ borderColor: 'rgba(255,255,255,0.10)', color: '#FAFAFA' }}
                />
              </div>
              <div>
                <label htmlFor="booking-email" className="mb-1 block text-sm" style={{ color: '#A1A1AA' }}>E-mail <span style={{ color: '#71717A' }}>(opcional)</span></label>
                <input
                  id="booking-email"
                  autoComplete="email" maxLength={254} disabled={confirmando}
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
                type="button" disabled={confirmando}
                onClick={() => setStep(4)}
                className="h-11 w-24 rounded-md border font-medium transition-colors hover:bg-white/5"
                style={{ borderColor: 'rgba(255,255,255,0.10)', color: '#A1A1AA' }}
              >
                ← Voltar
              </button>
              <button
                disabled={confirmando || nome.trim().length<2 || telefone.replace(/\D/g,'').length<10 || (!!email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))}
                type="submit"
                className="h-12 flex-1 rounded-md font-medium transition-opacity disabled:cursor-not-allowed disabled:opacity-40 enabled:hover:opacity-90"
                style={{ backgroundColor: '#6366F1', color: '#FAFAFA' }}
              >
                {confirmando ? 'Confirmando…' : 'Confirmar agendamento'}
              </button>
            </div>
          </form>
        )}
      </main>
    </div>
  );
}
