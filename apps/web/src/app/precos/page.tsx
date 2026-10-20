import Link from 'next/link';
import { Icon } from '@/components/ui/Icon';
import { LandingFooter } from '@/components/LandingFooter';
import { LandingHeader } from '@/components/LandingHeader';
import { subscriptionDestination } from '@/lib/auth-navigation';

const planos = [
  { id: 'BASIC', nome: 'Essencial', preco: 49, periodo: '/mês', descricao: 'Ideal para autônomos e pequenos negócios.', recursos: ['Agenda ilimitada', 'Até 2 profissionais', 'Controle de clientes', 'Suporte por e-mail'], destaque: false },
  { id: 'PRO', nome: 'Profissional', preco: 99, periodo: '/mês', descricao: 'Para negócios em crescimento.', recursos: ['Tudo do Essencial', 'Até 10 profissionais', 'Estoque e PDV', 'Relatórios financeiros', 'Suporte prioritário'], destaque: true },
  { id: 'ENTERPRISE', nome: 'Empresarial', preco: 199, periodo: '/mês', descricao: 'Para redes e franquias.', recursos: ['Tudo do Profissional', 'Profissionais ilimitados', 'Multiunidade', 'API e integrações', 'Suporte dedicado'], destaque: false },
];

export default function PrecosPage() {
  return (
    <div className="min-h-screen" style={{ backgroundColor: '#0C0C10' }}>
      <LandingHeader />

      <main className="px-4 py-16 md:px-6 md:py-24">
        <div className="mx-auto max-w-4xl text-center">
          <h1 className="text-3xl font-bold tracking-tight md:text-5xl" style={{ color: '#FAFAFA' }}>Planos que cabem no seu bolso</h1>
          <p className="mt-4 text-[16px]" style={{ color: '#A1A1AA' }}>Escolha o plano ideal para o tamanho do seu negócio.</p>
        </div>

        <div className="mx-auto mt-12 grid max-w-5xl grid-cols-1 gap-5 md:grid-cols-3">
          {planos.map((plano) => (
            <div key={plano.id} className="relative rounded-2xl border p-6" style={{ backgroundColor: '#111116', borderColor: plano.destaque ? '#6366F1' : 'rgba(255,255,255,0.08)' }}>
              {plano.destaque && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-wide" style={{ backgroundColor: '#6366F1', color: '#FAFAFA' }}>Mais popular</span>
              )}
              <h2 className="text-[18px] font-semibold" style={{ color: '#FAFAFA' }}>{plano.nome}</h2>
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
              <Link href={subscriptionDestination(plano.id)} className="mt-6 block w-full rounded-xl py-2.5 text-center text-[14px] font-semibold transition-colors" style={{ backgroundColor: plano.destaque ? '#6366F1' : 'transparent', color: plano.destaque ? '#FAFAFA' : '#FAFAFA', border: `1px solid ${plano.destaque ? '#6366F1' : 'rgba(255,255,255,0.10)'}` }}>Escolher {plano.nome}</Link>
            </div>
          ))}
        </div>

        <p className="mx-auto mt-12 max-w-2xl text-center text-[14px]" style={{ color: '#71717A' }}>
          Crie sua conta gratuitamente, sem cartão, com 1 profissional ativo. Para contratar, entre no Nexly e confira o valor no checkout seguro do Stripe. A assinatura é mensal, com renovação automática e cancelamento pelo portal.
        </p>
        <section className="mx-auto mt-24 max-w-3xl">
          <h2 className="mb-8 text-center text-2xl font-semibold">Perguntas comuns sobre os planos</h2>
          <div className="space-y-3">{[
            ['Preciso de cartão para começar?', 'Não. Você pode criar sua conta gratuita sem informar dados de cartão.'],
            ['Como escolho o plano ideal?', 'Compare os recursos e escolha um plano. Após entrar ou criar sua conta, você poderá conferir a assinatura antes de pagar.'],
            ['Como cancelo minha assinatura?', 'Acesse Plano e assinatura no Nexly e abra Gerenciar assinatura. O cancelamento é agendado para o fim do período vigente.'],
            ['Posso usar no celular?', 'Sim. A interface se adapta ao computador, tablet e celular.'],
            ['O estoque é integrado às vendas?', 'Sim. As vendas registradas no PDV atualizam o estoque dos produtos vendidos.'],
          ].map(([question, answer]) => <details key={question} className="rounded-lg border border-white/10 bg-[#111116] px-5 py-4"><summary className="cursor-pointer text-sm font-medium">{question}</summary><p className="mt-3 text-sm leading-relaxed text-[#A1A1AA]">{answer}</p></details>)}</div>
        </section>
        <section className="mx-auto mt-24 max-w-5xl rounded-xl bg-[#6366F1] p-10 text-center"><h2 className="text-2xl font-semibold">Comece a conhecer o Nexly</h2><p className="mt-3 text-sm text-white/80">Organize sua rotina com agenda, clientes e estoque integrados.</p><Link href="/cadastro" className="mt-6 inline-block rounded-lg bg-white px-5 py-3 text-sm font-semibold text-[#4F46E5]">Criar minha conta grátis</Link></section>
      </main>

      <LandingFooter />
    </div>
  );
}
