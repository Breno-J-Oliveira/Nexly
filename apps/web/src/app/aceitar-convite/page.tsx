'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { AuthInput, useAuthReady } from '@/components/ui/AuthField';
import { AuthShell } from '@/components/marketing/AuthShell';
import { api } from '@/lib/api';
import { parseApiError } from '@/lib/errors';
import { toastSuccess } from '@/components/ui/Toaster';

interface ConviteInfo {
  email: string;
  role: string;
  empresaNome: string;
}
const roles: Record<string, string> = {
  ADMIN: 'Administrador',
  GESTOR: 'Gestor',
  CAIXA: 'Caixa',
  RECEPCIONISTA: 'Recepcionista',
  PROFISSIONAL: 'Profissional',
};

export default function AceitarConvitePage() {
  const ready = useAuthReady();
  const router = useRouter();
  const token = useRef('');
  const submitting = useRef(false);
  const [convite, setConvite] = useState<ConviteInfo | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [erroForm, setErroForm] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ nome: '', senha: '', confirmar: '' });
  const [salvando, setSalvando] = useState(false);
  const [tentativa, setTentativa] = useState(0);

  const carregar = useCallback(async (signal: AbortSignal) => {
    setLoading(true);
    setErro(null);
    try {
      if (!token.current)
        throw new Error('Link inválido. Peça um novo convite ao administrador do seu negócio.');
      const { data } = await api.post<ConviteInfo>(
        '/auth/convite/detalhes',
        { token: token.current },
        { signal, timeout: 10000 },
      );
      if (!signal.aborted) setConvite(data);
    } catch (error) {
      if (!signal.aborted)
        setErro(parseApiError(error).message || 'Não foi possível consultar o convite.');
    } finally {
      if (!signal.aborted) setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Fragmentos não são enviados ao servidor ou ao Referer. Links antigos continuam válidos.
    token.current ||=
      new URLSearchParams(window.location.hash.slice(1)).get('token') ||
      new URLSearchParams(window.location.search).get('token') ||
      '';
    if (window.location.hash || window.location.search)
      window.history.replaceState(window.history.state, '', window.location.pathname);
    const controller = new AbortController();
    void carregar(controller.signal);
    return () => controller.abort();
  }, [carregar, tentativa]);

  async function enviar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!ready || submitting.current) return;
    setErroForm(null);
    if (form.senha !== form.confirmar) {
      setErroForm('As senhas não coincidem. Confira os dois campos.');
      return;
    }
    submitting.current = true;
    setSalvando(true);
    try {
      await api.post('/auth/aceitar-convite', {
        token: token.current,
        nome: form.nome.trim(),
        senha: form.senha,
      });
      setForm({ nome: '', senha: '', confirmar: '' });
      toastSuccess('Conta criada! Faça login.');
      router.replace('/login');
    } catch (error) {
      setErroForm(
        parseApiError(error).message || 'Não foi possível criar sua conta. Tente novamente.',
      );
    } finally {
      submitting.current = false;
      setSalvando(false);
    }
  }

  return (
    <AuthShell>
      <div className="rounded-2xl border border-white/10 bg-[#111116] p-6 sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#818CF8]">
          Seu novo espaço de trabalho
        </p>
        <h1 className="mt-4 text-3xl font-semibold tracking-[-0.04em] text-white">
          Aceitar convite
        </h1>
        {loading ? (
          <p role="status" className="mt-6 text-sm leading-7 text-[#A1A1AA]">
            Consultando seu convite…
          </p>
        ) : erro ? (
          <div className="mt-6">
            <p role="alert" className="text-sm leading-7 text-red-300">
              {erro}
            </p>
            <button
              type="button"
              onClick={() => setTentativa((value) => value + 1)}
              className="mt-5 min-h-11 rounded-xl border border-white/15 px-4 text-sm font-medium text-[#818CF8] hover:bg-white/5"
            >
              Tentar novamente
            </button>
            <Link
              href="/login"
              className="mt-4 block rounded py-2 text-sm text-[#A1A1AA] hover:text-white"
            >
              Já tenho conta. Ir para o login →
            </Link>
          </div>
        ) : (
          convite && (
            <>
              <div className="mt-6 rounded-xl border border-[#818CF8]/15 bg-[#818CF8]/5 p-4">
                <p className="text-sm leading-7 text-[#A1A1AA]">
                  Você foi convidado para{' '}
                  <strong className="font-medium text-white">{convite.empresaNome}</strong>.
                </p>
                <dl className="mt-3 space-y-2 text-xs leading-6">
                  <div>
                    <dt className="text-[#A1A1AA]">Acesso como</dt>
                    <dd className="text-[#DBD6EB]">{roles[convite.role] || convite.role}</dd>
                  </div>
                  <div>
                    <dt className="text-[#A1A1AA]">E-mail da conta</dt>
                    <dd className="break-all text-[#DBD6EB]">{convite.email}</dd>
                  </div>
                </dl>
              </div>
              <form
                method="post"
                onSubmit={(event) => void enviar(event)}
                className="mt-6 space-y-4"
              >
                <AuthInput
                  label="Nome completo"
                  name="nome"
                  autoComplete="name"
                  required
                  minLength={2}
                  maxLength={120}
                  value={form.nome}
                  onChange={(event) => setForm({ ...form, nome: event.target.value })}
                  disabled={salvando}
                  placeholder="Como você prefere ser chamado?"
                />
                <AuthInput
                  label="Senha"
                  name="senha"
                  type="password"
                  autoComplete="new-password"
                  required
                  minLength={8}
                  maxLength={72}
                  value={form.senha}
                  onChange={(event) => setForm({ ...form, senha: event.target.value })}
                  disabled={salvando}
                  aria-describedby="invite-password-help"
                />
                <p id="invite-password-help" className="text-xs leading-6 text-[#A1A1AA]">
                  Use de 8 a 72 caracteres. Prefira uma senha única para o Nexly.
                </p>
                <AuthInput
                  label="Confirmar senha"
                  name="confirmar"
                  type="password"
                  autoComplete="new-password"
                  required
                  minLength={8}
                  maxLength={72}
                  value={form.confirmar}
                  onChange={(event) => setForm({ ...form, confirmar: event.target.value })}
                  disabled={salvando}
                />
                {erroForm && (
                  <p
                    role="alert"
                    className="rounded-xl border border-red-300/20 bg-red-300/5 p-3 text-sm leading-6 text-red-300"
                  >
                    {erroForm}
                  </p>
                )}
                <button
                  type="submit"
                  disabled={!ready || salvando}
                  aria-busy={salvando || undefined}
                  className="min-h-12 w-full rounded-xl bg-[#6366F1] px-4 py-3 text-sm font-semibold text-[#FAFAFA] transition-colors hover:bg-[#4F46E5] disabled:cursor-wait disabled:opacity-60"
                >
                  {salvando ? 'Criando sua conta…' : 'Criar conta'}
                </button>
              </form>
              <p className="mt-5 text-xs leading-6 text-[#A1A1AA]">
                O convite cria seu acesso ao negócio indicado acima. Não é necessário informar
                cartão de crédito.
              </p>
            </>
          )
        )}
      </div>
    </AuthShell>
  );
}
