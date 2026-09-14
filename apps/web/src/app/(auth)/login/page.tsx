'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
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
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="text-[#71717A] transition-colors hover:text-[#A1A1AA]"
              aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
            >
              <Icon name={showPassword ? 'eye-slash' : 'eye'} size="sm" color="currentColor" />
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
          <Icon name="google" variant="brand" className="text-[18px]" style={{ color: '#4285F4' }} />
          Google
        </button>
        <button type="button" className="flex items-center justify-center gap-2 rounded-xl border px-4 py-2.5 text-[13px] font-medium transition-colors hover:bg-white/5" style={{ borderColor: 'rgba(255,255,255,0.08)', color: '#FAFAFA' }}>
          <Icon name="apple" variant="brand" className="text-[18px]" style={{ color: '#FAFAFA' }} />
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
