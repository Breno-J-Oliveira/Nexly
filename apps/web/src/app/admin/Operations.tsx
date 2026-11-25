'use client';

import { useState } from 'react';
import { apiError, formatNumber, usePlatformData } from './platform-data';
import { copyText, ErrorPanel, LoadingPanel } from './ui';
import styles from './console.module.css';

interface Check {
  ok: boolean;
  latencyMs: number | null;
}

interface OperationState {
  checkedAt: string;
  postgres: Check;
  redis: Check;
  billing: { mode: 'test' | 'live'; available: boolean };
  release: { version: string; commit: string | null; uptimeSeconds: number };
  queue: {
    pending: number;
    running: number;
    failed: number;
    due: number;
    failedByType: { type: string; total: number }[];
  } | null;
}

const checkedAt = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'medium' });

function uptime(seconds: number): string {
  const days = Math.floor(seconds / 86_400);
  const hours = Math.floor((seconds % 86_400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return [days ? `${days}d` : '', hours ? `${hours}h` : '', `${minutes}min`]
    .filter(Boolean)
    .join(' ');
}

export function Operations() {
  const { state, reload } = usePlatformData<OperationState>('/platform/operations');
  const [feedback, setFeedback] = useState('');
  if (state.status === 'loading') return <LoadingPanel label="Consultando a operação do Nexly…" />;
  if (state.status === 'error')
    return (
      <ErrorPanel
        message={apiError(state.error, 'O diagnóstico está indisponível.')}
        retry={reload}
      />
    );

  const { postgres, redis, billing, release, queue } = state.data;
  const operational = postgres.ok && redis.ok && queue !== null;
  const timestamp = checkedAt.format(new Date(state.data.checkedAt));
  const services = [
    {
      name: 'PostgreSQL',
      status: postgres.ok ? 'Respondendo' : 'Indisponível',
      ok: postgres.ok,
      latency: postgres.latencyMs,
    },
    {
      name: 'Redis',
      status: redis.ok ? 'Respondendo' : 'Indisponível',
      ok: redis.ok,
      latency: redis.latencyMs,
    },
    {
      name: 'Stripe',
      status: billing.available
        ? `Configurado · ${billing.mode === 'live' ? 'produção' : 'teste'}`
        : 'Sem configuração',
      ok: billing.available,
      latency: null,
    },
  ];

  async function copyDiagnosis() {
    const lines = [
      `Nexly ${release.version} · ${timestamp}`,
      ...services.map(({ name, status }) => `${name} - ${status}`),
      `Fila com falha - ${queue?.failed ?? 'indisponível'}`,
      `Commit - ${release.commit ?? 'indisponível'}`,
    ];
    setFeedback(
      (await copyText(lines.join('\n')))
        ? 'Diagnóstico copiado.'
        : 'Não foi possível copiar o diagnóstico.',
    );
  }

  return (
    <div className={styles.operationsGrid}>
      <section className={styles.panel} aria-labelledby="operations-services">
        <header className={styles.panelHeader}>
          <div>
            <h2 id="operations-services">Saúde dos serviços</h2>
            <p>Última consulta em {timestamp}</p>
          </div>
          <button type="button" className={styles.secondaryButton} onClick={reload}>
            Consultar novamente
          </button>
        </header>
        <p className={styles.notice} data-tone={operational ? undefined : 'warning'}>
          {operational
            ? 'Banco de dados, Redis e fila responderam.'
            : 'Alguma dependência está indisponível. Confira os resultados abaixo.'}
        </p>
        <dl className={styles.operationsFacts}>
          {services.map((service) => (
            <div key={service.name}>
              <dt>{service.name}</dt>
              <dd>
                {service.status}
                {service.latency !== null ? ` · ${service.latency} ms` : ''}
              </dd>
            </div>
          ))}
        </dl>
      </section>
      <section className={styles.panel} aria-labelledby="operations-queue">
        <header className={styles.panelHeader}>
          <div>
            <h2 id="operations-queue">Fila de tarefas</h2>
            <p>Agendamentos e falhas dos processos internos.</p>
          </div>
        </header>
        {queue ? (
          <>
            <dl className={styles.operationsFacts}>
              <div>
                <dt>Pendentes</dt>
                <dd>{formatNumber.format(queue.pending)}</dd>
              </div>
              <div>
                <dt>Prontas para rodar</dt>
                <dd>{formatNumber.format(queue.due)}</dd>
              </div>
              <div>
                <dt>Em execução</dt>
                <dd>{formatNumber.format(queue.running)}</dd>
              </div>
              <div>
                <dt>Com falha</dt>
                <dd>{formatNumber.format(queue.failed)}</dd>
              </div>
            </dl>
            {queue.failedByType.length > 0 && (
              <details className={styles.operationsDetails}>
                <summary>Falhas por tipo de tarefa</summary>
                <dl className={styles.operationsFacts}>
                  {queue.failedByType.map(({ type, total }) => (
                    <div key={type}>
                      <dt>{type}</dt>
                      <dd>{formatNumber.format(total)}</dd>
                    </div>
                  ))}
                </dl>
              </details>
            )}
          </>
        ) : (
          <p className={styles.notice} data-tone="warning">
            A fila não respondeu à consulta.
          </p>
        )}
      </section>
      <section className={styles.panel} aria-labelledby="operations-release">
        <header className={styles.panelHeader}>
          <div>
            <h2 id="operations-release">Versão da API</h2>
            <p>Informações da instância consultada.</p>
          </div>
          <button
            type="button"
            className={styles.secondaryButton}
            onClick={() => void copyDiagnosis()}
          >
            Copiar diagnóstico
          </button>
        </header>
        <dl className={styles.operationsFacts}>
          <div>
            <dt>Versão</dt>
            <dd>{release.version}</dd>
          </div>
          <div>
            <dt>Tempo em execução</dt>
            <dd>{uptime(release.uptimeSeconds)}</dd>
          </div>
          <div>
            <dt>Commit</dt>
            <dd title={release.commit ?? undefined}>
              {release.commit?.slice(0, 12) ?? 'Indisponível'}
            </dd>
          </div>
        </dl>
        <p role="status" className={styles.operationsDetails}>
          {feedback}
        </p>
      </section>
    </div>
  );
}
