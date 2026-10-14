'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { ReactNode, useState, useRef, useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import { useNotifications } from '@/lib/notifications';
import { formatarDataHora } from '@/lib/format';
import { Icon } from '@/components/ui/Icon';

/* --- Breadcrumb labels --- */
const PAGE_LABELS: Record<string, string> = {
  '/dashboard': 'Painel Geral',
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
  { label: 'MENU PRINCIPAL', items: [
    { label: 'Painel Geral', href: '/dashboard', icon: 'gauge-high' },
    { label: 'Agenda', href: '/agenda', icon: 'calendar-days' },
    { label: 'Clientes', href: '/clientes', icon: 'users' },
    { label: 'Profissionais', href: '/profissionais', icon: 'user-tie' },
    { label: 'Serviços', href: '/servicos', icon: 'scissors' },
  ]},
  { label: 'VENDAS', items: [
    { label: 'Produtos', href: '/produtos', icon: 'box-open' },
    { label: 'Estoque', href: '/estoque', icon: 'boxes-stacked' },
    { label: 'Pedidos', href: '/estoque/pedidos', icon: 'truck' },
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

/**
 * RBAC no menu: esconde itens que o papel não pode acessar.
 * Mantido em sintonia com apps/api/src/common/auth/permissions.ts.
 */
function hasAccess(route: string, role: string): boolean {
  if (role === 'ADMIN') return true;
  if (role === 'GESTOR') return route !== '/usuarios';
  const permitidas: Record<string, string[]> = {
    PROFISSIONAL: ['/dashboard', '/agenda'],
    RECEPCIONISTA: ['/dashboard', '/agenda', '/clientes', '/profissionais', '/servicos'],
    CAIXA: ['/dashboard', '/clientes', '/produtos', '/estoque', '/pdv', '/vendas'],
  };
  return (permitidas[role] ?? []).includes(route);
}

function NavLink({ item, active }: { item: NavItem; active: boolean }) {
  return (
    <Link
      href={item.href}
      className="group flex items-center gap-3 border rounded-lg px-3 py-2 text-[13px] font-medium transition-all duration-150"
      style={{
        backgroundColor: active ? 'rgba(99,102,241,0.10)' : 'transparent',
        borderColor: active ? 'rgba(99,102,241,0.28)' : 'transparent',
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
  const { notificacoes, naoLidas, marcarLida } = useNotifications();
  const [sidebarAberta, setSidebarAberta] = useState(false);
  const [menuAberto, setMenuAberto] = useState(false);
  const [notifAberto, setNotifAberto] = useState(false);
  const [busca, setBusca] = useState('');
  const menuRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);

  const pageLabel = PAGE_LABELS[pathname] ?? '';
  const nome = user?.nome ?? 'Usuário';
  const role = user?.role ?? '';
  const resultados = NAV_GROUPS.flatMap(group => group.items).filter(item => hasAccess(item.href, role) && item.label.toLocaleLowerCase('pt-BR').includes(busca.toLocaleLowerCase('pt-BR')));
  const dataHoje = new Intl.DateTimeFormat('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(new Date());
  const iniciais = nome.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase();

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuAberto(false);
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setNotifAberto(false);
    };
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') { setMenuAberto(false); setNotifAberto(false); setSidebarAberta(false); setBusca(''); } };
    document.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onClick);
    return () => { document.removeEventListener('mousedown', onClick); document.removeEventListener('keydown', onKey); };
  }, []);

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#060608' }}>
      {/* Overlay mobile */}
      {sidebarAberta && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden"
          role="presentation"
          onClick={() => setSidebarAberta(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed left-0 top-0 z-50 flex flex-col h-full w-[240px] transform border-r transition-transform duration-300 ease-out md:translate-x-0 ${
          sidebarAberta ? 'translate-x-0' : '-translate-x-full'
        }`}
        style={{ backgroundColor: '#111116', borderColor: 'rgba(255,255,255,0.06)' }}
      >
        <div className="flex h-[76px] shrink-0 items-center gap-3 border-b px-5" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
          <div className="flex h-10 w-8 items-center justify-center">
            <Image src="/logo.svg" alt="Nexly" width={32} height={40} className="h-10 w-8 object-contain" />
          </div>
          <span className="text-lg font-bold" style={{ color: '#FAFAFA' }}>Nexly</span>
          <button onClick={() => setSidebarAberta(false)} className="ml-auto md:hidden" style={{ color: '#A1A1AA' }} aria-label="Fechar menu">
            <Icon name="xmark" size="sm" color="#A1A1AA" />
          </button>
        </div>

        <nav aria-label="Menu principal" className="flex flex-1 flex-col gap-4 overflow-y-auto p-4">
          {NAV_GROUPS.map((group, idx) => {
            const items = group.items.filter((item) => hasAccess(item.href, role));
            if (items.length === 0) return null;
            return (
              <div key={idx}>
                {group.label && (
                  <p className="mb-2 px-3 text-[10px] font-bold uppercase tracking-wider" style={{ color: '#71717A' }}>
                    {group.label}
                  </p>
                )}
                <div className="flex flex-col gap-1">
                  {items.map((item) => (
                    <NavLink key={item.href} item={item} active={pathname === item.href || pathname.startsWith(`${item.href}/`)} />
                  ))}
                </div>
              </div>
            );
          })}
        </nav>
        <div className="mx-4 mb-4 flex shrink-0 items-center gap-3 rounded-xl border border-white/10 bg-[#18181F] p-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#6366F1]/15 text-xs font-semibold text-[#A5B4FC]">{iniciais}</span>
          <div className="min-w-0"><p className="truncate text-[13px] font-medium text-[#FAFAFA]">{nome}</p><p className="text-[11px] text-[#A1A1AA]">{role === 'ADMIN' ? 'Administrador' : role === 'GESTOR' ? 'Gestor' : role === 'CAIXA' ? 'Caixa' : role === 'RECEPCIONISTA' ? 'Recepcionista' : 'Profissional'}</p></div>
        </div>
      </aside>

      {/* Main */}
      <div className="flex min-h-screen flex-col min-w-0 md:pl-[240px]">
        {/* Header */}
        <header className="sticky top-0 z-10 flex min-h-[72px] items-center gap-3 border-b px-4 py-3 backdrop-blur-md md:px-8" style={{ backgroundColor: 'rgba(6,6,8,0.90)', borderColor: 'rgba(255,255,255,0.06)' }}>
          {/* Hamburger (mobile) */}
          <button onClick={() => setSidebarAberta(true)} className="md:hidden" style={{ color: '#A1A1AA' }} aria-label="Abrir menu">
            <Icon name="bars" size="sm" color="#A1A1AA" />
          </button>

          {/* Breadcrumb */}
          <div className="shell-default-heading min-w-0">
            <h1 className="truncate text-[24px] font-semibold tracking-tight text-[#FAFAFA]">{pageLabel || 'Nexly'}</h1>
            {pathname === '/dashboard' && <p className="mt-0.5 text-[12px] capitalize text-[#A1A1AA]">{dataHoje}</p>}
          </div>

          <div id="page-toolbar" className="min-w-0 flex-1 empty:hidden" />
          <div className="shell-header-tools ml-auto flex items-center gap-2">
            <div className="shell-global-search relative hidden lg:block">
              <label className="sr-only" htmlFor="nav-search">Buscar página</label>
              <input id="nav-search" value={busca} onChange={event => setBusca(event.target.value)} placeholder="Buscar página..." className="h-9 w-56 rounded-lg border border-white/10 bg-[#111116] px-3 text-[13px] text-[#FAFAFA] placeholder:text-[#71717A]" />
              {busca.trim() && <div className="absolute right-0 top-11 z-50 max-h-80 w-64 overflow-y-auto rounded-xl border border-white/10 bg-[#18181F] p-2 shadow-2xl">{resultados.length ? resultados.map(item => <Link key={item.href} href={item.href} onClick={() => setBusca('')} className="block rounded-lg px-3 py-2 text-[13px] text-[#FAFAFA] hover:bg-white/5">{item.label}</Link>) : <p className="p-3 text-xs text-[#A1A1AA]">Nenhuma página encontrada</p>}</div>}
            </div>
            {/* Notificações */}
            <div className="relative" ref={notifRef}>
              <button
                onClick={() => setNotifAberto((v) => !v)}
                className="relative flex h-9 w-9 items-center justify-center rounded-lg transition-colors hover:bg-white/5"
                style={{ color: '#A1A1AA' }}
                aria-label="Notificações" aria-expanded={notifAberto}
              >
                <Icon name="bell" size="sm" color="#71717A" />
                {naoLidas > 0 && (
                  <span className="absolute right-1.5 top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[9px] font-bold" style={{ backgroundColor: '#EF4444', color: '#fff' }}>
                    {naoLidas > 9 ? '9+' : naoLidas}
                  </span>
                )}
              </button>

              {notifAberto && (
                <div
                  className="absolute right-0 mt-2 w-[min(20rem,calc(100vw-2rem))] overflow-hidden rounded-lg border"
                  style={{ backgroundColor: '#18181F', borderColor: 'rgba(255,255,255,0.10)', boxShadow: '0 10px 30px rgba(0,0,0,0.4)', zIndex: 50 }}
                >
                  <div className="flex items-center justify-between border-b px-4 py-3" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
                    <span className="text-[13px] font-semibold" style={{ color: '#FAFAFA' }}>Notificações</span>
                    {naoLidas > 0 && (
                      <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold" style={{ backgroundColor: 'rgba(99,102,241,0.15)', color: '#818CF8' }}>
                        {naoLidas} não {naoLidas === 1 ? 'lida' : 'lidas'}
                      </span>
                    )}
                  </div>
                  <div className="max-h-80 overflow-y-auto">
                    {notificacoes.length === 0 ? (
                      <p className="px-4 py-6 text-center text-[13px]" style={{ color: '#71717A' }}>Nenhuma notificação no momento.</p>
                    ) : (
                      notificacoes.map((n) => (
                        <button
                          key={n.id}
                          onClick={() => { void marcarLida(n.id); if (n.link?.startsWith('/') && !n.link.startsWith('//')) window.location.href = n.link; }}
                          className="flex w-full flex-col gap-1 border-b px-4 py-3 text-left transition-colors hover:bg-white/5"
                          style={{ borderColor: 'rgba(255,255,255,0.04)', backgroundColor: n.lida ? 'transparent' : 'rgba(99,102,241,0.05)' }}
                        >
                          <span className="text-[13px] font-medium" style={{ color: '#FAFAFA' }}>{n.titulo}</span>
                          <span className="text-[12px] leading-relaxed" style={{ color: '#A1A1AA' }}>{n.mensagem}</span>
                          <span className="text-[11px]" style={{ color: '#71717A' }}>{formatarDataHora(n.createdAt)}</span>
                        </button>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* User menu */}
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setMenuAberto((v) => !v)}
                className="flex items-center gap-2 rounded-lg px-2 py-1.5 transition-colors hover:bg-white/5"
                aria-label="Menu do usuário" aria-expanded={menuAberto}
              >
                <div className="flex h-7 w-7 items-center justify-center rounded-full text-[11px] font-semibold" style={{ backgroundColor: '#6366F1', color: '#FAFAFA' }}>
                  {iniciais}
                </div>
                <span className="sr-only text-[13px] font-medium" style={{ color: '#A1A1AA' }}>{nome}</span>
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
                    onClick={() => { setMenuAberto(false); void logout(); }}
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
        <main className="dashboard-content min-w-0 flex-1 px-4 pb-24 pt-6 md:px-8 md:py-8" style={{ color: '#E4E4E7' }}>
          {children}
        </main>
      </div>
      <nav aria-label="Navegação mobile" className="fixed inset-x-0 bottom-0 z-30 flex border-t border-white/10 bg-[#111116]/95 px-2 pb-[env(safe-area-inset-bottom)] backdrop-blur-md md:hidden">
        {[
          { href: '/dashboard', label: 'Início', icon: 'gauge-high' },
          { href: '/agenda', label: 'Agenda', icon: 'calendar-days' },
          ...(NAV_GROUPS.flatMap(group => group.items).find(item => item.href === pathname && !['/dashboard', '/agenda'].includes(pathname)) ? [NAV_GROUPS.flatMap(group => group.items).find(item => item.href === pathname)!] : [{ href: '/clientes', label: 'Clientes', icon: 'users' }]),
        ].filter(item => hasAccess(item.href, role)).map(item => (
          <Link key={item.href} href={item.href} aria-current={pathname === item.href ? 'page' : undefined}
            className={`flex min-h-16 flex-1 flex-col items-center justify-center gap-1 text-[10px] font-medium ${pathname === item.href ? 'text-[#818CF8]' : 'text-[#A1A1AA]'}`}>
            <Icon name={item.icon} size="lg" color="currentColor" />{item.label}
          </Link>
        ))}
        <button type="button" onClick={() => setSidebarAberta(true)} aria-label="Abrir navegação" className="flex min-h-16 flex-1 flex-col items-center justify-center gap-1 text-[10px] font-medium text-[#A1A1AA]">
          <Icon name="bars" size="lg" color="currentColor" />Menu
        </button>
      </nav>
    </div>
  );
}
