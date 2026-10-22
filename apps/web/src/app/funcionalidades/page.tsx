import Link from 'next/link';
import { Icon } from '@/components/ui/Icon';
import { LandingFooter } from '@/components/LandingFooter';
import { LandingHeader } from '@/components/LandingHeader';
import { ContentCarousel } from '@/components/marketing/ContentCarousel';
import { featureCatalog } from '@/components/marketing/feature-catalog';
import { ProductImage } from '@/components/marketing/ProductImage';
import { PublicCTA, PublicIntro } from '@/components/marketing/PublicUI';

export default function FuncionalidadesPage() {
  return (
    <div className="public-site min-h-screen bg-[#0C0C10] text-[#FAFAFA]">
      <LandingHeader />
      <main id="conteudo-principal">
        <PublicIntro
          eyebrow="Conheça o seu próximo jeito de trabalhar"
          title="Veja o que o Nexly pode fazer pela sua rotina."
          description="Escolha uma funcionalidade e veja como ela funciona, do primeiro cadastro à operação do dia a dia."
        />
        <div className="public-container">
          <ContentCarousel
            label="Funcionalidades do Nexly"
            syncHash
            slides={featureCatalog.map((feature) => ({
              id: feature.id,
              label: feature.nome,
              content: (
                <article className="grid min-w-0 gap-8 overflow-hidden rounded-2xl border border-white/10 bg-[#111116] p-6 sm:p-9 lg:grid-cols-[0.9fr_1.1fr] lg:gap-12">
                  <div>
                    <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#6366F1]/10 text-[#818CF8]">
                      <Icon name={feature.icon} size="lg" />
                    </span>
                    <h2 className="mt-5 text-2xl font-semibold tracking-tight sm:text-3xl">
                      {feature.nome}
                    </h2>
                    <p className="mt-4 text-lg leading-7 text-[#D4D4D8]">{feature.benefit}</p>
                    <p className="mt-4 text-sm leading-7 text-[#A1A1AA]">{feature.descricao}</p>
                    <h3 className="mt-7 text-xs font-medium uppercase tracking-wider text-[#A1A1AA]">
                      Como funciona
                    </h3>
                    <ol className="mt-4 space-y-4">
                      {feature.steps.map((step, index) => (
                        <li key={step} className="flex gap-3 text-sm leading-6 text-[#D4D4D8]">
                          <span className="text-[#818CF8]">
                            {String(index + 1).padStart(2, '0')}
                          </span>
                          <span>{step}</span>
                        </li>
                      ))}
                    </ol>
                    <Link href="/cadastro" className="public-button mt-8">
                      Quero organizar meu negócio <span aria-hidden="true">↗</span>
                    </Link>
                    <p className="mt-3 text-xs leading-6 text-[#A1A1AA]">
                      Comece grátis com 1 profissional. Escolha seus módulos no cadastro.
                    </p>
                  </div>
                  <div className="flex min-w-0 flex-col justify-center">
                    {feature.screen ? (
                      <ProductImage screen={feature.screen} alt={`Nexly: ${feature.nome}`} />
                    ) : (
                      <div className="rounded-2xl border border-white/[0.06] bg-[#0C0C10] p-8 sm:p-12">
                        <p className="public-eyebrow">Na prática</p>
                        <p className="mt-6 text-2xl font-medium leading-snug tracking-tight">
                          {feature.benefit}
                        </p>
                        <div className="mt-10 flex items-center gap-4 text-[#818CF8]">
                          <Icon name={feature.icon} size="2x" />
                          <span className="h-px flex-1 bg-white/10" />
                          <Icon name="check" size="lg" />
                        </div>
                        <p className="mt-8 text-sm leading-7 text-[#A1A1AA]">
                          Ative este recurso no seu Nexly e mantenha as informações junto das outras
                          partes do negócio.
                        </p>
                      </div>
                    )}
                  </div>
                </article>
              ),
            }))}
          />
          <section className="mt-12 flex flex-col gap-5 border-y border-white/10 py-9 sm:flex-row sm:items-center sm:justify-between">
            <div className="max-w-2xl">
              <p className="public-eyebrow">O Nexly evolui com a sua rotina</p>
              <h2 className="mt-3 text-xl font-medium">
                Estamos sempre inovando e trazendo atualizações.
              </h2>
              <p className="mt-3 text-sm leading-7 text-[#A1A1AA]">
                Melhorias no produto começam com necessidades reais. Conte para a gente o que faria
                diferença no seu dia a dia.
              </p>
            </div>
            <Link href="/suporte#contato-suporte" className="public-button-secondary shrink-0">
              Compartilhar uma ideia ↗
            </Link>
          </section>
        </div>
        <PublicCTA />
      </main>
      <LandingFooter />
    </div>
  );
}
