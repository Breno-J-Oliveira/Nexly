'use client';

import { useEffect, useState } from 'react';
import { GoogleSignIn } from './GoogleSignIn';
import { Input } from './ui/Input';
import { Button } from './ui/Button';
import { api } from '@/lib/api';

export function GoogleAccountSecurity() {
  const [linked, setLinked] = useState<boolean | null>(null);
  const [failed, setFailed] = useState(false);
  const [senha, setSenha] = useState('');
  const [code, setCode] = useState('');
  const [prepared, setPrepared] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    void api
      .get<{ linked: boolean }>('/auth/google/status', { signal: controller.signal })
      .then(({ data }) => {
        if (!controller.signal.aborted) setLinked(data.linked);
      })
      .catch(() => {
        if (!controller.signal.aborted) setFailed(true);
      });
    return () => controller.abort();
  }, []);
  return (
    <section
      className="rounded-2xl border border-white/10 bg-[#111116] p-5 sm:p-6"
      aria-labelledby="google-account-title"
    >
      <h2 id="google-account-title" className="text-lg font-semibold">
        Acesso com Google
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-[#A1A1AA]">
        Vincule a conta Google com o mesmo e-mail do seu cadastro. O segundo fator do Nexly
        continuará sendo solicitado, se estiver ativado.
      </p>
      {failed ? (
        <p role="alert" className="mt-4 text-sm text-red-300">
          Não foi possível consultar a vinculação. Atualize a página para tentar novamente.
        </p>
      ) : linked === null ? (
        <p role="status" className="mt-4 text-sm text-[#A1A1AA]">
          Consultando vinculação…
        </p>
      ) : linked ? (
        <p role="status" className="mt-4 text-sm text-emerald-300">
          Google vinculado. Você já pode usá-lo na tela de entrada.
        </p>
      ) : (
        <div className="mt-5 max-w-sm space-y-4">
          <form
            className="space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              setPrepared(true);
            }}
          >
            <Input
              label="Confirme sua senha do Nexly"
              type="password"
              autoComplete="current-password"
              required
              maxLength={128}
              value={senha}
              onChange={(event) => {
                setSenha(event.target.value);
                setPrepared(false);
              }}
            />
            <Input
              label="Código do autenticador ou de backup (se ativado)"
              autoComplete="one-time-code"
              maxLength={64}
              value={code}
              onChange={(event) => {
                setCode(event.target.value.trim());
                setPrepared(false);
              }}
            />
            {!prepared && <Button type="submit">Escolher conta Google</Button>}
          </form>
          {prepared && (
            <GoogleSignIn
              text="continue_with"
              onCredential={async (credential) => {
                await api.post('/auth/google/link', {
                  credential,
                  senha,
                  ...(code ? { code } : {}),
                });
                setSenha('');
                setCode('');
                setPrepared(false);
                setLinked(true);
              }}
            />
          )}
        </div>
      )}
    </section>
  );
}
