'use client';

import { useDeferredValue, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faChevronLeft,
  faChevronRight,
  faFileArrowDown,
  faMagnifyingGlass,
  faXmark,
} from '@fortawesome/free-solid-svg-icons';
import {
  apiError,
  formatDate,
  formatNumber,
  planNames,
  usePlatformData,
  type CompanyList,
  type CompanySummary,
  type Plan,
} from './platform-data';
import { EmptyPanel, ErrorPanel, LoadingPanel } from './ui';
import { downloadCsv } from './overview-tools';
import styles from './console.module.css';
import tools from './overview-tools.module.css';

export type CompanySubscription = 'none' | 'active' | 'attention' | 'other';
type CompanyOrder = 'recent' | 'oldest' | 'name_asc' | 'name_desc';

const subscriptionFilters: Record<CompanySubscription, string> = {
  active: 'Ativa',
  attention: 'Requer atenção',
  none: 'Sem assinatura',
  other: 'Demais status',
};

const companyOrderLabels: Record<CompanyOrder, string> = {
  recent: 'Cadastro mais recente',
  oldest: 'Cadastro mais antigo',
  name_asc: 'Nome, A a Z',
  name_desc: 'Nome, Z a A',
};

const subscriptionStatuses: Record<string, { label: string; tone: string }> = {
  none: { label: 'Sem assinatura', tone: 'neutral' },
  active: { label: 'Ativa', tone: 'green' },
  trialing: { label: 'Em teste', tone: 'neutral' },
  past_due: { label: 'Em atraso', tone: 'warning' },
  canceled: { label: 'Cancelada', tone: 'neutral' },
  incomplete: { label: 'Pendente', tone: 'warning' },
  incomplete_expired: { label: 'Pagamento expirado', tone: 'warning' },
  unpaid: { label: 'Não paga', tone: 'warning' },
  paused: { label: 'Pausada', tone: 'warning' },
};

function subscriptionLabel(status: string | null) {
  if (!status) return { label: 'Sem assinatura', tone: 'neutral' };
  return subscriptionStatuses[status.toLowerCase()] ?? { label: status, tone: 'neutral' };
}

export function CompanyTable({
  items,
  filtered = false,
}: {
  items: CompanySummary[];
  filtered?: boolean;
}) {
  if (!items.length) {
    return (
      <EmptyPanel>
        {filtered ? 'Nenhuma empresa corresponde aos filtros.' : 'Nenhuma empresa cadastrada.'}
      </EmptyPanel>
    );
  }

  return (
    // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex -- A região recebe foco para permitir rolagem horizontal por teclado.
    <div className={styles.tableScroll} tabIndex={0} role="region" aria-label="Tabela de empresas">
      <table className={styles.table}>
        <thead>
          <tr>
            <th scope="col">Empresa</th>
            <th scope="col">Plano</th>
            <th scope="col">Assinatura</th>
            <th scope="col">Cadastro</th>
          </tr>
        </thead>
        <tbody>
          {items.map((company) => {
            const status = subscriptionLabel(company.subscriptionStatus);
            return (
              <tr key={company.id}>
                <th scope="row">
                  <span>{company.name}</span>
                  {company.segment && (
                    <small className={styles.segment}>
                      {company.segment.replaceAll('_', ' ').toLowerCase()}
                    </small>
                  )}
                </th>
                <td>{planNames[company.plan]}</td>
                <td>
                  <span className={styles.pill} data-tone={status.tone}>
                    {status.label}
                  </span>
                </td>
                <td>
                  <time dateTime={company.createdAt}>{formatDate(company.createdAt)}</time>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function downloadCompanyPage(items: CompanySummary[], page: number) {
  downloadCsv(`nexly-empresas-pagina-${page}.csv`, [
    ['Empresa', 'Segmento', 'Plano', 'Assinatura', 'Cadastro'],
    ...items.map((company) => [
      company.name,
      company.segment?.replaceAll('_', ' ').toLowerCase() ?? '',
      planNames[company.plan],
      subscriptionLabel(company.subscriptionStatus).label,
      formatDate(company.createdAt),
    ]),
  ]);
}

export function Companies({
  initialPlan,
  initialSubscription,
}: {
  initialPlan?: Plan;
  initialSubscription?: CompanySubscription;
} = {}) {
  const [query, setQuery] = useState('');
  const [plan, setPlan] = useState<Plan | ''>(initialPlan ?? '');
  const [subscription, setSubscription] = useState<CompanySubscription | ''>(
    initialSubscription ?? '',
  );
  const [order, setOrder] = useState<CompanyOrder>('recent');
  const [page, setPage] = useState(1);
  const search = useDeferredValue(query.trim());
  const params = new URLSearchParams({ page: String(page) });
  if (search) params.set('q', search);
  if (plan) params.set('plan', plan);
  if (subscription) params.set('subscription', subscription);
  if (order !== 'recent') params.set('sort', order);
  const { state, reload } = usePlatformData<CompanyList>(`/platform/companies?${params}`);
  const filtered = Boolean(query || plan || subscription);
  const result = state.status === 'ready' ? state.data : null;
  const lastPage = result ? Math.max(1, Math.ceil(result.total / result.pageSize)) : null;

  function resetFilters() {
    setQuery('');
    setPlan('');
    setSubscription('');
    setPage(1);
  }

  return (
    <section className={styles.panel} aria-label="Empresas da plataforma">
      <header className={`${styles.filterBar} ${tools.directoryFilters}`}>
        <label className={styles.field}>
          <span>Buscar empresa</span>
          <span className={styles.searchField}>
            <FontAwesomeIcon icon={faMagnifyingGlass} aria-hidden="true" />
            <input
              type="search"
              placeholder="Nome da empresa"
              value={query}
              maxLength={100}
              onChange={(event) => {
                setQuery(event.target.value);
                setPage(1);
              }}
            />
          </span>
        </label>
        <label className={styles.field}>
          <span>Plano</span>
          <select
            value={plan}
            onChange={(event) => {
              setPlan(event.target.value as Plan | '');
              setPage(1);
            }}
          >
            <option value="">Todos os planos</option>
            {Object.entries(planNames).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label className={styles.field}>
          <span>Assinatura</span>
          <select
            value={subscription}
            onChange={(event) => {
              setSubscription(event.target.value as CompanySubscription | '');
              setPage(1);
            }}
          >
            <option value="">Todos os status</option>
            {Object.entries(subscriptionFilters).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label className={styles.field}>
          <span>Ordenar por</span>
          <select
            value={order}
            onChange={(event) => {
              setOrder(event.target.value as CompanyOrder);
              setPage(1);
            }}
          >
            {Object.entries(companyOrderLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
      </header>
      {(filtered || (result?.items.length ?? 0) > 0) && (
        <div className={tools.listTools}>
          <div>
            {filtered && (
              <button type="button" className={styles.secondaryButton} onClick={resetFilters}>
                <FontAwesomeIcon icon={faXmark} /> Limpar filtros
              </button>
            )}
          </div>
          {result && result.items.length > 0 && (
            <button
              type="button"
              className={styles.secondaryButton}
              onClick={() => downloadCompanyPage(result.items, result.page)}
            >
              <FontAwesomeIcon icon={faFileArrowDown} /> Exportar esta página
            </button>
          )}
        </div>
      )}
      {state.status === 'loading' && <LoadingPanel label="Carregando empresas…" />}
      {state.status === 'error' && (
        <ErrorPanel
          message={apiError(state.error, 'Não foi possível carregar as empresas.')}
          retry={reload}
        />
      )}
      {result && (
        <>
          {result.page > (lastPage ?? 1) ? (
            <div className={styles.state}>
              <p>O número de resultados mudou. Volte para uma página disponível.</p>
              <button
                className={styles.secondaryButton}
                type="button"
                onClick={() => setPage(lastPage ?? 1)}
              >
                Voltar para a última página
              </button>
            </div>
          ) : (
            <CompanyTable items={result.items} filtered={filtered} />
          )}
          <footer className={styles.pagination}>
            <p aria-live="polite" className={tools.pageRange}>
              {result.items.length > 0
                ? `${formatNumber.format((result.page - 1) * result.pageSize + 1)} a ${formatNumber.format((result.page - 1) * result.pageSize + result.items.length)} de ${formatNumber.format(result.total)}`
                : formatNumber.format(result.total)}{' '}
              {result.total === 1 ? 'empresa' : 'empresas'}
            </p>
            <div>
              <button
                type="button"
                className={styles.iconButton}
                aria-label="Página anterior"
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
              >
                <FontAwesomeIcon icon={faChevronLeft} />
              </button>
              <span>
                Página {Math.min(result.page, lastPage ?? 1)} de {lastPage}
              </span>
              <button
                type="button"
                className={styles.iconButton}
                aria-label="Próxima página"
                disabled={page >= (lastPage ?? 1)}
                onClick={() => setPage(page + 1)}
              >
                <FontAwesomeIcon icon={faChevronRight} />
              </button>
            </div>
          </footer>
        </>
      )}
    </section>
  );
}
