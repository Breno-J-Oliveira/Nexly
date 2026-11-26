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
  const [email, setEmail] = useState('');
  const [emailEnviado, setEmailEnviado] = useState('');
  const [envioIndisponivel, setEnvioIndisponivel] = useState(false);
  const emailNormalizado = email.trim().toLowerCase();
  const enviado = emailEnviado !== '' && emailNormalizado === emailEnviado;
  if (status.loading)
    return (
      <p role="status" className="mt-6 text-sm text-[#A1A1AA]">
        Verificando disponibilidade…
      </p>
    );
  if (status.error || !status.data?.disponivel || envioIndisponivel)
    return (
      <div
        role="status"
        className="mt-6 rounded-xl border border-amber-400/20 bg-amber-500/5 p-4 text-sm leading-6 text-[#D4D4D8]"
      >
        <p className="font-medium text-amber-200">
          {status.error ? 'Não foi possível conectar ao Nexly' : 'Envio de links indisponível'}
        </p>
        <p className="mt-2">
          {status.error
            ? 'Confira sua conexão e tente novamente.'
            : 'O envio de links de recuperação está indisponível no momento.'}
        </p>
        {!status.error && (
          <p className="mt-2">
            Se você já usa o Google para entrar no Nexly, volte ao login e escolha essa opção. Se
            precisar de ajuda com o acesso, fale com o suporte abaixo.
          </p>
        )}
        <Button
          className="mt-3"
          variant="ghost"
          onClick={() => {
            setEnvioIndisponivel(false);
            void status.refetch();
          }}
        >
          Verificar novamente
        </Button>
      </div>
    );
  return (
    <form
      className="mt-6 space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        void action.run(async () => {
          const { data } = await api.post<{ disponivel: boolean }>(
            '/auth/recuperacao/solicitar',
            { email: emailNormalizado },
            { timeout: 15_000 },
          );
          if (!data.disponivel) {
            setEnvioIndisponivel(true);
            setEmailEnviado('');
            return false;
          }
          setEmailEnviado(emailNormalizado);
        }, 'Se houver uma conta ativa com este e-mail, você receberá um link válido por 30 minutos. Confira também a pasta de spam.');
      }}
    >
      <p className="text-sm leading-6 text-[#A1A1AA]">
        Informe o e-mail que você usa para entrar no Nexly.
      </p>
      <Input
        label="E-mail da conta"
        type="email"
        autoComplete="email"
        required
        maxLength={254}
        value={email}
        readOnly={action.busy}
        onChange={(e) => setEmail(e.target.value)}
      />
      <ActionStatus error={action.error} success={enviado ? action.success : ''} />
      {enviado && (
        <p className="text-sm leading-6 text-[#A1A1AA]">
          Se precisar pedir outro link, use o e-mail mais recente para redefinir sua senha.
        </p>
      )}
      <Button type="submit" loading={action.busy} className="w-full">
        {enviado ? 'Solicitar outro link' : 'Enviar link de recuperação'}
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
  if (concluido) return <ActionStatus error="" success={action.success} />;
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
          await api.post('/auth/recuperacao/redefinir', { token, senha }, { timeout: 15_000 });
          setConcluido(true);
          setSenha('');
          setConfirmacao('');
          setToken('');
        }, 'Senha alterada. Entre novamente com a nova senha.');
      }}
    >
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
        readOnly={action.busy}
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
        readOnly={action.busy}
        onChange={(e) => setConfirmacao(e.target.value)}
      />
      {confirmacao && senha !== confirmacao && (
        <p role="alert" className="text-sm text-amber-200">
          As senhas precisam ser iguais.
        </p>
      )}
      <Button
        type="submit"
        loading={action.busy}
        disabled={senha !== confirmacao}
        className="w-full"
      >
        Salvar nova senha
      </Button>
      <ActionStatus {...action} />
      {action.error && (
        <Link className="block text-sm text-[#A5B4FC] underline" href="/recuperar-senha">
          Solicitar novo link de recuperação
        </Link>
      )}
    </form>
  );
}
