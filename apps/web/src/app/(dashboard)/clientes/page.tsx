'use client';

import { hasPermission } from '@nexly/shared';
import { useAuth } from '@/lib/auth';

import { MetricGrid } from '@/components/ui/MetricGrid';
import { PageToolbar } from '@/components/ui/PageToolbar';
import { Modal } from '@/components/ui/Modal';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { api } from '@/lib/api';
import { maskTelefone, soDigitos } from '@/lib/format';
import { toastSuccess, toastError } from '@/components/ui/Toaster';
import { ErrorState } from '@/components/ui/ErrorState';
import { isCancel } from 'axios';
import { EmptyState } from '@/components/ui/EmptyState';
import { ClienteDrawer } from './ClienteDrawer';

interface Cliente {
  id: string;
  nome: string;
  telefone: string | null;
  email: string | null;
  createdAt?: string;
  observacoes?: string | null;
  totalGasto?: number | string | null;
  ultimaVisita?: string | null;
  tag?: string | null;
}

interface FormState {
  nome: string;
  telefone: string;
  email: string;
}

const vazio: FormState = { nome: '', telefone: '', email: '' };

export default function ClientesPage() {
  const { user } = useAuth();
  const podeCriar = hasPermission(user?.role, 'clientes:create');
  const podeEditar = hasPermission(user?.role, 'clientes:update');
  const podeExcluir = hasPermission(user?.role, 'clientes:delete');
  const podeVerCompras = hasPermission(user?.role, 'vendas:read');
  const [pagina, setPagina] = useState(1);
  const [inspectorInline, setInspectorInline] = useState(false);
  useEffect(() => {
    const media = window.matchMedia('(min-width: 1280px)');
    const atualizar = () => setInspectorInline(media.matches);
    atualizar();
    media.addEventListener('change', atualizar);
    return () => media.removeEventListener('change', atualizar);
  }, []);
  const [erroCarga, setErroCarga] = useState('');
  const request = useRef<AbortController | null>(null);
  const consultaAtual = useRef('');
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [busca, setBusca] = useState('');
  const [carregando, setCarregando] = useState(true);
  const [modalAberto, setModalAberto] = useState(false);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(vazio);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [totalClientes, setTotalClientes] = useState(0);
  const [clienteDrawer, setClienteDrawer] = useState<Cliente | null>(null);
  const buscaRef = useRef<HTMLInputElement | null>(null);

  // Atalho de teclado: `/` foca o campo de busca (padrão de várias UIs).
  // Ignora quando o foco já está em outro input/textarea para não atrapalhar.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== '/') return;
      const t = e.target as HTMLElement | null;
      if (t && /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName)) return;
      if (t && t.isContentEditable) return;
      e.preventDefault();
      buscaRef.current?.focus();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const carregar = useCallback(
    async (search?: string) => {
      request.current?.abort();
      const controller = new AbortController();
      request.current = controller;
      setCarregando(true);
      setErroCarga('');
      const consulta = JSON.stringify([pagina, search ?? '']);
      if (consultaAtual.current !== consulta) setClientes([]);
      consultaAtual.current = consulta;
      try {
        const res = await api.get<{ data: Cliente[]; total: number }>('/clientes', {
          signal: controller.signal,
          params: { page: pagina, limit: 25, search },
        });
        if (controller.signal.aborted) return;
        setTotalClientes(res.data.total);
        const ultimaPagina = Math.max(1, Math.ceil(res.data.total / 25));
        if (pagina > ultimaPagina) {
          setPagina(ultimaPagina);
          return;
        }
        setClientes(res.data.data);
        setClienteDrawer((atual) =>
          atual ? (res.data.data.find((cliente) => cliente.id === atual.id) ?? null) : null,
        );
      } catch (error) {
        if (!isCancel(error) && !controller.signal.aborted)
          setErroCarga('Não foi possível carregar os clientes. Tente novamente.');
      } finally {
        if (!controller.signal.aborted) setCarregando(false);
      }
    },
    [pagina],
  );

  useEffect(() => {
    const timer = setTimeout(() => void carregar(busca.trim() || undefined), 250);
    return () => {
      clearTimeout(timer);
      request.current?.abort();
    };
  }, [busca, carregar]);

  const abrirNovo = (): void => {
    setEditandoId(null);
    setForm(vazio);
    setErro(null);
    setModalAberto(true);
  };

  const abrirEdicao = (c: Cliente): void => {
    setEditandoId(c.id);
    setForm({ nome: c.nome, telefone: c.telefone ?? '', email: c.email ?? '' });
    setErro(null);
    setModalAberto(true);
  };

  const salvar = async (): Promise<void> => {
    if (salvando) return;
    setSalvando(true);
    setErro(null);
    try {
      const payload = {
        nome: form.nome,
        telefone: form.telefone ? soDigitos(form.telefone) : '',
        email: form.email,
      };
      if (editandoId) {
        await api.put(`/clientes/${editandoId}`, payload);
      } else {
        await api.post('/clientes', payload);
      }
      setModalAberto(false);
      toastSuccess(editandoId ? 'Cliente atualizado!' : 'Cliente criado!');
      await carregar(busca || undefined);
    } catch (e) {
      const err = e as { response?: { data?: { message?: string } } };
      setErro(err?.response?.data?.message ?? 'Erro ao salvar cliente');
    } finally {
      setSalvando(false);
    }
  };

  const excluir = async (c: Cliente): Promise<void> => {
    if (!confirm(`Desativar o cliente "${c.nome}"? O histórico será preservado.`)) return;
    try {
      await api.delete(`/clientes/${c.id}`);
      toastSuccess('Cliente desativado');
      await carregar(busca || undefined);
    } catch (error) {
      const response = error as { response?: { data?: { message?: string } } };
      toastError(
        response.response?.data?.message ??
          'Não foi possível desativar o cliente. Tente novamente.',
      );
    }
  };

  return (
    <div className="clients-page">
      <PageToolbar>
        <div className="page-heading with-search flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-[#FAFAFA]">Clientes</h2>
            <p className="mt-1 text-sm text-[#A1A1AA]">
              CRM de clientes e acompanhamento de fidelidade · {totalClientes}{' '}
              {totalClientes === 1 ? 'registrado' : 'registrados'}
            </p>
          </div>
          <div className="toolbar-actions flex flex-wrap items-center gap-3">
            {' '}
            <div className="toolbar-search w-full sm:w-56">
              <Input
                ref={buscaRef}
                aria-label="Buscar cliente"
                placeholder="Buscar cliente..."
                value={busca}
                onChange={(e) => {
                  setBusca(e.target.value);
                  setPagina(1);
                }}
              />
            </div>
            {podeCriar && (
              <Button className="toolbar-primary" onClick={abrirNovo}>
                + Novo cliente
              </Button>
            )}
          </div>
        </div>
      </PageToolbar>

      <div className="grid min-w-0 gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0">
          <MetricGrid
            items={[
              { label: 'Total de Clientes', value: totalClientes },
              {
                label: 'Novos este Mês',
                value: clientes.filter(
                  (c) =>
                    c.createdAt &&
                    new Date(c.createdAt).getMonth() === new Date().getMonth() &&
                    new Date(c.createdAt).getFullYear() === new Date().getFullYear(),
                ).length,
                note: 'Na lista atual',
              },
              { label: 'Com E-mail', value: clientes.filter((c) => c.email).length },
              { label: 'Com Telefone', value: clientes.filter((c) => c.telefone).length },
            ]}
          />

          {erroCarga && (
            <ErrorState message={erroCarga} onRetry={() => void carregar(busca || undefined)} />
          )}
          <div className="hidden overflow-x-auto md:block rounded-xl border border-[rgba(255,255,255,0.08)] bg-[#111116]">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-[rgba(255,255,255,0.08)] bg-[#18181F]/40">
                <tr>
                  <th className="px-3 py-3 font-medium text-[#A1A1AA]">Nome</th>
                  <th className="px-3 py-3 font-medium text-[#A1A1AA]">E-mail</th>
                  <th className="px-3 py-3 font-medium text-[#A1A1AA]">Telefone</th>
                  <th className="px-3 py-3 font-medium text-[#A1A1AA]">Última Visita</th>
                  {podeVerCompras && (
                    <th className="px-3 py-3 font-medium text-[#A1A1AA]">Total em vendas</th>
                  )}
                  <th className="px-3 py-3 font-medium text-[#A1A1AA]">Status</th>
                  <th className="px-3 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-[rgba(255,255,255,0.08)]">
                {carregando && (
                  <tr>
                    <td
                      colSpan={podeVerCompras ? 7 : 6}
                      className="px-4 py-6 text-center text-[#A1A1AA]"
                    >
                      Carregando…
                    </td>
                  </tr>
                )}
                {!carregando && !erroCarga && clientes.length === 0 && (
                  <tr>
                    <td colSpan={podeVerCompras ? 7 : 6} className="px-4 py-16">
                      <EmptyState
                        icon="users-slash"
                        title={
                          busca
                            ? `Nenhum cliente encontrado para "${busca}"`
                            : 'Nenhum cliente cadastrado'
                        }
                        description={
                          busca
                            ? 'Verifique a grafia ou cadastre um novo cliente'
                            : 'Adicione clientes para começar a agendar serviços'
                        }
                        action={
                          podeCriar && !busca ? (
                            <Button onClick={abrirNovo}>+ Novo cliente</Button>
                          ) : undefined
                        }
                      />
                    </td>
                  </tr>
                )}
                {clientes.map((c) => (
                  <tr key={c.id} className="hover:bg-[#18181F]/30">
                    <td className="px-3 py-3">
                      <button
                        className="whitespace-nowrap font-medium text-[#FAFAFA] hover:text-[#818CF8]"
                        onClick={() => setClienteDrawer(c)}
                      >
                        {c.nome}
                      </button>
                    </td>
                    <td
                      className="max-w-[110px] truncate px-3 py-3 text-[#D4D4D8]"
                      title={c.email || undefined}
                    >
                      {c.email ?? '—'}
                    </td>
                    <td className="whitespace-nowrap px-3 py-3 text-[#D4D4D8]">
                      {c.telefone ? maskTelefone(c.telefone) : '—'}
                    </td>
                    <td className="whitespace-nowrap px-3 py-3 text-[#A1A1AA]">
                      {c.ultimaVisita ? new Date(c.ultimaVisita).toLocaleDateString('pt-BR') : '—'}
                    </td>
                    {podeVerCompras && (
                      <td className="whitespace-nowrap px-3 py-3 font-medium">
                        {new Intl.NumberFormat('pt-BR', {
                          style: 'currency',
                          currency: 'BRL',
                        }).format(Number(c.totalGasto || 0))}
                      </td>
                    )}
                    <td className="px-3 py-3">
                      <span
                        className={`rounded px-2 py-1 text-[10px] ${c.tag === 'VIP' ? 'bg-[#6366F1]/10 text-[#818CF8]' : 'bg-green-500/10 text-green-400'}`}
                      >
                        {c.tag || 'Ativo'}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-right">
                      {(podeEditar || podeExcluir) && (
                        <details className="relative">
                          <summary
                            aria-label={`Acoes de ${c.nome}`}
                            className="cursor-pointer list-none text-lg text-[#A1A1AA]"
                          >
                            &#8942;
                          </summary>
                          <div className="absolute right-0 z-20 w-28 rounded-lg border border-white/10 bg-[#18181F] p-1 shadow-xl">
                            {podeEditar && (
                              <button
                                className="block w-full rounded px-3 py-2 text-left text-xs hover:bg-white/5"
                                onClick={() => abrirEdicao(c)}
                              >
                                Editar
                              </button>
                            )}
                            {podeExcluir && (
                              <button
                                className="block w-full rounded px-3 py-2 text-left text-xs text-red-400 hover:bg-white/5"
                                onClick={() => void excluir(c)}
                              >
                                Excluir
                              </button>
                            )}
                          </div>
                        </details>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="space-y-3 md:hidden">
            {carregando && (
              <p role="status" className="text-sm text-[#A1A1AA]">
                Carregando clientes…
              </p>
            )}
            {clientes.map((c) => (
              <button
                key={c.id}
                onClick={() => setClienteDrawer(c)}
                className="flex w-full items-center gap-3 rounded-xl border border-white/10 bg-[#111116] p-4 text-left"
              >
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#6366F1]/15 font-semibold text-[#818CF8]">
                  {c.nome.slice(0, 1)}
                </span>
                <span className="min-w-0 flex-1">
                  <strong className="block truncate text-sm">{c.nome}</strong>
                  <span className="block truncate text-xs text-[#71717A]">
                    {c.email || c.telefone || 'Sem contato informado'}
                  </span>
                  {podeVerCompras && (
                    <span className="block text-xs text-[#A1A1AA]">
                      Em vendas:{' '}
                      {new Intl.NumberFormat('pt-BR', {
                        style: 'currency',
                        currency: 'BRL',
                      }).format(Number(c.totalGasto || 0))}
                    </span>
                  )}
                </span>
                <span className="text-[#71717A]">&rsaquo;</span>
              </button>
            ))}
            {!carregando && !erroCarga && clientes.length === 0 && (
              <EmptyState
                icon="users"
                title="Nenhum cliente encontrado"
                description="Cadastre um cliente ou ajuste a busca"
              />
            )}
          </div>
          {!erroCarga && (
            <nav
              aria-label="Paginação de clientes"
              className="mt-5 flex flex-wrap items-center gap-3"
            >
              <Button
                variant="secondary"
                disabled={carregando || pagina <= 1}
                onClick={() => setPagina((atual) => atual - 1)}
              >
                Anterior
              </Button>
              <span role="status" className="text-sm text-[#A1A1AA]">
                Página {pagina} de {Math.max(1, Math.ceil(totalClientes / 25))}
              </span>
              <Button
                variant="secondary"
                disabled={carregando || pagina * 25 >= totalClientes}
                onClick={() => setPagina((atual) => atual + 1)}
              >
                Próxima
              </Button>
            </nav>
          )}
        </div>
        <ClienteDrawer
          inline={inspectorInline}
          cliente={clienteDrawer || (inspectorInline ? clientes[0] : null) || null}
          onClose={() => setClienteDrawer(null)}
          onAtualizar={() => void carregar(busca || undefined)}
        />
      </div>

      {modalAberto && (
        <Modal
          open
          title={editandoId ? 'Editar cliente' : 'Novo cliente'}
          onClose={() => {
            if (!salvando) setModalAberto(false);
          }}
        >
          <form
            className="mt-4 space-y-3"
            onSubmit={(event) => {
              event.preventDefault();
              void salvar();
            }}
          >
            <Input
              label="Nome"
              required
              minLength={2}
              maxLength={120}
              value={form.nome}
              onChange={(e) => setForm({ ...form, nome: e.target.value })}
              placeholder="Nome do cliente"
            />
            <Input
              label="Telefone"
              value={form.telefone}
              onChange={(e) => setForm({ ...form, telefone: maskTelefone(e.target.value) })}
              placeholder="(00) 00000-0000"
            />
            <Input
              label="E-mail"
              maxLength={254}
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="email@exemplo.com"
            />
            {erro && (
              <p role="alert" className="text-sm text-red-300">
                {erro}
              </p>
            )}
            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                disabled={salvando}
                variant="secondary"
                onClick={() => setModalAberto(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" loading={salvando} disabled={!form.nome}>
                Salvar
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
