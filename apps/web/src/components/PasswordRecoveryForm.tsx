'use client';
import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { useApi } from '@/lib/useApi';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { ActionStatus, useAction } from '@/components/gestao/GestaoUI';
export function PasswordRecoveryForm() {
  const status = useApi<{ disponivel: boolean }>('/auth/recuperacao/status'),
    action = useAction();
  const [email, setEmail] = useState(''),
    [enviado, setEnviado] = useState(false);
  if (status.loading)
    return (
      <p role="status" className="mt-6 text-sm text-[#A1A1AA]">
        Verificando disponibilidade…
      </p>
    );
  if (!status.data?.disponivel)
    return (
      <div
        role="status"
        className="mt-6 rounded-xl border border-amber-400/20 bg-amber-500/5 p-4 text-sm leading-6 text-[#D4D4D8]"
      >
        <p className="font-medium text-amber-200">Recuperação por e-mail indisponível</p>
        <p className="mt-2">
          O envio de instruções por e-mail ainda não está disponível. Você pode voltar ao login para
          tentar entrar novamente.
        </p>
        {status.error && (
          <Button className="mt-3" variant="ghost" onClick={() => void status.refetch()}>
            Verificar novamente
          </Button>
        )}
      </div>
    );
  return (
    <form
      className="mt-6 space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        void action.run(async () => {
          await api.post('/auth/recuperacao/solicitar', { email: email.trim().toLowerCase() });
          setEnviado(true);
        }, 'Se a conta existir e estiver ativa, enviaremos as instruções. O link expira em 30 minutos.');
      }}
    >
      <Input
        label="E-mail da conta"
        type="email"
        autoComplete="email"
        required
        maxLength={254}
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <ActionStatus {...action} />
      <Button type="submit" loading={action.busy} disabled={enviado}>
        Enviar instruções
      </Button>
    </form>
  );
}
export function PasswordResetForm() {
  const [token, setToken] = useState<string | null>(null),
    [senha, setSenha] = useState(''),
    [confirmacao, setConfirmacao] = useState(''),
    [concluido, setConcluido] = useState(false);
  const action = useAction(),
    lido = useRef(false);
  useEffect(() => {
    if (lido.current) return;
    lido.current = true;
    const value = new URLSearchParams(window.location.hash.slice(1)).get('token') ?? '';
    setToken(/^[a-f0-9]{64}$/.test(value) ? value : '');
    window.history.replaceState(window.history.state, '', window.location.pathname);
  }, []);
  if (token === null) return <p role="status">Preparando redefinição…</p>;
  if (!token)
    return (
      <p role="alert" className="text-sm text-amber-200">
        O link é inválido.{' '}
        <Link className="underline" href="/recuperar-senha">
          Solicite um novo link.
        </Link>
      </p>
    );
  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        if (senha !== confirmacao) return;
        void action.run(async () => {
          await api.post('/auth/recuperacao/redefinir', { token, senha });
          setConcluido(true);
          setSenha('');
          setConfirmacao('');
          setToken('concluido');
        }, 'Senha alterada. Todas as sessões anteriores foram encerradas.');
      }}
    >
      {!concluido && (
        <>
          <p className="text-sm leading-6 text-[#A1A1AA]">
            Use entre 12 e 72 caracteres, incluindo letras e números. A verificação em duas etapas
            continua ativa se você já a configurou.
          </p>
          <Input
            label="Nova senha"
            type="password"
            autoComplete="new-password"
            required
            minLength={12}
            maxLength={72}
            pattern="(?=.*[A-Za-z])(?=.*[0-9]).+"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
          />
          <Input
            label="Confirme a nova senha"
            type="password"
            autoComplete="new-password"
            required
            minLength={12}
            maxLength={72}
            value={confirmacao}
            onChange={(e) => setConfirmacao(e.target.value)}
          />
          {confirmacao && senha !== confirmacao && (
            <p role="alert" className="text-sm text-amber-200">
              As senhas precisam ser iguais.
            </p>
          )}
          <Button type="submit" loading={action.busy} disabled={senha !== confirmacao}>
            Salvar nova senha
          </Button>
        </>
      )}
      <ActionStatus {...action} />
    </form>
  );
}
