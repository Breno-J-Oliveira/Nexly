'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ReactNode } from 'react';
import { useAuth } from '@/lib/auth';

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Dashboard', icon: '📊' },
  { href: '/agenda', label: 'Agenda', icon: '📅' },
  { href: '/clientes', label: 'Clientes', icon: '👥' },
  { href: '/profissionais', label: 'Profissionais', icon: '💇' },
  { href: '/servicos', label: 'Serviços', icon: '✨' },
  { href: '/estoque', label: 'Estoque', icon: '📦' },
  { href: '/pdv', label: 'PDV', icon: '🛒' },
  { href: '/vendas', label: 'Vendas', icon: '💰' },
];

export function Shell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  return (
    <div className="flex min-h-screen">
      <aside className="fixed inset-y-0 left-0 flex w-64 flex-col border-r border-zinc-800 bg-zinc-900">
        <div className="flex h-16 items-center gap-2 border-b border-zinc-800 px-6">
          <span className="text-lg font-semibold tracking-tight text-primary-400">
            Nexly
            <span className="text-zinc-500">.</span>
          </span>
        </div>

        <nav className="flex-1 space-y-1 px-3 py-4">
          {NAV_ITEMS.map((item) => {
            const active = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition ${
                  active
                    ? 'bg-primary-500/10 text-primary-300'
                    : 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100'
                }`}
              >
                <span>{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-zinc-800 p-4">
          <div className="mb-3 flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-zinc-800 text-sm font-semibold text-primary-300">
              {user?.nome?.charAt(0).toUpperCase() ?? '?'}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-zinc-100">{user?.nome}</p>
              <div className="mt-0.5 flex items-center gap-2">
                <p className="truncate text-xs text-zinc-500">{user?.email}</p>
                {user?.role && (
                  <span
                    className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                      user.role === 'ADMIN'
                        ? 'bg-primary-500/15 text-primary-300'
                        : 'bg-zinc-800 text-zinc-400'
                    }`}
                    title={`Papel: ${user.role}`}
                  >
                    {user.role}
                  </span>
                )}
              </div>
            </div>
          </div>
          <button
            onClick={() => void logout()}
            className="w-full rounded-lg px-3 py-2 text-left text-sm text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100"
          >
            Sair
          </button>
        </div>
      </aside>

      <div className="ml-64 flex-1">
        <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b border-zinc-800 bg-zinc-950/80 px-8 backdrop-blur">
          <h1 className="text-base font-medium text-zinc-200">Nexly</h1>
        </header>
        <main className="p-8">{children}</main>
      </div>
    </div>
  );
}
