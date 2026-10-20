import Link from 'next/link';
import { Icon } from '@/components/ui/Icon';
import { LandingFooter } from '@/components/LandingFooter';
import { LandingHeader } from '@/components/LandingHeader';
import { PublicCTA, PublicIntro } from '@/components/marketing/PublicUI';
import { subscriptionDestination } from '@/lib/auth-navigation';

const planos = [
  {
    id: 'BASIC',
    nome: 'Essencial',
    preco: 49,
    descricao: 'Para organizar uma equipe pequena.',
    limite: 'Até 2 profissionais ativos',
    destaque: false,
  },
  {
    id: 'PRO',
    nome: 'Profissional',
    preco: 99,
    descricao: 'Para acompanhar o crescimento da equipe.',
    limite: 'Até 10 profissionais ativos',
    destaque: true,
  },
  {
    id: 'ENTERPRISE',
    nome: 'Empresarial',
    preco: 199,
    descricao: 'Para trabalhar com uma equipe maior.',
    limite: 'Profissionais ativos ilimitados',
    destaque: false,
  },
];
const features = [
  'Agenda e cadastro de clientes',
  'Estoque, serviços e ponto de venda',
  'Financeiro e relatórios',
  'Escolha dos módulos do seu negócio',
];
const questions = [
  [
    'Preciso de cartão para começar?',
    'Não. Você pode criar sua conta gratuita sem informar dados de cartão. O acesso gratuito permite 1 profissional ativo.',
  ],
  [
    'Como escolho o plano ideal?',
    'Escolha de acordo com o número de profissionais ativos da sua equipe. Após entrar ou criar sua conta, você poderá conferir a assinatura antes de pagar.',
  ],
  [
    'Como cancelo minha assinatura?',
    'Acesse Plano e assinatura no Nexly e abra Gerenciar assinatura. O cancelamento é agendado para o fim do período vigente.',
  ],
  [
    'O que acontece se minha equipe ultrapassar o limite?',
    'Os cadastros existentes são preservados. Para adicionar profissionais ativos, ajuste o plano ou desative um profissional que não faz mais parte da equipe.',
  ],
  ['Posso usar no celular?', 'Sim. A interface se adapta ao computador, tablet e celular.'],
  [
    'O estoque é integrado às vendas?',
    'Sim. As vendas registradas no PDV atualizam o estoque dos produtos vendidos.',
  ],
];

export default function PrecosPage() {
  return (
    <div className="min-h-screen bg-[#08080C] text-white">
      <LandingHeader />
      <main id="conteudo-principal">
        <PublicIntro
          eyebrow="Planos Nexly"
          title={
            <>
              O espaço certo
              <br />
              <span className="text-[#B9B4CD]">para a sua equipe.</span>
            </>
          }
          description="Comece gratuitamente com 1 profissional ativo. Quando precisar de mais espaço para a equipe, escolha uma assinatura mensal."
        />
        <section aria-label="Planos de assinatura" className="mx-auto max-w-6xl px-5 sm:px-8">
          <div className="grid gap-5 md:grid-cols-3">
            {planos.map((plano) => (
              <article
                key={plano.id}
                className={`relative flex flex-col rounded-2xl border p-6 sm:p-8 ${plano.destaque ? 'border-[#C7C5FF]/60 bg-[#181624]' : 'border-white/10 bg-[#111116]'}`}
              >
                <p className="mb-6 text-[11px] font-medium uppercase tracking-[0.15em] text-[#BDB6D5]">
                  {plano.destaque ? 'Para equipes em crescimento' : 'Assinatura mensal'}
                </p>
                <h2 className="text-xl font-medium tracking-tight">{plano.nome}</h2>
                <p className="mt-3 min-h-12 text-sm leading-6 text-[#AAA7BA]">{plano.descricao}</p>
                <p className="mt-6 flex items-baseline gap-1">
                  <span className="text-5xl font-semibold tracking-[-0.05em]">
                    R$ {plano.preco}
                  </span>
                  <span className="text-sm text-[#AAA7BA]">/mês</span>
                </p>
                <p className="mt-6 border-y border-white/10 py-4 text-sm font-medium text-[#D0CCF5]">
                  {plano.limite}
                </p>
                <ul className="my-6 flex-1 space-y-3">
                  {features.map((feature) => (
                    <li key={feature} className="flex gap-3 text-sm leading-6 text-[#BDB8CC]">
                      <Icon name="check" color="#C7C5FF" size="sm" />
                      {feature}
                    </li>
                  ))}
                </ul>
                <Link
                  href={subscriptionDestination(plano.id)}
                  className={`block rounded-xl px-3 py-3.5 text-center text-sm font-semibold transition-colors ${plano.destaque ? 'bg-[#C7C5FF] text-[#151326] hover:bg-[#DAD9FF]' : 'border border-white/15 text-white hover:bg-white/5'}`}
                >
                  Escolher {plano.nome}
                </Link>
              </article>
            ))}
          </div>
          <div className="mt-6 grid gap-4 rounded-2xl border border-white/10 p-6 text-sm leading-7 sm:grid-cols-[1fr_auto] sm:items-center">
            <div>
              <h2 className="font-medium text-white">Prefere conhecer primeiro?</h2>
              <p className="mt-1 text-[#AAA7BA]">
                Conta gratuita, 1 profissional ativo e nenhum cartão no cadastro.
              </p>
            </div>
            <Link href="/cadastro" className="font-medium text-[#C7C5FF] hover:underline">
              Começar gratuitamente <span aria-hidden="true">↗</span>
            </Link>
          </div>
          <p className="mt-6 max-w-3xl text-xs leading-6 text-[#AAA7BA]">
            Para contratar, entre no Nexly e confira o valor no checkout seguro do Stripe. A
            assinatura é mensal, com renovação automática e cancelamento pelo portal. Não há
            cobrança ao clicar em escolher um plano.
          </p>
        </section>
        <section className="mx-auto grid max-w-6xl gap-8 px-5 pt-16 sm:px-8 sm:pt-24 lg:grid-cols-[0.8fr_1.2fr]">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#BCBAFF]">
              Antes de escolher
            </p>
            <h2 className="mt-4 text-3xl font-semibold leading-tight tracking-[-0.04em]">
              Perguntas comuns sobre os planos
            </h2>
            <p className="mt-5 text-sm leading-7 text-[#AAA7BA]">
              Ainda precisa de ajuda?{' '}
              <Link href="/suporte" className="text-[#C7C5FF] underline underline-offset-4">
                Fale com o suporte.
              </Link>
            </p>
          </div>
          <div className="divide-y divide-white/10 border-y border-white/10">
            {questions.map(([question, answer]) => (
              <details key={question} className="group py-5">
                <summary className="cursor-pointer pr-4 text-sm font-medium leading-7 text-[#EAE7F2]">
                  {question}
                </summary>
                <p className="mt-3 max-w-xl text-sm leading-7 text-[#AAA7BA]">{answer}</p>
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
