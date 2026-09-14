'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { validarCnpj } from '@nexly/shared';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { api, setAccessToken } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { ErrorCodes, parseApiError } from '@/lib/errors';
import { maskCnpj, maskTelefone, soDigitos } from '@/lib/format';

const PASSO_COUNT = 5;

const planos = [
  { id: 'BASIC', nome: 'Essencial', preco: 49, periodo: '/mês', descricao: 'Ideal para autônomos e pequenos negócios.', recursos: ['Agenda ilimitada', 'Até 2 profissionais', 'Controle de clientes', 'Suporte por e-mail'], destaque: false },
  { id: 'PRO', nome: 'Profissional', preco: 99, periodo: '/mês', descricao: 'Para negócios em crescimento.', recursos: ['Tudo do Essencial', 'Até 10 profissionais', 'Estoque e PDV', 'Relatórios financeiros', 'Suporte prioritário'], destaque: true },
  { id: 'ENTERPRISE', nome: 'Empresarial', preco: 199, periodo: '/mês', descricao: 'Para redes e franquias.', recursos: ['Tudo do Profissional', 'Profissionais ilimitados', 'Multiunidade', 'API e integrações', 'Suporte dedicado'], destaque: false },
];

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
const schemaPasso4 = z.object({ nomeCartao: z.string().min(3, 'Nome no cartão obrigatório'), numeroCartao: z.string().min(19, 'Número do cartão inválido'), validade: z.string().min(5, 'Validade inválida'), cvv: z.string().min(3, 'CVV inválido') });

type Passo1 = z.infer<typeof schemaPasso1>;
type Passo2 = z.infer<typeof schemaPasso2>;
type Passo3 = z.infer<typeof schemaPasso3>;
type Passo4 = z.infer<typeof schemaPasso4>;

interface FormData extends Passo1, Passo2, Passo3, Passo4 {}

function AuthInput({ label, error, right, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { label: string; error?: string; right?: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <label className="text-[13px] font-medium" style={{ color: '#A1A1AA' }}>{label}</label>
      <div className="relative">
        <input {...props} className={`w-full rounded-xl border bg-[#111116] px-4 py-3 text-[14px] text-[#FAFAFA] placeholder:text-[#71717A] focus:outline-none focus:ring-2 focus:ring-[#6366F1]/30 ${error ? 'border-red-500/50' : 'border-[rgba(255,255,255,0.08)]'} ${right ? 'pr-11' : ''}`} />
        {right && <div className="absolute right-3 top-1/2 -translate-y-1/2">{right}</div>}
      </div>
      {error && <span className="text-xs text-red-400">{error}</span>}
    </div>
  );
}

function Select({ label, error, children, ...props }: React.SelectHTMLAttributes<HTMLSelectElement> & { label: string; error?: string }) {
  return (
    <div className="flex flex-col gap-2">
      <label className="text-[13px] font-medium" style={{ color: '#A1A1AA' }}>{label}</label>
      <select {...props} className={`w-full appearance-none rounded-xl border bg-[#111116] px-4 py-3 text-[14px] text-[#FAFAFA] focus:outline-none focus:ring-2 focus:ring-[#6366F1]/30 ${error ? 'border-red-500/50' : 'border-[rgba(255,255,255,0.08)]'}`}>{children}</select>
      {error && <span className="text-xs text-red-400">{error}</span>}
    </div>
  );
}

function StepIndicator({ passoAtual }: { passoAtual: number }) {
  const labels = ['Dados', 'Negócio', 'Plano', 'Pagamento', 'Conclusão'];
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
  const router = useRouter();
  const { login } = useAuth();
  const [passo, setPasso] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [form, setForm] = useState<Partial<FormData>>({});

  const form1 = useForm<Passo1>({ resolver: zodResolver(schemaPasso1), mode: 'onBlur' });
  const form2 = useForm<Passo2>({ resolver: zodResolver(schemaPasso2), mode: 'onBlur' });
  const form3 = useForm<Passo3>({ resolver: zodResolver(schemaPasso3), mode: 'onBlur' });
  const form4 = useForm<Passo4>({ resolver: zodResolver(schemaPasso4), mode: 'onBlur' });

  const avancar = async (): Promise<void> => {
    setError(null);
    let valid = false;
    let dados: Partial<FormData> = {};
    if (passo === 1) { valid = await form1.trigger(); if (valid) dados = form1.getValues(); }
    else if (passo === 2) { valid = await form2.trigger(); if (valid) dados = form2.getValues(); }
    else if (passo === 3) { valid = await form3.trigger(); if (valid) dados = form3.getValues(); }
    else if (passo === 4) { valid = await form4.trigger(); if (valid) dados = form4.getValues(); }
    if (!valid) return;
    setForm((prev) => ({ ...prev, ...dados }));
    setPasso((p) => Math.min(p + 1, PASSO_COUNT));
  };

  const voltar = (): void => { setError(null); setPasso((p) => Math.max(p - 1, 1)); };

  const finalizar = async (): Promise<void> => {
    setError(null);
    setIsSubmitting(true);
    try {
      const payload = {
        empresaNome: form.empresaNome,
        cnpj: soDigitos(form.cnpj ?? ''),
        responsavelNome: form.responsavelNome,
        email: form.email,
        senha: form.senha,
        telefone: form.telefone,
        segmento: form.segmento,
        cidade: form.cidade,
        plano: form.plano,
        nomeCartao: form.nomeCartao,
        numeroCartao: form.numeroCartao,
        validade: form.validade,
        cvv: form.cvv,
      };
      const res = await api.post<{ accessToken: string; usuario: unknown }>('/auth/register', payload);
      setAccessToken(res.data.accessToken);
      await login(form.email ?? '', form.senha ?? '').catch(() => undefined);
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
          <div className="space-y-4">
            <div className="rounded-xl border p-4" style={{ backgroundColor: '#18181F', borderColor: 'rgba(255,255,255,0.08)' }}>
              <p className="text-[12px] font-semibold uppercase tracking-wide" style={{ color: '#71717A' }}>Plano selecionado</p>
              <div className="mt-1 flex items-center justify-between">
                <span className="font-medium" style={{ color: '#FAFAFA' }}>{planos.find((p) => p.id === (form3.watch('plano') || form.plano))?.nome}</span>
                <span className="font-semibold" style={{ color: '#818CF8' }}>R$ {planos.find((p) => p.id === (form3.watch('plano') || form.plano))?.preco}/mês</span>
              </div>
            </div>
            <AuthInput label="Nome no cartão" placeholder="Como aparece no cartão" error={form4.formState.errors.nomeCartao?.message} {...form4.register('nomeCartao')} defaultValue={form.nomeCartao} />
            <AuthInput label="Número do cartão" placeholder="0000 0000 0000 0000" error={form4.formState.errors.numeroCartao?.message} defaultValue={form.numeroCartao} onChange={(e) => { const v = e.target.value.replace(/\D/g, '').slice(0, 16); const parts = v.match(/.{1,4}/g) ?? []; form4.setValue('numeroCartao', parts.join(' ')); }} />
            <div className="grid grid-cols-2 gap-4">
              <AuthInput label="Validade" placeholder="MM/AA" error={form4.formState.errors.validade?.message} defaultValue={form.validade} onChange={(e) => { const v = e.target.value.replace(/\D/g, '').slice(0, 4); if (v.length > 2) form4.setValue('validade', `${v.slice(0, 2)}/${v.slice(2)}`); else form4.setValue('validade', v); }} />
              <AuthInput label="CVV" placeholder="123" error={form4.formState.errors.cvv?.message} defaultValue={form.cvv} onChange={(e) => form4.setValue('cvv', e.target.value.replace(/\D/g, '').slice(0, 4))} />
            </div>
            <p className="text-[12px]" style={{ color: '#71717A' }}>Pagamento processado de forma segura. Não cobraremos nada durante o período de teste.</p>
          </div>
        );
      case 5:
        return (
          <div className="flex flex-col items-center py-6 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full" style={{ backgroundColor: 'rgba(34,197,94,0.12)' }}>
              <Icon name="check" className="text-[#22C55E]" size="xl" />
            </div>
            <h3 className="mt-4 text-lg font-semibold" style={{ color: '#FAFAFA' }}>Tudo pronto!</h3>
            <p className="mt-2 max-w-xs text-[14px] leading-relaxed" style={{ color: '#A1A1AA' }}>Seu cadastro foi realizado com sucesso. Clique abaixo para acessar o painel do Nexly.</p>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="rounded-3xl border p-8 shadow-2xl" style={{ backgroundColor: '#111116', borderColor: 'rgba(255,255,255,0.06)' }}>
      <div className="flex justify-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl" style={{ backgroundColor: '#6366F1' }}>
          <img src="/logo.svg" alt="Nexly" className="h-6 w-6 object-contain" />
        </div>
      </div>
      <h1 className="mt-6 text-center text-[24px] font-semibold" style={{ color: '#FAFAFA' }}>Crie sua conta no Nexly</h1>
      <p className="mt-2 text-center text-[14px]" style={{ color: '#A1A1AA' }}>{passo === 5 ? 'Bem-vindo ao time!' : 'Gerencie seu negócio de forma inteligente'}</p>
      <div className="mt-8 flex rounded-xl border p-1" style={{ borderColor: 'rgba(255,255,255,0.06)', backgroundColor: '#0C0C10' }}>
        <Link href="/login" className="flex-1 rounded-lg py-2 text-center text-[13px] font-medium transition-colors" style={{ color: '#A1A1AA' }}>Entrar</Link>
        <Link href="/cadastro" className="flex-1 rounded-lg py-2 text-center text-[13px] font-medium transition-colors" style={{ backgroundColor: '#6366F1', color: '#FAFAFA' }}>Criar Conta</Link>
      </div>
      <StepIndicator passoAtual={passo} />
      <form onSubmit={(e) => { e.preventDefault(); if (passo === PASSO_COUNT) void finalizar(); else void avancar(); }} className="space-y-4">
        {renderPasso()}
        {error && <p className="text-center text-sm text-red-400">{error}</p>}
        <div className="flex gap-3 pt-2">
          {passo > 1 && passo < PASSO_COUNT && (
            <Button type="button" variant="secondary" className="flex-1 rounded-xl py-3 text-[14px] font-semibold" onClick={voltar}>Voltar</Button>
          )}
          {passo < PASSO_COUNT ? (
            <Button type="submit" className="flex-1 rounded-xl py-3 text-[14px] font-semibold shadow-lg shadow-[#6366F1]/20">Continuar</Button>
          ) : (
            <Button type="submit" loading={isSubmitting} className="w-full rounded-xl py-3 text-[14px] font-semibold shadow-lg shadow-[#6366F1]/20">Acessar o painel</Button>
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
