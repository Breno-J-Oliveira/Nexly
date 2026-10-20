import type { Metadata } from 'next';
import Link from 'next/link';
import { LandingHeader } from '@/components/LandingHeader';
import { LandingFooter } from '@/components/LandingFooter';
import { SUPPORT_EMAIL, SUPPORT_MAILTO } from '@/lib/support';

export const metadata: Metadata = {
  title: 'Ajuda e suporte | Nexly',
  description:
    'Encontre ajuda para acessar o Nexly, gerenciar sua assinatura e falar com o suporte.',
};

const topics = [
  {
    title: 'Acessar minha conta',
    description:
      'Entre com seu e-mail e senha. Se criou a conta com o Google, use o botão do Google na tela de entrada.',
    href: '/login',
    action: 'Ir para o login',
  },
  {
    title: 'Plano e pagamentos',
    description:
      'Consulte sua assinatura, atualize a forma de pagamento ou agende o cancelamento no portal do Stripe.',
    href: '/assinatura',
    action: 'Ver minha assinatura',
  },
  {
    title: 'Conhecer os recursos',
    description:
      'Veja como agenda, clientes, estoque e vendas se conectam na rotina do seu negócio.',
    href: '/funcionalidades',
    action: 'Explorar funcionalidades',
  },
];

export default function SuportePage() {
  return (
    <div className="min-h-screen bg-[#0C0C10] text-[#FAFAFA]">
      <LandingHeader />
      <main className="mx-auto max-w-5xl px-4 py-14 md:px-6 md:py-20">
        <Link
          href="/"
          className="inline-flex rounded-lg py-2 text-sm text-indigo-300 hover:underline"
        >
          ← Voltar para o início
        </Link>
        <header className="mt-8 max-w-2xl">
          <p className="text-sm font-medium text-indigo-300">Estamos por aqui</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-5xl">
            Como podemos ajudar?
          </h1>
          <p className="mt-5 text-base leading-7 text-[#A1A1AA]">
            Encontre o caminho para continuar usando o Nexly ou fale diretamente com o suporte.
          </p>
        </header>
        <section aria-label="Atalhos de ajuda" className="mt-10 grid gap-5 md:grid-cols-3">
          {topics.map((topic) => (
            <article
              key={topic.href}
              className="flex flex-col rounded-2xl border border-white/10 bg-[#111116] p-6"
            >
              <h2 className="text-lg font-semibold">{topic.title}</h2>
              <p className="mt-3 flex-1 text-sm leading-7 text-[#A1A1AA]">{topic.description}</p>
              <Link
                href={topic.href}
                className="mt-6 inline-flex min-h-11 items-center text-sm font-medium text-indigo-300 hover:underline"
              >
                {topic.action} →
              </Link>
            </article>
          ))}
        </section>
        <section
          aria-labelledby="contato-suporte"
          className="mt-10 rounded-2xl border border-indigo-400/25 bg-indigo-400/5 p-6 sm:p-8"
        >
          <h2 id="contato-suporte" className="text-2xl font-semibold">
            Fale com o suporte
          </h2>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-[#A1A1AA]">
            Conte o que você estava tentando fazer, em qual página e qual mensagem apareceu. Informe
            o e-mail da sua conta para ajudar na identificação. Não envie senhas, códigos de
            autenticação ou dados completos de cartão.
          </p>
          <a
            href={SUPPORT_MAILTO}
            className="mt-6 inline-flex min-h-11 items-center justify-center rounded-xl bg-[#6366F1] px-5 py-3 text-sm font-semibold text-white hover:bg-indigo-500"
          >
            Enviar e-mail ao suporte
          </a>
          <p className="mt-4 break-all text-sm text-indigo-200">{SUPPORT_EMAIL}</p>
          <p className="mt-2 text-sm leading-7 text-[#A1A1AA]">
            Você também pode copiar o endereço e escrever pelo seu serviço de e-mail.
          </p>
        </section>
      </main>
      <LandingFooter />
    </div>
  );
}
