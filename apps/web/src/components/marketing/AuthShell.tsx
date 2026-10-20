import Link from 'next/link';
import Image from 'next/image';

export function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#08080C] text-white lg:grid lg:grid-cols-[minmax(300px,0.85fr)_minmax(0,1.15fr)]">
      <aside
        aria-label="Conheça o Nexly"
        className="relative hidden flex-col justify-between overflow-hidden border-r border-white/10 bg-[#13121D] p-10 lg:flex xl:p-16"
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-36 -left-36 h-[600px] w-[600px] rounded-full border border-[#C7C5FF]/10 shadow-[0_0_0_70px_#C7C5FF05,0_0_0_140px_#C7C5FF03]"
        />
        <Link
          href="/"
          aria-label="Nexly — página inicial"
          className="relative inline-flex w-fit items-center gap-3 rounded-lg"
        >
          <Image src="/logo.svg" alt="" width={28} height={36} />
          <span className="text-xl font-semibold tracking-tight">Nexly</span>
        </Link>
        <div className="relative my-16 max-w-md">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#C7C5FF]">
            Seu negócio, conectado
          </p>
          <p className="mt-6 text-4xl font-medium leading-[1.12] tracking-[-0.045em] xl:text-5xl">
            Mais clareza no trabalho.
            <br />
            <span className="text-[#B9B4CD]">Mais leveza no seu dia.</span>
          </p>
          <p className="mt-6 text-base leading-8 text-[#AAA7BA]">
            Agenda, clientes, estoque e vendas em um espaço que acompanha sua rotina.
          </p>
          <div className="mt-10 flex flex-wrap gap-2">
            {['Agenda', 'Clientes', 'Estoque', 'Financeiro'].map((module) => (
              <span
                key={module}
                className="rounded-full border border-white/12 px-3 py-2 text-xs text-[#C8C2D8]"
              >
                {module}
              </span>
            ))}
          </div>
        </div>
        <p className="relative text-xs leading-6 text-[#AAA7BA]">
          Comece com 1 profissional no gratuito.
          <br />
          Escolha os módulos que fazem sentido para você.
        </p>
      </aside>
      <main className="flex min-w-0 items-center justify-center px-4 py-8 sm:px-8 sm:py-12">
        <div className="auth-content relative w-full max-w-[440px]">
          <Link
            href="/"
            className="mb-6 inline-flex min-h-11 items-center rounded-lg text-sm text-[#B8B3C8] transition-colors hover:text-white"
          >
            ← Voltar para o início
          </Link>
          {children}
          <p className="mt-7 text-center text-xs leading-6 text-[#AAA7BA]">
            Precisa de ajuda?{' '}
            <Link href="/suporte" className="rounded text-[#C7C5FF] underline underline-offset-4">
              Fale com o suporte.
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}
