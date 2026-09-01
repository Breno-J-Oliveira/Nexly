'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ReactNode, useState } from 'react';
import { useAuth } from '@/lib/auth';

function SvgIcon({ d, active }: { d: string; active: boolean }) {
  const stroke = active ? '#818CF8' : '#A1A1AA';
  return (
    <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={stroke}
      strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d={d} />
    </svg>
  );
}

type NavItem = { href: string; label: string; icon: string };
type NavGroup = { label?: string; items: NavItem[] };

const NAV_GROUPS: NavGroup[] = [
  {
    items: [
      { href: '/dashboard', label: 'Dashboard', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
      { href: '/agenda', label: 'Agenda', icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z' },
      { href: '/clientes', label: 'Clientes', icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z' },
      { href: '/profissionais', label: 'Profissionais', icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z' },
      { href: '/servicos', label: 'Servicos', icon: 'M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01' },
    ],
  },
  {
    label: 'Produtos',
    items: [
      { href: '/estoque', label: 'Estoque', icon: 'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4' },
      { href: '/pdv', label: 'PDV', icon: 'M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 100 4 2 2 0 000-4z' },
      { href: '/vendas', label: 'Vendas', icon: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z' },
    ],
  },
  {
    label: 'Relatorios',
    items: [
      { href: '/produtos', label: 'Produtos', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2' },
      { href: '/comissao', label: 'Comissoes', icon: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z' },
      { href: '/configuracoes', label: 'Configuracoes', icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065zM15 12a3 3 0 11-6 0 3 3 0 016 0z' },
    ],
  },
];

export function Shell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  return (
    <div className="flex min-h-screen" style={{ backgroundColor: '#0C0C10' }}>
      <aside
        className="fixed inset-y-0 left-0 z-30 flex w-60 flex-col transition-transform duration-200 max-md:-translate-x-full md:translate-x-0"
        style={{ borderRight: '1px solid rgba(255,255,255,0.06)', backgroundColor: '#111116' }}
      >
        <div className="flex h-14 items-center gap-2.5 px-5" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="flex h-7 w-7 items-center justify-center rounded-md" style={{ backgroundColor: '#6366F1' }}>
            <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="#FAFAFA" strokeWidth={2}>
              <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
            </svg>
          </div>
          <span className="text-[15px] font-semibold tracking-tight" style={{ color: '#FAFAFA' }}>Nexly</span>
        </div>
        <nav className="flex-1 overflow-y-auto px-3 py-3">
          {NAV_GROUPS.map((group, gi) => (
            <div key={gi}>
              {group.label && (
                <div className="px-3 pb-1 pt-3 text-[10px] font-semibold uppercase tracking-widest"
                  style={{ color: '#3F3F46' }}>{group.label}</div>
              )}
              <div className="space-y-0.5">
                {group.items.map((item) => {
                  const active = pathname.startsWith(item.href);
                  return (
                    <Link key={item.href} href={item.href}
                      className="group relative flex items-center gap-3 rounded-md px-3 py-2 text-[13px] font-medium transition-colors"
                      style={{
                        color: active ? '#818CF8' : '#A1A1AA',
                        backgroundColor: active ? 'rgba(99,102,241,0.10)' : 'transparent',
                      }}>
                      {active && <div className="absolute inset-y-1 left-0 w-0.5 rounded-full" style={{ backgroundColor: '#6366F1' }} />}
                      <SvgIcon d={item.icon} active={active} />
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }} className="p-4">
          <div className="mb-3 flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold"
              style={{ backgroundColor: '#6366F1', color: '#FAFAFA' }}>
              {user?.nome?.charAt(0).toUpperCase() ?? '?'}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-medium" style={{ color: '#FAFAFA' }}>{user?.nome}</p>
              <p className="truncate text-[11px]" style={{ color: '#71717A' }}>{user?.email}</p>
            </div>
          </div>
          <button onClick={() => void logout()}
            className="w-full rounded-md px-3 py-2 text-left text-[13px] transition-colors"
            style={{ color: '#71717A' }}>Sair</button>
        </div>
      </aside>
      <div className="ml-60 flex-1">
        <header className="sticky top-0 z-10 flex h-14 items-center border-b px-8 backdrop-blur"
          style={{ borderColor: 'rgba(255,255,255,0.06)', backgroundColor: 'rgba(12,12,16,0.85)' }}>
          <span className="text-[13px] font-medium" style={{ color: '#A1A1AA' }}>Nexly</span>
        </header>
        <main className="p-8">{children}</main>
      </div>
    </div>
  );
}