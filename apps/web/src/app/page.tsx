import Link from 'next/link';
import { Icon } from '@/components/ui/Icon';
import { LandingFooter } from '@/components/LandingFooter';
import { LandingHeader } from '@/components/LandingHeader';

const features = [
  { icon: 'calendar-days', title: 'Agenda inteligente', desc: 'Controle horarios, profissionais e lembretes automaticos.' },
  { icon: 'users', title: 'Clientes', desc: 'Cadastro completo com historico de atendimentos e compras.' },
  { icon: 'cash-register', title: 'PDV e vendas', desc: 'Venda produtos, aplique descontos e acompanhe o faturamento.' },
  { icon: 'chart-column', title: 'Relatorios', desc: 'DRE, fluxo de caixa e indicadores para decisoes rapidas.' },
];

export default function HomePage() {
  return (
    <div className="min-h-screen" style={{ backgroundColor: '#0C0C10' }}>
      <LandingHeader />

      <main>
        {/* Hero */}
        <section className="relative overflow-hidden px-4 pb-20 pt-16 md:px-6 md:pt-24">
          <div className="pointer-events-none absolute inset-0 opacity-40" style={{ background: 'radial-gradient(ellipse at 50% 0%, rgba(99,102,241,0.22) 0%, transparent 55%)' }} />
          <div className="relative mx-auto max-w-4xl text-center">
            <div className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[12px] font-medium" style={{ backgroundColor: 'rgba(99,102,241,0.10)', borderColor: 'rgba(99,102,241,0.20)', color: '#A5B4FC' }}>
              <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: '#6366F1' }} />
              Novo: PDV com multiplas formas de pagamento
            </div>
            <h1 className="mt-6 text-4xl font-bold leading-tight md:text-6xl" style={{ color: '#FAFAFA' }}>
              Gerencie seu negocio de forma <span style={{ color: '#818CF8' }}>inteligente</span>
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-[16px] leading-relaxed md:text-[18px]" style={{ color: '#A1A1AA' }}>
              Agenda, clientes, estoque, vendas e relatorios em um so lugar. O Nexly foi feito para saloes, barbearias, clinicas de estetica e pequenos negocios que querem crescer.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link href="/cadastro" className="rounded-xl px-6 py-3 text-[14px] font-semibold shadow-lg shadow-[#6366F1]/20" style={{ backgroundColor: '#6366F1', color: '#FAFAFA' }}>Comecar gratuitamente</Link>
              <Link href="/funcionalidades" className="rounded-xl border px-6 py-3 text-[14px] font-semibold transition-colors hover:bg-white/5" style={{ borderColor: 'rgba(255,255,255,0.10)', color: '#FAFAFA' }}>Ver funcionalidades</Link>
            </div>
          </div>
        </section>

        {/* Features preview */}
        <section className="px-4 py-16 md:px-6" style={{ backgroundColor: '#111116' }}>
          <div className="mx-auto max-w-6xl">
            <div className="text-center">
              <h2 className="text-2xl font-bold md:text-3xl" style={{ color: '#FAFAFA' }}>Tudo que voce precisa</h2>
              <p className="mt-2 text-[15px]" style={{ color: '#A1A1AA' }}>Uma plataforma completa para o dia a dia do seu negocio.</p>
            </div>
            <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {features.map((f, i) => (
                <div key={i} className="rounded-2xl border p-6" style={{ backgroundColor: '#18181F', borderColor: 'rgba(255,255,255,0.08)' }}>
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg" style={{ backgroundColor: 'rgba(99,102,241,0.12)' }}>
                    <Icon name={f.icon as any} className="text-[#818CF8]" size="lg" />
                  </div>
                  <h3 className="mt-4 text-[16px] font-semibold" style={{ color: '#FAFAFA' }}>{f.title}</h3>
                  <p className="mt-2 text-[13px] leading-relaxed" style={{ color: '#A1A1AA' }}>{f.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="px-4 py-20 md:px-6">
          <div className="mx-auto max-w-4xl rounded-3xl border p-8 text-center md:p-12" style={{ backgroundColor: '#111116', borderColor: 'rgba(255,255,255,0.08)' }}>
            <h2 className="text-2xl font-bold md:text-3xl" style={{ color: '#FAFAFA' }}>Pronto para organizar seu negocio?</h2>
            <p className="mx-auto mt-3 max-w-xl text-[15px]" style={{ color: '#A1A1AA' }}>Crie sua conta em menos de 2 minutos e comece a usar o Nexly hoje mesmo.</p>
            <Link href="/cadastro" className="mt-6 inline-block rounded-xl px-6 py-3 text-[14px] font-semibold shadow-lg shadow-[#6366F1]/20" style={{ backgroundColor: '#6366F1', color: '#FAFAFA' }}>Criar conta gratis</Link>
          </div>
        </section>
      </main>

      <LandingFooter />
    </div>
  );
}
