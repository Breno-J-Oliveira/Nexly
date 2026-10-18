'use client';
import { ReactNode, SelectHTMLAttributes, useId, useState } from 'react';
import { isAxiosError } from 'axios';
import { ErrorState } from '@/components/ui/ErrorState';

export const campo =
  'min-h-11 w-full rounded-lg border border-white/15 bg-[#18181F] px-3 py-2 text-sm text-[#FAFAFA] focus:outline-none focus:ring-2 focus:ring-[#818CF8]';
export function Panel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-xl border border-white/10 bg-[#111116] p-5 sm:p-6">
      <h2 className="mb-4 text-lg font-semibold">{title}</h2>
      {children}
    </section>
  );
}
export function SelectField({
  label,
  children,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement> & { label: string }) {
  const id = useId();
  return (
    <div className="text-sm text-[#D4D4D8]">
      <label className="block" htmlFor={id}>
        {label}
      </label>
      <select id={id} className={`${campo} mt-2`} {...props}>
        {children}
      </select>
    </div>
  );
}
export function LoadState({
  loading,
  error,
  retry,
}: {
  loading: boolean;
  error: string | null;
  retry: () => Promise<void>;
}) {
  return error ? (
    <ErrorState message={error} onRetry={() => void retry()} />
  ) : loading ? (
    <p role="status" className="py-4 text-sm text-[#A1A1AA]">
      Carregando dados…
    </p>
  ) : null;
}
export function erroDaAcao(error: unknown) {
  if (isAxiosError(error)) {
    const message: unknown = error.response?.data?.message;
    if (Array.isArray(message)) return message.join('. ');
    if (typeof message === 'string') return message;
  }
  return 'Não foi possível concluir. Confira sua conexão e tente novamente.';
}
export function useAction() {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [success, setSuccess] = useState('');
  return {
    busy,
    error,
    success,
    async run(action: () => Promise<void | false>, message = 'Alteração salva com sucesso.') {
      if (busy) return false;
      setBusy(true);
      setError('');
      setSuccess('');
      try {
        if ((await action()) === false) return false;
        setSuccess(message);
        return true;
      } catch (e) {
        setError(erroDaAcao(e));
        return false;
      } finally {
        setBusy(false);
      }
    },
  };
}
export function ActionStatus({ error, success }: { error: string; success: string }) {
  return (
    <>
      {error && (
        <p
          role="alert"
          className="rounded-lg border border-red-400/30 bg-red-500/5 p-3 text-sm text-red-200"
        >
          {error}
        </p>
      )}
      {success && (
        <p
          role="status"
          className="rounded-lg border border-emerald-400/30 bg-emerald-500/5 p-3 text-sm text-emerald-200"
        >
          {success}
        </p>
      )}
    </>
  );
}
export function Titulo({ nome, descricao }: { nome: string; descricao: string }) {
  return (
    <header>
      <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-[#A5B4FC]">
        Gestão do seu negócio
      </p>
      <h1 className="text-2xl font-semibold">{nome}</h1>
      <p className="mt-2 max-w-3xl text-sm leading-6 text-[#A1A1AA]">{descricao}</p>
    </header>
  );
}
