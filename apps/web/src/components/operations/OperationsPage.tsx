'use client';
import { useCallback, useEffect, useState, useRef, FormEvent } from 'react';
import { createPortal } from 'react-dom';
import { operationError } from './errors';
import { useAuth } from '@/lib/auth';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { configs, Kind, Options, RecordData, statusLabels } from './config';
import { MarketingConsent } from './MarketingConsent';

const control =
  'w-full rounded-lg border border-white/10 bg-[#18181F] px-3 py-2 text-sm text-[#FAFAFA]';
const emptyOptions: Options = {
  usuarios: [],
  filiais: [],
  clientes: [],
  profissionais: [],
  servicos: [],
};
function localDate(value: unknown) {
  if (typeof value !== 'string') return '';
  const d = new Date(String(value));
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}
function date(value: unknown) {
  return typeof value === 'string' ? new Date(value).toLocaleString('pt-BR') : 'Sem prazo';
}
export function OperationsPage({ kind }: { kind: Kind }) {
  const { user } = useAuth();
  const allowed = user?.role === 'ADMIN' || user?.role === 'GESTOR';
  const config = configs[kind];
  const [items, setItems] = useState<RecordData[]>([]),
    [total, setTotal] = useState(0),
    [page, setPage] = useState(1);
  const [taskStatus, setTaskStatus] = useState('');
  const [taskBranch, setTaskBranch] = useState('');
  const [loading, setLoading] = useState(true),
    [error, setError] = useState(''),
    [notice, setNotice] = useState('');
  const [options, setOptions] = useState<Options>(emptyOptions);
  const [editing, setEditing] = useState<RecordData | null>(null),
    [form, setForm] = useState<Record<string, string | boolean | number>>({ ...config.defaults }),
    [open, setOpen] = useState(false),
    [busy, setBusy] = useState(false);
  const [remove, setRemove] = useState<RecordData | null>(null),
    [preview, setPreview] = useState<RecordData | null>(null);
  const [contacts, setContacts] = useState<
      { id: string; nome: string; url: string | null }[] | null
    >(null),
    [campaign, setCampaign] = useState<string | null>(null),
    [contactPage, setContactPage] = useState(1),
    [contactTotal, setContactTotal] = useState(0);
  const [clientSearch, setClientSearch] = useState('');
  const loadVersion = useRef(0);
  const cancelPendingLoads = useCallback(() => {
    loadVersion.current++;
  }, []);
  const load = useCallback(async () => {
    if (!allowed) return;
    const version = ++loadVersion.current;
    setLoading(true);
    try {
      const r = await api.get<{ data: RecordData[]; total: number } | RecordData[]>(
        `/operacoes/${config.path}`,
        {
          params: {
            page,
            ...(kind === 'tarefas'
              ? { status: taskStatus || undefined, filialId: taskBranch || undefined }
              : {}),
          },
        },
      );
      if (version !== loadVersion.current) return;
      setItems(Array.isArray(r.data) ? r.data : r.data.data);
      setTotal(Array.isArray(r.data) ? r.data.length : r.data.total);
      setError('');
    } catch (e) {
      if (version === loadVersion.current) setError(operationError(e));
    } finally {
      if (version === loadVersion.current) setLoading(false);
    }
  }, [allowed, config.path, page, kind, taskStatus, taskBranch]);
  useEffect(() => {
    void load();
    return cancelPendingLoads;
  }, [load, cancelPendingLoads]);
  useEffect(() => {
    if (!allowed) return;
    let active = true;
    api
      .get<Options>('/operacoes/opcoes')
      .then((r) => {
        if (active) setOptions(r.data);
      })
      .catch(() => {
        if (active)
          setError('Não foi possível carregar os cadastros auxiliares. Recarregue a página.');
      });
    return () => {
      active = false;
    };
  }, [allowed]);
  async function searchClients() {
    try {
      const r = await api.get<Options>('/operacoes/opcoes', { params: { busca: clientSearch } });
      setOptions(r.data);
    } catch (e) {
      setError(operationError(e));
    }
  }
  async function edit(item?: RecordData) {
    setError('');
    setNotice('');
    try {
      const record =
        item && kind === 'documentos'
          ? (await api.get<RecordData>(`/operacoes/documentos/${item.id}`)).data
          : item;
      setEditing(record || null);
      const next = { ...config.defaults };
      for (const f of config.fields) {
        if (record && record[f.name] !== undefined && record[f.name] !== null)
          next[f.name] =
            f.type === 'datetime-local'
              ? localDate(record[f.name])
              : (record[f.name] as string | number | boolean);
      }
      setForm(next);
      setOpen(true);
    } catch (e) {
      setError(operationError(e));
    }
  }
  async function save(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      const body: Record<string, unknown> = {};
      for (const f of config.fields) {
        const value = form[f.name];
        body[f.name] =
          f.type === 'number'
            ? Number(value)
            : f.type === 'datetime-local'
              ? value
                ? new Date(String(value)).toISOString()
                : null
              : f.source
                ? value || null
                : value;
      }
      if (editing && kind === 'documentos') body.versao = editing.versao;
      if (editing) await api.put(`/operacoes/${config.path}/${editing.id}`, body);
      else await api.post(`/operacoes/${config.path}`, body);
      setOpen(false);
      setNotice('Salvo com sucesso.');
      await load();
    } catch (e) {
      setError(operationError(e));
    } finally {
      setBusy(false);
    }
  }
  async function confirmRemove() {
    if (!remove) return;
    setBusy(true);
    try {
      if (kind === 'recorrencias') await api.post(`/operacoes/recorrencias/${remove.id}/cancelar`);
      else await api.delete(`/operacoes/${config.path}/${remove.id}`);
      setRemove(null);
      setNotice(
        kind === 'recorrencias'
          ? 'Atendimentos futuros cancelados; histórico preservado.'
          : 'Registro excluído.',
      );
      await load();
    } catch (e) {
      setError(operationError(e));
    } finally {
      setBusy(false);
    }
  }
  async function showDocument(item: RecordData) {
    try {
      setPreview((await api.get<RecordData>(`/operacoes/documentos/${item.id}`)).data);
    } catch (e) {
      setError(operationError(e));
    }
  }
  async function showContacts(id: string, p = 1) {
    try {
      const r = await api.get<{
        data: { id: string; nome: string; url: string | null }[];
        total: number;
      }>(`/operacoes/campanhas/${id}/contatos`, { params: { page: p } });
      setContacts(r.data.data);
      setContactTotal(r.data.total);
      setContactPage(p);
      setCampaign(id);
    } catch (e) {
      setError(operationError(e));
    }
  }
  if (!allowed)
    return <p role="alert">Este recurso está disponível para administradores e gestores.</p>;
  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-3xl">
          <h2 className="text-xl font-semibold">{config.title}</h2>
          <p className="mt-2 text-sm leading-relaxed text-[#A1A1AA]">{config.description}</p>
        </div>
        <Button onClick={() => void edit()}>Novo registro</Button>
      </header>
      {error && (
        <p role="alert" className="rounded-lg border border-red-500/30 p-3 text-sm text-red-300">
          {error}
        </p>
      )}
      {notice && (
        <p role="status" className="text-sm text-emerald-300">
          {notice}
        </p>
      )}
      {kind === 'automacao' && (
        <Button
          variant="secondary"
          disabled={busy}
          onClick={() => {
            void (async () => {
              setBusy(true);
              try {
                const r = await api.post<{ criadas: number }>('/operacoes/automacoes/processar');
                setNotice(`${r.data.criadas} tarefa(s) criada(s) para execuções vencidas.`);
                await load();
              } catch (e) {
                setError(operationError(e));
              } finally {
                setBusy(false);
              }
            })();
          }}
        >
          Verificar execuções agora
        </Button>
      )}
      {kind === 'tarefas' && (
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-sm text-[#A1A1AA]">
            Filtrar situação
            <select
              aria-label="Filtrar situação"
              className={`${control} mt-2`}
              value={taskStatus}
              onChange={(e) => {
                setTaskStatus(e.target.value);
                setPage(1);
              }}
            >
              <option value="">Todas</option>
              {['PENDENTE', 'EM_ANDAMENTO', 'CONCLUIDA'].map((status) => (
                <option key={status} value={status}>
                  {statusLabels[status]}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm text-[#A1A1AA]">
            Filtrar filial
            <select
              aria-label="Filtrar filial"
              className={`${control} mt-2`}
              value={taskBranch}
              onChange={(e) => {
                setTaskBranch(e.target.value);
                setPage(1);
              }}
            >
              <option value="">Todas</option>
              {options.filiais.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.nome}
                </option>
              ))}
            </select>
          </label>
        </div>
      )}
      {kind === 'marketing' && <MarketingConsent options={options} onError={setError} />}
      {loading ? (
        <p role="status">Carregando registros…</p>
      ) : (
        <>
          <div className="grid gap-4 lg:grid-cols-2">
            {items.map((item) => (
              <article
                key={item.id}
                className="min-w-0 rounded-xl border border-white/10 bg-[#111116] p-5"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <h3 className="break-words font-semibold">{String(item.titulo || item.nome)}</h3>
                  <span className="rounded-md bg-white/5 px-2 py-1 text-xs text-[#A1A1AA]">
                    {statusLabels[String(item.status || item.categoria)] ||
                      (item.ativa === false
                        ? 'Inativa'
                        : item.cancelada
                          ? 'Cancelada'
                          : kind === 'documentos'
                            ? `Versão ${item.versao}`
                            : 'Ativa')}
                  </span>
                </div>
                {kind === 'tarefas' && (
                  <>
                    <p className="mt-3 whitespace-pre-wrap break-words text-sm text-[#A1A1AA]">
                      {String(item.descricao || 'Sem descrição')}
                    </p>
                    <dl className="mt-3 space-y-1 text-xs text-[#A1A1AA]">
                      <div>Prazo: {date(item.prazo)}</div>
                      <div>Prioridade: {statusLabels[String(item.prioridade)]}</div>
                      <div>
                        Responsável:{' '}
                        {options.usuarios.find((o) => o.id === item.responsavelId)?.nome ||
                          (item.responsavelId ? 'Usuário indisponível' : 'Não definido')}
                      </div>
                      <div>
                        Filial:{' '}
                        {options.filiais.find((o) => o.id === item.filialId)?.nome ||
                          (item.filialId ? 'Filial inativa' : 'Não definida')}
                      </div>
                    </dl>
                  </>
                )}
                {kind === 'filiais' && (
                  <p className="mt-3 break-words text-sm text-[#A1A1AA]">
                    {String(item.endereco)}
                    <br />
                    {String(item.telefone || '')}
                  </p>
                )}
                {kind === 'marketing' && (
                  <p className="mt-3 whitespace-pre-wrap break-words text-sm text-[#A1A1AA]">
                    {String(item.mensagem)}
                  </p>
                )}
                {kind === 'documentos' && (
                  <p className="mt-3 text-xs text-[#A1A1AA]">
                    Versão {String(item.versao)} · Atualizado em {date(item.updatedAt)}
                  </p>
                )}
                {kind === 'automacao' && (
                  <p className="mt-3 text-sm text-[#A1A1AA]">
                    A cada {String(item.intervaloDias)} dias · Próxima: {date(item.proximaExecucao)}
                    <br />
                    ?ltima execução:{' '}
                    {item.ultimaExecucao ? date(item.ultimaExecucao) : 'Ainda não executada'}
                  </p>
                )}
                {kind === 'recorrencias' && (
                  <details className="mt-3 text-sm text-[#A1A1AA]">
                    <summary>
                      {String(item.quantidade)} atendimentos · a cada {String(item.intervaloDias)}{' '}
                      dias
                    </summary>
                    <ul className="mt-2 space-y-1">
                      {(
                        item.agendamentos as { id: string; dataHora: string; status: string }[]
                      ).map((a) => (
                        <li key={a.id}>
                          {date(a.dataHora)} · {a.status}
                        </li>
                      ))}
                    </ul>
                  </details>
                )}
                <div className="mt-4 flex flex-wrap gap-2">
                  {kind !== 'recorrencias' && (
                    <Button variant="secondary" onClick={() => void edit(item)}>
                      Editar
                    </Button>
                  )}
                  {kind === 'documentos' && (
                    <Button variant="secondary" onClick={() => void showDocument(item)}>
                      Visualizar / PDF
                    </Button>
                  )}
                  {kind === 'marketing' && item.status === 'ATIVA' && (
                    <Button variant="secondary" onClick={() => void showContacts(item.id)}>
                      Preparar contatos
                    </Button>
                  )}
                  {['tarefas', 'documentos', 'recorrencias'].includes(kind) &&
                    !(kind === 'recorrencias' && item.cancelada) && (
                      <Button variant="ghost" onClick={() => setRemove(item)}>
                        {kind === 'recorrencias' ? 'Cancelar futuros' : 'Excluir'}
                      </Button>
                    )}
                </div>
              </article>
            ))}
          </div>
          {!items.length && (
            <p className="rounded-xl border border-dashed border-white/10 p-8 text-center text-sm text-[#A1A1AA]">
              Nenhum registro ainda. Use “Novo registro” para começar.
            </p>
          )}
          <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-[#A1A1AA]">
            <span>
              {total} registro(s) · página {page}
            </span>
            <div className="flex gap-2">
              <Button variant="ghost" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>
                Anterior
              </Button>
              <Button
                variant="ghost"
                disabled={page * 50 >= total}
                onClick={() => setPage((p) => p + 1)}
              >
                Próxima
              </Button>
            </div>
          </div>
        </>
      )}
      <Modal
        open={open}
        title={`${editing ? 'Editar' : 'Criar'} — ${config.title}`}
        onClose={() => {
          if (!busy) setOpen(false);
        }}
        width="max-w-2xl"
      >
        <form
          onSubmit={(e) => {
            void save(e);
          }}
          className="space-y-4"
        >
          {kind === 'recorrencias' && (
            <div>
              <label htmlFor="client-search" className="text-sm">
                Buscar cliente pelo nome
              </label>
              <div className="mt-2 flex gap-2">
                <input
                  id="client-search"
                  className={control}
                  value={clientSearch}
                  onChange={(e) => setClientSearch(e.target.value)}
                  maxLength={100}
                />
                <Button type="button" variant="secondary" onClick={() => void searchClients()}>
                  Buscar
                </Button>
              </div>
              <p className="mt-1 text-xs text-[#71717A]">Até 100 clientes por busca.</p>
            </div>
          )}
          {config.fields.map((f) => (
            <div key={f.name} className="block text-sm text-[#A1A1AA]">
              <label htmlFor={`operation-${f.name}`}>{f.label}</label>
              {f.type === 'textarea' ? (
                <textarea
                  id={`operation-${f.name}`}
                  className={`${control} mt-2 min-h-32`}
                  value={String(form[f.name] || '')}
                  required={f.required}
                  maxLength={f.maxLength}
                  onChange={(e) => setForm({ ...form, [f.name]: e.target.value })}
                />
              ) : f.type === 'checkbox' ? (
                <input
                  id={`operation-${f.name}`}
                  className="ml-3 accent-[#6366F1]"
                  type="checkbox"
                  checked={Boolean(form[f.name])}
                  onChange={(e) => setForm({ ...form, [f.name]: e.target.checked })}
                />
              ) : f.type === 'select' ? (
                <select
                  id={`operation-${f.name}`}
                  className={`${control} mt-2`}
                  value={String(form[f.name] || '')}
                  required={f.required}
                  onChange={(e) => setForm({ ...form, [f.name]: e.target.value })}
                >
                  {!f.required || f.source ? <option value="">Selecione</option> : null}
                  {f.choices?.map((c) => (
                    <option key={c} value={c}>
                      {statusLabels[c] || c}
                    </option>
                  ))}
                  {f.source &&
                    form[f.name] &&
                    !options[f.source].some((o) => o.id === form[f.name]) && (
                      <option value={String(form[f.name])}>Vínculo anterior (inativo)</option>
                    )}
                  {f.source &&
                    options[f.source].map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.nome}
                      </option>
                    ))}
                </select>
              ) : (
                <input
                  id={`operation-${f.name}`}
                  className={`${control} mt-2`}
                  type={f.type || 'text'}
                  value={String(form[f.name] ?? '')}
                  required={f.required}
                  min={f.min}
                  max={f.max}
                  minLength={f.type !== 'number' ? f.min : undefined}
                  maxLength={f.maxLength}
                  onChange={(e) => setForm({ ...form, [f.name]: e.target.value })}
                />
              )}
            </div>
          ))}
          {kind === 'recorrencias' && form.inicio && (
            <details open className="text-xs text-[#A1A1AA]">
              <summary>Conferir datas antes de criar</summary>
              <ol className="mt-2 space-y-1">
                {Array.from(
                  { length: Math.max(0, Math.min(24, Number(form.quantidade) || 0)) },
                  (_, i) => (
                    <li key={i}>
                      {new Date(
                        new Date(String(form.inicio)).getTime() +
                          i * Number(form.intervaloDias) * 86400000,
                      ).toLocaleString('pt-BR')}
                    </li>
                  ),
                )}
              </ol>
            </details>
          )}
          {error && (
            <p role="alert" className="text-sm text-red-300">
              {error}
            </p>
          )}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" disabled={busy} onClick={() => setOpen(false)}>
              Voltar
            </Button>
            <Button loading={busy} type="submit">
              {kind === 'recorrencias' ? 'Criar todos os atendimentos' : 'Salvar'}
            </Button>
          </div>
        </form>
      </Modal>
      <Modal
        open={!!remove}
        title={kind === 'recorrencias' ? 'Cancelar próximos atendimentos?' : 'Excluir registro?'}
        onClose={() => {
          if (!busy) setRemove(null);
        }}
      >
        <p className="mb-5 text-sm text-[#A1A1AA]">
          {kind === 'recorrencias'
            ? 'Somente horários futuros agendados ou confirmados serão cancelados. O histórico permanece.'
            : 'Esta ação remove o registro. Confirme para continuar.'}
        </p>
        {error && <p role="alert">{error}</p>}
        <Button variant="danger" loading={busy} onClick={() => void confirmRemove()}>
          Confirmar
        </Button>
      </Modal>
      <Modal
        open={!!preview}
        title="Visualizar documento"
        onClose={() => setPreview(null)}
        width="max-w-3xl"
      >
        <article className="rounded-lg bg-white p-6 text-black">
          <h1 className="mb-6 text-2xl font-bold">{String(preview?.titulo || '')}</h1>
          <p className="whitespace-pre-wrap break-words leading-relaxed">
            {String(preview?.conteudo || '')}
          </p>
          <p className="mt-8 text-xs">Versão {String(preview?.versao || '')}</p>
        </article>
        <Button className="mt-4" onClick={() => window.print()}>
          Imprimir / Salvar PDF
        </Button>
      </Modal>
      {preview &&
        createPortal(
          <article id="print-document">
            <h1>{preview.titulo}</h1>
            <p>{preview.conteudo}</p>
            <footer>Versão {preview.versao}</footer>
          </article>,
          document.body,
        )}
      <Modal
        open={contacts !== null}
        title="Contatos autorizados"
        onClose={() => {
          setContacts(null);
          setCampaign(null);
        }}
        width="max-w-2xl"
      >
        <p className="mb-4 text-sm text-[#A1A1AA]">
          Revise a mensagem antes de enviar no WhatsApp. Abrir o contato não comprova entrega.
          Revogue autorizações em Marketing quando solicitado.
        </p>
        <ul className="space-y-3">
          {contacts?.map((c) => (
            <li key={c.id} className="flex flex-wrap items-center justify-between gap-3 text-sm">
              <span>{c.nome}</span>
              {c.url ? (
                <a
                  className="text-[#A5B4FC]"
                  href={c.url}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Revisar no WhatsApp
                </a>
              ) : (
                <span className="text-[#A1A1AA]">Telefone inválido ou ausente</span>
              )}
            </li>
          ))}
        </ul>
        {!contacts?.length && (
          <p className="text-sm text-[#A1A1AA]">Nenhum contato autorizado nesta página.</p>
        )}
        <div className="mt-5 flex gap-2">
          <Button
            variant="ghost"
            disabled={contactPage === 1}
            onClick={() => campaign && void showContacts(campaign, contactPage - 1)}
          >
            Anterior
          </Button>
          <Button
            variant="ghost"
            disabled={contactPage * 50 >= contactTotal}
            onClick={() => campaign && void showContacts(campaign, contactPage + 1)}
          >
            Próxima
          </Button>
        </div>
      </Modal>
    </div>
  );
}
