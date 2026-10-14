'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { UsuarioPublico, validarCnpj } from '@nexly/shared';
import { AuthInput, AuthSelect as Select, useAuthReady } from '@/components/ui/AuthField';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { ErrorCodes, parseApiError } from '@/lib/errors';
import { maskCnpj, maskTelefone, soDigitos } from '@/lib/format';

const PASSO_COUNT = 4;

const planos = [{ id: 'FREE', nome: 'Acesso gratuito', preco: 0, periodo: '', descricao: 'Comece a organizar seu negócio sem informar cartão.', recursos: ['Agenda e clientes', 'Estoque e PDV', 'Relatórios e gestão'], destaque: false }];

const schemaPasso1 = z
  .object({
    empresaNome: z.string().min(2, 'Nome da empresa obrigatório'),
    cnpj: z.string().refine((v) => validarCnpj(soDigitos(v)), 'CNPJ inválido'),
    responsavelNome: z.string().min(2, 'Nome do responsável obrigatório'),
    email: z.string().email('E-mail inválido'),
    senha: z.string().min(8, 'Senha deve ter ao menos 8 caracteres'),
    confirmacaoSenha: z.string(),
  })
  .refine((d) => d.senha === d.confirmacaoSenha, { message: 'As senhas não coincidem', path: ['confirmacaoSenha'] });

const schemaPasso2 = z.object({ telefone: z.string().min(14, 'Telefone inválido'), segmento: z.string().min(2, 'Segmento obrigatório'), cidade: z.string().min(2, 'Cidade obrigatória') });
const schemaPasso3 = z.object({ plano: z.string().min(1, 'Selecione um plano') });

type Passo1 = z.infer<typeof schemaPasso1>;
type Passo2 = z.infer<typeof schemaPasso2>;
type Passo3 = z.infer<typeof schemaPasso3>;

interface FormData extends Passo1, Passo2, Passo3 {}

function StepIndicator({ passoAtual }: { passoAtual: number }) {
  const labels = ['Dados', 'Negócio', 'Acesso', 'Revisão'];
  return (
    <div className="mb-8">
      <div className="flex items-center justify-between">
        {Array.from({ length: PASSO_COUNT }).map((_, idx) => {
          const num = idx + 1;
          const ativo = num <= passoAtual;
          const atual = num === passoAtual;
          return (
            <div key={num} className="flex flex-1 flex-col items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full text-[13px] font-semibold transition-colors" style={{ backgroundColor: ativo ? '#6366F1' : '#18181F', color: ativo ? '#FAFAFA' : '#71717A', border: `1px solid ${ativo ? '#6366F1' : 'rgba(255,255,255,0.10)'}`, boxShadow: atual ? '0 0 0 4px rgba(99,102,241,0.15)' : undefined }}>{num}</div>
              <span className="hidden text-[11px] font-medium sm:block" style={{ color: atual ? '#FAFAFA' : ativo ? '#A1A1AA' : '#71717A' }}>{labels[idx]}</span>
            </div>
          );
        })}
      </div>
      <div className="relative mt-3 h-1 rounded-full" style={{ backgroundColor: '#18181F' }}>
        <div className="absolute left-0 top-0 h-1 rounded-full transition-all" style={{ width: `${((passoAtual - 1) / (PASSO_COUNT - 1)) * 100}%`, backgroundColor: '#6366F1' }} />
      </div>
    </div>
  );
}

export default function CadastroPage() {
  const ready = useAuthReady();
  const router = useRouter();
  const { completeLogin } = useAuth();
  const [passo, setPasso] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [aceitouTermos, setAceitouTermos] = useState(false);
  const [form, setForm] = useState<Partial<FormData>>({});

  const form1 = useForm<Passo1>({ resolver: zodResolver(schemaPasso1), mode: 'onBlur' });
  const form2 = useForm<Passo2>({ resolver: zodResolver(schemaPasso2), mode: 'onBlur' });
  const form3 = useForm<Passo3>({ resolver: zodResolver(schemaPasso3), mode: 'onBlur', defaultValues: { plano: 'FREE' } });

  const avancar = async (): Promise<void> => {
    setError(null);
    let valid = false;
    let dados: Partial<FormData> = {};
    if (passo === 1) { valid = await form1.trigger(); if (valid) dados = form1.getValues(); }
    else if (passo === 2) { valid = await form2.trigger(); if (valid) dados = form2.getValues(); }
    else if (passo === 3) { valid = await form3.trigger(); if (valid) dados = form3.getValues(); }
    if (!valid) return;
    setForm((prev) => ({ ...prev, ...dados }));
    setPasso((p) => Math.min(p + 1, PASSO_COUNT));
  };

  const voltar = (): void => { setError(null); setPasso((p) => Math.max(p - 1, 1)); };

  const finalizar = async (): Promise<void> => {
    if (isSubmitting) return;
    if (!aceitouTermos) { setError('Aceite os Termos de Uso e a Política de Privacidade para continuar.'); return; }
    setError(null);
    setIsSubmitting(true);
    try {
      const payload = {
        empresaNome: form.empresaNome,
        cnpj: soDigitos(form.cnpj ?? ''),
        responsavelNome: form.responsavelNome,
        email: form.email,
        senha: form.senha,
        telefone: soDigitos(form.telefone ?? ''),
        segmento: form.segmento,
        cidade: form.cidade,
        plano: 'FREE',
        aceitouTermos: true,
      };
      const res = await api.post<{ accessToken: string; usuario: UsuarioPublico }>('/auth/register', payload);
      completeLogin(res.data.accessToken, res.data.usuario);
      router.push('/dashboard');
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
            <AuthInput label="Nome da empresa" placeholder="Salão Beleza Total" error={form1.formState.errors.empresaNome?.message} {...form1.register('empresaNome')} defaultValue={form.empresaNome} />
            <AuthInput label="CNPJ" placeholder="00.000.000/0000-00" error={form1.formState.errors.cnpj?.message} defaultValue={form.cnpj} onChange={(e) => form1.setValue('cnpj', maskCnpj(e.target.value))} />
            <AuthInput label="Nome do responsável" placeholder="Seu nome" error={form1.formState.errors.responsavelNome?.message} {...form1.register('responsavelNome')} defaultValue={form.responsavelNome} />
            <AuthInput label="E-mail" type="email" placeholder="voce@empresa.com" error={form1.formState.errors.email?.message} {...form1.register('email')} defaultValue={form.email} />
            <AuthInput label="Senha" type={showPassword ? 'text' : 'password'} placeholder="Mínimo 8 caracteres" error={form1.formState.errors.senha?.message} defaultValue={form.senha} {...form1.register('senha')} right={
              <button type="button" onClick={() => setShowPassword((v) => !v)} className="text-[#71717A] transition-colors hover:text-[#A1A1AA]" aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}>
                {showPassword ? (
                  <Icon name="eye-slash" variant="regular" className="text-[#71717A]" />
                ) : (
                  <Icon name="eye" variant="regular" className="text-[#71717A]" />
                )}
              </button>
            } />
            <AuthInput label="Confirmar senha" type="password" error={form1.formState.errors.confirmacaoSenha?.message} {...form1.register('confirmacaoSenha')} defaultValue={form.confirmacaoSenha} />
          </div>
        );
      case 2:
        return (
          <div className="space-y-4">
            <AuthInput label="Telefone do negócio" placeholder="(00) 00000-0000" error={form2.formState.errors.telefone?.message} defaultValue={form.telefone} onChange={(e) => form2.setValue('telefone', maskTelefone(e.target.value))} />
            <Select label="Segmento" error={form2.formState.errors.segmento?.message} defaultValue={form.segmento} {...form2.register('segmento')}>
              <option value="">Selecione o segmento</option>
              <option value="salao">Salão de beleza</option>
              <option value="barbearia">Barbearia</option>
              <option value="estetica">Clínica de estética</option>
              <option value="spa">Spa / Bem-estar</option>
              <option value="outro">Outro</option>
            </Select>
            <AuthInput label="Cidade" placeholder="São Paulo, SP" error={form2.formState.errors.cidade?.message} {...form2.register('cidade')} defaultValue={form.cidade} />
          </div>
        );
      case 3:
        return (
          <div className="space-y-3">
            {planos.map((plano) => {
              const selecionado = form3.watch('plano') === plano.id || form.plano === plano.id;
              return (
                <button key={plano.id} type="button" onClick={() => form3.setValue('plano', plano.id, { shouldValidate: true })} className="relative w-full rounded-2xl border p-4 text-left transition-all" style={{ backgroundColor: selecionado ? 'rgba(99,102,241,0.10)' : '#111116', borderColor: selecionado ? '#6366F1' : 'rgba(255,255,255,0.08)' }}>
                  {plano.destaque && <span className="absolute right-3 top-3 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide" style={{ backgroundColor: '#6366F1', color: '#FAFAFA' }}>Popular</span>}
                  <div className="flex items-end gap-2"><span className="text-2xl font-bold" style={{ color: '#FAFAFA' }}>R$ {plano.preco}</span><span className="text-sm" style={{ color: '#A1A1AA' }}>{plano.periodo}</span></div>
                  <div className="mt-1 text-[15px] font-semibold" style={{ color: '#FAFAFA' }}>{plano.nome}</div>
                  <p className="text-[13px]" style={{ color: '#A1A1AA' }}>{plano.descricao}</p>
                  <ul className="mt-3 space-y-1">
                    {plano.recursos.map((r, i) => (
                      <li key={i} className="flex items-center gap-2 text-[12px]" style={{ color: '#A1A1AA' }}>
                        <Icon name="check" className="text-[#22C55E]" size="sm" />
                        {r}
                      </li>
                    ))}
                  </ul>
                </button>
              );
            })}
            {form3.formState.errors.plano?.message && <span className="text-xs text-red-400">{form3.formState.errors.plano.message}</span>}
          </div>
        );
      case 4:
        return (
          <div className="space-y-5">
            <div className="rounded-xl border border-white/10 bg-[#18181F] p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-[#A1A1AA]">Confira seu cadastro</p>
              <dl className="mt-4 space-y-3 text-sm">
                {[['Empresa', form.empresaNome], ['Responsável', form.responsavelNome], ['E-mail', form.email], ['Cidade', form.cidade], ['Acesso', 'Gratuito']].map(([label, value]) => (
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
    <div className="rounded-2xl border px-6 py-8 shadow-2xl sm:p-10" style={{ backgroundColor: '#111116', borderColor: 'rgba(255,255,255,0.06)' }}>
      <div className="flex justify-center">
        <div className="flex h-12 w-12 items-center justify-center">
          <Image src="/logo.svg" alt="Nexly" width={40} height={40} className="h-10 w-10 object-contain" />
        </div>
      </div>
      <h1 className="mt-6 text-center text-[24px] font-semibold" style={{ color: '#FAFAFA' }}>Crie sua conta no Nexly</h1>
      <p className="mt-2 text-center text-[14px]" style={{ color: '#A1A1AA' }}>{passo === 4 ? 'Confira seus dados antes de criar a conta' : 'Gerencie seu negócio de forma inteligente'}</p>
      <div className="mt-8 flex rounded-xl border p-1" style={{ borderColor: 'rgba(255,255,255,0.06)', backgroundColor: '#0C0C10' }}>
        <Link href="/login" className="flex-1 rounded-lg py-2 text-center text-[13px] font-medium transition-colors" style={{ color: '#A1A1AA' }}>Entrar</Link>
        <Link href="/cadastro" className="flex-1 rounded-lg py-2 text-center text-[13px] font-medium transition-colors" style={{ backgroundColor: '#6366F1', color: '#FAFAFA' }}>Criar Conta</Link>
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
      <p className="mt-6 text-center text-[12px] leading-relaxed" style={{ color: '#71717A' }}>
        Ao continuar, você concorda com os{' '}
        <Link href="/termos" className="underline hover:text-[#A1A1AA]" style={{ color: '#A1A1AA' }}>Termos de Uso</Link>{' '}
        e{' '}
        <Link href="/privacidade" className="underline hover:text-[#A1A1AA]" style={{ color: '#A1A1AA' }}>Política de Privacidade</Link>.
      </p>
    </div>
  );
}
