import Link from 'next/link';
import type { ReactNode } from 'react';
import { LandingHeader } from '@/components/LandingHeader';
import { LandingFooter } from '@/components/LandingFooter';
import { PublicIntro } from './PublicUI';

export function LegalPage({
  title,
  description,
  sections,
}: {
  title: string;
  description: string;
  sections: { title: string; content: ReactNode }[];
}) {
  return (
    <div className="public-site min-h-screen bg-[#0C0C10] text-white">
      <LandingHeader />
      <main id="conteudo-principal">
        <PublicIntro eyebrow="Informações do serviço" title={title} description={description} />
        <div className="mx-auto grid max-w-6xl gap-10 px-5 pb-20 sm:px-8 lg:grid-cols-[240px_1fr]">
          <nav
            aria-label={`Seções: ${title}`}
            className="self-start border-l border-white/10 pl-5 lg:sticky lg:top-24"
          >
            <p className="text-xs font-semibold uppercase tracking-widest text-[#A1A1AA]">
              Nesta página
            </p>
            <ol className="mt-4 space-y-3">
              {sections.map((section, index) => (
                <li key={section.title}>
                  <a
                    href={`#secao-${index + 1}`}
                    className="inline-block rounded py-1 text-sm leading-6 text-[#A1A1AA] hover:text-[#818CF8]"
                  >
                    {index + 1}. {section.title}
                  </a>
                </li>
              ))}
            </ol>
          </nav>
          <article className="min-w-0 max-w-3xl">
            {sections.map((section, index) => (
              <section
                key={section.title}
                id={`secao-${index + 1}`}
                className="scroll-mt-24 border-b border-white/10 py-7 first:pt-0 last:border-0 last:pb-0"
              >
                <h2 className="text-xl font-medium tracking-tight">
                  {index + 1}. {section.title}
                </h2>
                <div className="mt-4 text-[15px] leading-8 text-[#A1A1AA]">{section.content}</div>
              </section>
            ))}
            <Link
              href="/"
              className="mt-8 inline-flex rounded-xl border border-white/15 px-5 py-3 text-sm font-medium text-[#818CF8] hover:bg-white/5"
            >
              Voltar para o início
            </Link>
          </article>
        </div>
      </main>
      <LandingFooter />
    </div>
  );
}
