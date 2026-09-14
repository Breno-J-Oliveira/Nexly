'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/lib/auth';
import { ErrorCodes, parseApiError } from '@/lib/errors';

const schema = z.object({
  email: z.string().email('E-mail inválido'),
  senha: z.string().min(1, 'Senha obrigatória'),
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

export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const onSubmit = async (data: FormData): Promise<void> => {
    setError(null);
    try {
      await login(data.email, data.senha);
      router.push('/dashboard');
    } catch (e) {
      const err = parseApiError(e);
      if (err.code === ErrorCodes.LOGIN_TOO_MANY_ATTEMPTS) {
        setError('Muitas tentativas de login. Aguarde alguns minutos e tente novamente.');
      } else if (err.code === 'USER_NOT_FOUND') {
        setError('E-mail ou senha incorretos');
      } else {
        setError(err.message || 'E-mail ou senha incorretos');
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
        <Link href="/login" className="flex-1 rounded-lg py-2 text-center text-[13px] font-medium transition-colors" style={{ backgroundColor: '#6366F1', color: '#FAFAFA' }}>
          Entrar
        </Link>
        <Link href="/cadastro" className="flex-1 rounded-lg py-2 text-center text-[13px] font-medium transition-colors" style={{ color: '#A1A1AA' }}>
          Criar conta
        </Link>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4">
        <AuthInput label="E-mail" type="email" placeholder="contato@studionexly.com" error={errors.email?.message} {...register('email')} />
        <AuthInput
          label="Senha"
          type={showPassword ? 'text' : 'password'}
          placeholder="••••••••"
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

        <div className="flex justify-end">
          <Link href="/recuperar-senha" className="text-[13px] font-medium hover:underline" style={{ color: '#818CF8' }}>
            Esqueceu a senha?
          </Link>
        </div>

        {error && <p className="text-center text-sm text-red-400">{error}</p>}

        <Button type="submit" loading={isSubmitting} className="w-full rounded-xl py-3 text-[14px] font-semibold shadow-lg shadow-[#6366F1]/20">
          Entrar no painel
        </Button>
      </form>

      <div className="relative mt-6 flex items-center">
        <div className="flex-1 border-t" style={{ borderColor: 'rgba(255,255,255,0.08)' }} />
        <span className="px-3 text-[11px] font-semibold uppercase tracking-wider" style={{ color: '#71717A' }}>
          ou continue com
        </span>
        <div className="flex-1 border-t" style={{ borderColor: 'rgba(255,255,255,0.08)' }} />
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3">
        <button type="button" className="flex items-center justify-center gap-2 rounded-xl border px-4 py-2.5 text-[13px] font-medium transition-colors hover:bg-white/5" style={{ borderColor: 'rgba(255,255,255,0.08)', color: '#FAFAFA' }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
          Google
        </button>
        <button type="button" className="flex items-center justify-center gap-2 rounded-xl border px-4 py-2.5 text-[13px] font-medium transition-colors hover:bg-white/5" style={{ borderColor: 'rgba(255,255,255,0.08)', color: '#FAFAFA' }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.06 1.87-2.54 6.98.22 8.13-.57 1.5-1.31 2.99-2.27 4.08zm-5.85-15.1c.07-2.04 1.76-3.79 3.8-3.94.29 2.32-1.93 4.48-3.8 3.94z"/></svg>
          Apple
        </button>
      </div>

      <p className="mt-6 text-center text-[12px] leading-relaxed" style={{ color: '#71717A' }}>
        Ao continuar, você concorda com os{' '}
        <Link href="/termos" className="underline hover:text-[#A1A1AA]" style={{ color: '#A1A1AA' }}>
          Termos de Uso
        </Link>{' '}
        e{' '}
        <Link href="/privacidade" className="underline hover:text-[#A1A1AA]" style={{ color: '#A1A1AA' }}>
          Política de Privacidade
        </Link>
        .
      </p>
    </div>
  );
}
