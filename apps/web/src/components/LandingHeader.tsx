'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { Icon } from '@/components/ui/Icon';

const publicLinks = [
  { href: '/', label: 'Início' },
  { href: '/funcionalidades', label: 'Funcionalidades' },
  { href: '/precos', label: 'Preços' },
  { href: '/blog', label: 'Blog' },
];

export function LandingHeader() {
  const [menuOpen, setMenuOpen] = useState(false);
  const pathname = usePathname();
  const menuButton = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!menuOpen) return;
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setMenuOpen(false);
        menuButton.current?.focus();
      }
    };
    window.addEventListener('keydown', escape);
    return () => window.removeEventListener('keydown', escape);
  }, [menuOpen]);
  const isActive = (href: string) =>
    pathname === href || (href !== '/' && pathname.startsWith(`${href}/`));

  return (
    <header
      className="sticky top-0 z-50 border-b backdrop-blur-md"
      style={{ backgroundColor: 'rgba(8,8,12,0.92)', borderColor: 'rgba(255,255,255,0.06)' }}
    >
      <a
        href={pathname.startsWith('/blog') ? '#blog-content' : '#conteudo-principal'}
        className="sr-only rounded-lg bg-[#6366F1] p-3 text-sm font-semibold text-[#FAFAFA] focus:not-sr-only focus:absolute focus:left-4 focus:top-3"
      >
        Pular para o conteúdo
      </a>
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5 sm:px-8">
        <Link
          href="/"
          aria-label="Nexly — página inicial"
          className="flex items-center gap-2 rounded-lg"
        >
          <div className="flex h-10 w-8 items-center justify-center">
            <Image
              src="/logo.svg"
              alt="Nexly"
              width={28}
              height={36}
              className="h-9 w-7 object-contain"
            />
          </div>
          <span className="text-lg font-bold" style={{ color: '#FAFAFA' }}>
            Nexly
          </span>
        </Link>

        <nav aria-label="Navegação principal" className="hidden items-center gap-8 md:flex">
          {publicLinks.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              aria-current={pathname === href ? 'page' : undefined}
              className={`rounded py-2 text-[14px] font-medium transition-colors ${isActive(href) ? 'text-[#818CF8]' : 'text-[#A1A1AA] hover:text-white'}`}
            >
              {label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          <Link
            href="/login"
            className="rounded-lg px-4 py-2 text-[14px] font-medium transition-colors hover:bg-white/5"
            style={{ color: '#A1A1AA' }}
          >
            Entrar
          </Link>
          <Link
            href="/cadastro"
            className="rounded-lg px-4 py-2 text-[14px] font-semibold"
            style={{ backgroundColor: '#6366F1', color: '#FAFAFA' }}
          >
            Criar conta
          </Link>
        </div>

        <button
          ref={menuButton}
          type="button"
          onClick={() => setMenuOpen(!menuOpen)}
          className="flex h-11 w-11 items-center justify-center rounded-lg md:hidden"
          style={{ color: '#A1A1AA' }}
          aria-label="Menu"
          aria-expanded={menuOpen}
          aria-controls="landing-mobile-menu"
        >
          <Icon name={menuOpen ? 'xmark' : 'bars'} size="lg" color="#A1A1AA" />
        </button>
      </div>

      {menuOpen && (
        <div
          id="landing-mobile-menu"
          className="border-t px-4 py-4 md:hidden"
          style={{ backgroundColor: '#111116', borderColor: 'rgba(255,255,255,0.06)' }}
        >
          <nav aria-label="Navegação principal no celular" className="flex flex-col gap-2">
            {publicLinks.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                onClick={() => setMenuOpen(false)}
                aria-current={pathname === href ? 'page' : undefined}
                className={`rounded-lg px-3 py-3 text-sm font-medium ${isActive(href) ? 'bg-indigo-500/10 text-indigo-200' : 'text-[#A1A1AA] hover:bg-white/5 hover:text-white'}`}
              >
                {label}
              </Link>
            ))}
            <Link
              href="/login"
              onClick={() => setMenuOpen(false)}
              className="rounded-lg px-3 py-3 text-[14px] font-medium"
              style={{ color: '#A1A1AA' }}
            >
              Entrar
            </Link>
            <Link
              href="/cadastro"
              onClick={() => setMenuOpen(false)}
              className="rounded-lg px-4 py-2 text-center text-[14px] font-semibold"
              style={{ backgroundColor: '#6366F1', color: '#FAFAFA' }}
            >
              Criar conta
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
}
