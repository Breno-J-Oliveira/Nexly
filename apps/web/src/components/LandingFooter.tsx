import Link from 'next/link';

export function LandingFooter() {
  return (
    <footer className="border-t py-12" style={{ backgroundColor: '#0C0C10', borderColor: 'rgba(255,255,255,0.06)' }}>
      <div className="mx-auto max-w-6xl px-4 md:px-6">
        <div className="flex flex-col items-center justify-between gap-6 md:flex-row">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg" style={{ backgroundColor: '#6366F1' }}>
              <img src="/logo.svg" alt="Nexly" className="h-4 w-4 object-contain" />
            </div>
            <span className="text-lg font-bold" style={{ color: '#FAFAFA' }}>Nexly</span>
          </div>
          <div className="flex gap-6">
            <Link href="/funcionalidades" className="text-[14px] transition-colors hover:text-[#FAFAFA]" style={{ color: '#A1A1AA' }}>Funcionalidades</Link>
            <Link href="/precos" className="text-[14px] transition-colors hover:text-[#FAFAFA]" style={{ color: '#A1A1AA' }}>Preços</Link>
            <Link href="/login" className="text-[14px] transition-colors hover:text-[#FAFAFA]" style={{ color: '#A1A1AA' }}>Entrar</Link>
          </div>
        </div>
        <p className="mt-8 text-center text-[12px]" style={{ color: '#71717A' }}>© {new Date().getFullYear()} Nexly. Todos os direitos reservados.</p>
      </div>
    </footer>
  );
}
