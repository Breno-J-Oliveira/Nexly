'use client';

import { MetricGrid } from '@/components/ui/MetricGrid';
import { PageToolbar } from '@/components/ui/PageToolbar';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { api } from '@/lib/api';
import { maskTelefone, soDigitos } from '@/lib/format';
import { toastSuccess } from '@/components/ui/Toaster';
import { EmptyState } from '@/components/ui/EmptyState';
import { ClienteDrawer } from './ClienteDrawer';

interface Cliente {
  id: string;
  nome: string;
  telefone: string | null;
  email: string | null;
  createdAt?: string;
  observacoes?: string | null;
}

interface FormState {
  nome: string;
  telefone: string;
  email: string;
}

const vazio: FormState = { nome: '', telefone: '', email: '' };

export default function ClientesPage() {
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

  const carregar = useCallback(async (search?: string) => {
    setCarregando(true);
    try {
      const res = await api.get<{ data: Cliente[]; total: number }>('/clientes', {
        params: { limit: 100, search },
      });
      setClientes(res.data.data);
      setTotalClientes(res.data.total);
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  useEffect(() => {
    const t = setTimeout(() => void carregar(busca || undefined), 300);
    return () => clearTimeout(t);
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
    if (!confirm(`Excluir o cliente "${c.nome}"?`)) return;
    await api.delete(`/clientes/${c.id}`);
    toastSuccess('Cliente excluído!');
    await carregar(busca || undefined);
  };

  return (
    <div>
      <PageToolbar><div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-[#FAFAFA]">Clientes</h2>
          <p className="mt-1 text-sm text-[#A1A1AA]">
            CRM de clientes e acompanhamento de fidelidade · {totalClientes}{' '}
            {totalClientes === 1 ? 'registrado' : 'registrados'}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">      <div className="w-full sm:w-56">
        <Input
          ref={buscaRef}
          aria-label="Buscar cliente" placeholder="Buscar cliente..."
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
        />
      </div><Button onClick={abrirNovo}>+ Novo cliente</Button></div>
      </div></PageToolbar>

      <div className="grid min-w-0 gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0">
          <MetricGrid items={[
            { label: 'Total de Clientes', value: totalClientes },
            { label: 'Novos este Mês', value: clientes.filter(c => c.createdAt && new Date(c.createdAt).getMonth() === new Date().getMonth() && new Date(c.createdAt).getFullYear() === new Date().getFullYear()).length, note: 'Na lista atual' },
            { label: 'Com E-mail', value: clientes.filter(c => c.email).length },
            { label: 'Com Telefone', value: clientes.filter(c => c.telefone).length },
          ]} />


      <div className="hidden overflow-x-auto md:block rounded-xl border border-[rgba(255,255,255,0.08)] bg-[#111116]">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-[rgba(255,255,255,0.08)] bg-[#18181F]/40">
            <tr>
              <th className="px-4 py-3 font-medium text-[#A1A1AA]">Nome</th>
              <th className="px-4 py-3 font-medium text-[#A1A1AA]">Telefone</th>
              <th className="px-4 py-3 font-medium text-[#A1A1AA]">E-mail</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-[rgba(255,255,255,0.08)]">
            {carregando && (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-[#A1A1AA]">
                  Carregando…
                </td>
              </tr>
            )}
            {!carregando && clientes.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-16">
                  <EmptyState
                    icon="users-slash"
                    title={busca ? `Nenhum cliente encontrado para "${busca}"` : "Nenhum cliente cadastrado"}
                    description={busca ? 'Verifique a grafia ou cadastre um novo cliente' : 'Adicione clientes para começar a agendar serviços'}
                    action={!busca ? <Button onClick={abrirNovo}>+ Novo cliente</Button> : undefined}
                  />
                </td>
              </tr>
            )}
            {clientes.map((c) => (
              <tr key={c.id} className="hover:bg-[#18181F]/30">
                <td className="px-4 py-3">
                  <button
                    className="font-medium text-[#FAFAFA] hover:text-[#818CF8]"
                    onClick={() => setClienteDrawer(c)}
                  >
                    {c.nome}
                  </button>
                </td>
                <td className="px-4 py-3 text-[#D4D4D8]">{c.telefone ?? '—'}</td>
                <td className="px-4 py-3 text-[#D4D4D8]">{c.email ?? '—'}</td>
                <td className="px-4 py-3 text-right">
                  <Button
                    variant="ghost"
                    className="mr-1 text-xs"
                    onClick={() => setClienteDrawer(c)}
                  >
                    Histórico
                  </Button>
                  <Button variant="ghost" className="mr-1 text-xs" onClick={() => abrirEdicao(c)}>
                    Editar
                  </Button>
                  <Button
                    variant="ghost"
                    className="text-xs text-red-400"
                    onClick={() => void excluir(c)}
                  >
                    Excluir
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>


          <div className="space-y-3 md:hidden">
            {clientes.map(c => <button key={c.id} onClick={() => setClienteDrawer(c)} className="flex w-full items-center gap-3 rounded-xl border border-white/10 bg-[#111116] p-4 text-left">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#6366F1]/15 font-semibold text-[#818CF8]">{c.nome.slice(0, 1)}</span>
              <span className="min-w-0 flex-1"><strong className="block truncate text-sm">{c.nome}</strong><span className="block truncate text-xs text-[#71717A]">{c.email || c.telefone || 'Sem contato informado'}</span></span><span className="text-[#71717A]">&rsaquo;</span>
            </button>)}
            {!carregando && clientes.length === 0 && <EmptyState icon="users" title="Nenhum cliente encontrado" description="Cadastre um cliente ou ajuste a busca" />}
          </div>
        </div>
        <div className="hidden xl:block"><ClienteDrawer inline cliente={clienteDrawer || clientes[0] || null} onClose={() => setClienteDrawer(null)} onAtualizar={() => void carregar(busca || undefined)} /></div>
      </div>
      <div className="xl:hidden">
      <ClienteDrawer
        cliente={clienteDrawer}
        onClose={() => setClienteDrawer(null)}
        onAtualizar={() => void carregar(busca || undefined)}
      />

      </div>

      {modalAberto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-md rounded-2xl border border-[rgba(255,255,255,0.08)] bg-[#111116] p-6">
            <h3 className="text-lg font-semibold text-[#FAFAFA]">
              {editandoId ? 'Editar cliente' : 'Novo cliente'}
            </h3>
            <div className="mt-4 space-y-3">
              <Input
                label="Nome"
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
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="email@exemplo.com"
              />
              {erro && <p className="text-sm text-red-400">{erro}</p>}
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="secondary" onClick={() => setModalAberto(false)}>
                  Cancelar
                </Button>
                <Button onClick={() => void salvar()} loading={salvando} disabled={!form.nome}>
                  Salvar
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
