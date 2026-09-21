'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { EmptyState } from '@/components/ui/EmptyState';
import { api } from '@/lib/api';
import { toastSuccess, toastError } from '@/components/ui/Toaster';

interface Usuario { id: string; nome: string; email: string; role: string; ativo: boolean; createdAt: string; }

// Valores alinhados ao enum Role do banco: ADMIN | GESTOR | PROFISSIONAL | RECEPCIONISTA | CAIXA.
const roleLabel: Record<string, string> = {
  ADMIN: 'Administrador',
  GESTOR: 'Gestor',
  PROFISSIONAL: 'Profissional',
  RECEPCIONISTA: 'Recepcionista',
  CAIXA: 'Operador de Caixa',
};
const roleColor: Record<string, string> = {
  ADMIN: '#818CF8',
  GESTOR: '#A5B4FC',
  PROFISSIONAL: '#22C55E',
  RECEPCIONISTA: '#60A5FA',
  CAIXA: '#A1A1AA',
};
const roleDescricao: Record<string, string> = {
  ADMIN: 'Acesso total ao sistema',
  GESTOR: 'Gerencia agenda, clientes, estoque e relatórios',
  PROFISSIONAL: 'Vê apenas a agenda',
  RECEPCIONISTA: 'Gerencia agenda e clientes',
  CAIXA: 'Usa o PDV e vê histórico de vendas',
};

export default function UsuariosPage() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [modalAberto, setModalAberto] = useState(false);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [form, setForm] = useState({ nome: '', email: '', senha: '', role: 'CAIXA' });
  const [salvando, setSalvando] = useState(false);
  const [conviteModal, setConviteModal] = useState(false);
  const [conviteForm, setConviteForm] = useState({ email: '', role: 'CAIXA' });
  const [convidando, setConvidando] = useState(false);
  const [conviteLink, setConviteLink] = useState<string | null>(null);

  const carregar = async (): Promise<void> => {
    const res = await api.get<Usuario[]>('/usuarios');
    setUsuarios(Array.isArray(res.data) ? res.data : []);
  };

  useEffect(() => { void carregar(); }, []);

  const salvar = async (): Promise<void> => {
    setSalvando(true);
    try {
      if (editandoId) {
        await api.put('/usuarios/' + editandoId, { nome: form.nome, role: form.role });
        toastSuccess('Usuário atualizado!');
      } else {
        await api.post('/usuarios', form);
        toastSuccess('Usuário criado!');
      }
      setModalAberto(false);
      await carregar();
    } catch (e) {
      const err = e as { response?: { data?: { message?: string } } };
      toastError(err?.response?.data?.message || 'Erro ao salvar');
    } finally { setSalvando(false); }
  };

  // Alterna entre ativo/inativo usando PUT (o DELETE apenas desativa o usuário,
  // então não serve para reativar).
  const toggleAtivo = async (u: Usuario): Promise<void> => {
    await api.put('/usuarios/' + u.id, { ativo: !u.ativo });
    toastSuccess(u.ativo ? 'Usuário desativado' : 'Usuário reativado');
    await carregar();
  };

  const convidar = async (): Promise<void> => {
    setConvidando(true);
    try {
      const r = await api.post<{ conviteId: string; link: string }>(
        '/usuarios/convidar',
        conviteForm,
      );
      setConviteLink(r.data.link);
      toastSuccess('Convite gerado!');
    } catch (e) {
      const err = e as { response?: { data?: { message?: string } } };
      toastError(err?.response?.data?.message || 'Erro ao convidar');
    } finally {
      setConvidando(false);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold" style={{ color: '#FAFAFA' }}>Usuários</h2>
          <p className="mt-1 text-sm" style={{ color: '#71717A' }}>Gerencie quem acessa o sistema</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="secondary"
            onClick={() => {
              setConviteLink(null);
              setConviteForm({ email: '', role: 'CAIXA' });
              setConviteModal(true);
            }}
          >
            + Convidar usuário
          </Button>
          <Button
            onClick={() => {
              setEditandoId(null);
              setForm({ nome: '', email: '', senha: '', role: 'CAIXA' });
              setModalAberto(true);
            }}
          >
            + Novo usuário
          </Button>
        </div>
      </div>

      <div className="mt-6 overflow-x-auto rounded-xl" style={{ backgroundColor: '#111116', border: '1px solid rgba(255,255,255,0.06)' }}>
        {usuarios.length === 0 ? (
          <EmptyState icon="user-group" title="Nenhum usuário" description="Adicione usuários para acessar o sistema" />
        ) : (
          <table className="w-full text-left text-[13px]">
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                <th className="px-4 py-3 font-medium" style={{ color: '#71717A' }}>Nome</th>
                <th className="px-4 py-3 font-medium" style={{ color: '#71717A' }}>E-mail</th>
                <th className="px-4 py-3 font-medium" style={{ color: '#71717A' }}>Função</th>
                <th className="px-4 py-3 font-medium" style={{ color: '#71717A' }}>Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {usuarios.map((u) => (
                <tr key={u.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <td className="px-4 py-3" style={{ color: '#FAFAFA' }}>{u.nome}</td>
                  <td className="px-4 py-3" style={{ color: '#A1A1AA' }}>{u.email}</td>
                  <td className="px-4 py-3"><span className="rounded-full px-2 py-0.5 text-[11px] font-semibold" style={{ color: roleColor[u.role], backgroundColor: roleColor[u.role] + '20' }}>{roleLabel[u.role] || u.role}</span></td>
                  <td className="px-4 py-3"><span className="text-[11px] font-semibold" style={{ color: u.ativo ? '#22C55E' : '#EF4444' }}>{u.ativo ? 'Ativo' : 'Inativo'}</span></td>
                  <td className="px-4 py-3">
                    <Button variant="ghost" className="text-xs" onClick={() => { setEditandoId(u.id); setForm({ nome: u.nome, email: u.email, senha: '', role: u.role }); setModalAberto(true); }}>Editar</Button>
                    <Button variant="ghost" className="text-xs" style={{ color: u.ativo ? '#EF4444' : '#22C55E' }} onClick={() => { void toggleAtivo(u); }}>{u.ativo ? 'Desativar' : 'Ativar'}</Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <Modal open={modalAberto} onClose={() => setModalAberto(false)} title={editandoId ? 'Editar usuário' : 'Novo usuário'}>
        <div className="space-y-3">
          <Input label="Nome" value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} placeholder="Nome completo" />
          {!editandoId && <Input label="E-mail" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="email@empresa.com" />}
          {!editandoId && <Input label="Senha" type="password" value={form.senha} onChange={(e) => setForm({ ...form, senha: e.target.value })} placeholder="••••••••" />}
          <div>
            <label className="mb-1 block text-sm font-medium" style={{ color: '#A1A1AA' }}>Função</label>
            <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} className="w-full rounded-lg border px-3 py-2 text-sm" style={{ backgroundColor: '#0C0C10', borderColor: 'rgba(255,255,255,0.10)', color: '#FAFAFA' }}>
              <option value="ADMIN">Administrador</option>
              <option value="GESTOR">Gestor</option>
              <option value="PROFISSIONAL">Profissional</option>
              <option value="RECEPCIONISTA">Recepcionista</option>
              <option value="CAIXA">Operador de Caixa</option>
            </select>
          </div>
          <Button onClick={() => { void salvar(); }} loading={salvando} className="w-full mt-4">Salvar</Button>
        </div>
      </Modal>

      <Modal open={conviteModal} onClose={() => setConviteModal(false)} title="Convidar usuário">
        <div className="space-y-3">
          <Input
            label="E-mail"
            type="email"
            value={conviteForm.email}
            onChange={(e) => setConviteForm({ ...conviteForm, email: e.target.value })}
            placeholder="email@empresa.com"
          />
          <div>
            <label className="mb-1 block text-sm font-medium" style={{ color: '#A1A1AA' }}>
              Função
            </label>
            <select
              value={conviteForm.role}
              onChange={(e) => setConviteForm({ ...conviteForm, role: e.target.value })}
              className="w-full rounded-lg border px-3 py-2 text-sm"
              style={{ backgroundColor: '#0C0C10', borderColor: 'rgba(255,255,255,0.10)', color: '#FAFAFA' }}
            >
              <option value="ADMIN">Administrador</option>
              <option value="GESTOR">Gestor</option>
              <option value="PROFISSIONAL">Profissional</option>
              <option value="RECEPCIONISTA">Recepcionista</option>
              <option value="CAIXA">Operador de Caixa</option>
            </select>
            <p className="mt-1 text-xs" style={{ color: '#71717A' }}>
              {roleDescricao[conviteForm.role]}
            </p>
          </div>
          {conviteLink && (
            <div
              className="rounded-lg border border-[rgba(34,197,94,0.3)] bg-[rgba(34,197,94,0.06)] p-3"
            >
              <p className="text-xs" style={{ color: '#22C55E' }}>
                Link de convite gerado:
              </p>
              <p className="mt-1 break-all text-xs" style={{ color: '#A1A1AA' }}>
                {conviteLink}
              </p>
            </div>
          )}
          <Button
            onClick={() => {
              void convidar();
            }}
            loading={convidando}
            disabled={!conviteForm.email}
            className="w-full mt-4"
          >
            Gerar convite
          </Button>
        </div>
      </Modal>
    </div>
  );
}
