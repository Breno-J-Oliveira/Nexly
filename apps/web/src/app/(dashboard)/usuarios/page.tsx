'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { EmptyState } from '@/components/ui/EmptyState';
import { api } from '@/lib/api';
import { toastSuccess, toastError } from '@/components/ui/Toaster';

interface Usuario { id: string; nome: string; email: string; role: string; ativo: boolean; createdAt: string; }

const roleLabel: Record<string, string> = { ADMIN: 'Administrador', GESTOR: 'Gerente', CAIXA: 'Operador de Caixa' };
const roleColor: Record<string, string> = { ADMIN: '#818CF8', GESTOR: '#22C55E', CAIXA: '#A1A1AA' };

export default function UsuariosPage() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [modalAberto, setModalAberto] = useState(false);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [form, setForm] = useState({ nome: '', email: '', senha: '', role: 'CAIXA' });
  const [salvando, setSalvando] = useState(false);

  const carregar = async () => {
    const res = await api.get<Usuario[]>('/usuarios');
    setUsuarios(Array.isArray(res.data) ? res.data : (res.data as any).data ?? []);
  };

  useEffect(() => { void carregar(); }, []);

  const salvar = async () => {
    setSalvando(true);
    try {
      if (editandoId) {
        await api.put('/usuarios/' + editandoId, { nome: form.nome, role: form.role });
        toastSuccess('Usuario atualizado!');
      } else {
        await api.post('/usuarios', form);
        toastSuccess('Usuario criado!');
      }
      setModalAberto(false);
      await carregar();
    } catch (e: any) {
      toastError(e?.response?.data?.message || 'Erro ao salvar');
    } finally { setSalvando(false); }
  };

  const toggleAtivo = async (u: Usuario) => {
    await api.delete('/usuarios/' + u.id);
    toastSuccess(u.ativo ? 'Usuario desativado' : 'Usuario reativado');
    await carregar();
  };

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold" style={{ color: '#FAFAFA' }}>Usuarios</h2>
          <p className="mt-1 text-sm" style={{ color: '#71717A' }}>Gerencie quem acessa o sistema</p>
        </div>
        <Button onClick={() => { setEditandoId(null); setForm({ nome: '', email: '', senha: '', role: 'CAIXA' }); setModalAberto(true); }}>+ Novo usuario</Button>
      </div>

      <div className="mt-6 overflow-x-auto rounded-xl" style={{ backgroundColor: '#111116', border: '1px solid rgba(255,255,255,0.06)' }}>
        {usuarios.length === 0 ? (
          <EmptyState icon="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" title="Nenhum usuario" description="Adicione usuarios para acessar o sistema" />
        ) : (
          <table className="w-full text-left text-[13px]">
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                <th className="px-4 py-3 font-medium" style={{ color: '#71717A' }}>Nome</th>
                <th className="px-4 py-3 font-medium" style={{ color: '#71717A' }}>Email</th>
                <th className="px-4 py-3 font-medium" style={{ color: '#71717A' }}>Funcao</th>
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
                    <Button variant="ghost" className="text-xs" style={{ color: u.ativo ? '#EF4444' : '#22C55E' }} onClick={() => toggleAtivo(u)}>{u.ativo ? 'Desativar' : 'Ativar'}</Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <Modal open={modalAberto} onClose={() => setModalAberto(false)} title={editandoId ? 'Editar usuario' : 'Novo usuario'}>
        <div className="space-y-3">
          <Input label="Nome" value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} placeholder="Nome completo" />
          {!editandoId && <Input label="Email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="email@empresa.com" />}
          {!editandoId && <Input label="Senha" type="password" value={form.senha} onChange={(e) => setForm({ ...form, senha: e.target.value })} placeholder="••••••••" />}
          <div>
            <label className="mb-1 block text-sm font-medium" style={{ color: '#A1A1AA' }}>Funcao</label>
            <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} className="w-full rounded-lg border px-3 py-2 text-sm" style={{ backgroundColor: '#0C0C10', borderColor: 'rgba(255,255,255,0.10)', color: '#FAFAFA' }}>
              <option value="ADMIN">Administrador</option>
              <option value="GESTOR">Gerente</option>
              <option value="CAIXA">Operador de Caixa</option>
            </select>
          </div>
          <Button onClick={salvar} loading={salvando} className="w-full mt-4">Salvar</Button>
        </div>
      </Modal>
    </div>
  );
}
