import Link from 'next/link';
import { ProductPreview } from '@/components/marketing/ProductPreview';
import { Icon } from '@/components/ui/Icon';
import { LandingFooter } from '@/components/LandingFooter';
import { PublicRecommendations } from '@/components/PublicRecommendations';
import { LandingHeader } from '@/components/LandingHeader';

const segmentos = [
  { icon: 'scissors', nome: 'Salões' },
  { icon: 'spa', nome: 'Clínicas' },
  { icon: 'paw', nome: 'Petshops' },
  { icon: 'dumbbell', nome: 'Estúdios' },
  { icon: 'cut', nome: 'Barbearias' },
];

const features = [
  {
    icon: 'calendar-days',
    title: 'Agenda inteligente',
    desc: 'Encontre horários livres, organize a equipe e evite conflitos entre atendimentos.',
  },
  {
    icon: 'box',
    title: 'Estoque completo',
    desc: 'Entradas, saídas e histórico, com alerta de estoque mínimo e controle de vencimento.',
  },
  {
    icon: 'cash-register',
    title: 'PDV rápido',
    desc: 'Registre vendas e formas de pagamento, aplique descontos e mantenha o estoque atualizado.',
  },
  {
    icon: 'users',
    title: 'Clientes e fidelidade',
    desc: 'Cadastro completo, histórico de atendimentos e programa de pontos automático.',
  },
  {
    icon: 'chart-column',
    title: 'Relatórios e DRE',
    desc: 'Faturamento, CMV, margem, fluxo de caixa e ranking de profissionais.',
  },
  {
    icon: 'wand-magic-sparkles',
    title: 'Baixa automática',
    desc: 'Insumos debitados do estoque ao concluir cada atendimento — sem retrabalho.',
  },
  {
    icon: 'lock',
    title: 'Controle de acesso',
    desc: 'Permissões por função, isolamento entre empresas e autenticação em dois fatores.',
  },
  {
    icon: 'mobile-screen-button',
    title: '100% responsivo',
    desc: 'Use no computador, tablet ou celular, onde você estiver.',
  },
];

const passos = [
  {
    n: '1',
    icon: 'user-plus',
    title: 'Crie sua conta',
    desc: 'Comece gratuitamente, sem cartão de crédito, com 1 profissional ativo.',
  },
  {
    n: '2',
    icon: 'gear',
    title: 'Configure seu negócio',
    desc: 'Cadastre serviços, profissionais, produtos e preços do seu jeito.',
  },
  {
    n: '3',
    icon: 'rocket',
    title: 'Comece a vender',
    desc: 'Gerencie a agenda, controle o estoque e acompanhe os resultados.',
  },
];

export default function HomePage() {
  return (
    <div className="min-h-screen" style={{ backgroundColor: '#060608' }}>
      <LandingHeader />

      <main id="conteudo-principal" className="public-polish">
        {/* Hero */}
        <section className="relative overflow-hidden px-4 pb-20 pt-16 md:px-6 md:pt-24">
          <div
            className="pointer-events-none absolute inset-0 opacity-40"
            style={{
              background:
                'radial-gradient(ellipse at 50% 50%, rgba(99,102,241,0.10) 0%, transparent 65%)',
            }}
          />
          <div className="relative mx-auto max-w-4xl text-center">
            <div
              className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[12px] font-medium"
              style={{
                backgroundColor: 'rgba(99,102,241,0.10)',
                borderColor: 'rgba(99,102,241,0.20)',
                color: '#A5B4FC',
              }}
            >
              <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: '#6366F1' }} />
              Agenda + Estoque + PDV em um só lugar
            </div>
            <h1
              className="mx-auto mt-6 max-w-3xl text-4xl font-bold leading-[1.08] tracking-tight md:text-[64px]"
              style={{ color: '#FAFAFA' }}
            >
              Gestão inteligente
              <br className="hidden sm:block" /> para o seu negócio
            </h1>
            <p
              className="mx-auto mt-6 max-w-2xl text-[16px] leading-relaxed md:text-[18px]"
              style={{ color: '#A1A1AA' }}
            >
              Agenda, clientes, estoque, vendas e relatórios em um só lugar. Feito para salões,
              barbearias, clínicas de estética e pequenos negócios que querem crescer.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link
                href="/cadastro"
                className="rounded-xl px-7 py-3.5 text-[15px] font-semibold shadow-lg shadow-[#6366F1]/25 transition-transform hover:scale-[1.02]"
                style={{ backgroundColor: '#6366F1', color: '#FAFAFA' }}
              >
                Começar gratuitamente
              </Link>
              <Link
                href="/funcionalidades"
                className="rounded-xl border px-7 py-3.5 text-[15px] font-semibold transition-colors hover:bg-white/5"
                style={{ borderColor: 'rgba(255,255,255,0.12)', color: '#FAFAFA' }}
              >
                Ver funcionalidades
              </Link>
            </div>
            <div className="mx-auto mt-14 max-w-5xl text-left">
              <ProductPreview />
            </div>
          </div>
        </section>

        {/* Trust bar — segmentos */}
        <section
          className="border-y px-4 py-8 md:px-6"
          style={{ borderColor: 'rgba(255,255,255,0.06)', backgroundColor: '#111116' }}
        >
          <div className="mx-auto max-w-5xl">
            <p
              className="text-center text-[12px] font-medium uppercase tracking-widest"
              style={{ color: '#71717A' }}
            >
              Feito para o seu negócio
            </p>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-x-10 gap-y-4">
              {segmentos.map((s) => (
                <div key={s.nome} className="flex items-center gap-2.5">
                  <Icon name={s.icon} size="lg" color="#71717A" />
                  <span className="text-[14px] font-medium" style={{ color: '#A1A1AA' }}>
                    {s.nome}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="px-4 py-20 md:px-6" style={{ backgroundColor: '#0C0C10' }}>
          <div className="mx-auto max-w-6xl">
            <div className="text-center">
              <h2 className="text-3xl font-bold md:text-4xl" style={{ color: '#FAFAFA' }}>
                Tudo que você precisa
              </h2>
              <p className="mt-3 text-[15px]" style={{ color: '#A1A1AA' }}>
                Uma plataforma completa para o dia a dia do seu negócio.
              </p>
            </div>
            <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {features.slice(0, 6).map((f) => (
                <div
                  key={f.title}
                  className="public-card rounded-2xl border p-6 transition-colors hover:border-[rgba(99,102,241,0.40)]"
                  style={{ backgroundColor: '#111116', borderColor: 'rgba(255,255,255,0.08)' }}
                >
                  <div
                    className="flex h-11 w-11 items-center justify-center rounded-lg"
                    style={{ backgroundColor: 'rgba(99,102,241,0.12)' }}
                  >
                    <Icon name={f.icon} size="lg" color="#818CF8" />
                  </div>
                  <h3 className="mt-4 text-[16px] font-semibold" style={{ color: '#FAFAFA' }}>
                    {f.title}
                  </h3>
                  <p className="mt-2 text-[13px] leading-relaxed" style={{ color: '#A1A1AA' }}>
                    {f.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Diferencial */}
        <section className="px-4 py-20 md:px-6">
          <div className="mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-2 [&>div:first-child]:lg:order-2">
            <div>
              <div
                className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[12px] font-medium"
                style={{
                  backgroundColor: 'rgba(99,102,241,0.10)',
                  borderColor: 'rgba(99,102,241,0.20)',
                  color: '#A5B4FC',
                }}
              >
                Diferencial Nexly
              </div>
              <h2
                className="mt-4 text-3xl font-bold leading-tight md:text-4xl"
                style={{ color: '#FAFAFA' }}
              >
                Baixa automática de estoque a cada venda realizada
              </h2>
              <p className="mt-4 text-[15px] leading-relaxed" style={{ color: '#A1A1AA' }}>
                Em negócios que unem serviço e venda, os insumos costumam sumir sem controle. O
                Nexly resolve isso: ao concluir um atendimento, os insumos configurados são
                debitados do estoque automaticamente.
              </p>
              <ul className="mt-6 space-y-3">
                {[
                  'Baixa automática ao concluir o serviço',
                  'Histórico completo de movimentações',
                  'Alerta de estoque mínimo e vencimento',
                ].map((t) => (
                  <li key={t} className="flex items-start gap-3">
                    <Icon name="circle-check" color="#22C55E" size="lg" />
                    <span className="text-[14px]" style={{ color: '#A1A1AA' }}>
                      {t}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
            <div
              className="rounded-3xl border p-8"
              style={{ backgroundColor: '#111116', borderColor: 'rgba(255,255,255,0.08)' }}
            >
              <div className="space-y-4">
                {[
                  { t: 'Serviço: Escova Progressiva', s: 'Concluído', cor: '#22C55E' },
                  { t: 'Insumo: Shampoo 500ml', s: '-1 unidade', cor: '#818CF8' },
                  { t: 'Insumo: Queratina 100g', s: '-1 unidade', cor: '#818CF8' },
                  { t: 'Estoque atualizado', s: 'automático', cor: '#71717A' },
                ].map((r) => (
                  <div
                    key={r.t}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-xl border p-4"
                    style={{ borderColor: 'rgba(255,255,255,0.06)', backgroundColor: '#18181F' }}
                  >
                    <span className="text-[14px]" style={{ color: '#FAFAFA' }}>
                      {r.t}
                    </span>
                    <span className="text-[13px] font-semibold" style={{ color: r.cor }}>
                      {r.s}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Como funciona */}
        <section className="px-4 py-20 md:px-6">
          <div className="mx-auto max-w-5xl">
            <div className="text-center">
              <h2 className="text-3xl font-bold md:text-4xl" style={{ color: '#FAFAFA' }}>
                Comece em 3 passos
              </h2>
              <p className="mt-3 text-[15px]" style={{ color: '#A1A1AA' }}>
                Escolha os módulos do seu negócio e organize a rotina no seu ritmo.
              </p>
            </div>
            <div className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-3">
              {passos.map((p) => (
                <div
                  key={p.n}
                  className="relative rounded-2xl border p-7"
                  style={{ backgroundColor: '#111116', borderColor: 'rgba(255,255,255,0.08)' }}
                >
                  <div
                    className="absolute -top-4 left-7 flex h-8 w-8 items-center justify-center rounded-full text-[14px] font-bold"
                    style={{ backgroundColor: '#6366F1', color: '#FAFAFA' }}
                  >
                    {p.n}
                  </div>
                  <div
                    className="flex h-11 w-11 items-center justify-center rounded-lg"
                    style={{ backgroundColor: 'rgba(99,102,241,0.12)' }}
                  >
                    <Icon name={p.icon} size="lg" color="#818CF8" />
                  </div>
                  <h3 className="mt-4 text-[16px] font-semibold" style={{ color: '#FAFAFA' }}>
                    {p.title}
                  </h3>
                  <p className="mt-2 text-[13px] leading-relaxed" style={{ color: '#A1A1AA' }}>
                    {p.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Depoimentos */}
        <section className="px-4 py-20 md:px-6">
          <div className="mx-auto max-w-6xl">
            <div className="text-center">
              <h2 className="text-3xl font-bold md:text-4xl" style={{ color: '#FAFAFA' }}>
                Quem usa recomenda
              </h2>
              <p className="mt-3 text-[15px]" style={{ color: '#A1A1AA' }}>
                Experiências compartilhadas por quem utiliza o Nexly.
              </p>
            </div>
            <PublicRecommendations />
          </div>
        </section>
        {/* CTA final */}
        <section className="px-4 py-24 md:px-6">
          <div
            className="mx-auto max-w-4xl p-10 text-center md:p-14"
            style={{ backgroundColor: '#0C0C10' }}
          >
            <h2 className="text-2xl font-bold md:text-4xl" style={{ color: '#FAFAFA' }}>
              Comece a transformar seu negócio hoje
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-[15px]" style={{ color: '#A1A1AA' }}>
              Comece com 1 profissional no acesso gratuito. Escolha seus módulos e conheça o Nexly
              sem informar cartão.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link
                href="/cadastro"
                className="rounded-xl px-7 py-3.5 text-[15px] font-semibold shadow-lg shadow-[#6366F1]/25 transition-transform hover:scale-[1.02]"
                style={{ backgroundColor: '#6366F1', color: '#FAFAFA' }}
              >
                Criar conta grátis
              </Link>
              <Link
                href="/precos"
                className="rounded-xl border px-7 py-3.5 text-[15px] font-semibold transition-colors hover:bg-white/5"
                style={{ borderColor: 'rgba(255,255,255,0.12)', color: '#FAFAFA' }}
              >
                Ver planos
              </Link>
            </div>
          </div>
        </section>
      </main>

      <LandingFooter />
    </div>
  );
}
