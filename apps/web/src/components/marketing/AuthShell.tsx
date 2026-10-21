import Link from 'next/link';

export function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <main className="public-polish relative flex min-h-screen items-center justify-center bg-[#060608] px-4 py-8 sm:py-10">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,rgba(99,102,241,0.08),transparent_55%)]"
      />
      <div className="auth-content relative z-10 w-full max-w-[440px]">
        <Link
          href="/"
          className="mb-5 inline-flex min-h-11 items-center rounded-lg px-2 text-sm text-[#A1A1AA] transition-colors hover:text-white"
        >
          ← Voltar para o início
        </Link>
        {children}
        <p className="mt-7 text-center text-xs leading-6 text-[#A1A1AA]">
          Precisa de ajuda?{' '}
          <Link href="/suporte" className="rounded text-[#818CF8] underline underline-offset-4">
            Fale com o suporte.
          </Link>
        </p>
      </div>
    </main>
  );
}
