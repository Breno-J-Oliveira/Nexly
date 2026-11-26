'use client';

import { useRef, useState, useSyncExternalStore } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faArrowLeft,
  faArrowRightFromBracket,
  faBuilding,
  faChartPie,
  faHeartPulse,
  faLink,
  faLock,
  faBriefcase,
  faShieldHalved,
  faTicket,
  faUserGroup,
} from '@fortawesome/free-solid-svg-icons';
import { useAuth } from '@/lib/auth';
import { Companies, type CompanySubscription } from './Companies';
import { Coupons } from './Coupons';
import { InternalWorkspace } from './InternalWorkspace';
import { Operations } from './Operations';
import { Overview } from './Overview';
import { Team } from './Team';
import {
  apiError,
  appErrorCode,
  httpStatus,
  roleNames,
  usePlatformData,
  type PlatformMember,
  type Plan,
} from './platform-data';
import { copyText, ErrorPanel, LoadingPanel } from './ui';
import styles from './console.module.css';

const sections = {
  overview: {
    label: 'Visão geral',
    description: 'Acompanhe as empresas, as assinaturas e o uso do Nexly.',
    icon: faChartPie,
  },
  companies: {
    label: 'Empresas',
    description: 'Consulte os negócios da plataforma e a situação das assinaturas.',
    icon: faBuilding,
  },
  workspace: {
    label: 'Minha operação',
    description: 'Organize as tarefas, os contatos e a rotina da empresa interna.',
    icon: faBriefcase,
  },
  team: {
    label: 'Equipe interna',
    description: 'Defina quem pode acessar o painel e o que cada pessoa pode fazer.',
    icon: faUserGroup,
  },
  coupons: {
    label: 'Cupons',
    description: 'Configure descontos e compartilhe links de assinatura.',
    icon: faTicket,
  },
  operations: {
    label: 'Operação',
    description: 'Confira as dependências da API, a fila de tarefas e a versão implantada.',
    icon: faHeartPulse,
  },
};

type Section = keyof typeof sections;

function subscribeSection(listener: () => void) {
  window.addEventListener('hashchange', listener);
  return () => window.removeEventListener('hashchange', listener);
}

const readSection = () => window.location.hash.slice(1);
const initialSection = () => '';

function Brand() {
  return (
    <div className={styles.brand}>
      <span className={styles.brandMark}>
        <Image src="/logo.svg" alt="" width={25} height={31} />
      </span>
      <span>
        <strong>Nexly</strong>
        <small>Administração da plataforma</small>
      </span>
    </div>
  );
}

function AccessRestricted({ twoFactor = false }: { twoFactor?: boolean }) {
  return (
    <main className={styles.authFrame}>
      <div className={styles.authCard}>
        <Brand />
        <div className={styles.authIcon}>
          <FontAwesomeIcon icon={twoFactor ? faShieldHalved : faLock} aria-hidden="true" />
        </div>
        <h1>{twoFactor ? 'Confirme seu acesso com 2FA' : 'Acesso restrito à equipe Nexly'}</h1>
        <p>
          {twoFactor
            ? 'Ative a autenticação em duas etapas em Minha conta e entre novamente para acessar o painel interno.'
            : 'O painel interno exige um acesso concedido pelo proprietário da plataforma.'}
        </p>
        <Link href={twoFactor ? '/minha-conta' : '/dashboard'} className={styles.primaryButton}>
          {twoFactor ? 'Abrir Minha conta' : 'Voltar ao painel da empresa'}
        </Link>
      </div>
    </main>
  );
}

function Workspace({ member }: { member: PlatformMember }) {
  const { user, logout } = useAuth();
  const sectionHash = useSyncExternalStore(subscribeSection, readSection, initialSection);
  const [companyPreset, setCompanyPreset] = useState<{
    plan?: Plan;
    subscription?: CompanySubscription;
  }>({});
  const [linkFeedback, setLinkFeedback] = useState('');
  const heading = useRef<HTMLHeadingElement>(null);
  const canManageTeam = member.papel === 'OWNER';
  const canManageCoupons = member.papel === 'OWNER' || member.papel === 'FINANCE';
  const canViewOperations = member.papel === 'OWNER' || member.papel === 'OPERATIONS';
  const canManageWorkspace = member.papel === 'OWNER' && user?.role === 'ADMIN';
  const tabs: Section[] = [
    'overview',
    'companies',
    ...(canManageWorkspace ? ['workspace' as const] : []),
    ...(canManageTeam ? ['team' as const] : []),
    ...(canManageCoupons ? ['coupons' as const] : []),
    ...(canViewOperations ? ['operations' as const] : []),
  ];
  const active = tabs.find((tab) => tab === sectionHash) ?? 'overview';
  const initials = member.nome
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word.charAt(0))
    .join('')
    .toUpperCase();

  function select(section: Section) {
    if (section === active) return;
    setLinkFeedback('');
    window.location.hash = section;
    requestAnimationFrame(() => heading.current?.focus());
  }

  async function shareSection() {
    const url = new URL('/admin', window.location.origin);
    url.hash = active;
    setLinkFeedback(
      (await copyText(url.href)) ? 'Link da seção copiado.' : 'Não foi possível copiar o link.',
    );
  }

  return (
    <div className={styles.console}>
      <a href="#platform-main" className={styles.skip}>
        Pular para o conteúdo
      </a>
      <aside className={styles.sidebar}>
        <Brand />
        <nav aria-label="Administração Nexly" className={styles.nav}>
          {tabs.map((section) => (
            <button
              type="button"
              key={section}
              aria-current={active === section ? 'page' : undefined}
              onClick={() => {
                if (section === 'companies' && active !== 'companies') setCompanyPreset({});
                select(section);
              }}
            >
              <FontAwesomeIcon icon={sections[section].icon} aria-hidden="true" />
              {sections[section].label}
            </button>
          ))}
        </nav>
        <div className={styles.sidebarBottom}>
          <Link className={styles.exitLink} href="/dashboard">
            <FontAwesomeIcon icon={faArrowLeft} aria-hidden="true" /> Painel da empresa
          </Link>
          <div className={styles.profile}>
            <span className={styles.avatar} aria-hidden="true">
              {initials}
            </span>
            <span>
              <strong title={member.nome}>{member.nome}</strong>
              <small>{roleNames[member.papel]}</small>
            </span>
            <button
              className={styles.iconButton}
              type="button"
              aria-label="Sair da conta"
              onClick={() => void logout().catch(() => undefined)}
            >
              <FontAwesomeIcon icon={faArrowRightFromBracket} />
            </button>
          </div>
        </div>
      </aside>
      <main id="platform-main" className={styles.main} tabIndex={-1}>
        <header className={styles.pageHeader}>
          <div>
            <h1 ref={heading} tabIndex={-1}>
              {sections[active].label}
            </h1>
            <p>{sections[active].description}</p>
          </div>
          <div>
            <button
              type="button"
              className={styles.secondaryButton}
              onClick={() => void shareSection()}
            >
              <FontAwesomeIcon icon={faLink} aria-hidden="true" /> Copiar link da seção
            </button>
            <Link className={styles.mobileExit} href="/dashboard">
              <FontAwesomeIcon icon={faArrowLeft} aria-hidden="true" /> Minha empresa
            </Link>
          </div>
        </header>
        <span className="sr-only" role="status">
          {linkFeedback}
        </span>
        {active === 'overview' && (
          <Overview
            openCompanies={(plan, subscription) => {
              setCompanyPreset({ plan, subscription });
              select('companies');
            }}
          />
        )}
        {active === 'companies' && (
          <Companies
            initialPlan={companyPreset.plan}
            initialSubscription={companyPreset.subscription}
          />
        )}
        {active === 'team' && canManageTeam && <Team />}
        {active === 'workspace' && canManageWorkspace && <InternalWorkspace />}
        {active === 'coupons' && canManageCoupons && <Coupons />}
        {active === 'operations' && canViewOperations && <Operations />}
      </main>
    </div>
  );
}

function PlatformAccess() {
  const { state, reload } = usePlatformData<PlatformMember>('/platform/me');
  if (state.status === 'loading') {
    return (
      <main className={styles.authFrame}>
        <LoadingPanel label="Verificando acesso à administração…" />
      </main>
    );
  }
  if (state.status === 'ready') return <Workspace member={state.data} />;
  if (httpStatus(state.error) === 403) {
    return <AccessRestricted twoFactor={appErrorCode(state.error) === 'PLATFORM_2FA_REQUIRED'} />;
  }
  return (
    <main className={styles.authFrame}>
      <ErrorPanel
        message={apiError(state.error, 'Não foi possível verificar o acesso à administração.')}
        retry={reload}
      />
    </main>
  );
}

export function PlatformConsole() {
  const { user } = useAuth();
  return user ? <PlatformAccess key={user.id} /> : null;
}
