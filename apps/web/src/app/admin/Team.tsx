'use client';

import { useDeferredValue, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faCircleCheck,
  faPause,
  faPlay,
  faShieldHalved,
  faUserPlus,
  faUsers,
} from '@fortawesome/free-solid-svg-icons';
import { api } from '@/lib/api';
import {
  apiError,
  appErrorCode,
  formatDate,
  roleNames,
  usePlatformData,
  type EmployeeRole,
  type PlatformRole,
  type TeamMember,
} from './platform-data';
import { ActionDialog, EmptyPanel, ErrorPanel, LoadingPanel } from './ui';
import styles from './console.module.css';
import teamStyles from './team.module.css';

type Member = TeamMember & { usuarioAtivo: boolean; doisFatoresAtivo: boolean };
type Candidate = Pick<Member, 'usuarioId' | 'nome' | 'email' | 'doisFatoresAtivo'>;
type Access = 'ready' | 'pending' | 'paused' | 'disabled';

const roleDescriptions: Record<PlatformRole, string> = {
  OWNER: 'Gerencia a equipe interna e os cupons, além de consultar empresas e indicadores.',
  OPERATIONS: 'Consulta os indicadores e acompanha o cadastro de empresas para operações.',
  FINANCE: 'Consulta indicadores e empresas e gerencia os cupons de desconto.',
  VIEWER: 'Acesso de leitura aos indicadores e ao cadastro de empresas.',
};

const accessLabels: Record<Access, string> = {
  ready: 'Acesso liberado',
  pending: '2FA pendente',
  paused: 'Acesso pausado',
  disabled: 'Conta desativada',
};

function accessOf(person: Member): Access {
  if (!person.usuarioAtivo) return 'disabled';
  if (!person.ativo) return 'paused';
  return person.doisFatoresAtivo ? 'ready' : 'pending';
}

function searchKey(text: string) {
  return text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLocaleLowerCase('pt-BR')
    .trim();
}

function initialOf(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');
}

function TeamEditor({
  member,
  onClose,
  onSaved,
  onDuplicate,
}: {
  member?: Member;
  onClose: () => void;
  onSaved: (message: string) => void;
  onDuplicate: (email: string) => void;
}) {
  const [role, setRole] = useState<EmployeeRole>(
    member && member.papel !== 'OWNER' ? member.papel : 'VIEWER',
  );
  const [candidate, setCandidate] = useState<Candidate | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [duplicate, setDuplicate] = useState(false);
  const canSave = member ? role !== member.papel : Boolean(candidate);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || !canSave) return;
    setError('');
    setDuplicate(false);
    setBusy(true);
    try {
      if (member) {
        await api.patch(`/platform/team/${encodeURIComponent(member.id)}`, {
          papel: role,
        });
        onSaved('Papel do colaborador atualizado.');
      } else if (candidate) {
        await api.post('/platform/team', { usuarioId: candidate.usuarioId, papel: role });
        onSaved(
          candidate.doisFatoresAtivo
            ? 'Colaborador adicionado ao painel interno.'
            : 'Colaborador adicionado. O acesso fica pendente até a conta ativar o 2FA.',
        );
      }
    } catch (failure) {
      setError(apiError(failure, 'Não foi possível salvar o acesso do colaborador.'));
      setDuplicate(appErrorCode(failure) === 'PLATFORM_MEMBER_EXISTS');
    } finally {
      setBusy(false);
    }
  }

  return (
    <ActionDialog
      title={member ? 'Editar papel' : 'Adicionar colaborador'}
      busy={busy}
      onClose={onClose}
    >
      <form className={styles.form} onSubmit={(event) => void save(event)}>
        {member ? (
          <p className={styles.formHint}>
            Você está alterando o acesso de <strong>{member.nome}</strong>.
          </p>
        ) : (
          <CandidatePicker
            selected={candidate}
            onSelect={(person) => {
              setCandidate(person);
              setError('');
              setDuplicate(false);
            }}
            disabled={busy}
          />
        )}
        <label className={styles.field}>
          <span>Papel na plataforma</span>
          <select
            value={role}
            disabled={busy}
            onChange={(event) => setRole(event.target.value as EmployeeRole)}
          >
            {(['OPERATIONS', 'FINANCE', 'VIEWER'] as const).map((value) => (
              <option key={value} value={value}>
                {roleNames[value]}
              </option>
            ))}
          </select>
          <small>{roleDescriptions[role]}</small>
        </label>
        {error && (
          <p className={styles.notice} data-tone="error" role="alert">
            <span>{error}</span>
            {duplicate && candidate && (
              <button
                type="button"
                className={styles.secondaryButton}
                onClick={() => onDuplicate(candidate.email)}
              >
                Localizar na equipe
              </button>
            )}
          </p>
        )}
        <footer className={styles.formActions}>
          <button
            type="button"
            className={styles.secondaryButton}
            onClick={onClose}
            disabled={busy}
          >
            Cancelar
          </button>
          <button
            type="submit"
            className={styles.primaryButton}
            disabled={busy || !canSave || duplicate}
          >
            {busy ? 'Salvando…' : member ? 'Salvar acesso' : 'Adicionar colaborador'}
          </button>
        </footer>
      </form>
    </ActionDialog>
  );
}

function AccessDialog({
  member,
  onClose,
  onSaved,
}: {
  member: Member;
  onClose: () => void;
  onSaved: (message: string) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const pausing = member.ativo;
  const verb = pausing ? 'Pausar acesso' : 'Restaurar acesso';

  async function change(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      await api.patch(`/platform/team/${encodeURIComponent(member.id)}`, { ativo: !pausing });
      onSaved(
        pausing
          ? 'Acesso ao painel interno pausado.'
          : member.doisFatoresAtivo
            ? 'Acesso ao painel interno restaurado.'
            : 'Acesso restaurado. O colaborador ainda precisa ativar o 2FA.',
      );
    } catch (failure) {
      setError(apiError(failure, 'Não foi possível alterar o acesso.'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <ActionDialog title={verb} busy={busy} onClose={onClose}>
      <form className={styles.form} onSubmit={(event) => void change(event)}>
        <p className={styles.formHint}>
          <strong>{member.nome}</strong>
          {' · '}
          {roleNames[member.papel]}
        </p>
        <p>
          {pausing
            ? 'O colaborador perde o acesso ao painel interno. A conta da empresa continua disponível, e o vínculo pode ser restaurado com o mesmo papel.'
            : `O colaborador poderá usar o painel interno novamente com o papel de ${roleNames[member.papel]}.`}
        </p>
        {!pausing && !member.doisFatoresAtivo && (
          <p className={styles.notice} data-tone="warning">
            A liberação exige a ativação do 2FA na conta.
          </p>
        )}
        {error && (
          <p className={styles.notice} data-tone="error" role="alert">
            {error}
          </p>
        )}
        <footer className={styles.formActions}>
          <button
            type="button"
            className={styles.secondaryButton}
            onClick={onClose}
            disabled={busy}
          >
            Cancelar
          </button>
          <button type="submit" className={styles.primaryButton} disabled={busy}>
            {busy ? 'Salvando…' : verb}
          </button>
        </footer>
      </form>
    </ActionDialog>
  );
}

function CandidatePicker({
  selected,
  onSelect,
  disabled,
}: {
  selected: Candidate | null;
  onSelect: (candidate: Candidate) => void;
  disabled: boolean;
}) {
  const [query, setQuery] = useState('');
  const search = useDeferredValue(query.trim());
  const params = new URLSearchParams({ busca: search });
  const { state, reload } = usePlatformData<Candidate[]>(
    `/platform/team/candidates${search ? `?${params}` : ''}`,
  );

  return (
    <div className={styles.candidatePicker}>
      <p className={styles.formHint}>
        Escolha uma conta ativa da sua empresa. Se precisar criar uma conta, acesse{' '}
        <Link href="/usuarios">Usuários</Link>.
      </p>
      <label className={styles.field}>
        <span>Buscar colaborador</span>
        <input
          type="search"
          placeholder="Nome ou e-mail"
          maxLength={120}
          value={query}
          disabled={disabled}
          onChange={(event) => setQuery(event.target.value)}
        />
      </label>
      {selected && (
        <p className={styles.notice} data-tone={selected.doisFatoresAtivo ? 'success' : 'warning'}>
          <FontAwesomeIcon icon={faShieldHalved} aria-hidden="true" />
          <span>
            <strong>{selected.nome}</strong>
            {selected.doisFatoresAtivo
              ? ' já tem 2FA configurado.'
              : ' precisa ativar o 2FA na própria conta para entrar.'}
          </span>
        </p>
      )}
      {state.status === 'loading' && <LoadingPanel label="Buscando contas da equipe…" />}
      {state.status === 'error' && (
        <ErrorPanel
          message={apiError(state.error, 'Não foi possível buscar as contas.')}
          retry={reload}
        />
      )}
      {state.status === 'ready' &&
        (state.data.length ? (
          <fieldset className={styles.candidates} disabled={disabled}>
            <legend className={styles.srOnly}>Conta que receberá acesso</legend>
            {state.data.map((person) => (
              <label key={person.usuarioId}>
                <input
                  type="radio"
                  name="platform-employee"
                  checked={selected?.usuarioId === person.usuarioId}
                  onChange={() => onSelect(person)}
                />
                <span>
                  <strong>{person.nome}</strong>
                  <small>{person.email}</small>
                </span>
                <small className={teamStyles.candidateStatus}>
                  {person.doisFatoresAtivo ? '2FA ativo' : '2FA pendente'}
                </small>
              </label>
            ))}
          </fieldset>
        ) : (
          <EmptyPanel>
            {search
              ? 'Nenhuma conta corresponde à busca.'
              : 'Nenhuma conta elegível para adicionar. Contas com acesso pausado podem ser restauradas na lista da equipe.'}
          </EmptyPanel>
        ))}
    </div>
  );
}

export function Team() {
  const { state, reload } = usePlatformData<Member[]>('/platform/team');
  const [editor, setEditor] = useState<Member | 'new' | null>(null);
  const [accessDialog, setAccessDialog] = useState<Member | null>(null);
  const [feedback, setFeedback] = useState('');
  const [query, setQuery] = useState('');
  const [role, setRole] = useState<PlatformRole | ''>('');
  const [access, setAccess] = useState<Access | ''>('');
  const people = state.status === 'ready' ? state.data : [];
  const totals = {
    ready: people.filter((person) => accessOf(person) === 'ready').length,
    pending: people.filter((person) => accessOf(person) === 'pending').length,
  };
  const search = searchKey(query);
  const matches = people.filter(
    (person) =>
      (!role || person.papel === role) &&
      (!access || accessOf(person) === access) &&
      (!search || searchKey(`${person.nome} ${person.email}`).includes(search)),
  );
  const filtered = Boolean(search || role || access);

  function saved(message: string) {
    setEditor(null);
    setAccessDialog(null);
    setFeedback(message);
    reload();
  }

  function clearFilters() {
    setQuery('');
    setRole('');
    setAccess('');
  }

  return (
    <section className={styles.panel} aria-labelledby="platform-team">
      <header className={styles.panelHeader}>
        <div>
          <h2 id="platform-team">Acessos internos</h2>
          <p>Os colaboradores precisam usar autenticação em duas etapas para entrar.</p>
        </div>
        {state.status === 'ready' && (
          <button
            className={styles.primaryButton}
            type="button"
            onClick={() => {
              setFeedback('');
              setEditor('new');
            }}
          >
            <FontAwesomeIcon icon={faUserPlus} /> Adicionar colaborador
          </button>
        )}
      </header>
      {feedback && (
        <p className={styles.notice} data-tone="success" role="status">
          {feedback}
        </p>
      )}
      {state.status === 'loading' && <LoadingPanel label="Carregando colaboradores…" />}
      {state.status === 'error' && (
        <ErrorPanel
          message={apiError(state.error, 'Não foi possível carregar os colaboradores.')}
          retry={reload}
        />
      )}
      {state.status === 'ready' && (
        <>
          <div className={teamStyles.summary} aria-label="Situação da equipe">
            <div>
              <FontAwesomeIcon icon={faUsers} aria-hidden="true" />
              <strong>{people.length}</strong>
              <span>Vínculos</span>
            </div>
            <div>
              <FontAwesomeIcon icon={faCircleCheck} aria-hidden="true" />
              <strong>{totals.ready}</strong>
              <span>Acessos liberados</span>
            </div>
            <div>
              <FontAwesomeIcon icon={faShieldHalved} aria-hidden="true" />
              <strong>{totals.pending}</strong>
              <span>Aguardando 2FA</span>
            </div>
          </div>

          <details className={teamStyles.onboarding}>
            <summary>Como liberar um acesso</summary>
            <ol>
              <li>
                Crie ou convide o colaborador em <Link href="/usuarios">Usuários</Link> da empresa
                interna.
              </li>
              <li>Adicione a conta neste painel com o papel adequado.</li>
              <li>
                Peça ao colaborador para entrar na conta e configurar a verificação em duas etapas.
              </li>
            </ol>
            <dl>
              {(Object.keys(roleDescriptions) as PlatformRole[]).map((value) => (
                <div key={value}>
                  <dt>{roleNames[value]}</dt>
                  <dd>{roleDescriptions[value]}</dd>
                </div>
              ))}
            </dl>
          </details>

          {!!people.length && (
            <>
              <div className={teamStyles.filters}>
                <label className={styles.field}>
                  <span>Buscar na equipe</span>
                  <input
                    value={query}
                    type="search"
                    placeholder="Nome ou e-mail"
                    onChange={(event) => setQuery(event.target.value)}
                  />
                </label>
                <label className={styles.field}>
                  <span>Papel</span>
                  <select
                    value={role}
                    onChange={(event) => setRole(event.target.value as PlatformRole | '')}
                  >
                    <option value="">Todos os papéis</option>
                    {(Object.keys(roleNames) as PlatformRole[]).map((value) => (
                      <option key={value} value={value}>
                        {roleNames[value]}
                      </option>
                    ))}
                  </select>
                </label>
                <label className={styles.field}>
                  <span>Situação</span>
                  <select
                    value={access}
                    onChange={(event) => setAccess(event.target.value as Access | '')}
                  >
                    <option value="">Todas as situações</option>
                    {(Object.keys(accessLabels) as Access[]).map((value) => (
                      <option key={value} value={value}>
                        {accessLabels[value]}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <div className={teamStyles.filterFeedback}>
                <p role="status">
                  {matches.length} de {people.length} {people.length === 1 ? 'vínculo' : 'vínculos'}
                </p>
                {filtered && (
                  <button className={styles.secondaryButton} type="button" onClick={clearFilters}>
                    Limpar filtros
                  </button>
                )}
              </div>
            </>
          )}
          {matches.length ? (
            <div
              className={styles.tableScroll}
              // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex -- Permite rolar a tabela horizontalmente pelo teclado.
              tabIndex={0}
              role="region"
              aria-label="Tabela de colaboradores"
            >
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th scope="col">Colaborador</th>
                    <th scope="col">Papel</th>
                    <th scope="col">Status</th>
                    <th scope="col">Histórico</th>
                    <th scope="col">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {matches.map((person) => {
                    const memberAccess = accessOf(person);
                    return (
                      <tr key={person.id}>
                        <th scope="row">
                          <div className={teamStyles.person}>
                            <span className={teamStyles.avatar} aria-hidden="true">
                              {initialOf(person.nome)}
                            </span>
                            <div>
                              <span>{person.nome}</span>
                              <small>{person.email}</small>
                            </div>
                          </div>
                        </th>
                        <td>{roleNames[person.papel]}</td>
                        <td>
                          <span
                            className={styles.pill}
                            data-tone={
                              memberAccess === 'ready'
                                ? 'green'
                                : memberAccess === 'pending'
                                  ? 'warning'
                                  : 'neutral'
                            }
                          >
                            {accessLabels[memberAccess]}
                          </span>
                        </td>
                        <td>
                          <small>
                            Desde{' '}
                            <time dateTime={person.criadoEm}>{formatDate(person.criadoEm)}</time>
                          </small>
                          {person.atualizadoEm !== person.criadoEm && (
                            <small>
                              Revisto em{' '}
                              <time dateTime={person.atualizadoEm}>
                                {formatDate(person.atualizadoEm)}
                              </time>
                            </small>
                          )}
                        </td>
                        <td>
                          {person.papel === 'OWNER' ? (
                            <small>Gerenciado na configuração do acesso</small>
                          ) : (
                            <div className={teamStyles.actions}>
                              <button
                                type="button"
                                className={styles.secondaryButton}
                                aria-label={`Editar papel de ${person.nome}`}
                                onClick={() => {
                                  setFeedback('');
                                  setEditor(person);
                                }}
                              >
                                Editar papel
                              </button>
                              {(person.ativo || person.usuarioAtivo) && (
                                <button
                                  type="button"
                                  className={styles.secondaryButton}
                                  aria-label={`${person.ativo ? 'Pausar' : 'Restaurar'} acesso de ${person.nome}`}
                                  onClick={() => {
                                    setFeedback('');
                                    setAccessDialog(person);
                                  }}
                                >
                                  <FontAwesomeIcon
                                    icon={person.ativo ? faPause : faPlay}
                                    aria-hidden="true"
                                  />
                                  {person.ativo ? 'Pausar' : 'Restaurar'}
                                </button>
                              )}
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyPanel>
              {filtered
                ? 'Nenhum vínculo corresponde aos filtros.'
                : 'Nenhum colaborador com acesso cadastrado.'}
            </EmptyPanel>
          )}
        </>
      )}
      {editor && (
        <TeamEditor
          member={editor === 'new' ? undefined : editor}
          onClose={() => setEditor(null)}
          onSaved={saved}
          onDuplicate={(email) => {
            setEditor(null);
            clearFilters();
            setQuery(email);
            reload();
          }}
        />
      )}
      {accessDialog && (
        <AccessDialog member={accessDialog} onClose={() => setAccessDialog(null)} onSaved={saved} />
      )}
    </section>
  );
}
