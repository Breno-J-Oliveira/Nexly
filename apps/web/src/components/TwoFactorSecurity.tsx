'use client';

import Image from 'next/image';
import { RECOVERY_CODE_LENGTH, TWO_FACTOR_CODE_PATTERN } from '@nexly/shared';
import { FormEvent, useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { parseApiError } from '@/lib/errors';
import { baixarBlob } from '@/lib/download';
import { GoogleSignIn } from '@/components/GoogleSignIn';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { ErrorState } from '@/components/ui/ErrorState';
import { toastSuccess } from '@/components/ui/Toaster';

type TwoFactorSetup = { qrCodeUrl: string; secret: string; setupToken: string };

export function TwoFactorSecurity() {
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [googleLinked, setGoogleLinked] = useState(false);
  const [statusError, setStatusError] = useState(false);
  const [setup, setSetup] = useState<TwoFactorSetup | null>(null);
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const load = useCallback(async (signal?: AbortSignal) => {
    setStatusError(false);
    try {
      const { data } = await api.get<{ enabled: boolean; googleLinked: boolean }>(
        '/auth/2fa/status',
        { signal },
      );
      if (!signal?.aborted) {
        setEnabled(data.enabled);
        setGoogleLinked(data.googleLinked === true);
      }
    } catch {
      if (!signal?.aborted) setStatusError(true);
    }
  }, []);
  useEffect(() => {
    const c = new AbortController();
    void load(c.signal);
    return () => c.abort();
  }, [load]);
  const mutate = async (action: 'setup' | 'enable' | 'disable', credential?: string) => {
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      if (action === 'setup') {
        const { data } = credential
          ? await api.post<TwoFactorSetup>('/auth/google/2fa/setup', { credential })
          : await api.post<TwoFactorSetup>('/auth/2fa/setup', { password });
        setSetup(data);
        setPassword('');
        setCode('');
      } else if (action === 'enable') {
        if (!setup) return;
        const { data } = await api.post<{ backupCodes: string[] }>('/auth/2fa/enable', {
          code,
          setupToken: setup.setupToken,
        });
        setBackupCodes(data.backupCodes);
        setEnabled(true);
        setSetup(null);
        setCode('');
        toastSuccess('2FA ativado. Os outros acessos foram encerrados.');
      } else {
        await api.post('/auth/2fa/disable', { password, code });
        setEnabled(false);
        setPassword('');
        setCode('');
        setBackupCodes([]);
        toastSuccess('2FA desativado.');
      }
    } catch (e) {
      if (credential) throw e;
      const failure = parseApiError(e);
      if (failure.code === 'TWO_FACTOR_SETUP_REQUIRED') {
        setSetup(null);
        setCode('');
      }
      setError(failure.message);
    } finally {
      setBusy(false);
    }
  };
  const submit = (event: FormEvent<HTMLFormElement>, action: 'setup' | 'enable' | 'disable') => {
    event.preventDefault();
    void mutate(action);
  };
  return (
    <section
      aria-labelledby="two-factor-title"
      className="rounded-2xl border border-white/10 bg-[#111116] p-5 sm:p-6"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 id="two-factor-title" className="text-lg font-semibold text-[#FAFAFA]">
            Autenticação de dois fatores
          </h2>
          <p className="mt-2 max-w-lg text-sm leading-6 text-[#A1A1AA]">
            Proteja seu acesso com um código do app autenticador, além da senha. Disponível para
            todos os membros da equipe.
          </p>
        </div>
        {enabled === true && (
          <span className="rounded-full bg-green-500/10 px-3 py-1 text-xs font-semibold text-green-300">
            2FA ativo
          </span>
        )}
      </div>
      {statusError ? (
        <ErrorState
          message="Não foi possível consultar o autenticador"
          onRetry={() => void load()}
        />
      ) : enabled === null ? (
        <p role="status" className="mt-4 text-sm text-[#A1A1AA]">
          Consultando proteção…
        </p>
      ) : (
        <>
          {!enabled && !setup && (
            <div className="mt-5 max-w-md space-y-4">
              <form onSubmit={(event) => submit(event, 'setup')} className="space-y-4">
                <Input
                  label="Senha atual para configurar"
                  type="password"
                  autoComplete="current-password"
                  required
                  maxLength={128}
                  disabled={busy}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                />
                <Button type="submit" loading={busy} disabled={!password}>
                  Configurar autenticador
                </Button>
              </form>
              {googleLinked && (
                <GoogleSignIn
                  text="continue_with"
                  onCredential={(credential) => mutate('setup', credential)}
                />
              )}
            </div>
          )}
          {!enabled && setup && (
            <form onSubmit={(e) => submit(e, 'enable')} className="mt-5 max-w-md space-y-4">
              <p className="text-sm leading-6 text-[#A1A1AA]">
                1. Escaneie o QR com Google Authenticator, Microsoft Authenticator ou outro app
                compatível.
              </p>
              <Image
                src={setup.qrCodeUrl}
                unoptimized
                width={192}
                height={192}
                alt="QR code para configurar o autenticador Nexly"
                className="rounded-lg"
              />
              <details className="text-sm text-[#A1A1AA]">
                <summary className="cursor-pointer">Não consigo escanear</summary>
                <p className="mt-2">Adicione esta chave manualmente no app:</p>
                <code className="mt-2 block break-all rounded bg-[#0C0C10] p-3 text-[#FAFAFA]">
                  {setup.secret}
                </code>
              </details>
              <p className="text-sm text-[#A1A1AA]">
                2. Digite o código de seis números exibido no app. Conclua em até 5 minutos.
              </p>
              <Input
                label="Código do app"
                autoComplete="one-time-code"
                inputMode="numeric"
                pattern="[0-9]{6}"
                maxLength={6}
                required
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
              />
              <div className="flex flex-wrap gap-3">
                <Button type="submit" loading={busy} disabled={code.length !== 6}>
                  Ativar 2FA
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  disabled={busy}
                  onClick={() => {
                    setSetup(null);
                    setCode('');
                    setError('');
                  }}
                >
                  Cancelar configuração
                </Button>
              </div>
            </form>
          )}
          {enabled && backupCodes.length > 0 && (
            <div className="mt-5 rounded-xl border border-indigo-400/30 bg-indigo-500/5 p-4">
              <h3 className="font-medium text-[#FAFAFA]">Guarde seus códigos de recuperação</h3>
              <p className="mt-2 text-sm leading-6 text-[#A1A1AA]">
                Cada código funciona uma vez caso você perca o celular. Eles só aparecem nesta
                configuração. Guarde fora deste dispositivo e não compartilhe.
              </p>
              <ul
                aria-label="Códigos de recuperação"
                className="my-4 grid grid-cols-2 gap-2 sm:grid-cols-5"
              >
                {backupCodes.map((c) => (
                  <li
                    key={c}
                    className="break-all rounded bg-[#0C0C10] p-2 text-center font-mono text-xs text-[#FAFAFA]"
                  >
                    {c}
                  </li>
                ))}
              </ul>
              <div className="flex flex-wrap gap-3">
                <Button
                  variant="secondary"
                  onClick={() =>
                    baixarBlob(
                      new Blob(
                        ['Nexly — códigos de recuperação (uso único)\n' + backupCodes.join('\n')],
                        { type: 'text/plain;charset=utf-8' },
                      ),
                      'nexly-codigos-recuperacao.txt',
                    )
                  }
                >
                  Baixar códigos
                </Button>
                <Button variant="ghost" onClick={() => setBackupCodes([])}>
                  Já guardei, ocultar códigos
                </Button>
              </div>
            </div>
          )}
          {enabled && (
            <details className="mt-5 border-t border-white/10 pt-4 text-sm text-[#A1A1AA]">
              <summary className="cursor-pointer">Desativar autenticação de dois fatores</summary>
              <form onSubmit={(e) => submit(e, 'disable')} className="mt-4 max-w-md space-y-4">
                <p>
                  Confirme sua senha e um código do autenticador ou de recuperação. Se acabou de
                  usar o app, aguarde o próximo código.
                </p>
                <Input
                  label="Senha atual para desativar"
                  type="password"
                  autoComplete="current-password"
                  required
                  maxLength={128}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <Input
                  label="Código do app ou de recuperação"
                  autoComplete="one-time-code"
                  maxLength={RECOVERY_CODE_LENGTH}
                  pattern={TWO_FACTOR_CODE_PATTERN.source}
                  required
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/[^a-f0-9]/gi, '').toLowerCase())}
                />
                <Button
                  type="submit"
                  variant="danger"
                  loading={busy}
                  disabled={!password || !TWO_FACTOR_CODE_PATTERN.test(code)}
                >
                  Desativar 2FA
                </Button>
              </form>
            </details>
          )}
        </>
      )}
      {error && (
        <p role="alert" className="mt-4 text-sm text-red-300">
          {error}
        </p>
      )}
    </section>
  );
}
