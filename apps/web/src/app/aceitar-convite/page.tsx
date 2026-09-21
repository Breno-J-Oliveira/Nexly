'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { api } from '@/lib/api';
import { toastError, toastSuccess } from '@/components/ui/Toaster';

interface ConviteInfo {
  email: string;
  role: string;
  empresaNome: string;
}

export default function AceitarConvitePage() {
  const [token, setToken] = useState('');
  const [convite, setConvite] = useState<ConviteInfo | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [form, setForm] = useState({ nome: '', senha: '', confirmar: '' });
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    const t = new URLSearchParams(window.location.search).get('token') ?? '';
    setToken(t);
    if (!t) {
      setErro('Link inválido.');
      return;
    }
    api
      .get<ConviteInfo>('/auth/aceitar-convite', { params: { token: t } })
      .then((r) => setConvite(r.data))
      .catch((e) => {
        const err = e as { response?: { data?: { message?: string } } };
        setErro(err?.response?.data?.message ?? 'Convite inválido ou expirado');
      });
  }, []);

  const enviar = async (): Promise<void> => {
    if (form.senha !== form.confirmar) {
      toastError('As senhas não coincidem');
      return;
    }
    setSalvando(true);
    try {
      await api.post('/auth/aceitar-convite', {
        token,
        nome: form.nome,
        senha: form.senha,
      });
      toastSuccess('Conta criada! Faça login.');
      window.location.href = '/login';
    } catch (e) {
      const err = e as { response?: { data?: { message?: string } } };
      toastError(err?.response?.data?.message ?? 'Erro ao criar conta');
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div
      className="flex min-h-screen items-center justify-center p-4"
      style={{ backgroundColor: '#0C0C10' }}
    >
      <div
        className="w-full max-w-md rounded-2xl border p-6"
        style={{ borderColor: 'rgba(255,255,255,0.08)', backgroundColor: '#111116' }}
      >
        <h1 className="text-xl font-semibold" style={{ color: '#FAFAFA' }}>
          Aceitar convite
        </h1>
        {erro ? (
          <p className="mt-4 text-sm" style={{ color: '#EF4444' }}>
            {erro}
          </p>
        ) : !convite ? (
          <p className="mt-4 text-sm" style={{ color: '#71717A' }}>
            Carregando…
          </p>
        ) : (
          <div className="mt-4 space-y-3">
            <p className="text-sm" style={{ color: '#A1A1AA' }}>
              Você foi convidado para <strong style={{ color: '#FAFAFA' }}>{convite.empresaNome}</strong>{' '}
              como <strong style={{ color: '#FAFAFA' }}>{convite.role}</strong> ({convite.email}).
            </p>
            <Input
              label="Nome completo"
              value={form.nome}
              onChange={(e) => setForm({ ...form, nome: e.target.value })}
              placeholder="Seu nome"
            />
            <Input
              label="Senha"
              type="password"
              value={form.senha}
              onChange={(e) => setForm({ ...form, senha: e.target.value })}
              placeholder="••••••••"
            />
            <Input
              label="Confirmar senha"
              type="password"
              value={form.confirmar}
              onChange={(e) => setForm({ ...form, confirmar: e.target.value })}
              placeholder="••••••••"
            />
            <Button
              onClick={() => void enviar()}
              loading={salvando}
              disabled={!form.nome || form.senha.length < 8}
              className="w-full"
            >
              Criar conta
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
