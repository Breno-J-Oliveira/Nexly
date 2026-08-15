'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useAuth } from '@/lib/auth';

const schema = z.object({
  email: z.string().email('E-mail inválido'),
  senha: z.string().min(1, 'Senha obrigatória'),
});

type FormData = z.infer<typeof schema>;

export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
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
    } catch {
      setError('E-mail ou senha incorretos');
    }
  };

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-8">
      <h1 className="text-2xl font-bold text-zinc-100">Entrar</h1>
      <p className="mt-1 text-sm text-zinc-400">Acesse sua conta Nexly</p>

      <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4">
        <Input
          label="E-mail"
          type="email"
          placeholder="voce@empresa.com"
          error={errors.email?.message}
          {...register('email')}
        />
        <Input
          label="Senha"
          type="password"
          placeholder="••••••••"
          error={errors.senha?.message}
          {...register('senha')}
        />
        {error && <p className="text-sm text-red-400">{error}</p>}
        <Button type="submit" loading={isSubmitting} className="w-full">
          Entrar
        </Button>
      </form>

      <p className="mt-4 text-center text-sm text-zinc-400">
        Não tem conta?{' '}
        <Link href="/cadastro" className="font-medium text-primary-400 hover:underline">
          Cadastre sua empresa
        </Link>
      </p>
    </div>
  );
}
