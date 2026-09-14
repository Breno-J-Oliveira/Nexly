import Link from 'next/link';
import { Icon } from '@/components/ui/Icon';
import { LandingFooter } from '@/components/LandingFooter';
import { LandingHeader } from '@/components/LandingHeader';

const planos = [
  { id: 'essencial', nome: 'Essencial', preco: 49, periodo: '/mês', descricao: 'Ideal para autônomos e pequenos negócios.', recursos: ['Agenda ilimitada', 'Até 2 profissionais', 'Controle de clientes', 'Suporte por e-mail'], destaque: false },
  { id: 'pro', nome: 'Profissional', preco: 99, periodo: '/mês', descricao: 'Para negócios em crescimento.', recursos: ['Tudo do Essencial', 'Até 10 profissionais', 'Estoque e PDV', 'Relatórios financeiros', 'Suporte prioritário'], destaque: true },
  { id: 'empresarial', nome: 'Empresarial', preco: 199, periodo: '/mês', descricao: 'Para redes e franquias.', recursos: ['Tudo do Profissional', 'Profissionais ilimitados', 'Multiunidade', 'API e integrações', 'Suporte dedicado'], destaque: false },
];

export default function PrecosPage() {
  return (
    <div className="min-h-screen" style={{ backgroundColor: '#0C0C10' }}>
      <LandingHeader />

      <main className="px-4 py-16 md:px-6 md:py-24">
        <div className="mx-auto max-w-4xl text-center">
          <h1 className="text-3xl font-bold md:text-5xl" style={{ color: '#FAFAFA' }}>Planos e preços</h1>
          <p className="mt-4 text-[16px]" style={{ color: '#A1A1AA' }}>Escolha o plano ideal para o tamanho do seu negócio.</p>
        </div>

        <div className="mx-auto mt-12 grid max-w-5xl grid-cols-1 gap-6 md:grid-cols-3">
          {planos.map((plano) => (
            <div key={plano.id} className="relative rounded-2xl border p-6" style={{ backgroundColor: '#111116', borderColor: plano.destaque ? '#6366F1' : 'rgba(255,255,255,0.08)' }}>
              {plano.destaque && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-wide" style={{ backgroundColor: '#6366F1', color: '#FAFAFA' }}>Mais popular</span>
              )}
              <h3 className="text-[18px] font-semibold" style={{ color: '#FAFAFA' }}>{plano.nome}</h3>
              <p className="mt-1 text-[14px]" style={{ color: '#A1A1AA' }}>{plano.descricao}</p>
              <div className="mt-4 flex items-baseline gap-1">
                <span className="text-4xl font-bold" style={{ color: '#FAFAFA' }}>R$ {plano.preco}</span>
                <span className="text-[14px]" style={{ color: '#A1A1AA' }}>{plano.periodo}</span>
              </div>
              <ul className="mt-6 space-y-3">
                {plano.recursos.map((r, i) => (
                  <li key={i} className="flex items-center gap-2 text-[14px]" style={{ color: '#A1A1AA' }}>
                    <Icon name="check" className="text-[#22C55E]" size="sm" />
                    {r}
                  </li>
                ))}
              </ul>
              <Link href="/cadastro" className="mt-6 block w-full rounded-xl py-2.5 text-center text-[14px] font-semibold transition-colors" style={{ backgroundColor: plano.destaque ? '#6366F1' : 'transparent', color: plano.destaque ? '#FAFAFA' : '#FAFAFA', border: `1px solid ${plano.destaque ? '#6366F1' : 'rgba(255,255,255,0.10)'}` }}>Escolher {plano.nome}</Link>
            </div>
          ))}
        </div>

        <p className="mx-auto mt-12 max-w-2xl text-center text-[14px]" style={{ color: '#71717A' }}>
          Todos os planos incluem 7 dias de teste gratuito. Cancele a qualquer momento. Sem taxa de setup.
        </p>
      </main>

      <LandingFooter />
    </div>
  );
}
