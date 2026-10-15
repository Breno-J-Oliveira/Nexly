'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { PageToolbar } from '@/components/ui/PageToolbar';
import { ErrorState } from '@/components/ui/ErrorState';
import { toastError, toastSuccess } from '@/components/ui/Toaster';
import { formatarDataHora } from '@/lib/format';

interface Sessao {
  id: string;
  atual: boolean;
  createdAt: string;
  expiresAt: string;
}

export default function MinhaContaPage() {
  const { user, logout } = useAuth();
  const [sessoes, setSessoes] = useState<Sessao[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erroSessoes, setErroSessoes] = useState(false);
  const [revogando, setRevogando] = useState<string | null>(null);
  const [senhaAtual, setSenhaAtual] = useState('');
  const [novaSenha, setNovaSenha] = useState('');
  const [confirmacao, setConfirmacao] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');

  const carregar = useCallback(async (signal?: AbortSignal) => {
    setCarregando(true);
    setErroSessoes(false);
    try {
      const { data } = await api.get<Sessao[]>('/auth/sessions', { signal });
      if (!signal?.aborted) setSessoes(data);
    } catch {
      if (!signal?.aborted) setErroSessoes(true);
    } finally {
      if (!signal?.aborted) setCarregando(false);
    }
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    void carregar(controller.signal);
    return () => controller.abort();
  }, [carregar]);

  const trocarSenha = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (salvando) return;
    setErro('');
    if (novaSenha !== confirmacao) {
      setErro('A confirmação deve ser igual à nova senha.');
      return;
    }
    if (novaSenha === senhaAtual) {
      setErro('Escolha uma senha diferente da atual.');
      return;
    }
    setSalvando(true);
    try {
      await api.post('/usuarios/trocar-senha', { senhaAtual, novaSenha });
      setSenhaAtual('');
      setNovaSenha('');
      setConfirmacao('');
      toastSuccess('Senha alterada. Entre novamente com sua nova senha.');
      await logout();
    } catch (error) {
      const response = error as { response?: { data?: { message?: string } } };
      setErro(
        response.response?.data?.message ?? 'Não foi possível alterar a senha. Tente novamente.',
      );
    } finally {
      setSalvando(false);
    }
  };

  const encerrar = async (sessao: Sessao) => {
    if (revogando) return;
    setRevogando(sessao.id);
    try {
      await api.delete(`/auth/sessions/${sessao.id}`);
      if (sessao.atual) {
        await logout();
        return;
      }
      setSessoes((atual) => atual.filter((item) => item.id !== sessao.id));
      toastSuccess('Sessão encerrada. O acesso foi revogado.');
    } catch {
      toastError('Não foi possível encerrar esta sessão. Tente novamente.');
    } finally {
      setRevogando(null);
    }
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <PageToolbar>
        <div className="min-w-0">
          <h2 className="text-2xl font-semibold text-[#FAFAFA]">Minha conta</h2>
          <p className="mt-1 max-w-full truncate text-sm text-[#A1A1AA]">
            Seu acesso e suas sessões
          </p>
        </div>
      </PageToolbar>
      <p className="break-words text-sm text-[#A1A1AA]">
        {user?.nome} · {user?.email}
      </p>
      <div className="grid items-start gap-6 lg:grid-cols-2">
        <section
          className="rounded-2xl border border-white/10 bg-[#111116] p-5 sm:p-6"
          aria-labelledby="senha-titulo"
        >
          <h2 id="senha-titulo" className="text-lg font-semibold">
            Alterar senha
          </h2>
          <p className="mb-6 mt-2 text-sm leading-relaxed text-[#A1A1AA]">
            Use de 8 a 72 caracteres. Ao salvar, todas as suas sessões serão encerradas, inclusive
            esta.
          </p>
          <form
            onSubmit={(event) => {
              void trocarSenha(event);
            }}
            className="space-y-4"
          >
            <Input
              label="Senha atual"
              type="password"
              autoComplete="current-password"
              required
              maxLength={128}
              value={senhaAtual}
              onChange={(event) => setSenhaAtual(event.target.value)}
            />
            <Input
              label="Nova senha"
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
              maxLength={72}
              value={novaSenha}
              onChange={(event) => setNovaSenha(event.target.value)}
            />
            <Input
              label="Confirmar nova senha"
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
              maxLength={72}
              value={confirmacao}
              onChange={(event) => setConfirmacao(event.target.value)}
            />
            {erro && (
              <p role="alert" className="text-sm text-red-300">
                {erro}
              </p>
            )}
            <Button type="submit" loading={salvando} className="w-full">
              Salvar nova senha
            </Button>
          </form>
        </section>
        <section
          className="rounded-2xl border border-white/10 bg-[#111116] p-5 sm:p-6"
          aria-labelledby="sessoes-titulo"
        >
          <h2 id="sessoes-titulo" className="text-lg font-semibold">
            Sessões ativas
          </h2>
          <p className="mb-5 mt-2 text-sm leading-relaxed text-[#A1A1AA]">
            Não reconhece um acesso? Encerre a sessão e altere sua senha. São exibidas as 50 sessões
            mais recentes.
          </p>
          {carregando ? (
            <p role="status" className="text-sm text-[#A1A1AA]">
              Carregando sessões…
            </p>
          ) : erroSessoes ? (
            <ErrorState
              message="Não foi possível carregar suas sessões"
              onRetry={() => void carregar()}
            />
          ) : (
            <ul className="space-y-3">
              {sessoes.map((sessao) => (
                <li key={sessao.id} className="rounded-xl border border-white/10 bg-[#0C0C10] p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium">
                        {sessao.atual ? 'Esta sessão' : 'Outro acesso'}
                      </p>
                      <p className="mt-1 text-xs text-[#A1A1AA]">
                        Início: {formatarDataHora(sessao.createdAt)}
                      </p>
                      <p className="mt-1 text-xs text-[#A1A1AA]">
                        Expira: {formatarDataHora(sessao.expiresAt)}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      loading={revogando === sessao.id}
                      disabled={revogando !== null}
                      onClick={() => void encerrar(sessao)}
                      aria-label={
                        sessao.atual
                          ? 'Sair desta sessão'
                          : `Encerrar acesso de ${formatarDataHora(sessao.createdAt)}`
                      }
                    >
                      {sessao.atual ? 'Sair' : 'Encerrar'}
                    </Button>
                  </div>
                </li>
              ))}
              {!sessoes.length && (
                <li className="text-sm text-[#A1A1AA]">Nenhuma sessão ativa encontrada.</li>
              )}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
