'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ReactNode, useState, useRef, useEffect } from 'react';
import { useAuth } from '@/lib/auth';

/* --- SVG Icons (Lucide outline, 16px, stroke 1.5) --- */
function SvgIcon({ d, active, size = 16 }: { d: string; active?: boolean; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke={active ? '#818CF8' : '#A1A1AA'} strokeWidth={1.5}
      strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d={d} />
    </svg>
  );
}


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

/* --- Navigation icons (Lucide outline paths) --- */
const ICONS: Record<string, string> = {
  dashboard: 'M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z',
  agenda: 'M8 2v4m8-4v4M3 8h18M4 4h16a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1z',
  clientes: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zm14 10v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75',
  profissionais: 'M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2m8-6a4 4 0 1 0 0-8 4 4 0 0 0 0 8zm10 6v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75',
  servicos: 'M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z',
  produtos: 'M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4zM3 6h18M9 10a3 3 0 1 0 6 0',
  estoque: 'M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2m1-2h6a1 1 0 0 1 1 1v2a1 1 0 0 1-1 1H9a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1zm3 9v3m0 3v-3m0-3l-2 2m2-2l2 2',
  pdv: 'M3 3h18v18H3V3zm6-2v4m4-4v4m-9 8h14m-11 0v3m6-3v2',
  vendas: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6m-9 5v6m0-6l3 3 3-3',
  relatorios: 'M18 20V10m-6 10V4M6 20v-6',
  comissao: 'M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6',
  fidelidade: 'M12 2l2.9 5.88 6.1.88-4.5 4.4 1.1 6.1-5.6-3-5.6 3 1.1-6.1L3.5 8.76l6.1-.88L12 2z',
  usuarios: 'M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2m10-10a4 4 0 1 0 0-8 4 4 0 0 0 0 8zm8 10v-2a4 4 0 0 0-3-3.87',
  config: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zm7.4-3a7.4 7.4 0 0 0-.1-1.2l2-1.5-2-3.5-2.4 1a7.4 7.4 0 0 0-2-1.2L14.5 3h-5l-.4 2.6a7.4 7.4 0 0 0-2 1.2l-2.4-1-2 3.5 2 1.5a7.4 7.4 0 0 0 0 2.4l-2 1.5 2 3.5 2.4-1a7.4 7.4 0 0 0 2 1.2l.4 2.6h5l.4-2.6a7.4 7.4 0 0 0 2-1.2l2.4 1 2-3.5-2-1.5c.1-.4.1-.8.1-1.2z',
};

/* --- Navigation structure --- */
type NavItem = { label: string; href: string; icon: string };
type NavGroup = { label?: string; items: NavItem[] };
const NAV_GROUPS: NavGroup[] = [
  { items: [
    { label: 'Dashboard', href: '/dashboard', icon: ICONS.dashboard! },
    { label: 'Agenda', href: '/agenda', icon: ICONS.agenda! },
    { label: 'Clientes', href: '/clientes', icon: ICONS.clientes! },
    { label: 'Profissionais', href: '/profissionais', icon: ICONS.profissionais! },
    { label: 'Serviços', href: '/servicos', icon: ICONS.servicos! },
  ]},
  { label: 'VENDAS', items: [
    { label: 'Produtos', href: '/produtos', icon: ICONS.produtos! },
    { label: 'Estoque', href: '/estoque', icon: ICONS.estoque! },
    { label: 'PDV', href: '/pdv', icon: ICONS.pdv! },
    { label: 'Vendas', href: '/vendas', icon: ICONS.vendas! },
  ]},
  { label: 'GESTÃO', items: [
    { label: 'Relatórios', href: '/relatorios', icon: ICONS.relatorios! },
    { label: 'Comissões', href: '/comissao', icon: ICONS.comissao! },
    { label: 'Fidelidade', href: '/fidelidade', icon: ICONS.fidelidade! },
  ]},
  { label: 'SISTEMA', items: [
    { label: 'Usuários', href: '/usuarios', icon: ICONS.usuarios! },
    { label: 'Configurações', href: '/configuracoes', icon: ICONS.config! },
  ]},
];
function inicials(nome?: string | null) {
  if (!nome) return 'NX';
  const p = nome.trim().split(/\s+/).filter(Boolean);
  const first = p[0];
  if (!first) return 'NX';
  const last = p[p.length - 1];
  const letters = p.length >= 2 ? first.charAt(0) + (last ? last.charAt(0) : '') : first.slice(0, 2);
  return letters.toUpperCase();
}

export function Shell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [sidebarAberta, setSidebarAberta] = useState(false);
  const [menuAberto, setMenuAberto] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuAberto(false);
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const role = user?.role ?? 'CAIXA';
  const pode = (path: string) => role === 'ADMIN' || !['/relatorios', '/comissao', '/fidelidade', '/usuarios', '/configuracoes'].includes(path);

  const grupos = NAV_GROUPS
    .map((g) => ({ ...g, items: g.items.filter((i) => pode(i.href)) }))
    .filter((g) => g.items.length > 0);

  const pageLabel =
    pathname === '/'
      ? 'Dashboard'
      : PAGE_LABELS[pathname] ??
        PAGE_LABELS[Object.keys(PAGE_LABELS).find((p) => pathname.startsWith(p + '/')) ?? ''];

  const nome = user?.nome || user?.email?.split('@')[0] || 'Usuário';
  const iniciais = inicials(user?.nome || user?.email);

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#0C0C10' }}>
      {/* Overlay mobile */}
      {sidebarAberta && (
        <div
          className="fixed inset-0 z-20 md:hidden"
          style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
          onClick={() => setSidebarAberta(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-30 flex w-64 flex-col border-r transition-transform duration-200 md:translate-x-0 ${
          sidebarAberta ? 'translate-x-0' : '-translate-x-full'
        }`}
        style={{ backgroundColor: '#111116', borderColor: 'rgba(255,255,255,0.06)' }}
      >
        {/* Logo */}
        <div className="flex h-16 items-center gap-2.5 px-5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg" style={{ backgroundColor: '#6366F1' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M13 2L3 14h7l-1 8 10-12h-7l1-8z" />
            </svg>
          </div>
          <span className="text-[15px] font-semibold tracking-tight" style={{ color: '#FAFAFA' }}>Nexly</span>
          <button
            onClick={() => setSidebarAberta(false)}
            className="ml-auto md:hidden"
            style={{ color: '#A1A1AA' }}
            aria-label="Fechar menu"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-3 py-2">
          {grupos.map((group, gi) => (
            <div key={gi} className="mb-1">
              {group.label && (
                <div className="px-3 pb-1 pt-3 text-[10px] font-semibold uppercase tracking-widest" style={{ color: '#3F3F46' }}>
                  {group.label}
                </div>
              )}
              <div className="space-y-0.5">
                {group.items.map((item) => {
                  const active = pathname === item.href || pathname.startsWith(item.href + '/');
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setSidebarAberta(false)}
                      className="group relative flex items-center gap-3 rounded-md px-3 py-2 text-[13px] font-medium transition-colors"
                      style={{
                        color: active ? '#818CF8' : '#A1A1AA',
                        backgroundColor: active ? 'rgba(99,102,241,0.10)' : 'transparent',
                      }}
                    >
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
        {/* Sidebar footer */}
        <div className="border-t px-3 py-3" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
          <div className="flex items-center gap-3 rounded-lg px-2 py-2">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[12px] font-semibold" style={{ backgroundColor: 'rgba(99,102,241,0.15)', color: '#818CF8' }}>
              {iniciais}
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-[13px] font-medium" style={{ color: '#FAFAFA' }}>{nome}</div>
              <div className="text-[11px]" style={{ color: '#71717A' }}>Admin</div>
            </div>
          </div>
        </div>
      </aside>

      {/* Main */}
      <div className="flex min-h-screen flex-col md:pl-64">
        {/* Header */}
        <header className="sticky top-0 z-10 flex h-16 items-center gap-3 border-b px-4 md:px-6" style={{ backgroundColor: 'rgba(12,12,16,0.85)', borderColor: 'rgba(255,255,255,0.06)' }}>
          {/* Hamburger (mobile) */}
          <button onClick={() => setSidebarAberta(true)} className="md:hidden" style={{ color: '#A1A1AA' }} aria-label="Abrir menu">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
              <path d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>

          {/* Breadcrumb */}
          <h1 className="text-[15px] font-semibold tracking-tight" style={{ color: '#FAFAFA' }}>
            {pageLabel || 'Nexly'}
          </h1>

          <div className="ml-auto flex items-center gap-1">
            {/* Bell (visual) */}
            <button className="flex h-9 w-9 items-center justify-center rounded-lg transition-colors hover:bg-white/5" style={{ color: '#A1A1AA' }} aria-label="Notificações">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 0 1-3.46 0" />
              </svg>
            </button>

            {/* User menu */}
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setMenuAberto((v) => !v)}
                className="flex items-center gap-2 rounded-lg px-2 py-1.5 transition-colors hover:bg-white/5"
                aria-label="Menu do usuário"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-lg text-[12px] font-semibold" style={{ backgroundColor: 'rgba(99,102,241,0.15)', color: '#818CF8' }}>
                  {iniciais}
                </div>
                <span className="hidden text-[13px] font-medium sm:block" style={{ color: '#E4E4E7' }}>{nome}</span>
              </button>

              {menuAberto && (
                <div className="absolute right-0 mt-2 w-48 overflow-hidden rounded-lg border" style={{ backgroundColor: '#111116', borderColor: 'rgba(255,255,255,0.06)', boxShadow: '0 10px 30px rgba(0,0,0,0.4)' }}>
                  <Link
                    href="/configuracoes"
                    onClick={() => setMenuAberto(false)}
                    className="block px-4 py-2.5 text-[13px] transition-colors hover:bg-white/5"
                    style={{ color: '#E4E4E7' }}
                  >
                    Configurações
                  </Link>
                  <button
                    type="button"
                    onClick={() => { setMenuAberto(false); logout(); }}
                    className="block w-full px-4 py-2.5 text-left text-[13px] transition-colors hover:bg-white/5"
                    style={{ color: '#F87171' }}
                  >
                    Sair
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

