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
];

export function Shell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  return (
    <div className="flex min-h-screen">
      <aside className="fixed inset-y-0 left-0 flex w-64 flex-col border-r border-gray-200 bg-white">
        <div className="flex h-16 items-center gap-2 border-b border-gray-200 px-6">
          <span className="text-xl font-bold text-primary-600">Nexly</span>
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
                    ? 'bg-primary-50 text-primary-700'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <span>{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-gray-200 p-4">
          <div className="mb-3 flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-100 text-sm font-semibold text-primary-700">
              {user?.nome?.charAt(0).toUpperCase() ?? '?'}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-gray-900">{user?.nome}</p>
              <p className="truncate text-xs text-gray-500">{user?.email}</p>
            </div>
          </div>
          <button
            onClick={() => void logout()}
            className="w-full rounded-lg px-3 py-2 text-left text-sm text-gray-600 hover:bg-gray-100"
          >
            Sair
          </button>
        </div>
      </aside>

      <div className="ml-64 flex-1">
        <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b border-gray-200 bg-white px-8">
          <h1 className="text-lg font-semibold text-gray-900">Nexly</h1>
        </header>
        <main className="p-8">{children}</main>
      </div>
    </div>
  );
}
