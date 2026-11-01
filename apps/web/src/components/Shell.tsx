'use client';

import Link from 'next/link';
import { canAccessWorkspaceRoute as hasAccess } from '@nexly/shared';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { ReactNode, useState, useRef, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/auth';
import { useWorkspace } from '@/lib/workspace';
import { useNotifications } from '@/lib/notifications';
import { formatarDataHora } from '@/lib/format';
import { Icon } from '@/components/ui/Icon';
import { CommandPalette } from '@/components/CommandPalette';
import { ConnectionStatus } from '@/components/ConnectionStatus';

import { navigationGroups, visibleNavigation, type NavItem } from '@/lib/navigation';

/**
 * RBAC no menu: esconde itens que o papel não pode acessar.
 * Mantido em sintonia com apps/api/src/common/auth/permissions.ts.
 */

function NavLink({ item, active, onNavigate }: { item: NavItem; active: boolean; onNavigate: () => void }) {
  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      aria-current={active ? 'page' : undefined}
      className="group flex min-h-11 items-center gap-3 border rounded-lg px-3 py-2 text-[13px] font-medium transition-colors duration-150 motion-reduce:transition-none"
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
  const { enabled,profile } = useWorkspace();
  const { user, logout } = useAuth();
  const { notificacoes, naoLidas, marcarLida } = useNotifications();
  const [sidebarAberta, setSidebarAberta] = useState(false);
  const [menuAberto, setMenuAberto] = useState(false);
  const [notifAberto, setNotifAberto] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const changeSearchOpen = useCallback((open: boolean) => {
    if (open) setSidebarAberta(false);
    setSearchOpen(open);
  }, []);
  const currentPath = useRef(pathname);
  currentPath.current = pathname;
  const sidebarRef = useRef<HTMLElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const mobileNavRef = useRef<HTMLElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);

  const pageLabel = navigationGroups(profile.preferencias).flatMap(group => group.items).find(item => item.href === pathname)?.label ?? '';
  const nome = user?.nome ?? 'Usuário';
  const role = user?.role ?? '';
  const grupos = visibleNavigation(role, enabled, hasAccess, profile.preferencias);
  const destinos = grupos.flatMap(group => group.items);
  const dataHoje = new Intl.DateTimeFormat('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(new Date());
  const iniciais = nome.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase();

  useEffect(() => { setSidebarAberta(false); setSearchOpen(false); }, [pathname]);

  useEffect(() => {
    const openedPath = currentPath.current;
    const content = contentRef.current;
    const mobileNav = mobileNavRef.current;
    const media = window.matchMedia('(min-width: 768px)');
    const restore = sidebarAberta && document.activeElement instanceof HTMLElement
      ? document.activeElement : null;
    let wasModal = false;
    let focusFrame = 0;
    const focusSidebarWhenVisible = () => {
      const button = sidebarRef.current?.querySelector<HTMLButtonElement>('button');
      if (!button || media.matches || !sidebarAberta) return;
      // CSS visibility can still be hidden during the opening transition.
      // Focusing then silently fails; retry at a rendered frame, never by timeout.
      if (getComputedStyle(button).visibility !== 'visible' || !button.getClientRects().length) {
        focusFrame = requestAnimationFrame(focusSidebarWhenVisible);
        return;
      }
      button.focus();
    };
    const focusDesktopWhenVisible = () => {
      const sidebar = sidebarRef.current;
      if (!sidebar || !media.matches || !sidebarAberta) return;
      const active = document.activeElement;
      const focusLost = active === document.body || active === document.documentElement;
      const sidebarControlHidden = active instanceof HTMLElement && sidebar.contains(active) &&
        (!active.getClientRects().length || getComputedStyle(active).visibility !== 'visible');
      // Media-query events and focus loss can run in either order across browsers.
      // Inspect rendered focus in a frame; preserve any currently usable control.
      if (!focusLost && !sidebarControlHidden) return;
      const target = sidebar.querySelector<HTMLButtonElement>('nav button');
      if (!target || target.disabled) return;
      if (!target.getClientRects().length || getComputedStyle(target).visibility !== 'visible') {
        focusFrame = requestAnimationFrame(focusDesktopWhenVisible);
        return;
      }
      target.focus();
    };
    const sync = () => {
      cancelAnimationFrame(focusFrame);
      const sidebar = sidebarRef.current;
      if (!sidebar) return;
      const modal = !media.matches && sidebarAberta;
      sidebar.inert = !media.matches && !sidebarAberta;
      sidebar.setAttribute('aria-label', 'Navegação principal');
      if (modal) {
        sidebar.setAttribute('role', 'dialog');
        sidebar.setAttribute('aria-modal', 'true');
        if (!wasModal) focusFrame = requestAnimationFrame(focusSidebarWhenVisible);
      } else {
        cancelAnimationFrame(focusFrame);
        sidebar.removeAttribute('role');
        sidebar.removeAttribute('aria-modal');
      }
      if (content) content.inert = modal;
      if (mobileNav) mobileNav.inert = modal;
      document.body.style.overflow = modal ? 'hidden' : previousOverflow;
      if (wasModal && !modal) {
        focusFrame = requestAnimationFrame(focusDesktopWhenVisible);
      }
      wasModal = modal;
    };
    const previousOverflow = document.body.style.overflow;
    const trap = (event: KeyboardEvent) => {
      if (media.matches || !sidebarAberta || event.key !== 'Tab') return;
      const nodes = Array.from(sidebarRef.current?.querySelectorAll<HTMLElement>('a[href], button, summary') ?? []).filter(node => node.getClientRects().length && !node.matches(':disabled') && !node.closest('[inert], details:not([open]) > div'));
      const first = nodes[0], last = nodes[nodes.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    };
    sync();
    media.addEventListener('change', sync);
    document.addEventListener('keydown', trap);
    return () => {
      cancelAnimationFrame(focusFrame);
      media.removeEventListener('change', sync);
      document.removeEventListener('keydown', trap);
      if (content) content.inert = false;
      if (mobileNav) mobileNav.inert = false;
      document.body.style.overflow = previousOverflow;
      if (restore?.isConnected) {
        if (currentPath.current !== openedPath) document.getElementById('main-content')?.focus();
        else if (restore.getClientRects().length && getComputedStyle(restore).visibility !== 'hidden') restore.focus();
        else document.getElementById('main-content')?.focus();
      }
    };
  }, [sidebarAberta]);


  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuAberto(false);
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setNotifAberto(false);
    };
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') { setMenuAberto(false); setNotifAberto(false); setSidebarAberta(false); } };
    document.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onClick);
    return () => { document.removeEventListener('mousedown', onClick); document.removeEventListener('keydown', onKey); };
  }, []);

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#060608' }}>
      <a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-lg focus:bg-[#6366F1] focus:px-4 focus:py-3 focus:text-white">Pular para o conteúdo</a>
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
        ref={sidebarRef}
        id="workspace-navigation"
        className={`fixed left-0 top-0 z-50 flex flex-col h-full w-[240px] transform border-r transition-transform duration-300 ease-out motion-reduce:transition-none md:visible md:translate-x-0 ${
          sidebarAberta ? 'visible translate-x-0' : 'invisible -translate-x-full'
        }`}
        style={{ backgroundColor: '#111116', borderColor: 'rgba(255,255,255,0.06)' }}
      >
        <div className="flex h-[72px] shrink-0 items-center gap-3 border-b px-5" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
          <div className="flex h-10 w-8 items-center justify-center">
            <Image src="/logo.svg" alt="Nexly" width={32} height={40} className="h-10 w-8 object-contain" />
          </div>
          <span className="text-lg font-bold" style={{ color: '#FAFAFA' }}>Nexly</span>
          <button onClick={() => setSidebarAberta(false)} className="ml-auto inline-flex min-h-11 min-w-11 items-center justify-center md:hidden" style={{ color: '#A1A1AA' }} aria-label="Fechar menu">
            <Icon name="xmark" size="sm" color="#A1A1AA" />
          </button>
        </div>

        <nav aria-label="Menu principal" className="flex flex-1 flex-col gap-4 overflow-y-auto p-4">
          <button type="button" aria-haspopup="dialog" onClick={() => { changeSearchOpen(true); }} className="flex min-h-11 items-center justify-between rounded-lg border border-white/10 px-3 text-sm text-[#D4D4D8]">Buscar páginas <kbd className="text-[10px] text-[#A1A1AA]">Ctrl K</kbd></button>
          {grupos.map((group, idx) => (
            <details key={`${group.label}-${pathname}`} open={idx === 0 || group.items.some(item => item.href === pathname)} onToggle={(event) => { if (group.items.some(item => item.href === pathname)) event.currentTarget.open = true; }} className="group/nav">
              <summary className="min-h-11 cursor-pointer rounded-lg px-3 py-3 text-xs font-semibold text-[#A1A1AA] focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-400">
                {group.label}
              </summary>
              <div className="mt-1 flex flex-col gap-1">
                {group.items.map(item => <NavLink key={item.href} item={item} active={pathname === item.href} onNavigate={() => setSidebarAberta(false)} />)}
              </div>
            </details>
          ))}
        </nav>
        <div className="mx-4 mb-4 flex shrink-0 items-center gap-3 rounded-xl border border-white/10 bg-[#18181F] p-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#6366F1]/15 text-xs font-semibold text-[#A5B4FC]">{iniciais}</span>
          <div className="min-w-0"><p className="truncate text-[13px] font-medium text-[#FAFAFA]">{nome}</p><p className="text-[11px] text-[#A1A1AA]">{role === 'ADMIN' ? 'Administrador' : role === 'GESTOR' ? 'Gestor' : role === 'CAIXA' ? 'Caixa' : role === 'RECEPCIONISTA' ? 'Recepcionista' : 'Profissional'}</p></div>
        </div>
      </aside>

      {/* Main */}
      <div ref={contentRef} className="flex min-h-screen flex-col min-w-0 md:pl-[240px]">
        {/* Header */}
        <header className="sticky top-0 z-10 flex min-h-[72px] items-center gap-3 border-b px-4 py-2.5 backdrop-blur-md md:px-8" style={{ backgroundColor: 'rgba(6,6,8,0.90)', borderColor: 'rgba(255,255,255,0.06)' }}>
          {/* Hamburger (mobile) */}
          <button onClick={() => setSidebarAberta(true)} className="inline-flex min-h-11 min-w-11 items-center justify-center md:hidden" style={{ color: '#A1A1AA' }} aria-label="Abrir menu" aria-controls="workspace-navigation" aria-expanded={sidebarAberta}>
            <Icon name="bars" size="sm" color="#A1A1AA" />
          </button>

          {/* Breadcrumb */}
          <div className="shell-default-heading min-w-0">
            <h1 className="truncate text-[24px] font-semibold tracking-tight text-[#FAFAFA]">{pageLabel || 'Nexly'}</h1>
            {pathname === '/dashboard' && <p className="mt-0.5 text-[12px] capitalize text-[#A1A1AA]">{dataHoje}</p>}
          </div>

          <div id="page-toolbar" className="min-w-0 flex-1 empty:hidden" />
          <div className="shell-header-tools ml-auto flex items-center gap-2">
            <button type="button" onClick={() => changeSearchOpen(true)} aria-label="Buscar páginas" aria-haspopup="dialog" className="shell-global-search hidden min-h-11 items-center gap-4 rounded-lg border border-white/10 px-3 text-sm text-[#A1A1AA] lg:flex">Buscar página <kbd className="text-xs">Ctrl K</kbd></button>
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
                    href="/minha-conta"
                    onClick={() => setMenuAberto(false)}
                    className="flex items-center gap-2 px-4 py-2.5 text-[13px] transition-colors hover:bg-white/5"
                    style={{ color: '#E4E4E7' }}
                  >
                    <Icon name="user" size="xs" color="#A1A1AA" /> Minha conta
                  </Link>
                  <Link
                    href="/suporte"
                    onClick={() => setMenuAberto(false)}
                    className="flex items-center gap-2 px-4 py-2.5 text-[13px] text-[#E4E4E7] transition-colors hover:bg-white/5"
                  >
                    Ajuda e suporte
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
        <main id="main-content" tabIndex={-1} className="dashboard-content min-w-0 flex-1 px-4 pb-24 pt-6 md:px-8 md:py-8" style={{ color: '#E4E4E7' }}>
          <ConnectionStatus />
          {children}
        </main>
      </div>
      <nav ref={mobileNavRef} aria-label="Navegação mobile" className="fixed inset-x-0 bottom-0 z-30 flex border-t border-white/10 bg-[#111116]/95 px-2 pb-[env(safe-area-inset-bottom)] backdrop-blur-md md:hidden">
        <button type="button" onClick={() => changeSearchOpen(true)} aria-label="Buscar páginas" aria-haspopup="dialog" className="flex min-h-16 flex-1 flex-col items-center justify-center gap-1 text-[10px] font-medium text-[#A1A1AA]"><Icon name="magnifying-glass" size="lg" color="currentColor" />Buscar</button>
        {[
          { href: '/dashboard', label: 'Início', icon: 'gauge-high' },
          { href: '/agenda', label: 'Agenda', icon: 'calendar-days' },
          { href: '/clientes', label: 'Clientes', icon: 'users' },
        ].filter(item => hasAccess(item.href, role) && enabled(item.href)).map(item => (
          <Link key={item.href} href={item.href} aria-current={pathname === item.href ? 'page' : undefined}
            className={`flex min-h-16 flex-1 flex-col items-center justify-center gap-1 text-[10px] font-medium ${pathname === item.href ? 'text-[#818CF8]' : 'text-[#A1A1AA]'}`}>
            <Icon name={item.icon} size="lg" color="currentColor" />{item.label}
          </Link>
        ))}
        <button type="button" onClick={() => setSidebarAberta(true)} aria-label="Abrir navegação" aria-controls="workspace-navigation" aria-expanded={sidebarAberta} className={`flex min-h-16 flex-1 flex-col items-center justify-center gap-1 text-[10px] font-medium ${!['/dashboard', '/agenda', '/clientes'].includes(pathname) ? 'text-[#818CF8]' : 'text-[#A1A1AA]'}`}>
          <Icon name="bars" size="lg" color="currentColor" />Menu
        </button>
      </nav>
      <CommandPalette open={searchOpen} setOpen={changeSearchOpen} items={destinos} />
    </div>
  );
}
