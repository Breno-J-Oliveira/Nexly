'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useState } from 'react';
import { Icon } from '@/components/ui/Icon';

export function LandingHeader() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b backdrop-blur-md" style={{ backgroundColor: 'rgba(12,12,16,0.85)', borderColor: 'rgba(255,255,255,0.06)' }}>
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 md:px-6">
        <Link href="/" className="flex items-center gap-2">
          <div className="flex h-10 w-8 items-center justify-center">
            <Image src="/logo.svg" alt="Nexly" width={28} height={36} className="h-9 w-7 object-contain" />
          </div>
          <span className="text-lg font-bold" style={{ color: '#FAFAFA' }}>Nexly</span>
        </Link>

        <nav className="hidden items-center gap-8 md:flex">
          <Link href="/" className="text-[14px] font-medium text-[#A1A1AA] hover:text-white">Home</Link>
          <Link href="/funcionalidades" className="text-[14px] font-medium transition-colors hover:text-[#FAFAFA]" style={{ color: '#A1A1AA' }}>Funcionalidades</Link>
          <Link href="/precos" className="text-[14px] font-medium transition-colors hover:text-[#FAFAFA]" style={{ color: '#A1A1AA' }}>Preços</Link>
          <Link href="/blog" className="text-[14px] font-medium text-[#A1A1AA] hover:text-white">Blog</Link>
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          <Link href="/login" className="rounded-lg px-4 py-2 text-[14px] font-medium transition-colors hover:bg-white/5" style={{ color: '#A1A1AA' }}>Entrar</Link>
          <Link href="/cadastro" className="rounded-lg px-4 py-2 text-[14px] font-semibold" style={{ backgroundColor: '#6366F1', color: '#FAFAFA' }}>Criar conta</Link>
        </div>

        <button onClick={() => setMenuOpen(!menuOpen)} className="md:hidden" style={{ color: '#A1A1AA' }} aria-label="Menu" aria-expanded={menuOpen}>
          <Icon name={menuOpen ? 'xmark' : 'bars'} size="lg" color="#A1A1AA" />
        </button>
      </div>

      {menuOpen && (
        <div className="border-t px-4 py-4 md:hidden" style={{ backgroundColor: '#111116', borderColor: 'rgba(255,255,255,0.06)' }}>
          <nav className="flex flex-col gap-3">
            <Link href="/" onClick={() => setMenuOpen(false)} className="text-sm text-[#A1A1AA]">Home</Link>
            <Link href="/blog" onClick={() => setMenuOpen(false)} className="text-sm text-[#A1A1AA]">Blog</Link>
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
