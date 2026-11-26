'use client';

import Link from 'next/link';
import { useState, type FormEvent } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faArrowRight,
  faArrowRotateRight,
  faBoxesStacked,
  faBuilding,
  faCalendarDays,
  faCircleExclamation,
  faFileLines,
  faListCheck,
  faPlus,
  faSliders,
  faUserGroup,
  faUsers,
  faWallet,
} from '@fortawesome/free-solid-svg-icons';
import { statusLabels } from '@/components/operations/config';
import { api } from '@/lib/api';
import { apiError, formatDate, formatNumber, usePlatformData } from './platform-data';
import { ActionDialog, EmptyPanel, ErrorPanel, LoadingPanel } from './ui';
import shell from './console.module.css';
import styles from './internal-workspace.module.css';

interface InternalTask {
  id: string;
  title: string;
  status: string;
  priority: string;
  dueAt: string | null;
  updatedAt: string;
}

interface InternalWorkspaceData {
  workspace: { name: string; timeZone: string };
  totals: {
    openTasks: number;
    overdueTasks: number;
    contacts: number;
    appointmentsNext7Days: number;
  };
  tasks: InternalTask[];
  links: Array<{ label: string; href: string; description: string }>;
  generatedAt: string;
}

const moduleIcons = {
  '/tarefas': faListCheck,
  '/clientes': faUserGroup,
  '/agenda': faCalendarDays,
  '/usuarios': faUsers,
  '/estoque': faBoxesStacked,
  '/financeiro': faWallet,
  '/documentos': faFileLines,
  '/meu-nexly': faSliders,
};

function NewTask({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const data = new FormData(event.currentTarget);
    const title = data.get('titulo');
    const due = data.get('prazo');
    const deadline = typeof due === 'string' && due ? new Date(due) : null;
    if (typeof title !== 'string' || title.trim().length < 2) {
      setError('Informe um título com pelo menos dois caracteres.');
      return;
    }
    if (deadline && !Number.isFinite(deadline.getTime())) {
      setError('Confira a data e a hora do prazo.');
      return;
    }

    setError('');
    setBusy(true);
    try {
      await api.post('/operacoes/tarefas', {
        titulo: title.trim(),
        descricao: data.get('descricao'),
        status: 'PENDENTE',
        prioridade: data.get('prioridade'),
        ...(deadline ? { prazo: deadline.toISOString() } : {}),
      });
      onSaved();
    } catch (failure) {
      setError(apiError(failure, 'Não foi possível criar a tarefa. Tente novamente.'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <ActionDialog title="Nova tarefa interna" busy={busy} onClose={onClose}>
      <form className={shell.form} onSubmit={(event) => void save(event)}>
        <label className={shell.field}>
          <span>Título</span>
          <input name="titulo" required minLength={2} maxLength={120} disabled={busy} />
        </label>
        <label className={shell.field}>
          <span>Descrição</span>
          <textarea name="descricao" rows={3} maxLength={4000} disabled={busy} />
        </label>
        <div className={shell.formColumns}>
          <label className={shell.field}>
            <span>Prioridade</span>
            <select name="prioridade" defaultValue="NORMAL" disabled={busy}>
              <option value="BAIXA">Baixa</option>
              <option value="NORMAL">Normal</option>
              <option value="ALTA">Alta</option>
            </select>
          </label>
          <label className={shell.field}>
            <span>Prazo</span>
            <input
              type="datetime-local"
              name="prazo"
              aria-describedby="internal-task-time"
              disabled={busy}
            />
            <small id="internal-task-time">No fuso deste dispositivo.</small>
          </label>
        </div>
        {error && (
          <p role="alert" className={shell.notice} data-tone="error">
            {error}
          </p>
        )}
        <footer className={shell.formActions}>
          <button type="button" className={shell.secondaryButton} onClick={onClose} disabled={busy}>
            Cancelar
          </button>
          <button type="submit" className={shell.primaryButton} disabled={busy}>
            {busy ? 'Criando…' : 'Criar tarefa'}
          </button>
        </footer>
      </form>
    </ActionDialog>
  );
}

function ModuleLinks({ links }: Pick<InternalWorkspaceData, 'links'>) {
  const modules = links.filter((link): link is typeof link & { href: keyof typeof moduleIcons } =>
    Object.hasOwn(moduleIcons, link.href),
  );
  return (
    <section className={shell.panel} aria-labelledby="workspace-modules">
      <header className={shell.panelHeader}>
        <div>
          <h2 id="workspace-modules">Atalhos de trabalho</h2>
          <p>Abra os módulos habilitados para sua empresa.</p>
        </div>
      </header>
      {modules.length ? (
        <ul className={styles.moduleList}>
          {modules.map(({ href, label, description }) => (
            <li key={href}>
              <Link href={href} className={styles.moduleLink}>
                <span className={styles.moduleIcon}>
                  <FontAwesomeIcon icon={moduleIcons[href]} aria-hidden="true" />
                </span>
                <span className={styles.moduleCopy}>
                  <strong>{label}</strong>
                  <small>{description}</small>
                </span>
                <FontAwesomeIcon icon={faArrowRight} className={styles.arrow} aria-hidden="true" />
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyPanel>Nenhum atalho disponível para esta empresa.</EmptyPanel>
      )}
    </section>
  );
}

function TaskList({ data, onNew }: { data: InternalWorkspaceData; onNew: () => void }) {
  const { tasks, links, generatedAt, workspace } = data;
  const hasTaskModule = links.some(({ href }) => href === '/tarefas');
  return (
    <section className={shell.panel} aria-labelledby="workspace-tasks">
      <header className={shell.panelHeader}>
        <div>
          <h2 id="workspace-tasks">Tarefas em aberto</h2>
          <p>Acompanhe as próximas entregas e as tarefas que passaram do prazo.</p>
        </div>
        {hasTaskModule && (
          <div className={styles.taskActions}>
            <Link className={shell.secondaryButton} href="/tarefas">
              Abrir tarefas <FontAwesomeIcon icon={faArrowRight} aria-hidden="true" />
            </Link>
            <button type="button" className={shell.primaryButton} onClick={onNew}>
              <FontAwesomeIcon icon={faPlus} aria-hidden="true" /> Nova tarefa
            </button>
          </div>
        )}
      </header>
      {!hasTaskModule ? (
        <EmptyPanel>O módulo de tarefas está desativado nesta empresa.</EmptyPanel>
      ) : tasks.length ? (
        <ul className={styles.taskList}>
          {tasks.map((task) => {
            const isOverdue =
              task.dueAt && new Date(task.dueAt).getTime() < new Date(generatedAt).getTime();
            return (
              <li className={styles.task} key={task.id}>
                <div className={styles.taskTitle}>
                  <strong>{task.title}</strong>
                  <span>{statusLabels[task.status] ?? task.status}</span>
                </div>
                <div className={styles.taskDetails}>
                  <span
                    className={shell.pill}
                    data-tone={task.priority === 'ALTA' ? 'warning' : 'neutral'}
                  >
                    Prioridade {statusLabels[task.priority]?.toLowerCase() ?? 'normal'}
                  </span>
                  <span className={styles.due} data-overdue={Boolean(isOverdue)}>
                    {isOverdue && <FontAwesomeIcon icon={faCircleExclamation} aria-hidden="true" />}
                    {task.dueAt ? (
                      <>
                        <span>{isOverdue ? 'Em atraso' : 'Prazo'}</span>
                        <time dateTime={task.dueAt}>
                          {formatDate(task.dueAt, workspace.timeZone)}
                        </time>
                      </>
                    ) : (
                      'Sem prazo'
                    )}
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
      ) : (
        <EmptyPanel>Nenhuma tarefa em aberto.</EmptyPanel>
      )}
    </section>
  );
}

function WorkspaceContent({
  data,
  reload,
  onNew,
}: {
  data: InternalWorkspaceData;
  reload: () => void;
  onNew: () => void;
}) {
  const { workspace, totals, links, generatedAt } = data;
  const hasModule = (module: keyof typeof moduleIcons) => links.some(({ href }) => href === module);
  const metrics = [
    {
      key: 'openTasks',
      label: 'Tarefas em aberto',
      count: totals.openTasks,
      icon: faListCheck,
      hint: 'Pendentes e em andamento',
      available: hasModule('/tarefas'),
    },
    {
      key: 'overdueTasks',
      label: 'Tarefas em atraso',
      count: totals.overdueTasks,
      icon: faCircleExclamation,
      hint: 'Em aberto e com prazo vencido',
      available: hasModule('/tarefas'),
    },
    {
      key: 'contacts',
      label: 'Contatos ativos',
      count: totals.contacts,
      icon: faUserGroup,
      hint: 'Cadastros ativos da empresa',
      available: hasModule('/clientes'),
    },
    {
      key: 'appointments',
      label: 'Próximos agendamentos',
      count: totals.appointmentsNext7Days,
      icon: faCalendarDays,
      hint: 'Hoje e os próximos seis dias',
      available: hasModule('/agenda'),
    },
  ];
  const formattedTime = new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
    timeZone: workspace.timeZone,
  }).format(new Date(generatedAt));

  return (
    <div className={styles.workspace}>
      <section className={styles.intro} aria-labelledby="workspace-company">
        <div className={styles.company}>
          <span className={styles.companyIcon}>
            <FontAwesomeIcon icon={faBuilding} aria-hidden="true" />
          </span>
          <div>
            <p>Empresa vinculada à sua conta</p>
            <h2 id="workspace-company">{workspace.name}</h2>
          </div>
        </div>
        <div className={styles.updated}>
          <time dateTime={generatedAt}>Consulta em {formattedTime}</time>
          <small>{workspace.timeZone}</small>
          <button
            type="button"
            className={shell.iconButton}
            aria-label="Atualizar minha operação"
            onClick={reload}
          >
            <FontAwesomeIcon icon={faArrowRotateRight} aria-hidden="true" />
          </button>
        </div>
      </section>
      <section className={shell.stats} aria-label="Indicadores da operação interna">
        {metrics.map(({ key, label, count, icon, hint, available }) => (
          <article key={key} className={shell.stat}>
            <div>
              <h2>{label}</h2>
              <FontAwesomeIcon icon={icon} aria-hidden="true" />
            </div>
            <strong>{available ? formatNumber.format(count) : '—'}</strong>
            <p>{available ? hint : 'Módulo desativado'}</p>
          </article>
        ))}
      </section>
      <div className={styles.panels}>
        <TaskList data={data} onNew={onNew} />
        <ModuleLinks links={links} />
      </div>
    </div>
  );
}

export function InternalWorkspace() {
  const { state, reload } = usePlatformData<InternalWorkspaceData>('/platform/workspace');
  const [adding, setAdding] = useState(false);
  const [saved, setSaved] = useState(false);
  if (state.status === 'loading') return <LoadingPanel label="Carregando a operação interna…" />;
  if (state.status === 'error') {
    return (
      <ErrorPanel
        message={apiError(state.error, 'Não foi possível carregar a operação interna.')}
        retry={reload}
      />
    );
  }
  return (
    <>
      {saved && (
        <p className={shell.notice} data-tone="success" role="status">
          Tarefa criada na empresa interna.
        </p>
      )}
      <WorkspaceContent
        data={state.data}
        reload={reload}
        onNew={() => {
          setSaved(false);
          setAdding(true);
        }}
      />
      {adding && (
        <NewTask
          onClose={() => setAdding(false)}
          onSaved={() => {
            setAdding(false);
            setSaved(true);
            reload();
          }}
        />
      )}
    </>
  );
}
