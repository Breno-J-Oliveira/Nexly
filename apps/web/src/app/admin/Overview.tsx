'use client';

import { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faArrowRotateRight,
  faArrowRight,
  faBuilding,
  faCalendarDays,
  faCircleExclamation,
  faCreditCard,
  faFileArrowDown,
  faUsers,
} from '@fortawesome/free-solid-svg-icons';
import {
  apiError,
  formatNumber,
  planNames,
  usePlatformData,
  type Plan,
  type PlatformOverview,
} from './platform-data';
import { CompanyTable, type CompanySubscription } from './Companies';
import { EmptyPanel, ErrorPanel, LoadingPanel } from './ui';
import { downloadCsv } from './overview-tools';
import styles from './console.module.css';
import tools from './overview-tools.module.css';

const dayFormat = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: '2-digit',
  timeZone: 'UTC',
});
const percentage = new Intl.NumberFormat('pt-BR', {
  style: 'percent',
  maximumFractionDigits: 1,
});
const freshness = new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' });

type OpenCompanies = (plan?: Plan, subscription?: CompanySubscription) => void;

const dayLabel = (value: string) => dayFormat.format(new Date(value));
const registrations = (items: PlatformOverview['signups']) =>
  items.reduce((sum, day) => sum + day.count, 0);

function comparedRegistrations(items: PlatformOverview['signups'], range: number) {
  const complete = items.slice(0, -1);
  if (complete.length < range * 2) return null;
  const previous = registrations(complete.slice(-range * 2, -range));
  const latest = registrations(complete.slice(-range));
  const delta = latest - previous;
  if (delta === 0) return 'mesmo total';
  const change = `${formatNumber.format(Math.abs(delta))} ${delta > 0 ? 'a mais' : 'a menos'}`;
  return previous > 0 ? `${change} (${percentage.format(Math.abs(delta) / previous)})` : change;
}

function SignupChart({ signups, periodDays }: Pick<PlatformOverview, 'signups' | 'periodDays'>) {
  const [range, setRange] = useState(periodDays);
  const plotted = signups.slice(-range);
  const plottedTotal = registrations(plotted);
  const peak = plotted.reduce<(typeof plotted)[number] | undefined>(
    (highest, day) => (!highest || day.count > highest.count ? day : highest),
    undefined,
  );
  const comparison = comparedRegistrations(signups, range);
  const max = Math.max(1, ...plotted.map((day) => day.count));
  const rows = [...new Set([max, Math.floor(max / 2), 0])].reverse();

  return (
    <section className={styles.panel} aria-labelledby="platform-signups">
      <header className={styles.panelHeader}>
        <div>
          <h2 id="platform-signups">Cadastros de empresas</h2>
          <p>Evolução diária por data UTC</p>
        </div>
      </header>
      {plotted.length === 0 ? (
        <EmptyPanel>Sem dados de cadastro para o período.</EmptyPanel>
      ) : (
        <>
          <div className={tools.chartControls}>
            <div className={tools.ranges} role="group" aria-label="Período do gráfico">
              {[...new Set([7, 14, periodDays])]
                .filter((days) => days <= periodDays)
                .map((days) => (
                  <button
                    type="button"
                    key={days}
                    aria-pressed={range === days}
                    onClick={() => setRange(days)}
                  >
                    {days} dias
                  </button>
                ))}
            </div>
            <button
              type="button"
              className={styles.secondaryButton}
              onClick={() =>
                downloadCsv(`nexly-cadastros-${range}-dias.csv`, [
                  ['Data (UTC)', 'Empresas cadastradas'],
                  ...plotted.map((item) => [item.date, item.count]),
                ])
              }
            >
              <FontAwesomeIcon icon={faFileArrowDown} /> Baixar série
            </button>
          </div>
          <p className={tools.chartSummary} aria-live="polite">
            <span data-empty={plottedTotal === 0}>
              {plottedTotal === 0 ? (
                `Nenhum cadastro nos últimos ${range} dias`
              ) : (
                <>
                  <strong>{formatNumber.format(plottedTotal)}</strong>{' '}
                  {plottedTotal === 1 ? 'cadastro' : 'cadastros'} em {range} dias
                </>
              )}
            </span>
            {!!peak?.count && (
              <small>
                Pico em {dayLabel(peak.date)} ({formatNumber.format(peak.count)})
              </small>
            )}
            {comparison && (
              <small>
                {comparison} nos últimos {range} dias completos em relação aos anteriores
              </small>
            )}
          </p>
          <div className={styles.chart} aria-hidden="true">
            <div className={styles.chartPlot}>
              {rows.map((value) => (
                <div
                  key={value}
                  className={styles.chartGrid}
                  style={{ bottom: `${(value / max) * 100}%` }}
                >
                  <span>{formatNumber.format(value)}</span>
                </div>
              ))}
              <div className={styles.chartBars}>
                {plotted.map((day) => (
                  <div key={day.date} title={`${dayLabel(day.date)} · ${day.count} cadastro(s)`}>
                    <div
                      className={day.count ? styles.chartBar : styles.chartZero}
                      style={{ height: `${(day.count / max) * 100}%` }}
                    />
                  </div>
                ))}
              </div>
            </div>
            <div className={styles.chartDates}>
              {plotted
                .filter(
                  (_, index) =>
                    index === 0 ||
                    index === plotted.length - 1 ||
                    index === Math.floor(plotted.length / 2),
                )
                .map((day) => (
                  <span key={day.date}>{dayLabel(day.date)}</span>
                ))}
            </div>
          </div>
          <details className={styles.details}>
            <summary>Ver dados do gráfico</summary>
            <div className={styles.chartData}>
              <table>
                <caption className={styles.srOnly}>Cadastros por dia</caption>
                <thead>
                  <tr>
                    <th scope="col">Dia</th>
                    <th scope="col">Cadastros</th>
                  </tr>
                </thead>
                <tbody>
                  {plotted.toReversed().map((day) => (
                    <tr key={day.date}>
                      <td>{dayLabel(day.date)}</td>
                      <td>{formatNumber.format(day.count)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
        </>
      )}
    </section>
  );
}

function PlanDistribution({
  plans,
  openCompanies,
}: Pick<PlatformOverview, 'plans'> & { openCompanies: OpenCompanies }) {
  const total = plans.reduce((sum, plan) => sum + plan.companies, 0);
  return (
    <section className={styles.panel} aria-labelledby="platform-plan-distribution">
      <header className={styles.panelHeader}>
        <div>
          <h2 id="platform-plan-distribution">Empresas por plano</h2>
          <p>Distribuição dos planos atuais</p>
        </div>
      </header>
      {total === 0 ? (
        <EmptyPanel>Nenhuma empresa registrada.</EmptyPanel>
      ) : (
        <ul className={styles.planList}>
          {plans.map(({ plan, companies }, index) => (
            <li key={plan}>
              <div className={styles.planLine}>
                {companies > 0 ? (
                  <button
                    type="button"
                    className={tools.planButton}
                    aria-label={`Ver empresas do plano ${planNames[plan]}`}
                    onClick={() => openCompanies(plan)}
                  >
                    {planNames[plan]} <span aria-hidden="true">↗</span>
                  </button>
                ) : (
                  <span>{planNames[plan]}</span>
                )}
                <span className={tools.planCounts}>
                  <strong>{formatNumber.format(companies)}</strong>
                  <small>{percentage.format(companies / total)}</small>
                </span>
              </div>
              <div className={styles.planTrack} aria-hidden="true">
                <span data-shade={index % 4} style={{ width: `${(companies / total) * 100}%` }} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export function Overview({ openCompanies }: { openCompanies: OpenCompanies }) {
  const { state, reload } = usePlatformData<PlatformOverview>('/platform/overview');
  if (state.status === 'loading')
    return <LoadingPanel label="Carregando visão geral da plataforma…" />;
  if (state.status === 'error')
    return (
      <ErrorPanel
        message={apiError(state.error, 'Não foi possível carregar as métricas.')}
        retry={reload}
      />
    );

  return <OverviewContent data={state.data} reload={reload} openCompanies={openCompanies} />;
}

function OverviewContent({
  data,
  reload,
  openCompanies,
}: {
  data: PlatformOverview;
  reload: () => void;
  openCompanies: OpenCompanies;
}) {
  const [loadedAt] = useState(() => new Date());
  const { totals, billing, periodDays, recentCompanies, signups, plans } = data;
  const stats = [
    {
      label: 'Empresas cadastradas',
      value: totals.companies,
      icon: faBuilding,
      subtitle: `${formatNumber.format(totals.newCompanies)} ${totals.newCompanies === 1 ? 'nova' : 'novas'} nos últimos ${periodDays} dias`,
    },
    {
      label: 'Assinaturas ativas',
      value: totals.activeSubscriptions,
      icon: faCreditCard,
      subtitle: 'Assinaturas com status ativo',
    },
    {
      label: 'Contas ativas',
      value: totals.managedUsers,
      icon: faUsers,
      subtitle: 'Usuários das empresas',
    },
    {
      label: 'Agendamentos',
      value: totals.appointments,
      icon: faCalendarDays,
      subtitle: `Horários dos últimos ${periodDays} dias, exceto cancelados`,
    },
  ];

  return (
    <div className={styles.overview}>
      <section aria-label="Indicadores da plataforma" className={styles.stats}>
        {stats.map((stat) => (
          <article className={styles.stat} key={stat.label}>
            <div>
              <h2>{stat.label}</h2>
              <FontAwesomeIcon icon={stat.icon} aria-hidden="true" />
            </div>
            <strong>{formatNumber.format(stat.value)}</strong>
            <p>{stat.subtitle}</p>
          </article>
        ))}
      </section>
      <div className={styles.insights}>
        <button
          className={`${styles.insight} ${tools.attention}`}
          type="button"
          disabled={totals.nonHealthySubscriptions === 0}
          onClick={() => openCompanies(undefined, 'attention')}
        >
          <FontAwesomeIcon icon={faCircleExclamation} aria-hidden="true" />
          <strong>{formatNumber.format(totals.nonHealthySubscriptions)}</strong>{' '}
          {totals.nonHealthySubscriptions === 1
            ? 'assinatura requer atenção'
            : 'assinaturas requerem atenção'}
        </button>
        <span className={styles.insight}>
          <span
            aria-hidden="true"
            className={billing.available ? styles.statusDot : styles.warningDot}
          />
          {billing.available
            ? `Stripe em ambiente de ${billing.mode === 'live' ? 'produção' : 'teste'}`
            : 'Stripe não configurado'}
        </span>
        <div className={tools.refresh}>
          <time dateTime={loadedAt.toISOString()}>Consultado às {freshness.format(loadedAt)}</time>
          <button
            type="button"
            className={styles.iconButton}
            onClick={reload}
            aria-label="Atualizar indicadores"
            title="Atualizar indicadores"
          >
            <FontAwesomeIcon icon={faArrowRotateRight} />
          </button>
        </div>
      </div>
      <div className={styles.charts}>
        <SignupChart signups={signups} periodDays={periodDays} />
        <PlanDistribution plans={plans} openCompanies={openCompanies} />
      </div>
      <section className={styles.panel} aria-labelledby="platform-recent-companies">
        <header className={styles.panelHeader}>
          <div>
            <h2 id="platform-recent-companies">Empresas recentes</h2>
            <p>Últimos negócios cadastrados na plataforma</p>
          </div>
          <button className={styles.secondaryButton} type="button" onClick={() => openCompanies()}>
            Ver empresas <FontAwesomeIcon icon={faArrowRight} />
          </button>
        </header>
        <CompanyTable items={recentCompanies} />
      </section>
    </div>
  );
}
