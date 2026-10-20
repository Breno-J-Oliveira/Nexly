import Link from 'next/link';
import { Icon } from '@/components/ui/Icon';
import { LandingFooter } from '@/components/LandingFooter';
import { LandingHeader } from '@/components/LandingHeader';
import { ProductPreview } from '@/components/marketing/ProductPreview';
import { PublicCTA, PublicIntro, PublicSectionTitle } from '@/components/marketing/PublicUI';

const resources = [
  {
    icon: 'users',
    title: 'Clientes',
    description: 'Dados de contato e histórico reunidos para dar continuidade ao relacionamento.',
  },
  {
    icon: 'user-tie',
    title: 'Profissionais',
    description: 'Equipe, serviços e horários organizados por profissional.',
  },
  {
    icon: 'scissors',
    title: 'Serviços e insumos',
    description: 'Duração, preço e consumo de produtos definidos para cada atendimento.',
  },
  {
    icon: 'cash-register',
    title: 'Ponto de venda',
    description: 'Registro de vendas, descontos e formas de pagamento, com atualização do estoque.',
  },
  {
    icon: 'chart-column',
    title: 'Financeiro e relatórios',
    description: 'Receitas, despesas e indicadores para acompanhar o resultado da operação.',
  },
  {
    icon: 'hand-holding-dollar',
    title: 'Comissões',
    description: 'Configuração e acompanhamento das comissões da equipe.',
  },
];

export default function FuncionalidadesPage() {
  return (
    <div className="min-h-screen bg-[#08080C] text-white">
      <LandingHeader />
      <main id="conteudo-principal">
        <PublicIntro
          eyebrow="Conheça o Nexly"
          title={
            <>
              Uma rotina conectada.
              <br />
              <span className="text-[#B9B4CD]">Do começo ao fechamento.</span>
            </>
          }
          description="Cada parte do seu negócio tem seu espaço. E as informações seguem juntas, sem precisar repetir o mesmo trabalho."
        />
        <section className="mx-auto grid max-w-6xl items-center gap-10 px-5 pb-16 sm:px-8 sm:pb-24 lg:grid-cols-2">
          <div>
            <PublicSectionTitle
              eyebrow="Agenda e atendimento"
              title="O próximo horário, sem desencontro."
              description="Consulte os atendimentos, escolha um profissional e encontre um horário disponível. A verificação de conflitos ajuda a evitar dois agendamentos no mesmo espaço da agenda."
            />
            <ul className="mt-6 space-y-3 text-sm leading-6 text-[#C2BDCF]">
              {[
                'Confirme, cancele ou conclua atendimentos.',
                'Consulte a rotina de cada profissional.',
                'Vincule os serviços ao consumo de insumos.',
              ].map((item) => (
                <li key={item} className="flex gap-3">
                  <Icon name="check" color="#C7C5FF" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <ProductPreview initialTab="agenda" />
        </section>
        <section className="border-y border-white/8 bg-[#0D0D13] px-5 py-16 sm:px-8 sm:py-24">
          <div className="mx-auto grid max-w-6xl items-center gap-10 lg:grid-cols-2">
            <div className="lg:order-2">
              <PublicSectionTitle
                eyebrow="Produtos e insumos"
                title="Seu estoque acompanha a operação."
                description="Registre entradas e saídas, consulte o histórico e acompanhe alertas de estoque mínimo. Produtos vendidos no PDV e insumos configurados nos serviços entram no mesmo controle."
              />
              <Link
                href="/cadastro"
                className="mt-6 inline-block rounded-xl border border-white/15 px-5 py-3 text-sm font-medium text-[#C7C5FF] hover:bg-white/5"
              >
                Configurar meu negócio <span aria-hidden="true">↗</span>
              </Link>
            </div>
            <ProductPreview initialTab="stock" />
          </div>
        </section>
        <section className="mx-auto max-w-6xl px-5 py-16 sm:px-8 sm:py-24">
          <PublicSectionTitle
            eyebrow="Um espaço para cada tarefa"
            title="Mais contexto para trabalhar melhor."
            description="Escolha os módulos que fazem sentido para a sua atividade. Você pode ajustar essa organização conforme o negócio evolui."
          />
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {resources.map((resource) => (
              <article
                key={resource.title}
                className="rounded-2xl border border-white/10 bg-[#111116] p-6"
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#C7C5FF]/10">
                  <Icon name={resource.icon} color="#C7C5FF" />
                </span>
                <h3 className="mt-5 text-lg font-medium tracking-tight">{resource.title}</h3>
                <p className="mt-3 text-sm leading-7 text-[#AAA7BA]">{resource.description}</p>
              </article>
            ))}
          </div>
          <p className="mt-6 text-sm leading-7 text-[#AAA7BA]">
            O PDV registra as vendas do seu negócio. Os pagamentos das assinaturas do Nexly são
            gerenciados separadamente pelo Stripe.
          </p>
        </section>
        <PublicCTA />
      </main>
      <LandingFooter />
    </div>
  );
}
