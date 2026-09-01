'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';

interface Servico { id: string; nome: string; duracaoMin: number; preco: number; }
interface Profissional { id: string; nome: string; fotoUrl: string | null; }
interface Empresa { id: string; nome: string; }

function fmt(v: number): string { return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v); }

export default function BookingPage() {
  const { token } = useParams<{ token: string }>();
  const [empresa, setEmpresa] = useState<Empresa | null>(null);
  const [servicos, setServicos] = useState<Servico[]>([]);
  const [profissionais, setProfissionais] = useState<Profissional[]>([]);
  const [horarios, setHorarios] = useState<string[]>([]);
  const [passo, setPasso] = useState(1);
  const [servicoId, setServicoId] = useState('');
  const [profissionalId, setProfissionalId] = useState('');
  const [data, setData] = useState(() => new Date().toISOString().slice(0, 10));
  const [horario, setHorario] = useState('');
  const [nome, setNome] = useState('');
  const [telefone, setTelefone] = useState('');
  const [email, setEmail] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [sucesso, setSucesso] = useState(false);
  const [erro, setErro] = useState('');

  const api = async (path: string) => {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/booking/${token}${path}`);
    return res.json();
  };

  useEffect(() => { api('').then(setEmpresa).catch(() => setErro('Pagina nao encontrada')); api('/servicos').then(setServicos); api('/profissionais').then(setProfissionais); }, [token]);

  const carregarHorarios = async () => {
    if (!profissionalId || !data) return;
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/booking/${token}/horarios?data=${data}&profissionalId=${profissionalId}`);
    setHorarios(await res.json());
  };

  useEffect(() => { void carregarHorarios(); }, [profissionalId, data]);

  const agendar = async () => {
    setEnviando(true); setErro('');
    try {
      const dh = `${data}T${horario}:00`;
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/booking/${token}/agendar`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ servicoId, profissionalId, dataHora: dh, clienteNome: nome, clienteTelefone: telefone, clienteEmail: email }),
      });
      if (!res.ok) { const j = await res.json(); throw new Error(j.message || 'Erro ao agendar'); }
      setSucesso(true);
    } catch (e: any) { setErro(e.message); }
    finally { setEnviando(false); }
  };

  if (erro && !empresa) return <div className="flex min-h-screen items-center justify-center" style={{ background: '#0C0C10' }}><p style={{ color: '#EF4444', fontSize: 18 }}>{erro}</p></div>;
  if (sucesso) return <div className="flex min-h-screen items-center justify-center" style={{ background: '#0C0C10' }}><div className="rounded-2xl p-10 text-center" style={{ backgroundColor: '#111116', border: '1px solid rgba(34,197,94,0.20)' }}><div className="text-5xl mb-4">✅</div><h2 className="text-xl font-bold" style={{ color: '#22C55E' }}>Agendamento Confirmado!</h2><p className="mt-2" style={{ color: '#A1A1AA' }}>{empresa?.nome} agradece! Voce recebera um lembrete.</p></div></div>;

  return (
    <div className="min-h-screen p-4 sm:p-8" style={{ background: '#0C0C10' }}>
      <div className="mx-auto max-w-2xl">
        <h1 className="text-2xl font-bold" style={{ color: '#FAFAFA' }}>{empresa?.nome || 'Agendamento'}</h1>
        <p className="mt-2" style={{ color: '#71717A' }}>Escolha o servico, profissional e horario</p>

        {/* Step indicator */}
        <div className="mt-6 flex gap-2">{['Servico', 'Profissional', 'Horario', 'Dados'].map((s, i) => <div key={i} className={`flex-1 rounded-full py-1.5 text-center text-xs font-semibold ${passo > i+1 ? '' : passo === i+1 ? '' : ''}`} style={{ backgroundColor: passo > i+1 ? 'rgba(99,102,241,0.15)' : passo === i+1 ? '#6366F1' : '#111116', color: passo >= i+1 ? '#FAFAFA' : '#3F3F46' }}>{s}</div>)}</div>

        {/* Step 1: Servico */}
        {passo === 1 && <div className="mt-6 space-y-3">{servicos.map(s => <button key={s.id} onClick={() => { setServicoId(s.id); setPasso(2); }} className="w-full rounded-xl p-4 text-left transition-colors" style={{ backgroundColor: '#111116', border: servicoId===s.id ? '1px solid #6366F1' : '1px solid rgba(255,255,255,0.06)' }}><span className="font-semibold" style={{ color: '#FAFAFA' }}>{s.nome}</span><span className="ml-3" style={{ color: '#A1A1AA' }}>{s.duracaoMin}min</span><span className="float-right font-bold" style={{ color: '#818CF8' }}>{fmt(Number(s.preco))}</span></button>)}</div>}

        {/* Step 2: Profissional */}
        {passo === 2 && <div className="mt-6 space-y-3">{profissionais.map(p => <button key={p.id} onClick={() => { setProfissionalId(p.id); setPasso(3); }} className="w-full rounded-xl p-4 text-left transition-colors" style={{ backgroundColor: '#111116', border: profissionalId===p.id ? '1px solid #6366F1' : '1px solid rgba(255,255,255,0.06)' }}><div className="flex h-10 w-10 items-center justify-center rounded-full text-lg font-bold" style={{ backgroundColor: '#6366F1', color: '#FAFAFA', display: 'inline-flex' }}>{p.nome.charAt(0)}</div><span className="ml-3 text-lg font-semibold" style={{ color: '#FAFAFA' }}>{p.nome}</span></button>)}</div>}

        {/* Step 3: Data + Horario */}
        {passo === 3 && (<div className="mt-6"><input type="date" value={data} onChange={e => setData(e.target.value)} className="w-full rounded-xl border px-4 py-3 text-[15px]" style={{ backgroundColor: '#111116', borderColor: 'rgba(255,255,255,0.10)', color: '#FAFAFA' }} /><div className="mt-4 grid grid-cols-4 gap-2">{horarios.length===0 ? <p style={{color:'#71717A',gridColumn:'span 4',textAlign:'center',padding:'24px 0'}}>Nenhum horario disponivel nesta data</p> : horarios.map(h => <button key={h} onClick={() => { setHorario(h); setPasso(4); }} className="rounded-xl py-3 text-center text-sm font-semibold transition-colors" style={{ backgroundColor: horario===h ? '#6366F1' : '#111116', color: horario===h ? '#FAFAFA' : '#A1A1AA', border: horario===h ? '1px solid #6366F1' : '1px solid rgba(255,255,255,0.06)' }}>{h}</button>)}</div></div>)}

        {/* Step 4: Dados do cliente */}
        {passo === 4 && (<div className="mt-6 space-y-4 rounded-xl p-6" style={{ backgroundColor: '#111116', border: '1px solid rgba(255,255,255,0.06)' }}><h3 className="text-lg font-semibold" style={{ color: '#FAFAFA' }}>Seus dados</h3><div className="flex flex-col gap-1.5"><label className="text-sm font-medium" style={{ color: '#A1A1AA' }}>Nome</label><input className="rounded-lg border px-3 py-2" style={{ backgroundColor: '#0C0C10', borderColor: 'rgba(255,255,255,0.10)', color: '#FAFAFA' }} value={nome} onChange={e=>setNome(e.target.value)} placeholder="Seu nome completo" /></div><div className="flex flex-col gap-1.5"><label className="text-sm font-medium" style={{ color: '#A1A1AA' }}>Telefone (WhatsApp)</label><input className="rounded-lg border px-3 py-2" style={{ backgroundColor: '#0C0C10', borderColor: 'rgba(255,255,255,0.10)', color: '#FAFAFA' }} value={telefone} onChange={e=>setTelefone(e.target.value)} placeholder="(11) 99999-9999" /></div><div className="flex flex-col gap-1.5"><label className="text-sm font-medium" style={{ color: '#A1A1AA' }}>E-mail (opcional)</label><input type="email" className="rounded-lg border px-3 py-2" style={{ backgroundColor: '#0C0C10', borderColor: 'rgba(255,255,255,0.10)', color: '#FAFAFA' }} value={email} onChange={e=>setEmail(e.target.value)} placeholder="seu@email.com" /></div>{erro && <p style={{color:'#EF4444',fontSize:13}}>{erro}</p>}<button onClick={agendar} disabled={!nome||!telefone||enviando} className="mt-4 w-full rounded-xl py-3 text-center font-bold transition-all" style={{ backgroundColor: (!nome||!telef
one) ? '#3F3F46' : '#6366F1', color: '#FAFAFA' }}>{enviando ? 'Agendando...' : 'Confirmar Agendamento'}</button></div>)}
        {passo > 1 && <button onClick={()=>setPasso(passo-1)} className='mt-4 text-sm' style={{color:'#818CF8'}}>← Voltar</button>}
      </div>
    </div>
  );
}