'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';
import { validarCnpj } from '@nexly/shared';
import { Button } from '@/components/ui/Button';
import { api, setAccessToken } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { ErrorCodes, parseApiError } from '@/lib/errors';
import { maskCnpj, soDigitos } from '@/lib/format';

const schema = z
  .object({
    empresaNome: z.string().min(2, 'Nome da empresa obrigatório'),
    cnpj: z.string().refine((v) => validarCnpj(soDigitos(v)), 'CNPJ inválido'),
    responsavelNome: z.string().min(2, 'Nome do responsável obrigatório'),
    email: z.string().email('E-mail inválido'),
    senha: z.string().min(8, 'Senha deve ter ao menos 8 caracteres'),
    confirmacaoSenha: z.string(),
  })
  .refine((d) => d.senha === d.confirmacaoSenha, {
    message: 'As senhas não coincidem',
    path: ['confirmacaoSenha'],
  });

type FormData = z.infer<typeof schema>;

function AuthInput({
  label,
  error,
  right,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  error?: string;
  right?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2">
      <label className="text-[13px] font-medium" style={{ color: '#A1A1AA' }}>
        {label}
      </label>
      <div className="relative">
        <input
          {...props}
          className={`w-full rounded-xl border bg-[#111116] px-4 py-3 text-[14px] text-[#FAFAFA] placeholder:text-[#71717A] focus:outline-none focus:ring-2 focus:ring-[#6366F1]/30 ${
            error ? 'border-red-500/50' : 'border-[rgba(255,255,255,0.08)]'
          } ${right ? 'pr-11' : ''}`}
        />
        {right && <div className="absolute right-3 top-1/2 -translate-y-1/2">{right}</div>}
      </div>
      {error && <span className="text-xs text-red-400">{error}</span>}
    </div>
  );
}

export default function CadastroPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const {
    register,
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const onSubmit = async (data: FormData): Promise<void> => {
    setError(null);
    try {
      const res = await api.post<{ accessToken: string; usuario: unknown }>('/auth/register', {
        empresaNome: data.empresaNome,
        cnpj: soDigitos(data.cnpj),
        responsavelNome: data.responsavelNome,
        email: data.email,
        senha: data.senha,
      });
      setAccessToken(res.data.accessToken);
      await login(data.email, data.senha).catch(() => undefined);
      router.push('/dashboard');
    } catch (e) {
      const err = parseApiError(e);
      if (err.code === ErrorCodes.EMAIL_TAKEN) {
        setError('Este e-mail já está cadastrado. Tente fazer login ou use outro e-mail.');
      } else if (err.code === ErrorCodes.INVALID_DATETIME) {
        setError('Data/hora inválida.');
      } else if (err.errors && err.errors.length > 0) {
        setError(err.errors[0] ?? 'Dados inválidos');
      } else {
        setError(err.message || 'Não foi possível concluir o cadastro. Verifique os dados.');
      }
    }
  };

  return (
    <div
      className="rounded-3xl border p-8 shadow-2xl"
      style={{ backgroundColor: '#111116', borderColor: 'rgba(255,255,255,0.06)' }}
    >
      <div className="flex justify-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl" style={{ backgroundColor: '#6366F1' }}>
          <img src="/logo.svg" alt="Nexly" className="h-6 w-6 object-contain" />
        </div>
      </div>

      <h1 className="mt-6 text-center text-[24px] font-semibold" style={{ color: '#FAFAFA' }}>
        Boas-vindas ao Nexly
      </h1>
      <p className="mt-2 text-center text-[14px]" style={{ color: '#A1A1AA' }}>
        Gerencie seu negócio de forma inteligente
      </p>

      <div className="mt-8 flex rounded-xl border p-1" style={{ borderColor: 'rgba(255,255,255,0.06)', backgroundColor: '#0C0C10' }}>
        <Link href="/login" className="flex-1 rounded-lg py-2 text-center text-[13px] font-medium transition-colors" style={{ color: '#A1A1AA' }}>
          Entrar
        </Link>
        <Link href="/cadastro" className="flex-1 rounded-lg py-2 text-center text-[13px] font-medium transition-colors" style={{ backgroundColor: '#6366F1', color: '#FAFAFA' }}>
          Criar Conta
        </Link>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4">
        <AuthInput label="Nome da empresa" placeholder="Salão Beleza Total" error={errors.empresaNome?.message} {...register('empresaNome')} />
        <Controller
          name="cnpj"
          control={control}
          render={({ field }) => (
            <AuthInput
              label="CNPJ"
              placeholder="00.000.000/0000-00"
              error={errors.cnpj?.message}
              value={field.value ?? ''}
              onChange={(e) => field.onChange(maskCnpj(e.target.value))}
              onBlur={field.onBlur}
            />
          )}
        />
        <AuthInput label="Nome do responsável" placeholder="Seu nome" error={errors.responsavelNome?.message} {...register('responsavelNome')} />
        <AuthInput label="E-mail" type="email" placeholder="voce@empresa.com" error={errors.email?.message} {...register('email')} />
        <AuthInput
          label="Senha"
          type={showPassword ? 'text' : 'password'}
          placeholder="Mínimo 8 caracteres"
          error={errors.senha?.message}
          right={
            <button type="button" onClick={() => setShowPassword((v) => !v)} className="text-[#71717A] transition-colors hover:text-[#A1A1AA]" aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}>
              {showPassword ? (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/><path d="M4.5 4.5l15 15"/></svg>
              ) : (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
              )}
            </button>
          }
          {...register('senha')}
        />
        <AuthInput label="Confirmar senha" type="password" error={errors.confirmacaoSenha?.message} {...register('confirmacaoSenha')} />

        {error && <p className="text-center text-sm text-red-400">{error}</p>}

        <Button type="submit" loading={isSubmitting} className="w-full rounded-xl py-3 text-[14px] font-semibold shadow-lg shadow-[#6366F1]/20">
          Começar
        </Button>
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
