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
    <header className="mx-auto max-w-6xl px-5 pb-12 pt-14 sm:px-8 sm:pb-16 sm:pt-24">
      <p className="flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.18em] text-[#BCBAFF]">
        <span className="h-px w-7 bg-[#BCBAFF]" />
        {eyebrow}
      </p>
      <h1 className="mt-6 max-w-4xl text-[clamp(2.5rem,6vw,4.75rem)] font-semibold leading-[1.05] tracking-[-0.055em] text-white">
        {title}
      </h1>
      <p className="mt-6 max-w-2xl text-base leading-8 text-[#A7A7B4] sm:text-lg">{description}</p>
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
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#BCBAFF]">{eyebrow}</p>
      <h2 className="mt-4 text-3xl font-semibold leading-tight tracking-[-0.04em] text-white sm:text-5xl">
        {title}
      </h2>
      {description && <p className="mt-5 text-base leading-8 text-[#A7A7B4]">{description}</p>}
    </div>
  );
}

export function PublicCTA() {
  return (
    <section className="mx-auto max-w-6xl px-5 py-16 sm:px-8 sm:py-24">
      <div className="grid items-center gap-8 rounded-[28px] border border-[#C7C5FF]/20 bg-[#12121F] p-7 sm:p-12 lg:grid-cols-[1fr_auto]">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#BCBAFF]">
            Seu próximo passo
          </p>
          <h2 className="mt-4 max-w-xl text-3xl font-semibold leading-tight tracking-[-0.04em] text-white sm:text-4xl">
            Mais organização. Mais espaço para o seu negócio.
          </h2>
          <p className="mt-4 max-w-xl leading-7 text-[#A7A7B4]">
            Comece com uma conta gratuita para 1 profissional ativo. Sem cartão de crédito no
            cadastro.
          </p>
        </div>
        <div className="flex flex-col gap-3">
          <Link
            href="/cadastro"
            className="rounded-xl bg-[#C7C5FF] px-6 py-3.5 text-center text-sm font-semibold text-[#151326] transition-colors hover:bg-[#DAD9FF]"
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
