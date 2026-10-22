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
      <p className="public-eyebrow">{eyebrow}</p>
      <h1 className="mx-auto mt-5 max-w-3xl text-3xl font-semibold leading-tight tracking-[-0.035em] text-[#FAFAFA] sm:text-5xl">
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
      <p className="public-eyebrow">{eyebrow}</p>
      <h2 className="mt-4 text-3xl font-medium leading-tight tracking-[-0.035em] text-white sm:text-4xl">
        {title}
      </h2>
      {description && <p className="mt-5 text-base leading-8 text-[#A1A1AA]">{description}</p>}
    </div>
  );
}

export function PublicCTA() {
  return (
    <section className="mx-auto max-w-6xl px-5 py-16 sm:px-8 sm:py-24">
      <div className="grid items-center gap-8 border-y border-white/10 py-10 sm:py-12 lg:grid-cols-[1fr_auto]">
        <div>
          <p className="public-eyebrow">Comece com o que você precisa hoje</p>
          <h2 className="mt-4 max-w-xl text-3xl font-medium leading-tight tracking-[-0.035em] text-white sm:text-4xl">
            Sua próxima agenda já pode estar organizada.
          </h2>
          <p className="mt-4 max-w-xl leading-7 text-[#A1A1AA]">
            Crie sua conta, escolha os recursos e cadastre seu primeiro cliente. Um passo de cada
            vez para tirar a gestão do improviso.
          </p>
          <p className="mt-5 text-sm text-[#A1A1AA]">
            Grátis para 1 profissional · Sem cartão no cadastro · Acesso pelo celular
          </p>
        </div>
        <div className="flex flex-col gap-3">
          <Link
            href="/cadastro"
            className="rounded-xl bg-[#6366F1] px-6 py-3.5 text-center text-sm font-semibold text-[#FAFAFA] transition-colors hover:bg-[#4F46E5]"
          >
            Começar meu Nexly grátis
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
