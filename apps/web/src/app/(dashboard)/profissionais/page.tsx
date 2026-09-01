'use client';

import { useCallback, useEffect, useState } from 'react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { api } from '@/lib/api';
import { toastSuccess } from '@/components/ui/Toaster';
import { EmptyState } from '@/components/ui/EmptyState';


interface Profissional {
  id: string;
  nome: string;
  especialidade: string | null;
  agendamentos?: { id: string }[];
}

export default function ProfissionaisPage() {
  const [profissionais, setProfissionais] = useState<Profissional[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [modalAberto, setModalAberto] = useState(false);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [nome, setNome] = useState('');
  const [especialidade, setEspecialidade] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    setCarregando(true);
    try {
      const res = await api.get<Profissional[]>('/profissionais');
      setProfissionais(res.data);
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  const abrirNovo = (): void => {
    setEditandoId(null);
    setNome('');
    setEspecialidade('');
    setErro(null);
    setModalAberto(true);
  };

  const abrirEdicao = (p: Profissional): void => {
    setEditandoId(p.id);
    setNome(p.nome);
    setEspecialidade(p.especialidade ?? '');
    setErro(null);
    setModalAberto(true);
  };

  const salvar = async (): Promise<void> => {
    setSalvando(true);
    setErro(null);
    try {
      const payload = { nome, especialidade: especialidade || undefined };
      if (editandoId) {
        await api.put(`/profissionais/${editandoId}`, payload);
      } else {
        await api.post('/profissionais', payload);
      }
      setModalAberto(false);
    toastSuccess(editandoId ? 'Profissional atualizado!' : 'Profissional cadastrado!');
      await carregar();
    } catch (e) {
      const err = e as { response?: { data?: { message?: string } } };
      setErro(err?.response?.data?.message ?? 'Erro ao salvar profissional');
    } finally {
      setSalvando(false);
    }
  };

  const excluir = async (p: Profissional): Promise<void> => {
    if (!confirm(`Excluir o profissional "${p.nome}"?`)) return;
    await api.delete(`/profissionais/${p.id}`);
    await carregar();
  };

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-zinc-100">Profissionais</h2>
          <p className="mt-1 text-sm text-zinc-400">Equipe de atendimento do seu negócio</p>
        </div>
        <Button onClick={abrirNovo}>+ Novo profissional</Button>
      </div>

      {carregando ? (
        <p className="mt-8 text-sm text-zinc-400">Carregando…</p>
      ) : profissionais.length === 0 ? (
        <EmptyState
          icon="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
          title="Equipe vazia"
          description="Adicione os profissionais do seu negocio para comecar a agendar"
          action={<Button onClick={abrirNovo}>+ Novo profissional</Button>}
        />
      ) : (
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {profissionais.map((p) => (
            <div key={p.id} className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-primary-500/15 text-sm font-semibold text-primary-300">
                  {p.nome.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="truncate font-medium text-zinc-100">{p.nome}</p>
                  <p className="truncate text-xs text-zinc-500">
                    {p.especialidade ?? 'Sem especialidade'}
                  </p>
                </div>
              </div>
              <div className="mt-4 flex items-center justify-between">
                {p.agendamentos && p.agendamentos.length > 0 ? (
                  <Badge color="CONFIRMADO">{p.agendamentos.length} atendimentos</Badge>
                ) : (
                  <Badge>Disponível</Badge>
                )}
                <div>
                  <Button variant="ghost" className="mr-1 text-xs" onClick={() => abrirEdicao(p)}>
                    Editar
                  </Button>
                  <Button
                    variant="ghost"
                    className="text-xs text-red-400"
                    onClick={() => void excluir(p)}
                  >
                    Excluir
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {modalAberto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
            <h3 className="text-lg font-semibold text-zinc-100">
              {editandoId ? 'Editar profissional' : 'Novo profissional'}
            </h3>
            <div className="mt-4 space-y-3">
              <Input
                label="Nome"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Nome do profissional"
              />
              <Input
                label="Especialidade"
                value={especialidade}
                onChange={(e) => setEspecialidade(e.target.value)}
                placeholder="Ex: cabeleireiro, manicure"
              />
              {erro && <p className="text-sm text-red-400">{erro}</p>}
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="secondary" onClick={() => setModalAberto(false)}>
                  Cancelar
                </Button>
                <Button onClick={() => void salvar()} loading={salvando} disabled={!nome}>
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
