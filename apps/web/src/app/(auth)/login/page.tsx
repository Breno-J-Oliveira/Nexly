'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { Brand } from '@/components/marketing/Brand';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { AuthInput, useAuthReady } from '@/components/ui/AuthField';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { GoogleSignIn } from '@/components/GoogleSignIn';
import { api, waitForSessionRefresh } from '@/lib/api';
import { GoogleRegistration, LoginResponse, useAuth } from '@/lib/auth';
import { ErrorCodes, parseApiError } from '@/lib/errors';
import { authLink } from '@/lib/auth-navigation';
import { useAuthDestination } from '@/lib/use-auth-destination';
import {
  UsuarioPublico,
  AUTHENTICATOR_CODE_PATTERN,
  RECOVERY_CODE_PATTERN,
  RECOVERY_CODE_LENGTH,
} from '@nexly/shared';

const schema = z.object({
  email: z.string({ required_error: 'E-mail obrigatório' }).email('E-mail inválido'),
  senha: z.string({ required_error: 'Senha obrigatória' }).min(1, 'Senha obrigatória'),
});

type FormData = z.infer<typeof schema>;

export default function LoginPage() {
  const ready = useAuthReady();
  const destination = useAuthDestination();
  const {
    login,
    completeLogin,
    setGoogleRegistration,
    googleTwoFactorToken,
    setGoogleTwoFactorToken,
  } = useAuth();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [twoFactor, setTwoFactor] = useState<{ tempToken: string } | null>(
    googleTwoFactorToken ? { tempToken: googleTwoFactorToken } : null,
  );
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [backupMode, setBackupMode] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const twoFactorInputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (googleTwoFactorToken) setGoogleTwoFactorToken(null);
  }, [googleTwoFactorToken, setGoogleTwoFactorToken]);

  // Foca o campo do código quando a etapa de 2FA aparece. Equivale ao
  // `autoFocus`, mas sem o atributo (que prejudica leitores de tela).
  useEffect(() => {
    if (twoFactor) twoFactorInputRef.current?.focus();
  }, [twoFactor]);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    // Sem `defaultValues` os campos ainda não rastreados chegam `undefined` ao
    // zod, que responde com a mensagem padrão em inglês ("Required").
    defaultValues: { email: '', senha: '' },
  });

  const onSubmit = async (data: FormData): Promise<void> => {
    setError(null);
    try {
      const res = await login(data.email, data.senha);
      if (res.requiresTwoFactor && res.tempToken) {
        setTwoFactor({ tempToken: res.tempToken });
        return;
      }
      router.push(destination);
    } catch (e) {
      const err = parseApiError(e);
      if (err.code === ErrorCodes.LOGIN_TOO_MANY_ATTEMPTS) {
        setError('Muitas tentativas de login. Aguarde alguns minutos e tente novamente.');
      } else if (err.code === 'USER_NOT_FOUND') {
        setError('E-mail ou senha incorretos');
      } else {
        setError(err.message || 'E-mail ou senha incorretos');
      }
    }
  };

  const verificar2fa = async (): Promise<void> => {
    if (!twoFactor || verifying) return;
    setError(null);
    setVerifying(true);
    try {
      const res = await api.post<{ accessToken: string; usuario: UsuarioPublico }>(
        '/auth/2fa/verify',
        { tempToken: twoFactor.tempToken, code: twoFactorCode },
      );
      completeLogin(res.data.accessToken, res.data.usuario);
      router.push(destination);
    } catch (error) {
      const failure = error as { response?: { data?: { message?: string } } };
      setError(
        failure.response?.data?.message ?? 'Não foi possível verificar o código. Tente novamente.',
      );
    } finally {
      setVerifying(false);
    }
  };

  return (
    <div
      className="rounded-2xl border px-6 py-8 sm:p-10"
      style={{ backgroundColor: '#111116', borderColor: 'rgba(255,255,255,0.06)' }}
    >
      <div className="flex justify-center">
        <Brand />
      </div>

      <h1
        className="mt-8 text-center text-[28px] font-semibold tracking-tight sm:text-[30px]"
        style={{ color: '#FAFAFA' }}
      >
        Bom ter você de volta.
      </h1>
      <p className="mt-2 text-center text-[14px]" style={{ color: '#A1A1AA' }}>
        Entre para cuidar do seu negócio.
      </p>

      <div
        className="mt-8 flex rounded-xl border p-1"
        style={{ borderColor: 'rgba(255,255,255,0.06)', backgroundColor: '#0C0C10' }}
      >
        <Link
          href={authLink('/login', destination)}
          className="flex-1 rounded-lg py-2 text-center text-[13px] font-medium transition-colors"
          style={{ backgroundColor: '#6366F1', color: '#FAFAFA' }}
        >
          Entrar
        </Link>
        <Link
          href={authLink('/cadastro', destination)}
          className="flex-1 rounded-lg py-2 text-center text-[13px] font-medium transition-colors"
          style={{ color: '#A1A1AA' }}
        >
          Criar conta
        </Link>
      </div>

      {twoFactor ? (
        <form
          className="mt-6 space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            void verificar2fa();
          }}
        >
          <p className="text-center text-sm" style={{ color: '#A1A1AA' }}>
            {backupMode ? 'Digite um código de backup' : 'Digite o código do seu app autenticador'}
          </p>
          <input
            ref={twoFactorInputRef}
            value={twoFactorCode}
            onChange={(e) =>
              setTwoFactorCode(
                backupMode
                  ? e.target.value.replace(/[^a-f0-9]/gi, '').toLowerCase()
                  : e.target.value.replace(/\D/g, ''),
              )
            }
            placeholder={backupMode ? 'código de backup' : '000000'}
            inputMode={backupMode ? 'text' : 'numeric'}
            autoComplete="one-time-code"
            maxLength={backupMode ? RECOVERY_CODE_LENGTH : 6}
            className={`w-full rounded-xl border bg-[#111116] px-4 py-3 text-center font-mono ${backupMode ? 'text-base tracking-wide' : 'text-[40px] tracking-widest'} text-[#FAFAFA] placeholder:text-[#3F3F46] focus:outline-none focus:ring-2 focus:ring-[#6366F1]/30`}
            style={{ borderColor: 'rgba(255,255,255,0.08)' }}
            aria-label="Código de verificação em dois fatores"
          />
          <div className="text-center">
            <button
              type="button"
              onClick={() => {
                setBackupMode((v) => !v);
                setTwoFactorCode('');
              }}
              className="text-[13px] font-medium underline"
              style={{ color: '#818CF8' }}
            >
              {backupMode ? 'Usar código do app' : 'Usar código de backup'}
            </button>
          </div>
          {error && (
            <p role="alert" className="text-center text-sm text-red-400">
              {error}
            </p>
          )}
          <Button
            type="submit"
            loading={verifying || !ready}
            disabled={
              backupMode
                ? !RECOVERY_CODE_PATTERN.test(twoFactorCode)
                : !AUTHENTICATOR_CODE_PATTERN.test(twoFactorCode)
            }
            className="w-full rounded-xl py-3 text-[14px] font-semibold shadow-lg shadow-[#6366F1]/20"
          >
            Verificar
          </Button>
          <button
            type="button"
            disabled={verifying}
            className="w-full text-center text-sm text-[#A1A1AA] hover:text-white"
            onClick={() => {
              setTwoFactor(null);
              setTwoFactorCode('');
              setBackupMode(false);
              setError(null);
            }}
          >
            Entrar novamente
          </button>
        </form>
      ) : (
        <form
          method="post"
          onSubmit={(e) => void handleSubmit(onSubmit)(e)}
          className="mt-6 space-y-4"
        >
          <AuthInput
            label="E-mail"
            type="email"
            autoComplete="email"
            placeholder="contato@studionexly.com"
            error={errors.email?.message}
            {...register('email')}
          />
          <AuthInput
            label="Senha"
            type={showPassword ? 'text' : 'password'}
            autoComplete="current-password"
            placeholder="••••••••"
            error={errors.senha?.message}
            right={
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="text-[#71717A] transition-colors hover:text-[#A1A1AA]"
                aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
              >
                <Icon name={showPassword ? 'eye-slash' : 'eye'} size="sm" color="currentColor" />
              </button>
            }
            {...register('senha')}
          />

          <div className="flex justify-end">
            <Link
              href="/recuperar-senha"
              className="text-[13px] font-medium hover:underline"
              style={{ color: '#818CF8' }}
            >
              Esqueceu a senha?
            </Link>
          </div>

          {error && <p className="text-center text-sm text-red-400">{error}</p>}

          <Button
            type="submit"
            loading={isSubmitting || !ready}
            className="w-full rounded-xl py-3 text-[14px] font-semibold shadow-lg shadow-[#6366F1]/20"
          >
            Entrar no painel
          </Button>
        </form>
      )}

      <div className="relative mt-6 flex items-center">
        <div className="flex-1 border-t" style={{ borderColor: 'rgba(255,255,255,0.08)' }} />
        <span
          className="px-3 text-[11px] font-semibold uppercase tracking-wider"
          style={{ color: '#71717A' }}
        >
          outras formas de acesso
        </span>
        <div className="flex-1 border-t" style={{ borderColor: 'rgba(255,255,255,0.08)' }} />
      </div>

      {!twoFactor && (
        <div className="mt-6">
          <GoogleSignIn
            onCredential={async (credential) => {
              await waitForSessionRefresh();
              const { data } = await api.post<
                LoginResponse & Partial<GoogleRegistration> & { requiresRegistration?: boolean }
              >('/auth/google/login', { credential });
              if (data.requiresRegistration && data.registrationToken && data.email) {
                setGoogleRegistration({
                  registrationToken: data.registrationToken,
                  email: data.email,
                  nome: data.nome ?? '',
                });
                router.push(authLink('/cadastro', destination));
              } else if (data.requiresTwoFactor && data.tempToken) {
                setError(null);
                setTwoFactor({ tempToken: data.tempToken });
              } else if (data.accessToken && data.usuario) {
                completeLogin(data.accessToken, data.usuario);
                router.push(destination);
              } else throw new Error('Resposta de autenticação inválida.');
            }}
          />
        </div>
      )}
      <p className="mt-6 text-center text-[12px] leading-relaxed" style={{ color: '#71717A' }}>
        Ao continuar, você concorda com os{' '}
        <Link
          href="/termos"
          className="underline hover:text-[#A1A1AA]"
          style={{ color: '#A1A1AA' }}
        >
          Termos de Uso
        </Link>{' '}
        e{' '}
        <Link
          href="/privacidade"
          className="underline hover:text-[#A1A1AA]"
          style={{ color: '#A1A1AA' }}
        >
          Política de Privacidade
        </Link>
        .
      </p>
    </div>
  );
}
