'use client';

import Link from 'next/link';
import { useState } from 'react';

export function LandingHeader() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b backdrop-blur-md" style={{ backgroundColor: 'rgba(12,12,16,0.85)', borderColor: 'rgba(255,255,255,0.06)' }}>
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 md:px-6">
        <Link href="/" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg" style={{ backgroundColor: '#6366F1' }}>
            <img src="/logo.svg" alt="Nexly" className="h-4 w-4 object-contain" />
          </div>
          <span className="text-lg font-bold" style={{ color: '#FAFAFA' }}>Nexly</span>
        </Link>

        <nav className="hidden items-center gap-8 md:flex">
          <Link href="/funcionalidades" className="text-[14px] font-medium transition-colors hover:text-[#FAFAFA]" style={{ color: '#A1A1AA' }}>Funcionalidades</Link>
          <Link href="/precos" className="text-[14px] font-medium transition-colors hover:text-[#FAFAFA]" style={{ color: '#A1A1AA' }}>Preços</Link>
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          <Link href="/login" className="rounded-lg px-4 py-2 text-[14px] font-medium transition-colors hover:bg-white/5" style={{ color: '#A1A1AA' }}>Entrar</Link>
          <Link href="/cadastro" className="rounded-lg px-4 py-2 text-[14px] font-semibold" style={{ backgroundColor: '#6366F1', color: '#FAFAFA' }}>Criar conta</Link>
        </div>

        <button onClick={() => setMenuOpen(!menuOpen)} className="md:hidden" style={{ color: '#A1A1AA' }} aria-label="Menu">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M4 6h16M4 12h16M4 18h16"/></svg>
        </button>
      </div>

      {menuOpen && (
        <div className="border-t px-4 py-4 md:hidden" style={{ backgroundColor: '#111116', borderColor: 'rgba(255,255,255,0.06)' }}>
          <nav className="flex flex-col gap-3">
            <Link href="/funcionalidades" onClick={() => setMenuOpen(false)} className="text-[14px] font-medium" style={{ color: '#A1A1AA' }}>Funcionalidades</Link>
            <Link href="/precos" onClick={() => setMenuOpen(false)} className="text-[14px] font-medium" style={{ color: '#A1A1AA' }}>Preços</Link>
            <Link href="/login" onClick={() => setMenuOpen(false)} className="text-[14px] font-medium" style={{ color: '#A1A1AA' }}>Entrar</Link>
            <Link href="/cadastro" onClick={() => setMenuOpen(false)} className="rounded-lg px-4 py-2 text-center text-[14px] font-semibold" style={{ backgroundColor: '#6366F1', color: '#FAFAFA' }}>Criar conta</Link>
          </nav>
        </div>
      )}
    </header>
  );
}
