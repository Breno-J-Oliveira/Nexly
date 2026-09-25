import Link from 'next/link';
import { Icon } from '@/components/ui/Icon';
import { LandingFooter } from '@/components/LandingFooter';
import { LandingHeader } from '@/components/LandingHeader';

const segmentos = [
  { icon: 'scissors', nome: 'Salões' },
  { icon: 'spa', nome: 'Clínicas' },
  { icon: 'paw', nome: 'Petshops' },
  { icon: 'dumbbell', nome: 'Estúdios' },
  { icon: 'cut', nome: 'Barbearias' },
];

const features = [
  { icon: 'calendar-days', title: 'Agenda inteligente', desc: 'Horários, profissionais e validação automática de conflitos, com lembretes por WhatsApp.' },
  { icon: 'box', title: 'Estoque completo', desc: 'Entradas, saídas e histórico, com alerta de estoque mínimo e controle de vencimento.' },
  { icon: 'cash-register', title: 'PDV rápido', desc: 'Dinheiro, PIX, débito ou crédito, desconto e cupom — tudo integrado ao estoque.' },
  { icon: 'users', title: 'Clientes e fidelidade', desc: 'Cadastro completo, histórico de atendimentos e programa de pontos automático.' },
  { icon: 'chart-column', title: 'Relatórios e DRE', desc: 'Faturamento, CMV, margem, fluxo de caixa e ranking de profissionais.' },
  { icon: 'wand-magic-sparkles', title: 'Baixa automática', desc: 'Insumos debitados do estoque ao concluir cada atendimento — sem retrabalho.' },
  { icon: 'lock', title: 'Segurança de ponta', desc: 'Multi-tenant com isolamento no banco, JWT, 2FA e conformidade com a LGPD.' },
  { icon: 'mobile-screen-button', title: '100% responsivo', desc: 'Use no computador, tablet ou celular, onde você estiver.' },
];

const passos = [
  { n: '1', icon: 'user-plus', title: 'Crie sua conta', desc: 'Cadastro rápido em menos de 2 minutos, sem cartão de crédito.' },
  { n: '2', icon: 'gear', title: 'Configure seu negócio', desc: 'Cadastre serviços, profissionais, produtos e preços do seu jeito.' },
  { n: '3', icon: 'rocket', title: 'Comece a vender', desc: 'Gerencie a agenda, controle o estoque e acompanhe os resultados.' },
];

const modulos = [
  { title: 'Agenda', itens: ['Horários e profissionais', 'Validação de conflito', 'Lembretes automáticos', 'Agendamento online público'] },
  { title: 'Estoque & PDV', itens: ['Entradas e saídas', 'Alerta de estoque mínimo', 'Cupons e desconto', 'Baixa automática de insumos'] },
  { title: 'Financeiro', itens: ['DRE com CMV e margem', 'Fluxo de caixa', 'Comissões de profissionais', 'Exportação em CSV'] },
  { title: 'Clientes & Growth', itens: ['Histórico de atendimentos', 'Programa de fidelidade', 'Avaliações (NPS)', 'Segmentação de clientes'] },
];

const depoimentos = [
  { nome: 'Mariana Souza', cargo: 'Dona de salão de beleza', texto: 'Antes eu perdia dinheiro com produtos que sumiam do estoque. Com o Nexly, tudo é debitado sozinho quando o atendimento termina.' },
  { nome: 'Carlos Lima', cargo: 'Clínica de estética', texto: 'A agenda com lembretes por WhatsApp reduziu as faltas em mais da metade. O painel financeiro me dá clareza total do lucro.' },
  { nome: 'Ana Beatriz', cargo: 'Petshop & banho e tosa', texto: 'Consigo vender produtos e agendar banhos no mesmo lugar. O PDV é rápido e o estoque fica sempre em dia.' },
];

const planos = [
  { nome: 'Grátis', preco: 'R$ 0', desc: 'Para começar', destaque: false, itens: ['Até 3 profissionais', 'Agenda e clientes', 'Estoque básico', 'Suporte por e-mail'] },
  { nome: 'Pro', preco: 'R$ 49', desc: 'Para crescer', destaque: true, itens: ['Profissionais ilimitados', 'PDV e relatórios', 'Baixa automática de insumos', 'Fidelidade e cupons', 'Suporte prioritário'] },
  { nome: 'Enterprise', preco: 'Sob consulta', desc: 'Para redes', destaque: false, itens: ['Múltiplas unidades', 'API de integração', 'Onboarding dedicado', 'SLA garantido'] },
];

const faqs = [
  { q: 'Preciso de cartão de crédito para começar?', a: 'Não. O plano gratuito não exige cartão, e você pode testar todas as funcionalidades antes de assinar.' },
  { q: 'O Nexly funciona para o meu tipo de negócio?', a: 'Sim. Salões, barbearias, clínicas de estética, petshops, estúdios e qualquer negócio que una serviço e venda de produtos.' },
  { q: 'Meus dados ficam seguros?', a: 'Sim. Cada empresa tem os dados isolados no banco (multi-tenant com Row-Level Security), e seguimos a LGPD.' },
  { q: 'Posso usar no celular?', a: 'Sim. O Nexly é 100% responsivo e funciona em qualquer navegador, no computador, tablet ou celular.' },
  { q: 'Como funciona a baixa automática de estoque?', a: 'Você associa os insumos a cada serviço. Ao concluir um atendimento, o sistema debita automaticamente as quantidades usadas.' },
];

export default function HomePage() {
  return (
    <div className="min-h-screen" style={{ backgroundColor: '#0C0C10' }}>
      <LandingHeader />

      <main>
        {/* Hero */}
        <section className="relative overflow-hidden px-4 pb-20 pt-16 md:px-6 md:pt-24">
          <div className="pointer-events-none absolute inset-0 opacity-40" style={{ background: 'radial-gradient(ellipse at 50% 0%, rgba(99,102,241,0.25) 0%, transparent 55%)' }} />
          <div className="relative mx-auto max-w-4xl text-center">
            <div className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[12px] font-medium" style={{ backgroundColor: 'rgba(99,102,241,0.10)', borderColor: 'rgba(99,102,241,0.20)', color: '#A5B4FC' }}>
              <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: '#6366F1' }} />
              Agenda + Estoque + PDV em um só lugar
            </div>
            <h1 className="mt-6 text-4xl font-bold leading-[1.1] md:text-6xl" style={{ color: '#FAFAFA' }}>
              Gerencie seu negócio de forma <span style={{ color: '#818CF8' }}>inteligente</span>
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-[16px] leading-relaxed md:text-[18px]" style={{ color: '#A1A1AA' }}>
              Agenda, clientes, estoque, vendas e relatórios em um só lugar. Feito para salões, barbearias, clínicas de estética e pequenos negócios que querem crescer.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link href="/cadastro" className="rounded-xl px-7 py-3.5 text-[15px] font-semibold shadow-lg shadow-[#6366F1]/25 transition-transform hover:scale-[1.02]" style={{ backgroundColor: '#6366F1', color: '#FAFAFA' }}>Começar gratuitamente</Link>
              <Link href="/funcionalidades" className="rounded-xl border px-7 py-3.5 text-[15px] font-semibold transition-colors hover:bg-white/5" style={{ borderColor: 'rgba(255,255,255,0.12)', color: '#FAFAFA' }}>Ver funcionalidades</Link>
            </div>
            <div className="mx-auto mt-14 grid max-w-2xl grid-cols-3 gap-4 border-t pt-8" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
              {[
                { v: '2min', l: 'para criar a conta' },
                { v: '-50%', l: 'de faltas com lembretes' },
                { v: '100%', l: 'integrado ao estoque' },
              ].map((s) => (
                <div key={s.l} className="text-center">
                  <div className="text-2xl font-bold md:text-3xl" style={{ color: '#FAFAFA' }}>{s.v}</div>
                  <div className="mt-1 text-[12px]" style={{ color: '#71717A' }}>{s.l}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Trust bar — segmentos */}
        <section className="border-y px-4 py-8 md:px-6" style={{ borderColor: 'rgba(255,255,255,0.06)', backgroundColor: '#111116' }}>
          <div className="mx-auto max-w-5xl">
            <p className="text-center text-[12px] font-medium uppercase tracking-widest" style={{ color: '#71717A' }}>Feito para o seu negócio</p>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-x-10 gap-y-4">
              {segmentos.map((s) => (
                <div key={s.nome} className="flex items-center gap-2.5">
                  <Icon name={s.icon} size="lg" color="#71717A" />
                  <span className="text-[14px] font-medium" style={{ color: '#A1A1AA' }}>{s.nome}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Diferencial */}
        <section className="px-4 py-20 md:px-6">
          <div className="mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-2">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[12px] font-medium" style={{ backgroundColor: 'rgba(99,102,241,0.10)', borderColor: 'rgba(99,102,241,0.20)', color: '#A5B4FC' }}>Diferencial Nexly</div>
              <h2 className="mt-4 text-3xl font-bold leading-tight md:text-4xl" style={{ color: '#FAFAFA' }}>Adeus ao retrabalho e ao <span style={{ color: '#818CF8' }}>desvio de estoque</span></h2>
              <p className="mt-4 text-[15px] leading-relaxed" style={{ color: '#A1A1AA' }}>Em negócios que unem serviço e venda, os insumos costumam sumir sem controle. O Nexly resolve isso: ao concluir um atendimento, os insumos configurados são debitados do estoque automaticamente.</p>
              <ul className="mt-6 space-y-3">
                {['Baixa automática ao concluir o serviço', 'Histórico completo de movimentações', 'Alerta de estoque mínimo e vencimento'].map((t) => (
                  <li key={t} className="flex items-start gap-3">
                    <Icon name="circle-check" color="#22C55E" size="lg" />
                    <span className="text-[14px]" style={{ color: '#A1A1AA' }}>{t}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-3xl border p-8" style={{ backgroundColor: '#111116', borderColor: 'rgba(255,255,255,0.08)' }}>
              <div className="space-y-4">
                {[
                  { t: 'Serviço: Escova Progressiva', s: 'Concluído', cor: '#22C55E' },
                  { t: 'Insumo: Shampoo 500ml', s: '-1 unidade', cor: '#818CF8' },
                  { t: 'Insumo: Queratina 100g', s: '-1 unidade', cor: '#818CF8' },
                  { t: 'Estoque atualizado', s: 'automático', cor: '#71717A' },
                ].map((r) => (
                  <div key={r.t} className="flex items-center justify-between rounded-xl border p-4" style={{ borderColor: 'rgba(255,255,255,0.06)', backgroundColor: '#18181F' }}>
                    <span className="text-[14px]" style={{ color: '#FAFAFA' }}>{r.t}</span>
                    <span className="text-[13px] font-semibold" style={{ color: r.cor }}>{r.s}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="px-4 py-20 md:px-6" style={{ backgroundColor: '#111116' }}>
          <div className="mx-auto max-w-6xl">
            <div className="text-center">
              <h2 className="text-3xl font-bold md:text-4xl" style={{ color: '#FAFAFA' }}>Tudo que você precisa</h2>
              <p className="mt-3 text-[15px]" style={{ color: '#A1A1AA' }}>Uma plataforma completa para o dia a dia do seu negócio.</p>
            </div>
            <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {features.map((f) => (
                <div key={f.title} className="rounded-2xl border p-6 transition-colors hover:border-[rgba(99,102,241,0.40)]" style={{ backgroundColor: '#18181F', borderColor: 'rgba(255,255,255,0.08)' }}>
                  <div className="flex h-11 w-11 items-center justify-center rounded-lg" style={{ backgroundColor: 'rgba(99,102,241,0.12)' }}>
                    <Icon name={f.icon} size="lg" color="#818CF8" />
                  </div>
                  <h3 className="mt-4 text-[16px] font-semibold" style={{ color: '#FAFAFA' }}>{f.title}</h3>
                  <p className="mt-2 text-[13px] leading-relaxed" style={{ color: '#A1A1AA' }}>{f.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Como funciona */}
        <section className="px-4 py-20 md:px-6">
          <div className="mx-auto max-w-5xl">
            <div className="text-center">
              <h2 className="text-3xl font-bold md:text-4xl" style={{ color: '#FAFAFA' }}>Comece em 3 passos</h2>
              <p className="mt-3 text-[15px]" style={{ color: '#A1A1AA' }}>Sem complicação, sem instalação, sem curva de aprendizado.</p>
            </div>
            <div className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-3">
              {passos.map((p) => (
                <div key={p.n} className="relative rounded-2xl border p-7" style={{ backgroundColor: '#111116', borderColor: 'rgba(255,255,255,0.08)' }}>
                  <div className="absolute -top-4 left-7 flex h-8 w-8 items-center justify-center rounded-full text-[14px] font-bold" style={{ backgroundColor: '#6366F1', color: '#FAFAFA' }}>{p.n}</div>
                  <div className="flex h-11 w-11 items-center justify-center rounded-lg" style={{ backgroundColor: 'rgba(99,102,241,0.12)' }}>
                    <Icon name={p.icon} size="lg" color="#818CF8" />
                  </div>
                  <h3 className="mt-4 text-[16px] font-semibold" style={{ color: '#FAFAFA' }}>{p.title}</h3>
                  <p className="mt-2 text-[13px] leading-relaxed" style={{ color: '#A1A1AA' }}>{p.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Módulos */}
        <section className="px-4 py-20 md:px-6" style={{ backgroundColor: '#111116' }}>
          <div className="mx-auto max-w-6xl">
            <div className="text-center">
              <h2 className="text-3xl font-bold md:text-4xl" style={{ color: '#FAFAFA' }}>Módulos completos</h2>
              <p className="mt-3 text-[15px]" style={{ color: '#A1A1AA' }}>Tudo integrado, sem precisar de várias ferramentas.</p>
            </div>
            <div className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
              {modulos.map((m) => (
                <div key={m.title} className="rounded-2xl border p-6" style={{ backgroundColor: '#18181F', borderColor: 'rgba(255,255,255,0.08)' }}>
                  <h3 className="text-[16px] font-semibold" style={{ color: '#FAFAFA' }}>{m.title}</h3>
                  <ul className="mt-4 space-y-2.5">
                    {m.itens.map((item) => (
                      <li key={item} className="flex items-start gap-2.5">
                        <Icon name="check" color="#22C55E" size="sm" />
                        <span className="text-[13px]" style={{ color: '#A1A1AA' }}>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Depoimentos */}
        <section className="px-4 py-20 md:px-6">
          <div className="mx-auto max-w-6xl">
            <div className="text-center">
              <h2 className="text-3xl font-bold md:text-4xl" style={{ color: '#FAFAFA' }}>Quem usa recomenda</h2>
              <p className="mt-3 text-[15px]" style={{ color: '#A1A1AA' }}>Pequenos negócios que transformaram a gestão com o Nexly.</p>
            </div>
            <div className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-3">
              {depoimentos.map((d) => (
                <figure key={d.nome} className="rounded-2xl border p-7" style={{ backgroundColor: '#111116', borderColor: 'rgba(255,255,255,0.08)' }}>
                  <div className="flex gap-1">
                    {[0, 1, 2, 3, 4].map((i) => <Icon key={i} name="star" size="sm" color="#EAB308" />)}
                  </div>
                  <blockquote className="mt-4 text-[14px] leading-relaxed" style={{ color: '#A1A1AA' }}>“{d.texto}”</blockquote>
                  <figcaption className="mt-5">
                    <div className="text-[14px] font-semibold" style={{ color: '#FAFAFA' }}>{d.nome}</div>
                    <div className="text-[12px]" style={{ color: '#71717A' }}>{d.cargo}</div>
                  </figcaption>
                </figure>
              ))}
            </div>
          </div>
        </section>
        {/* Preços */}
        <section className="px-4 py-20 md:px-6" style={{ backgroundColor: '#111116' }}>
          <div className="mx-auto max-w-5xl">
            <div className="text-center">
              <h2 className="text-3xl font-bold md:text-4xl" style={{ color: '#FAFAFA' }}>Planos simples</h2>
              <p className="mt-3 text-[15px]" style={{ color: '#A1A1AA' }}>Comece grátis e evolua quando precisar.</p>
            </div>
            <div className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-3">
              {planos.map((p) => (
                <div key={p.nome} className={`relative rounded-2xl border p-7 ${p.destaque ? 'md:-translate-y-3' : ''}`} style={{ backgroundColor: '#18181F', borderColor: p.destaque ? 'rgba(99,102,241,0.50)' : 'rgba(255,255,255,0.08)' }}>
                  {p.destaque && <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full px-3 py-1 text-[11px] font-bold" style={{ backgroundColor: '#6366F1', color: '#FAFAFA' }}>Mais popular</div>}
                  <h3 className="text-[15px] font-semibold" style={{ color: '#FAFAFA' }}>{p.nome}</h3>
                  <div className="mt-3 text-3xl font-bold" style={{ color: '#FAFAFA' }}>{p.preco}</div>
                  <div className="mt-1 text-[12px]" style={{ color: '#71717A' }}>{p.desc}</div>
                  <ul className="mt-6 space-y-2.5">
                    {p.itens.map((item) => (
                      <li key={item} className="flex items-start gap-2.5">
                        <Icon name="check" color="#22C55E" size="sm" />
                        <span className="text-[13px]" style={{ color: '#A1A1AA' }}>{item}</span>
                      </li>
                    ))}
                  </ul>
                  <Link href="/cadastro" className={`mt-7 block rounded-xl py-2.5 text-center text-[14px] font-semibold ${p.destaque ? '' : 'border'}`} style={p.destaque ? { backgroundColor: '#6366F1', color: '#FAFAFA' } : { borderColor: 'rgba(255,255,255,0.12)', color: '#FAFAFA' }}>Começar</Link>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="px-4 py-20 md:px-6">
          <div className="mx-auto max-w-3xl">
            <div className="text-center">
              <h2 className="text-3xl font-bold md:text-4xl" style={{ color: '#FAFAFA' }}>Perguntas frequentes</h2>
            </div>
            <div className="mt-10 space-y-3">
              {faqs.map((f) => (
                <details key={f.q} className="group rounded-xl border" style={{ backgroundColor: '#111116', borderColor: 'rgba(255,255,255,0.08)' }}>
                  <summary className="flex cursor-pointer items-center justify-between px-5 py-4 text-[14px] font-medium" style={{ color: '#FAFAFA' }}>
                    {f.q}
                    <Icon name="chevron-down" size="sm" color="#71717A" className="transition-transform group-open:rotate-180" />
                  </summary>
                  <p className="px-5 pb-5 text-[14px] leading-relaxed" style={{ color: '#A1A1AA' }}>{f.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* CTA final */}
        <section className="px-4 pb-24 pt-4 md:px-6">
          <div className="mx-auto max-w-4xl rounded-3xl border p-10 text-center md:p-14" style={{ backgroundColor: 'rgba(99,102,241,0.08)', borderColor: 'rgba(99,102,241,0.25)' }}>
            <h2 className="text-2xl font-bold md:text-4xl" style={{ color: '#FAFAFA' }}>Pronto para organizar seu negócio?</h2>
            <p className="mx-auto mt-4 max-w-xl text-[15px]" style={{ color: '#A1A1AA' }}>Crie sua conta em menos de 2 minutos e comece a usar o Nexly hoje mesmo. Sem cartão de crédito.</p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link href="/cadastro" className="rounded-xl px-7 py-3.5 text-[15px] font-semibold shadow-lg shadow-[#6366F1]/25 transition-transform hover:scale-[1.02]" style={{ backgroundColor: '#6366F1', color: '#FAFAFA' }}>Criar conta grátis</Link>
              <Link href="/precos" className="rounded-xl border px-7 py-3.5 text-[15px] font-semibold transition-colors hover:bg-white/5" style={{ borderColor: 'rgba(255,255,255,0.12)', color: '#FAFAFA' }}>Ver planos</Link>
            </div>
          </div>
        </section>
      </main>

      <LandingFooter />
    </div>
  );
}
