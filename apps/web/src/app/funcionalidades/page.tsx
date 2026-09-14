import Link from 'next/link';
import { LandingFooter } from '@/components/LandingFooter';
import { LandingHeader } from '@/components/LandingHeader';

const funcionalidades = [
  { icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z', title: 'Agenda inteligente', desc: 'Visualize e gerencie os agendamentos do dia, confirme, cancele ou conclua atendimentos em poucos cliques.' },
  { icon: 'M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 7a4 4 0 118 0 4 4 0 01-8 0z', title: 'Cadastro de clientes', desc: 'Mantenha o histórico completo de atendimentos, compras e dados de contato dos seus clientes.' },
  { icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z', title: 'Profissionais', desc: 'Cadastre a equipe, vincule serviços e acompanhe a produtividade de cada profissional.' },
  { icon: 'M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z', title: 'Serviços e insumos', desc: 'Configure serviços, durações, preços e insumos consumidos em cada atendimento.' },
  { icon: 'M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4zM3 6h18M9 10a3 3 0 100 6', title: 'Estoque e produtos', desc: 'Controle o inventário, receba alertas de reposição e gerencie entradas e saídas.' },
  { icon: 'M3 3h18v18H3V3zm6-2v4m4-4v4m-9 8h14m-11 0v3m6-3v2', title: 'PDV rápido', desc: 'Realize vendas com busca de produtos, múltiplas formas de pagamento e descontos.' },
  { icon: 'M18 20V10m-6 10V4M6 20v-6', title: 'Relatórios financeiros', desc: 'Acompanhe DRE, fluxo de caixa, ticket médio e margem bruta do seu negócio.' },
  { icon: 'M12 1v22M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6', title: 'Comissões', desc: 'Configure e acompanhe as comissões dos profissionais de forma automática.' },
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
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#818CF8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d={f.icon} /></svg>
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
