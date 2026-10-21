import Link from 'next/link';
import Image from 'next/image';
import { Icon } from '@/components/ui/Icon';
import { LandingFooter } from '@/components/LandingFooter';
import { LandingHeader } from '@/components/LandingHeader';

const funcionalidades = [
  {
    icon: 'calendar-days',
    title: 'Agenda inteligente',
    desc: 'Visualize e gerencie os agendamentos do dia, confirme, cancele ou conclua atendimentos em poucos cliques.',
  },
  {
    icon: 'users',
    title: 'Cadastro de clientes',
    desc: 'Mantenha o histórico completo de atendimentos, compras e dados de contato dos seus clientes.',
  },
  {
    icon: 'user-tie',
    title: 'Profissionais',
    desc: 'Cadastre a equipe, vincule serviços e acompanhe a produtividade de cada profissional.',
  },
  {
    icon: 'scissors',
    title: 'Serviços e insumos',
    desc: 'Configure serviços, durações, preços e insumos consumidos em cada atendimento.',
  },
  {
    icon: 'box-open',
    title: 'Estoque e produtos',
    desc: 'Controle o inventário, receba alertas de reposição e gerencie entradas e saídas.',
  },
  {
    icon: 'cash-register',
    title: 'PDV rápido',
    desc: 'Realize vendas com busca de produtos, múltiplas formas de pagamento e descontos.',
  },
  {
    icon: 'chart-column',
    title: 'Relatórios financeiros',
    desc: 'Acompanhe DRE, fluxo de caixa, ticket médio e margem bruta do seu negócio.',
  },
  {
    icon: 'hand-holding-dollar',
    title: 'Comissões',
    desc: 'Configure e acompanhe as comissões dos profissionais de forma automática.',
  },
] as const;

export default function FuncionalidadesPage() {
  return (
    <div className="min-h-screen" style={{ backgroundColor: '#0C0C10' }}>
      <LandingHeader />

      <main id="conteudo-principal" className="public-polish px-4 py-16 md:px-6 md:py-24">
        <div className="mx-auto max-w-4xl text-center">
          <h1
            className="text-3xl font-bold tracking-tight md:text-5xl"
            style={{ color: '#FAFAFA' }}
          >
            Tudo que você precisa em um só lugar
          </h1>
          <p className="mt-4 text-[16px]" style={{ color: '#A1A1AA' }}>
            Conheça tudo o que o Nexly oferece para simplificar a gestão do seu negócio.
          </p>
        </div>

        <div className="mx-auto mt-16 max-w-6xl space-y-20">
          {[
            funcionalidades[0],
            funcionalidades[1],
            funcionalidades[5],
            funcionalidades[4],
            funcionalidades[6],
          ].map((f, i) => (
            <section key={f.title} className="grid items-center gap-10 lg:grid-cols-2">
              <figure
                className={`overflow-hidden rounded-xl border border-white/10 bg-[#111116] p-3 shadow-2xl ${i % 2 === 1 ? 'lg:order-2' : ''}`}
              >
                <Image
                  src={`/images/product/${['agenda', 'clientes', 'pdv', 'estoque', 'relatorios'][i]}.webp`}
                  alt={`Prévia ilustrativa: ${f.title}`}
                  width={1200}
                  height={750}
                  sizes="(max-width: 1024px) 100vw, 560px"
                  className="h-auto w-full rounded-lg"
                />
                <figcaption className="mt-2 text-center text-[10px] text-[#71717A]">
                  Modelo de interface com dados de exemplo
                </figcaption>
              </figure>
              <div>
                <div
                  className="flex h-11 w-11 items-center justify-center rounded-xl"
                  style={{ backgroundColor: 'rgba(99,102,241,0.12)' }}
                >
                  <Icon name={f.icon} className="text-[#818CF8]" size="lg" />
                </div>
                <h2
                  className="mt-4 text-2xl font-semibold tracking-tight md:text-3xl"
                  style={{ color: '#FAFAFA' }}
                >
                  {f.title}
                </h2>
                <p className="mt-4 text-[15px] leading-relaxed" style={{ color: '#A1A1AA' }}>
                  {f.desc}
                </p>
                <Link
                  href="/cadastro"
                  className="mt-6 inline-flex items-center gap-2 text-sm font-medium text-[#818CF8]"
                >
                  Conhecer o Nexly <Icon name="chevron-right" size="xs" />
                </Link>
              </div>
            </section>
          ))}
        </div>

        <div
          className="mx-auto mt-24 max-w-6xl rounded-xl p-10 text-center"
          style={{ backgroundColor: '#111116', border: '1px solid rgba(255,255,255,0.08)' }}
        >
          <h2 className="text-2xl font-bold" style={{ color: '#FAFAFA' }}>
            Seu negócio, do seu jeito
          </h2>
          <p className="mt-2 text-[15px]" style={{ color: '#A1A1AA' }}>
            Escolha os módulos que fazem sentido para você. Ajuste sua rotina conforme o negócio
            evolui.
          </p>
          <Link
            href="/cadastro"
            className="mt-6 inline-block rounded-xl px-6 py-3 text-[14px] font-semibold"
            style={{ backgroundColor: '#6366F1', color: '#FAFAFA' }}
          >
            Criar conta grátis
          </Link>
        </div>
      </main>

      <LandingFooter />
    </div>
  );
}
