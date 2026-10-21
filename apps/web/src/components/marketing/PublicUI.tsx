import Link from 'next/link';
import type { ReactNode } from 'react';

export function PublicIntro({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: ReactNode;
  description: string;
  children?: ReactNode;
}) {
  return (
    <header className="public-polish mx-auto max-w-4xl px-5 pb-12 pt-14 text-center sm:px-8 sm:pb-16 sm:pt-20">
      <p className="inline-flex items-center rounded-full border border-indigo-400/20 bg-indigo-500/10 px-3 py-1 text-[11px] font-medium uppercase tracking-wider text-[#818CF8]">
        {eyebrow}
      </p>
      <h1 className="mx-auto mt-5 max-w-3xl text-3xl font-bold leading-tight tracking-tight text-[#FAFAFA] sm:text-5xl">
        {title}
      </h1>
      <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-[#A1A1AA]">{description}</p>
      {children}
    </header>
  );
}

export function PublicSectionTitle({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description?: string;
}) {
  return (
    <div className="max-w-2xl">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#818CF8]">{eyebrow}</p>
      <h2 className="mt-4 text-3xl font-semibold leading-tight tracking-[-0.04em] text-white sm:text-5xl">
        {title}
      </h2>
      {description && <p className="mt-5 text-base leading-8 text-[#A1A1AA]">{description}</p>}
    </div>
  );
}

export function PublicCTA() {
  return (
    <section className="mx-auto max-w-6xl px-5 py-16 sm:px-8 sm:py-24">
      <div className="grid items-center gap-8 rounded-[28px] border border-[#818CF8]/20 bg-[#111116] p-7 sm:p-12 lg:grid-cols-[1fr_auto]">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#818CF8]">
            Seu próximo passo
          </p>
          <h2 className="mt-4 max-w-xl text-3xl font-semibold leading-tight tracking-[-0.04em] text-white sm:text-4xl">
            Mais organização. Mais espaço para o seu negócio.
          </h2>
          <p className="mt-4 max-w-xl leading-7 text-[#A1A1AA]">
            Comece com uma conta gratuita para 1 profissional ativo. Sem cartão de crédito no
            cadastro.
          </p>
        </div>
        <div className="flex flex-col gap-3">
          <Link
            href="/cadastro"
            className="rounded-xl bg-[#6366F1] px-6 py-3.5 text-center text-sm font-semibold text-[#FAFAFA] transition-colors hover:bg-[#4F46E5]"
          >
            Criar conta grátis
          </Link>
          <Link
            href="/precos"
            className="rounded-xl border border-white/15 px-6 py-3.5 text-center text-sm font-medium text-white transition-colors hover:bg-white/5"
          >
            Comparar planos
          </Link>
        </div>
      </div>
    </section>
  );
}
