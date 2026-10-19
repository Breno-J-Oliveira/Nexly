'use client';

import Script from 'next/script';
import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '@/lib/api';
import { parseApiError } from '@/lib/errors';

interface GoogleIdentityApi {
  initialize: (options: {
    client_id: string;
    nonce: string;
    auto_select: boolean;
    callback: (response: { credential: string }) => void;
  }) => void;
  renderButton: (
    element: HTMLElement,
    options: {
      theme: string;
      size: string;
      shape: string;
      text: string;
      width: number;
      locale: string;
    },
  ) => void;
}
type GoogleWindow = Window & { google?: { accounts?: { id?: GoogleIdentityApi } } };

export function GoogleSignIn({
  onCredential,
  text = 'signin_with',
}: {
  onCredential: (credential: string) => Promise<void>;
  text?: 'signin_with' | 'signup_with' | 'continue_with';
}) {
  const container = useRef<HTMLDivElement>(null);
  const handler = useRef(onCredential);
  const busy = useRef(false);
  const [config, setConfig] = useState<{ enabled: boolean; clientId: string | null } | null>(null);
  const [scriptReady, setScriptReady] = useState(false);
  const [scriptFailed, setScriptFailed] = useState(false);
  const [working, setWorking] = useState(false);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    handler.current = onCredential;
  }, [onCredential]);

  const loadConfig = useCallback(async (signal?: AbortSignal) => {
    try {
      const { data } = await api.get<{ enabled: boolean; clientId: string | null }>(
        '/auth/google/config',
        { signal },
      );
      if (!signal?.aborted) {
        setConfig(data);
        setError('');
      }
    } catch {
      if (!signal?.aborted) setError('Não foi possível carregar o acesso com Google.');
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void loadConfig(controller.signal);
    return () => controller.abort();
  }, [loadConfig]);

  useEffect(() => {
    if (!config?.enabled || !scriptReady || !container.current) return;
    const controller = new AbortController();
    setReady(false);
    const initialize = async () => {
      try {
        const { data } = await api.post<{ nonce: string; clientId: string }>(
          '/auth/google/challenge',
          {},
          { signal: controller.signal },
        );
        if (controller.signal.aborted || !container.current) return;
        const google = (window as GoogleWindow).google?.accounts?.id;
        if (!google) throw new Error('Google indisponível');
        google.initialize({
          client_id: data.clientId,
          nonce: data.nonce,
          auto_select: false,
          callback: ({ credential }) => {
            if (controller.signal.aborted || busy.current) return;
            busy.current = true;
            setWorking(true);
            setError('');
            void handler
              .current(credential)
              .catch((failure: unknown) => {
                if (!controller.signal.aborted) {
                  setError(parseApiError(failure).message || 'Não foi possível entrar com Google.');
                  setReady(false);
                }
              })
              .finally(() => {
                busy.current = false;
                if (!controller.signal.aborted) {
                  setWorking(false);
                  setReady(false);
                }
              });
          },
        });
        container.current.replaceChildren();
        google.renderButton(container.current, {
          theme: 'outline',
          size: 'large',
          shape: 'pill',
          text,
          width: Math.min(360, container.current.clientWidth || 260),
          locale: 'pt-BR',
        });
        setReady(true);
      } catch {
        if (!controller.signal.aborted)
          setError('Não foi possível preparar o Google. Confira sua conexão e tente novamente.');
      }
    };
    void initialize();
    return () => controller.abort();
  }, [config, scriptReady, attempt, text]);

  if (config && !config.enabled) return null;
  return (
    <div className="space-y-3">
      {config?.enabled && (
        <Script
          id="google-identity"
          src="https://accounts.google.com/gsi/client"
          strategy="afterInteractive"
          onReady={() => setScriptReady(true)}
          onError={() => {
            setScriptFailed(true);
            setError('O Google não carregou. Recarregue a página ou use seu e-mail e senha.');
          }}
        />
      )}
      <div className="relative min-h-11">
        <div
          ref={container}
          inert={working || !ready}
          className={`flex min-h-11 w-full justify-center ${working || !ready ? 'pointer-events-none opacity-60' : ''}`}
          aria-busy={working}
        />
        {!ready && !error && (
          <p
            role="status"
            className="absolute inset-0 flex items-center justify-center text-center text-xs text-[#A1A1AA]"
          >
            {working ? 'Validando seu acesso…' : 'Preparando acesso com Google…'}
          </p>
        )}
      </div>
      {error && (
        <p role="alert" className="text-center text-sm text-red-300">
          {error}
        </p>
      )}
      {!ready && !working && error && (
        <button
          type="button"
          className="w-full rounded-lg px-3 py-2 text-sm text-[#A5B4FC] underline focus-visible:outline focus-visible:outline-2"
          onClick={() => {
            if (scriptFailed) {
              window.location.reload();
              return;
            }
            setError('');
            if (!config) void loadConfig();
            else setAttempt((value) => value + 1);
          }}
        >
          {scriptFailed ? 'Recarregar página' : 'Tentar novamente'}
        </button>
      )}
    </div>
  );
}
