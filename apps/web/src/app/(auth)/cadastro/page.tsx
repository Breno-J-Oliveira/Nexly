'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { formatarCnpj, validarCnpj } from '@nexly/shared';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { api, setAccessToken } from '@/lib/api';
import { useAuth } from '@/lib/auth';

const schema = z
  .object({
    empresaNome: z.string().min(2, 'Nome da empresa obrigatório'),
    cnpj: z.string().refine((v) => validarCnpj(v), 'CNPJ inválido'),
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

export default function CadastroPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const onSubmit = async (data: FormData): Promise<void> => {
    setError(null);
    try {
      const res = await api.post<{ accessToken: string; usuario: unknown }>('/auth/register', {
        empresaNome: data.empresaNome,
        cnpj: formatarCnpj(data.cnpj),
        responsavelNome: data.responsavelNome,
        email: data.email,
        senha: data.senha,
      });
      setAccessToken(res.data.accessToken);
      // Atualiza o contexto de auth sem passar pelo login (que exige senha).
      await login(data.email, data.senha).catch(() => undefined);
      router.push('/dashboard');
    } catch {
      setError('Não foi possível concluir o cadastro. Verifique os dados.');
    }
  };

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-8">
      <h1 className="text-2xl font-bold text-zinc-100">Cadastrar empresa</h1>
      <p className="mt-1 text-sm text-zinc-400">Crie sua conta e comece a usar o Nexly</p>

      <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4">
        <Input label="Nome da empresa" placeholder="Salão Beleza Total" error={errors.empresaNome?.message} {...register('empresaNome')} />
        <Input label="CNPJ" placeholder="00.000.000/0000-00" error={errors.cnpj?.message} {...register('cnpj')} />
        <Input label="Nome do responsável" placeholder="Seu nome" error={errors.responsavelNome?.message} {...register('responsavelNome')} />
        <Input label="E-mail" type="email" placeholder="voce@empresa.com" error={errors.email?.message} {...register('email')} />
        <Input label="Senha" type="password" placeholder="Mínimo 8 caracteres" error={errors.senha?.message} {...register('senha')} />
        <Input label="Confirmar senha" type="password" error={errors.confirmacaoSenha?.message} {...register('confirmacaoSenha')} />
        {error && <p className="text-sm text-red-400">{error}</p>}
        <Button type="submit" loading={isSubmitting} className="w-full">
          Criar conta
        </Button>
      </form>

      <p className="mt-4 text-center text-sm text-zinc-400">
        Já tem conta?{' '}
        <Link href="/login" className="font-medium text-primary-400 hover:underline">
          Entrar
        </Link>
      </p>
    </div>
  );
}
