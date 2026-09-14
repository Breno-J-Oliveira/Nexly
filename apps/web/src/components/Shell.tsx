'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ReactNode, useState, useRef, useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import { useNotifications } from '@/lib/notifications';
import { Icon } from '@/components/ui/Icon';

/* --- Breadcrumb labels --- */
const PAGE_LABELS: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/agenda': 'Agenda',
  '/clientes': 'Clientes',
  '/profissionais': 'Profissionais',
  '/servicos': 'Serviços',
  '/produtos': 'Produtos',
  '/estoque': 'Estoque',
  '/pdv': 'Ponto de Venda',
  '/vendas': 'Vendas',
  '/relatorios': 'Relatórios',
  '/comissao': 'Comissões',
  '/fidelidade': 'Fidelidade',
  '/usuarios': 'Usuários',
  '/configuracoes': 'Configurações',
};

/* --- Navigation structure --- */
type NavItem = { label: string; href: string; icon: string };
type NavGroup = { label?: string; items: NavItem[] };
const NAV_GROUPS: NavGroup[] = [
  { items: [
    { label: 'Dashboard', href: '/dashboard', icon: 'gauge-high' },
    { label: 'Agenda', href: '/agenda', icon: 'calendar-days' },
    { label: 'Clientes', href: '/clientes', icon: 'users' },
    { label: 'Profissionais', href: '/profissionais', icon: 'user-tie' },
    { label: 'Serviços', href: '/servicos', icon: 'scissors' },
  ]},
  { label: 'VENDAS', items: [
    { label: 'Produtos', href: '/produtos', icon: 'box-open' },
    { label: 'Estoque', href: '/estoque', icon: 'boxes-stacked' },
    { label: 'PDV', href: '/pdv', icon: 'cash-register' },
    { label: 'Vendas', href: '/vendas', icon: 'receipt' },
    { label: 'Relatórios', href: '/relatorios', icon: 'chart-column' },
  ]},
  { label: 'GESTÃO', items: [
    { label: 'Comissões', href: '/comissao', icon: 'money-bill-wave' },
    { label: 'Fidelidade', href: '/fidelidade', icon: 'star' },
    { label: 'Usuários', href: '/usuarios', icon: 'user-group' },
    { label: 'Configurações', href: '/configuracoes', icon: 'gear' },
  ]},
];

function NavLink({ item, active }: { item: NavItem; active: boolean }) {
  return (
    <Link
      href={item.href}
      className="group flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-medium transition-all duration-150"
      style={{
        backgroundColor: active ? 'rgba(99,102,241,0.12)' : 'transparent',
        color: active ? '#818CF8' : '#A1A1AA',
      }}
    >
      <Icon name={item.icon} size="sm" color={active ? '#818CF8' : '#A1A1AA'} className="transition-colors duration-150 group-hover:text-[#FAFAFA]" />
      <span className="transition-colors duration-150 group-hover:text-[#FAFAFA]">{item.label}</span>
    </Link>
  );
}

export function Shell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const { naoLidas } = useNotifications();
  const [sidebarAberta, setSidebarAberta] = useState(false);
  const [menuAberto, setMenuAberto] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const pageLabel = PAGE_LABELS[pathname] ?? '';
  const nome = user?.nome ?? 'Usuário';
  const iniciais = nome.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase();

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuAberto(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#0C0C10' }}>
      {/* Overlay mobile */}
      {sidebarAberta && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden"
          onClick={() => setSidebarAberta(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed left-0 top-0 z-50 h-full w-64 transform border-r transition-transform duration-300 ease-out md:translate-x-0 ${
          sidebarAberta ? 'translate-x-0' : '-translate-x-full'
        }`}
        style={{ backgroundColor: '#111116', borderColor: 'rgba(255,255,255,0.06)' }}
      >
        <div className="flex h-16 items-center gap-3 border-b px-5" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
          <div className="flex h-9 w-9 items-center justify-center rounded-lg" style={{ backgroundColor: '#6366F1' }}>
            <img src="/logo.svg" alt="Nexly" className="h-5 w-5 object-contain" />
          </div>
          <span className="text-lg font-bold" style={{ color: '#FAFAFA' }}>Nexly</span>
          <button onClick={() => setSidebarAberta(false)} className="ml-auto md:hidden" style={{ color: '#A1A1AA' }} aria-label="Fechar menu">
            <Icon name="xmark" size="sm" color="#A1A1AA" />
          </button>
        </div>

        <nav className="flex flex-col gap-6 p-4">
          {NAV_GROUPS.map((group, idx) => (
            <div key={idx}>
              {group.label && (
                <p className="mb-2 px-3 text-[10px] font-bold uppercase tracking-wider" style={{ color: '#71717A' }}>
                  {group.label}
                </p>
              )}
              <div className="flex flex-col gap-1">
                {group.items.map((item) => (
                  <NavLink key={item.href} item={item} active={pathname === item.href || pathname.startsWith(`${item.href}/`)} />
                ))}
              </div>
            </div>
          ))}
        </nav>
      </aside>

      {/* Main */}
      <div className="flex min-h-screen flex-col md:pl-64">
        {/* Header */}
        <header className="sticky top-0 z-10 flex h-16 items-center gap-3 border-b px-4 md:px-6" style={{ backgroundColor: 'rgba(12,12,16,0.85)', borderColor: 'rgba(255,255,255,0.06)' }}>
          {/* Hamburger (mobile) */}
          <button onClick={() => setSidebarAberta(true)} className="md:hidden" style={{ color: '#A1A1AA' }} aria-label="Abrir menu">
            <Icon name="bars" size="sm" color="#A1A1AA" />
          </button>

          {/* Breadcrumb */}
          <h1 className="text-[14px]" style={{ color: '#A1A1AA' }}>
            {pageLabel || 'Nexly'}
          </h1>

          <div className="ml-auto flex items-center gap-1">
            {/* Bell */}
            <button className="relative flex h-9 w-9 items-center justify-center rounded-lg transition-colors hover:bg-white/5" style={{ color: '#A1A1AA' }} aria-label="Notificações">
              <Icon name="bell" size="sm" color="#71717A" />
              {naoLidas > 0 && (
                <span className="absolute right-1.5 top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[9px] font-bold" style={{ backgroundColor: '#EF4444', color: '#fff' }}>
                  {naoLidas > 9 ? '9+' : naoLidas}
                </span>
              )}
            </button>

            {/* User menu */}
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setMenuAberto((v) => !v)}
                className="flex items-center gap-2 rounded-lg px-2 py-1.5 transition-colors hover:bg-white/5"
                aria-label="Menu do usuário"
              >
                <div className="flex h-7 w-7 items-center justify-center rounded-full text-[11px] font-semibold" style={{ backgroundColor: '#6366F1', color: '#FAFAFA' }}>
                  {iniciais}
                </div>
                <span className="hidden text-[13px] font-medium sm:block" style={{ color: '#A1A1AA' }}>{nome}</span>
                <Icon name="chevron-down" size="xs" color="#71717A" />
              </button>

              {menuAberto && (
                <div
                  className="absolute right-0 mt-2 w-48 overflow-hidden rounded-lg border"
                  style={{ backgroundColor: '#18181F', borderColor: 'rgba(255,255,255,0.10)', borderRadius: 8, boxShadow: '0 10px 30px rgba(0,0,0,0.4)', zIndex: 50 }}
                >
                  <Link
                    href="/configuracoes"
                    onClick={() => setMenuAberto(false)}
                    className="flex items-center gap-2 px-4 py-2.5 text-[13px] transition-colors hover:bg-white/5"
                    style={{ color: '#E4E4E7' }}
                  >
                    <Icon name="gear" size="xs" color="#A1A1AA" /> Configurações
                  </Link>
                  <div className="my-1 h-px" style={{ backgroundColor: 'rgba(255,255,255,0.10)' }} />
                  <button
                    type="button"
                    onClick={() => { setMenuAberto(false); logout(); }}
                    className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-[13px] transition-colors hover:bg-white/5"
                    style={{ color: '#F87171' }}
                  >
                    <Icon name="arrow-right-from-bracket" size="xs" color="#F87171" /> Sair
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 px-4 py-6 md:px-6" style={{ color: '#E4E4E7' }}>
          {children}
        </main>
      </div>
    </div>
  );
}
