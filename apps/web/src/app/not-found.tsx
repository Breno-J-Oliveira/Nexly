import Link from 'next/link';
import { LandingHeader } from '@/components/LandingHeader';
import { LandingFooter } from '@/components/LandingFooter';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#08080C] text-white">
      <LandingHeader />
      <main id="conteudo-principal" className="mx-auto max-w-6xl px-5 py-20 sm:px-8 sm:py-28">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#C7C5FF]">
          Página não encontrada · 404
        </p>
        <div className="mt-8 grid gap-10 sm:grid-cols-[1fr_auto] sm:items-center">
          <div>
            <h1 className="max-w-xl text-4xl font-semibold leading-tight tracking-[-0.05em] sm:text-6xl">
              Vamos encontrar
              <br />
              outro caminho.
            </h1>
            <p className="mt-6 max-w-md text-base leading-8 text-[#AAA7BA]">
              O endereço pode ter mudado ou estar incompleto. Volte para o início ou acesse sua
              conta para continuar.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/"
                className="rounded-xl bg-[#C7C5FF] px-5 py-3.5 text-sm font-semibold text-[#151326] hover:bg-[#DAD9FF]"
              >
                Voltar para o início
              </Link>
              <Link
                href="/login"
                className="rounded-xl border border-white/15 px-5 py-3.5 text-sm font-medium hover:bg-white/5"
              >
                Acessar minha conta
              </Link>
            </div>
            <p className="mt-6 text-sm text-[#AAA7BA]">
              Precisa de ajuda?{' '}
              <Link href="/suporte" className="rounded text-[#C7C5FF] underline underline-offset-4">
                Fale com o suporte.
              </Link>
            </p>
          </div>
          <span
            aria-hidden="true"
            className="hidden select-none text-[180px] font-semibold leading-none tracking-[-0.08em] text-[#282333] sm:block"
          >
            404
          </span>
        </div>
      </main>
      <LandingFooter />
    </div>
  );
}
