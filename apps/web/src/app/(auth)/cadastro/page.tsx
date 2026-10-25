'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { Brand } from '@/components/marketing/Brand';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { UsuarioPublico, validarCnpj, normalizeModules, PRESETS, ModuleId } from '@nexly/shared';
import { ModulePicker } from '@/components/ModulePicker';
import { GoogleSignIn } from '@/components/GoogleSignIn';
import { AuthInput, AuthSelect as Select, useAuthReady } from '@/components/ui/AuthField';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { api, waitForSessionRefresh } from '@/lib/api';
import { GoogleRegistration, LoginResponse, useAuth } from '@/lib/auth';
import { ErrorCodes, parseApiError } from '@/lib/errors';
import { maskCnpj, maskTelefone, soDigitos } from '@/lib/format';
import { authLink } from '@/lib/auth-navigation';
import { useAuthDestination } from '@/lib/use-auth-destination';

const PASSO_COUNT = 4;
const SEGMENT_PRESETS: Record<string, string> = { salao: 'salao', barbearia: 'salao', estetica: 'estetica', spa: 'estetica', veterinaria: 'veterinaria', psicologia: 'psicologia', petshop: 'petshop', outro: 'personalizado' };

const schemaPasso1 = z
  .object({
    email: z.string().email('E-mail inválido'),
    senha: z.string().min(8, 'Senha deve ter ao menos 8 caracteres').max(72, 'Use no máximo 72 caracteres'),
  });

const schemaPasso2 = z.object({
  empresaNome: z.string().min(2, 'Nome da empresa obrigatório'),
  segmento: z.string().min(2, 'Segmento obrigatório'),
});
const schemaPerfil = z.object({
  responsavelNome: z.string().min(2, 'Informe seu nome'),
  cnpj: z.string().refine(v => validarCnpj(soDigitos(v)), 'CNPJ inválido'),
  telefone: z.string().min(14, 'Telefone inválido'),
  cidade: z.string().min(2, 'Informe a cidade'),
});

type Passo1 = z.infer<typeof schemaPasso1>;
type Passo2 = z.infer<typeof schemaPasso2>;

interface FormData extends Passo1, Passo2, z.infer<typeof schemaPerfil> {}

function StepIndicator({ passoAtual }: { passoAtual: number }) {
  const labels = ['Conta', 'Negócio', 'Recursos', 'Perfil'];
  return (
    <nav aria-label="Etapas do cadastro" className="my-8 border-y border-white/[0.06] py-6 sm:my-9">
      <p className="mb-5 text-center text-xs text-[#A1A1AA]">Etapa {passoAtual} de {PASSO_COUNT} · {labels[passoAtual - 1]}</p>
      <ol className="flex items-center justify-between gap-2">
        {Array.from({ length: PASSO_COUNT }).map((_, idx) => {
          const num = idx + 1;
          const ativo = num <= passoAtual;
          const atual = num === passoAtual;
          return (
            <li key={num} aria-current={atual ? 'step' : undefined} aria-label={`${num}. ${labels[idx]}`} className="flex min-w-0 flex-1 flex-col items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full text-[13px] font-semibold transition-colors" style={{ backgroundColor: ativo ? '#6366F1' : '#18181F', color: ativo ? '#FAFAFA' : '#71717A', border: `1px solid ${ativo ? '#6366F1' : 'rgba(255,255,255,0.10)'}`, boxShadow: atual ? '0 0 0 4px rgba(99,102,241,0.15)' : undefined }}>{num}</div>
              <span className="hidden text-[11px] font-medium sm:block" style={{ color: atual ? '#FAFAFA' : ativo ? '#A1A1AA' : '#71717A' }}>{labels[idx]}</span>
            </li>
          );
        })}
      </ol>
      <div className="relative mt-3 h-1 rounded-full" style={{ backgroundColor: '#18181F' }}>
        <div className="absolute left-0 top-0 h-1 rounded-full transition-all" style={{ width: `${((passoAtual - 1) / (PASSO_COUNT - 1)) * 100}%`, backgroundColor: '#6366F1' }} />
      </div>
    </nav>
  );
}

export default function CadastroPage() {
  const ready = useAuthReady();
  const destination = useAuthDestination();
  const router = useRouter();
  const { completeLogin, googleRegistration, setGoogleRegistration, setGoogleTwoFactorToken } = useAuth();
  const [passo, setPasso] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [aceitouTermos, setAceitouTermos] = useState(false);
  const [form, setForm] = useState<Partial<FormData>>({});
  const [preset, setPreset] = useState('salao');
  const [modulos, setModulos] = useState<ModuleId[]>(normalizeModules(PRESETS.find(p => p.id === 'salao')!.modulos));

  const form1 = useForm<Passo1>({ resolver: zodResolver(schemaPasso1), mode: 'onBlur' });
  const form2 = useForm<Passo2>({ resolver: zodResolver(schemaPasso2), mode: 'onBlur' });
  const perfil = useForm<z.infer<typeof schemaPerfil>>({ resolver: zodResolver(schemaPerfil), mode: 'onBlur' });

  useEffect(() => {
    const escolhido = new URLSearchParams(window.location.search).get('segmento');
    if (escolhido && Object.hasOwn(SEGMENT_PRESETS, escolhido)) {
      form2.setValue('segmento', escolhido);
      setForm(previous => ({ ...previous, segmento: escolhido }));
    }
  }, [form2]);

  useEffect(() => {
    if (!googleRegistration) return;
    form1.setValue('email', googleRegistration.email);
    perfil.setValue('responsavelNome', googleRegistration.nome);
    setForm((previous) => ({ ...previous, email: googleRegistration.email }));
  }, [googleRegistration, form1, perfil]);

  const segmento = form2.watch('segmento');
  useEffect(() => {
    if (!segmento) return;
    const modelo = PRESETS.find(p => p.id === SEGMENT_PRESETS[segmento]);
    if (modelo) { setPreset(modelo.id); setModulos(normalizeModules(modelo.modulos)); }
  }, [segmento]);

  const avancar = async (): Promise<void> => {
    setError(null);
    let valid = false;
    let dados: Partial<FormData> = {};
    if (passo === 1) { valid = await form1.trigger(); if (valid) dados = form1.getValues(); }
    else if (passo === 2) { valid = await form2.trigger(); if (valid) dados = form2.getValues(); }
    else if (passo === 3) { valid = modulos.length > 0; if (!valid) setError('Escolha pelo menos um recurso.'); }
    if (!valid) return;
    setForm((prev) => ({ ...prev, ...dados }));
    setPasso((p) => Math.min(p + 1, PASSO_COUNT));
  };

  const voltar = (): void => { setError(null); setPasso((p) => Math.max(p - 1, 1)); };

  const finalizar = async (): Promise<void> => {
    if (isSubmitting) return;
    if (!aceitouTermos) { setError('Aceite os Termos de Uso e a Política de Privacidade para continuar.'); return; }
    if (!await perfil.trigger()) return;
    const dadosPerfil = perfil.getValues();
    setError(null);
    setIsSubmitting(true);
    try {
      const payload = {
        empresaNome: form.empresaNome,
        cnpj: soDigitos(dadosPerfil.cnpj),
        responsavelNome: dadosPerfil.responsavelNome,
        email: form.email,
        senha: form.senha,
        telefone: soDigitos(dadosPerfil.telefone),
        segmento: form.segmento,
        cidade: dadosPerfil.cidade,
        preset, modulos,
        plano: 'FREE',
        aceitouTermos: true,
      };
      const res = await api.post<{ accessToken: string; usuario: UsuarioPublico }>(googleRegistration ? '/auth/google/register' : '/auth/register', { ...payload, ...(googleRegistration ? { registrationToken: googleRegistration.registrationToken } : {}) });
      completeLogin(res.data.accessToken, res.data.usuario);
      router.push(destination);
    } catch (e) {
      const err = parseApiError(e);
      if (err.code === ErrorCodes.EMAIL_TAKEN) setError('Este e-mail já está cadastrado. Tente fazer login ou use outro e-mail.');
      else if (err.errors && err.errors.length > 0) setError(err.errors[0] ?? 'Dados inválidos');
      else setError(err.message || 'Não foi possível concluir o cadastro. Tente novamente.');
      setIsSubmitting(false);
    }
  };

  const renderPasso = () => {
    switch (passo) {
      case 1:
        return (
          <div className="space-y-4">
            {googleRegistration && <div className="rounded-xl bg-indigo-500/10 p-3 text-sm text-indigo-200"><p role="status">E-mail confirmado pelo Google. Crie uma senha alternativa para acessar o Nexly também sem o Google.</p><button type="button" className="mt-2 underline" onClick={() => { setGoogleRegistration(null); form1.setValue('email', ''); setForm((previous) => ({ ...previous, email: '' })); }}>Usar outro acesso</button></div>}
            <AuthInput label="E-mail" type="email" readOnly={Boolean(googleRegistration)} placeholder="voce@empresa.com" error={form1.formState.errors.email?.message} {...form1.register('email')} defaultValue={form.email} />
            <AuthInput label="Senha" type={showPassword ? 'text' : 'password'} placeholder="Mínimo 8 caracteres" error={form1.formState.errors.senha?.message} defaultValue={form.senha} {...form1.register('senha')} right={
              <button type="button" onClick={() => setShowPassword((v) => !v)} className="text-[#71717A] transition-colors hover:text-[#A1A1AA]" aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}>
                {showPassword ? (
                  <Icon name="eye-slash" variant="regular" className="text-[#71717A]" />
                ) : (
                  <Icon name="eye" variant="regular" className="text-[#71717A]" />
                )}
              </button>
            } />
          </div>
        );
      case 2:
        return (
          <div className="space-y-4">
            <AuthInput label="Nome da empresa" placeholder="Salão Beleza Total" error={form2.formState.errors.empresaNome?.message} {...form2.register('empresaNome')} defaultValue={form.empresaNome} />
            <Select label="Segmento" error={form2.formState.errors.segmento?.message} defaultValue={form.segmento} {...form2.register('segmento')}>
              <option value="">Selecione o segmento</option>
              <option value="salao">Salão de beleza</option>
              <option value="barbearia">Barbearia</option>
              <option value="estetica">Clínica de estética</option>
              <option value="spa">Spa / Bem-estar</option>
              <option value="veterinaria">Veterinária</option>
              <option value="psicologia">Psicologia</option>
              <option value="petshop">Petshop</option>
              <option value="outro">Outro</option>
            </Select>
          </div>
        );
      case 3:
        return <ModulePicker preset={preset} modulos={modulos} onChange={(p, ids) => { setPreset(p); setModulos(ids); }} />;
      case 4:
        return (
          <div className="space-y-5">
            <AuthInput label="Nome do responsável" placeholder="Seu nome" error={perfil.formState.errors.responsavelNome?.message} {...perfil.register('responsavelNome')} />
            <AuthInput label="CNPJ" placeholder="00.000.000/0000-00" error={perfil.formState.errors.cnpj?.message} value={perfil.watch('cnpj') || ''} onChange={e => perfil.setValue('cnpj', maskCnpj(e.target.value))} />
            <AuthInput label="Telefone do negócio" placeholder="(00) 00000-0000" error={perfil.formState.errors.telefone?.message} value={perfil.watch('telefone') || ''} onChange={e => perfil.setValue('telefone', maskTelefone(e.target.value))} />
            <AuthInput label="Cidade" placeholder="São Paulo, SP" error={perfil.formState.errors.cidade?.message} {...perfil.register('cidade')} />
            <div className="rounded-xl border border-white/10 bg-[#18181F] p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-[#A1A1AA]">Confira seu cadastro</p>
              <p className="mt-2 text-sm leading-6 text-[#A1A1AA]">Acesso gratuito com 1 profissional ativo, sem cartão. Você poderá contratar um plano depois de criar a conta.</p>
              <dl className="mt-4 space-y-3 text-sm">
                {[['Empresa', form.empresaNome], ['E-mail', form.email], ['Recursos', `${modulos.length} selecionados`], ['Acesso', 'Gratuito']].map(([label, value]) => (
                  <div key={label} className="flex flex-wrap justify-between gap-2"><dt className="text-[#A1A1AA]">{label}</dt><dd className="break-all text-right text-[#FAFAFA]">{value}</dd></div>
                ))}
              </dl>
            </div>
            <label className="flex items-start gap-3 text-[13px] leading-relaxed text-[#A1A1AA]">
              <input type="checkbox" checked={aceitouTermos} onChange={(e) => setAceitouTermos(e.target.checked)} className="mt-1 h-4 w-4 shrink-0 accent-[#6366F1]" />
              <span>Li e aceito os <Link href="/termos" target="_blank" className="text-[#818CF8] underline">Termos de Uso</Link> e a <Link href="/privacidade" target="_blank" className="text-[#818CF8] underline">Política de Privacidade</Link>.</span>
            </label>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div data-onboarding-modules={passo === 3 ? 'true' : undefined} className="rounded-2xl border px-6 py-8 sm:p-10" style={{ backgroundColor: '#111116', borderColor: 'rgba(255,255,255,0.06)' }}>
      <div className="flex justify-center"><Brand /></div>
      <h1 className="mt-6 text-center text-[24px] font-semibold" style={{ color: '#FAFAFA' }}>{['Comece pelo seu acesso', 'Configure seu negócio', 'O Nexly se adapta ao seu negócio.', 'Complete seu perfil'][passo - 1]}</h1>
      <p className="mt-2 text-center text-[14px]" style={{ color: '#A1A1AA' }}>{passo === 3 ? 'Escolha os recursos que você precisa e crie uma experiência sob medida.' : passo === PASSO_COUNT ? 'Confira seus dados antes de criar a conta' : 'Gerencie seu negócio de forma inteligente'}</p>
      <div className="mt-8 flex rounded-xl border p-1" style={{ borderColor: 'rgba(255,255,255,0.06)', backgroundColor: '#0C0C10' }}>
        <Link href={authLink('/login', destination)} className="flex-1 rounded-lg py-2 text-center text-[13px] font-medium transition-colors" style={{ color: '#A1A1AA' }}>Entrar</Link>
        <Link href={authLink('/cadastro', destination)} className="flex-1 rounded-lg py-2 text-center text-[13px] font-medium transition-colors" style={{ backgroundColor: '#6366F1', color: '#FAFAFA' }}>Criar Conta</Link>
      </div>
      <StepIndicator passoAtual={passo} />
      <form method="post" onSubmit={(e) => { e.preventDefault(); if (passo === PASSO_COUNT) void finalizar(); else void avancar(); }} className="space-y-4">
        {renderPasso()}
        {error && <p className="text-center text-sm text-red-400">{error}</p>}
        <div className="flex gap-3 pt-2">
          {passo > 1 && (
            <Button type="button" variant="secondary" className="flex-1 rounded-xl py-3 text-[14px] font-semibold" onClick={voltar} disabled={isSubmitting}>Voltar</Button>
          )}
          {passo < PASSO_COUNT ? (
            <Button type="submit" disabled={!ready} className="flex-1 rounded-xl py-3 text-[14px] font-semibold shadow-lg shadow-[#6366F1]/20">Continuar</Button>
          ) : (
            <Button type="submit" loading={isSubmitting || !ready} className="w-full rounded-xl py-3 text-[14px] font-semibold shadow-lg shadow-[#6366F1]/20">Criar conta e acessar</Button>
          )}
        </div>
      </form>
      {passo === 1 && !googleRegistration && <div className="mt-6 border-t border-white/10 pt-5"><GoogleSignIn text="signup_with" onCredential={async (credential) => {
        await waitForSessionRefresh();
        const { data } = await api.post<LoginResponse & Partial<GoogleRegistration> & { requiresRegistration?: boolean }>('/auth/google/login', { credential });
        if (data.requiresRegistration && data.registrationToken && data.email) {
          setGoogleRegistration({ registrationToken: data.registrationToken, email: data.email, nome: data.nome ?? '' });
        } else if (data.accessToken && data.usuario) {
          completeLogin(data.accessToken, data.usuario); router.push(destination);
        } else if (data.requiresTwoFactor && data.tempToken) {
          setGoogleTwoFactorToken(data.tempToken);
          router.push(authLink('/login', destination));
        } else throw new Error('Resposta de autenticação inválida.');
      }} /></div>}
      <p className="mt-6 text-center text-[12px] leading-relaxed" style={{ color: '#71717A' }}>
        Ao continuar, você concorda com os{' '}
        <Link href="/termos" className="underline hover:text-[#A1A1AA]" style={{ color: '#A1A1AA' }}>Termos de Uso</Link>{' '}
        e{' '}
        <Link href="/privacidade" className="underline hover:text-[#A1A1AA]" style={{ color: '#A1A1AA' }}>Política de Privacidade</Link>.
      </p>
    </div>
  );
}
