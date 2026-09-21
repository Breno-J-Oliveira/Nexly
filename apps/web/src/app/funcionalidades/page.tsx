import Link from 'next/link';
import { Icon } from '@/components/ui/Icon';
import { LandingFooter } from '@/components/LandingFooter';
import { LandingHeader } from '@/components/LandingHeader';

const funcionalidades = [
  { icon: 'calendar-days', title: 'Agenda inteligente', desc: 'Visualize e gerencie os agendamentos do dia, confirme, cancele ou conclua atendimentos em poucos cliques.' },
  { icon: 'users', title: 'Cadastro de clientes', desc: 'Mantenha o histórico completo de atendimentos, compras e dados de contato dos seus clientes.' },
  { icon: 'user-tie', title: 'Profissionais', desc: 'Cadastre a equipe, vincule serviços e acompanhe a produtividade de cada profissional.' },
  { icon: 'scissors', title: 'Serviços e insumos', desc: 'Configure serviços, durações, preços e insumos consumidos em cada atendimento.' },
  { icon: 'box-open', title: 'Estoque e produtos', desc: 'Controle o inventário, receba alertas de reposição e gerencie entradas e saídas.' },
  { icon: 'cash-register', title: 'PDV rápido', desc: 'Realize vendas com busca de produtos, múltiplas formas de pagamento e descontos.' },
  { icon: 'chart-column', title: 'Relatórios financeiros', desc: 'Acompanhe DRE, fluxo de caixa, ticket médio e margem bruta do seu negócio.' },
  { icon: 'hand-holding-dollar', title: 'Comissões', desc: 'Configure e acompanhe as comissões dos profissionais de forma automática.' },
];

export default function FuncionalidadesPage() {
  return (
    <div className="min-h-screen" style={{ backgroundColor: '#0C0C10' }}>
      <LandingHeader />

      <main className="px-4 py-16 md:px-6 md:py-24">
        <div className="mx-auto max-w-4xl text-center">
          <h1 className="text-3xl font-bold md:text-5xl" style={{ color: '#FAFAFA' }}>Funcionalidades</h1>
          <p className="mt-4 text-[16px]" style={{ color: '#A1A1AA' }}>Conheça tudo o que o Nexly oferece para simplificar a gestão do seu negócio.</p>
        </div>

        <div className="mx-auto mt-12 grid max-w-6xl grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {funcionalidades.map((f, i) => (
            <div key={i} className="rounded-2xl border p-6" style={{ backgroundColor: '#111116', borderColor: 'rgba(255,255,255,0.08)' }}>
              <div className="flex h-11 w-11 items-center justify-center rounded-xl" style={{ backgroundColor: 'rgba(99,102,241,0.12)' }}>
                <Icon name={f.icon} className="text-[#818CF8]" size="lg" />
              </div>
              <h3 className="mt-4 text-[17px] font-semibold" style={{ color: '#FAFAFA' }}>{f.title}</h3>
              <p className="mt-2 text-[14px] leading-relaxed" style={{ color: '#A1A1AA' }}>{f.desc}</p>
            </div>
          ))}
        </div>

        <div className="mx-auto mt-16 max-w-4xl rounded-3xl border p-8 text-center" style={{ backgroundColor: '#111116', borderColor: 'rgba(255,255,255,0.08)' }}>
          <h2 className="text-2xl font-bold" style={{ color: '#FAFAFA' }}>E muito mais por vir</h2>
          <p className="mt-2 text-[15px]" style={{ color: '#A1A1AA' }}>Estamos sempre adicionando novos recursos para ajudar o seu negócio a crescer.</p>
          <Link href="/cadastro" className="mt-6 inline-block rounded-xl px-6 py-3 text-[14px] font-semibold" style={{ backgroundColor: '#6366F1', color: '#FAFAFA' }}>Experimente grátis</Link>
        </div>
      </main>

      <LandingFooter />
    </div>
  );
}
