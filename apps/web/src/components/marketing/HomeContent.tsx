import Link from 'next/link';
import { Icon } from '@/components/ui/Icon';
import { LandingHeader } from '@/components/LandingHeader';
import { LandingFooter } from '@/components/LandingFooter';
import { PublicRecommendations } from '@/components/PublicRecommendations';
import { ProductPreview } from './ProductPreview';
import { PublicCTA, PublicSectionTitle } from './PublicUI';

const resources = [
  {
    icon: 'calendar-days',
    title: 'Uma agenda que faz sentido',
    text: 'Organize horários, equipe e serviços. A verificação de conflitos ajuda a evitar desencontros.',
    href: '/funcionalidades#agenda',
  },
  {
    icon: 'box-open',
    title: 'Estoque conectado à rotina',
    text: 'Acompanhe produtos e insumos, com histórico de movimentações e alertas de reposição.',
    href: '/funcionalidades#estoque',
  },
  {
    icon: 'users',
    title: 'Mais contexto para atender',
    text: 'Encontre contatos, histórico e preferências sem depender de informações espalhadas.',
    href: '/funcionalidades#clientes',
  },
];
const questions = [
  [
    'Preciso de cartão para começar?',
    'Não. A conta gratuita permite 1 profissional ativo, sem informar dados de cartão.',
  ],
  [
    'Posso escolher as funções que vou usar?',
    'Sim. Escolha um modelo de negócio no cadastro e ajuste os módulos à sua rotina. Depois, você pode mudar essa seleção em Meu Nexly.',
  ],
  [
    'O Nexly funciona no celular?',
    'Sim. Você pode acessar o sistema pelo navegador do computador, tablet ou celular.',
  ],
];

export function HomeContent() {
  return (
    <div className="public-site min-h-screen bg-[#0C0C10] text-[#FAFAFA]">
      <LandingHeader />
      <main id="conteudo-principal" className="public-polish">
        <section className="public-container grid items-center gap-12 py-16 sm:py-24 lg:grid-cols-[0.9fr_1.1fr] lg:gap-14">
          <div>
            <p className="public-eyebrow">Gestão inteligente, do seu jeito</p>
            <h1 className="mt-5 max-w-xl text-[clamp(2.6rem,4.8vw,4.25rem)] font-semibold leading-[1.08] tracking-[-0.045em]">
              Seu negócio conectado.
              <br />
              <span className="text-[#A1A1AA]">Sua rotina mais leve.</span>
            </h1>
            <p className="mt-6 max-w-lg text-base leading-8 text-[#A1A1AA]">
              Agenda, clientes, estoque e vendas no mesmo lugar. Mais clareza para trabalhar, mais
              tempo para cuidar de quem você atende.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/cadastro" className="public-button">
                Começar gratuitamente <span aria-hidden="true">→</span>
              </Link>
              <Link href="/funcionalidades" className="public-button-secondary">
                Ver funcionalidades
              </Link>
            </div>
            <p className="mt-5 text-xs leading-6 text-[#A1A1AA]">
              Sem cartão. Comece com 1 profissional e escolha seus módulos.
            </p>
          </div>
          <div className="min-w-0">
            <ProductPreview />
          </div>
        </section>

        <section aria-label="Segmentos atendidos" className="border-y border-white/[0.06]">
          <div className="public-container flex flex-wrap items-center justify-between gap-x-8 gap-y-4 py-6 text-sm text-[#A1A1AA]">
            <p className="text-xs font-medium uppercase tracking-wider">
              Um espaço para o seu negócio
            </p>
            <div className="flex flex-wrap gap-x-7 gap-y-3">
              {['Salões', 'Clínicas', 'Petshops', 'Estúdios', 'Barbearias'].map((name) => (
                <span key={name}>{name}</span>
              ))}
            </div>
          </div>
        </section>

        <section className="public-reveal public-container py-20 sm:py-24">
          <PublicSectionTitle
            eyebrow="Tudo trabalhando junto"
            title="Menos tarefas espalhadas. Mais controle do seu dia."
            description="Cada informação tem seu lugar. E as partes do negócio se conectam para você não precisar repetir o trabalho."
          />
          <div className="mt-10 grid gap-8 md:grid-cols-3">
            {resources.map((resource) => (
              <article key={resource.title} className="border-t border-white/10 pt-7">
                <Icon name={resource.icon} color="#818CF8" size="lg" />
                <h3 className="mt-5 text-lg font-medium tracking-tight">{resource.title}</h3>
                <p className="mt-3 text-sm leading-7 text-[#A1A1AA]">{resource.text}</p>
                <Link
                  href={resource.href}
                  className="mt-4 inline-flex min-h-11 items-center gap-2 rounded text-sm text-[#818CF8] hover:text-white"
                >
                  Conhecer recurso <span aria-hidden="true">→</span>
                </Link>
              </article>
            ))}
          </div>
        </section>

        <section className="border-y border-white/[0.06] bg-[#111116]/40">
          <div className="public-container grid items-start gap-10 py-16 lg:grid-cols-[0.9fr_1.1fr]">
            <PublicSectionTitle
              eyebrow="O diferencial está na conexão"
              title="Do atendimento ao estoque. Sem retrabalho."
              description="Vincule os insumos a um serviço. Ao concluir o atendimento, o Nexly registra a baixa no estoque e mantém o histórico da operação."
            />
            <ol className="divide-y divide-white/10">
              {[
                ['01', 'Prepare seus serviços', 'Defina preço, duração e os insumos utilizados.'],
                [
                  '02',
                  'Atenda e conclua',
                  'A conclusão do atendimento atualiza os insumos configurados.',
                ],
                [
                  '03',
                  'Acompanhe o resultado',
                  'Consulte as movimentações e veja o que precisa de reposição.',
                ],
              ].map(([number, title, text]) => (
                <li key={number} className="flex gap-5 py-5 first:pt-0">
                  <span className="pt-1 text-xs text-[#818CF8]">{number}</span>
                  <div>
                    <h3 className="font-medium">{title}</h3>
                    <p className="mt-2 text-sm leading-7 text-[#A1A1AA]">{text}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className="public-reveal public-container py-20 sm:py-24">
          <div className="flex flex-wrap items-end justify-between gap-6">
            <PublicSectionTitle
              eyebrow="Experiências de quem usa"
              title="Quem usa recomenda"
              description="Relatos compartilhados por pessoas que utilizam o Nexly."
            />
            <Link href="/precos" className="public-button-secondary">
              Comparar planos
            </Link>
          </div>
          <PublicRecommendations />
        </section>

        <section className="public-container grid gap-8 pb-8 lg:grid-cols-[0.8fr_1.2fr]">
          <PublicSectionTitle eyebrow="Antes de começar" title="Vamos tirar suas dúvidas?" />
          <div className="divide-y divide-white/10 border-y border-white/10">
            {questions.map(([question, answer]) => (
              <details key={question} className="py-5">
                <summary className="cursor-pointer text-sm font-medium leading-7">
                  {question}
                </summary>
                <p className="mt-3 text-sm leading-7 text-[#A1A1AA]">{answer}</p>
              </details>
            ))}
          </div>
        </section>
        <PublicCTA />
      </main>
      <LandingFooter />
    </div>
  );
}
