'use client';

import { useCallback, useEffect, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { api } from '@/lib/api';
import { maskTelefone, soDigitos } from '@/lib/format';

interface Cliente {
  id: string;
  nome: string;
  telefone: string | null;
  email: string | null;
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

  const carregar = useCallback(async (search?: string) => {
    setCarregando(true);
    try {
      const res = await api.get<{ data: Cliente[] }>('/clientes', {
        params: { limit: 100, search },
      });
      setClientes(res.data.data);
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
    await carregar(busca || undefined);
  };

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-zinc-100">Clientes</h2>
          <p className="mt-1 text-sm text-zinc-400">Gerencie os clientes do seu negócio</p>
        </div>
        <Button onClick={abrirNovo}>+ Novo cliente</Button>
      </div>

      <div className="mt-6 max-w-md">
        <Input
          placeholder="Buscar por nome ou telefone..."
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
        />
      </div>

      <div className="mt-6 overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-zinc-800 bg-zinc-800/40">
            <tr>
              <th className="px-4 py-3 font-medium text-zinc-400">Nome</th>
              <th className="px-4 py-3 font-medium text-zinc-400">Telefone</th>
              <th className="px-4 py-3 font-medium text-zinc-400">E-mail</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800">
            {carregando && (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-zinc-400">
                  Carregando…
                </td>
              </tr>
            )}
            {!carregando && clientes.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-zinc-500">
                  Nenhum cliente encontrado.
                </td>
              </tr>
            )}
            {clientes.map((c) => (
              <tr key={c.id} className="hover:bg-zinc-800/30">
                <td className="px-4 py-3 font-medium text-zinc-100">{c.nome}</td>
                <td className="px-4 py-3 text-zinc-300">{c.telefone ?? '—'}</td>
                <td className="px-4 py-3 text-zinc-300">{c.email ?? '—'}</td>
                <td className="px-4 py-3 text-right">
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

      {modalAberto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
            <h3 className="text-lg font-semibold text-zinc-100">
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
