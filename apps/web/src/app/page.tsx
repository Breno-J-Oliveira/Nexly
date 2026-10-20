import Link from 'next/link';
import { Icon } from '@/components/ui/Icon';
import { LandingFooter } from '@/components/LandingFooter';
import { PublicRecommendations } from '@/components/PublicRecommendations';
import { LandingHeader } from '@/components/LandingHeader';
import { ProductPreview } from '@/components/marketing/ProductPreview';
import { PublicCTA, PublicSectionTitle } from '@/components/marketing/PublicUI';

const resources = [
  {
    icon: 'calendar-days',
    title: 'Cada horário no seu lugar.',
    description:
      'Organize serviços e profissionais em uma agenda que verifica conflitos antes de confirmar o atendimento.',
    detail: 'Agenda e equipe',
  },
  {
    icon: 'box',
    title: 'Saiba o que entra. E o que sai.',
    description:
      'Acompanhe produtos, insumos e movimentações. Identifique o que precisa de reposição com os alertas de estoque mínimo.',
    detail: 'Estoque e insumos',
  },
  {
    icon: 'users',
    title: 'Atenda com mais contexto.',
    description:
      'Encontre os dados dos seus clientes e o histórico de atendimentos sem procurar em várias planilhas.',
    detail: 'Clientes e relacionamento',
  },
  {
    icon: 'chart-column',
    title: 'Enxergue o seu resultado.',
    description:
      'Registre vendas, acompanhe receitas e despesas e consulte relatórios para entender a rotina do negócio.',
    detail: 'Vendas e financeiro',
  },
];
const steps = [
  {
    title: 'Conte sobre seu negócio',
    description: 'Crie sua conta e escolha o perfil que mais combina com a sua atividade.',
  },
  {
    title: 'Monte seu espaço',
    description: 'Escolha os módulos que quer usar e cadastre seus serviços, produtos e horários.',
  },
  {
    title: 'Organize o primeiro dia',
    description:
      'Adicione um cliente, faça um agendamento e acompanhe o atendimento até a conclusão.',
  },
];

export default function HomePage() {
  return (
    <div className="min-h-screen bg-[#08080C] text-white">
      <LandingHeader />
      <main id="conteudo-principal">
        <section className="relative overflow-hidden border-b border-white/8">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-40 top-0 h-[650px] w-[850px] rounded-full bg-[radial-gradient(ellipse,#37305730,transparent_65%)]"
          />
          <div className="relative mx-auto grid max-w-7xl items-center gap-12 px-5 pb-16 pt-14 sm:px-8 sm:py-24 lg:grid-cols-[0.95fr_1.05fr] lg:gap-14 lg:py-28">
            <div>
              <p className="flex items-center gap-2 text-xs font-medium tracking-wide text-[#C7C5FF]">
                <span className="h-1.5 w-1.5 rounded-full bg-[#C7C5FF]" />
                Uma rotina mais simples começa aqui
              </p>
              <h1 className="mt-6 text-[clamp(2.8rem,5.6vw,5rem)] font-semibold leading-[1.02] tracking-[-0.06em]">
                Seu negócio em ordem.
                <br />
                <span className="text-[#B9B4CD]">Seu dia mais leve.</span>
              </h1>
              <p className="mt-6 max-w-lg text-base leading-8 text-[#AAA7BA] sm:text-lg">
                Agenda, clientes, estoque e vendas conectados. Um espaço para cuidar do seu negócio
                sem perder de vista o que importa.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/cadastro"
                  className="rounded-xl bg-[#C7C5FF] px-6 py-3.5 text-center text-sm font-semibold text-[#151326] transition-colors hover:bg-[#DAD9FF]"
                >
                  Começar gratuitamente{' '}
                  <span aria-hidden="true" className="ml-2">
                    ↗
                  </span>
                </Link>
                <Link
                  href="/funcionalidades"
                  className="rounded-xl border border-white/15 px-6 py-3.5 text-center text-sm font-medium transition-colors hover:bg-white/5"
                >
                  Conhecer os recursos
                </Link>
              </div>
              <p className="mt-5 text-xs leading-6 text-[#AAA7BA]">
                1 profissional no gratuito · Sem cartão no cadastro
              </p>
            </div>
            <div className="min-w-0 lg:pt-6">
              <ProductPreview />
            </div>
          </div>
        </section>
        <section
          aria-label="Para diferentes tipos de negócio"
          className="border-b border-white/8 px-5 py-8 sm:px-8"
        >
          <div className="mx-auto flex max-w-6xl flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <p className="text-sm text-[#AAA7BA]">
              Seu jeito de trabalhar.
              <br className="hidden lg:block" /> Um Nexly para acompanhar.
            </p>
            <ul className="flex flex-wrap gap-2">
              {[
                'Salões e barbearias',
                'Clínicas e consultórios',
                'Petshops',
                'Estúdios',
                'Pequenos negócios',
              ].map((segment) => (
                <li
                  key={segment}
                  className="rounded-full border border-white/10 px-4 py-2 text-xs text-[#CECADB]"
                >
                  {segment}
                </li>
              ))}
            </ul>
          </div>
        </section>
        <section className="mx-auto max-w-6xl px-5 py-16 sm:px-8 sm:py-24">
          <div className="flex flex-col justify-between gap-6 sm:flex-row sm:items-end">
            <PublicSectionTitle
              eyebrow="Menos abas abertas"
              title="Tudo conversa. Você ganha tempo."
              description="As informações acompanham o trabalho, do primeiro agendamento ao fechamento do dia."
            />
            <Link
              href="/funcionalidades"
              className="shrink-0 text-sm font-medium text-[#C7C5FF] hover:underline"
            >
              Explorar funcionalidades <span aria-hidden="true">↗</span>
            </Link>
          </div>
          <div className="mt-10 grid gap-4 sm:grid-cols-2">
            {resources.map((resource, index) => (
              <article
                key={resource.title}
                className="group rounded-2xl border border-white/10 bg-[#111116] p-6 transition-colors hover:border-[#C7C5FF]/30 sm:p-8"
              >
                <div className="flex items-center justify-between">
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl border border-[#C7C5FF]/15 bg-[#C7C5FF]/8">
                    <Icon name={resource.icon} color="#C7C5FF" />
                  </span>
                  <span className="text-xs text-[#8E899F]">0{index + 1}</span>
                </div>
                <p className="mt-7 text-[11px] font-medium uppercase tracking-[0.15em] text-[#B7AFCC]">
                  {resource.detail}
                </p>
                <h3 className="mt-3 text-2xl font-medium tracking-[-0.03em]">{resource.title}</h3>
                <p className="mt-3 max-w-md text-sm leading-7 text-[#AAA7BA]">
                  {resource.description}
                </p>
              </article>
            ))}
          </div>
        </section>
        <section className="border-y border-white/8 bg-[#0D0D13] px-5 py-16 sm:px-8 sm:py-24">
          <div className="mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-2">
            <PublicSectionTitle
              eyebrow="Do atendimento ao estoque"
              title="Um serviço concluído. Um controle a menos para fazer."
              description="Vincule os insumos utilizados em cada serviço. Ao concluir o atendimento, o Nexly registra o consumo e atualiza o estoque, mantendo o histórico para consulta."
            />
            <div className="rounded-2xl border border-white/10 bg-[#14131D] p-5 sm:p-8">
              <p className="mb-6 text-xs font-medium uppercase tracking-widest text-[#B7AFCC]">
                Como funciona
              </p>
              <ol className="space-y-5">
                {[
                  {
                    title: 'Defina o consumo do serviço',
                    text: 'Informe os produtos e as quantidades utilizados.',
                  },
                  {
                    title: 'Conclua o atendimento',
                    text: 'O consumo configurado é registrado no estoque.',
                  },
                  {
                    title: 'Acompanhe as movimentações',
                    text: 'Consulte o histórico e os itens que precisam de reposição.',
                  },
                ].map((step, index) => (
                  <li key={step.title} className="flex gap-4">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[#C7C5FF]/25 text-xs text-[#C7C5FF]">
                      {index + 1}
                    </span>
                    <div className="min-w-0 border-b border-white/8 pb-5">
                      <h3 className="text-sm font-medium">{step.title}</h3>
                      <p className="mt-2 text-sm leading-6 text-[#AAA7BA]">{step.text}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </section>
        <section className="mx-auto max-w-6xl px-5 py-16 sm:px-8 sm:py-24">
          <PublicSectionTitle
            eyebrow="Comece pelo essencial"
            title="Seu espaço, no seu ritmo."
            description="Você não precisa configurar tudo de uma vez. Comece com o que faz sentido para a sua rotina."
          />
          <ol className="mt-10 grid gap-8 sm:grid-cols-3">
            {steps.map((step, index) => (
              <li key={step.title} className="border-t border-[#C7C5FF]/25 pt-6">
                <span className="text-sm font-medium text-[#C7C5FF]">0{index + 1}</span>
                <h3 className="mt-5 text-xl font-medium tracking-tight">{step.title}</h3>
                <p className="mt-3 text-sm leading-7 text-[#AAA7BA]">{step.description}</p>
              </li>
            ))}
          </ol>
        </section>
        <section className="border-y border-white/8 bg-[#0D0D13] px-5 py-16 sm:px-8 sm:py-24">
          <div className="mx-auto max-w-6xl">
            <PublicSectionTitle
              eyebrow="Histórias de quem usa"
              title="Quem usa recomenda"
              description="Experiências compartilhadas por pessoas que utilizam o Nexly. Aqui, as recomendações vêm dos próprios usuários."
            />
            <PublicRecommendations />
          </div>
        </section>
        <PublicCTA />
      </main>
      <LandingFooter />
    </div>
  );
}
