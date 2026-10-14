'use client';

import { MetricGrid } from '@/components/ui/MetricGrid';
import { PageToolbar } from '@/components/ui/PageToolbar';

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
  const [busca, setBusca] = useState('');
  const [selecionadoId, setSelecionadoId] = useState<string | null>(null);
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

  const selecionado = profissionais.find(p => p.id === selecionadoId) || profissionais[0];

  return (
    <div>
      <PageToolbar><div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-[#FAFAFA]">Profissionais</h2>
          <p className="mt-1 text-sm text-[#A1A1AA]">Equipe de atendimento do seu negócio</p>
        </div>
        <div className="flex flex-wrap items-center gap-3"><Input aria-label="Buscar profissional" placeholder="Buscar profissional..." value={busca} onChange={e => setBusca(e.target.value)} /><Button onClick={abrirNovo}>+ Novo profissional</Button></div>
      </div></PageToolbar>

      <MetricGrid items={[
        { label: 'Total Profissionais', value: profissionais.length },
        { label: 'Atendimentos', value: profissionais.reduce((sum, p) => sum + (p.agendamentos?.length || 0), 0), note: 'Agendamentos registrados' },
        { label: 'Especialidades', value: new Set(profissionais.map(p => p.especialidade).filter(Boolean)).size },
        { label: 'Com Agenda', value: profissionais.filter(p => p.agendamentos?.length).length },
      ]} />
      {carregando ? (
        <p className="mt-8 text-sm text-[#A1A1AA]">Carregando…</p>
      ) : profissionais.length === 0 ? (
        <EmptyState
          icon="user-tie"
          title="Equipe vazia"
          description="Adicione os profissionais do seu negocio para comecar a agendar"
          action={<Button onClick={abrirNovo}>+ Novo profissional</Button>}
        />
      ) : (
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_300px]"><div className="grid content-start grid-cols-1 gap-4 sm:grid-cols-2">
          {profissionais.filter(p => p.nome.toLowerCase().includes(busca.toLowerCase())).map((p) => (
            <div key={p.id} className="rounded-xl border border-[rgba(255,255,255,0.08)] bg-[#111116] p-5">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[rgba(99,102,241,0.15)] text-sm font-semibold text-[#A5B4FC]">
                  {p.nome.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <button onClick={() => setSelecionadoId(p.id)} className="truncate text-left font-medium text-[#FAFAFA] hover:text-[#818CF8]">{p.nome}</button>
                  <p className="truncate text-xs text-[#71717A]">
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
          {selecionado && <aside className="detail-panel"><div className="flex flex-col items-center border-b border-white/10 pb-6 text-center"><span className="mb-4 flex h-20 w-20 items-center justify-center rounded-full border-2 border-[#6366F1] bg-[#6366F1]/10 text-2xl text-[#818CF8]">{selecionado.nome.slice(0, 1)}</span><h3 className="text-xl font-semibold">{selecionado.nome}</h3><p className="mt-2 text-xs text-[#A1A1AA]">{selecionado.especialidade || 'Sem especialidade'}</p></div><p className="mt-6 text-xs text-[#71717A]">ATENDIMENTOS REGISTRADOS</p><p className="mt-2 text-2xl font-semibold">{selecionado.agendamentos?.length || 0}</p><div className="mt-8 flex flex-wrap gap-3"><Button variant="secondary" onClick={() => abrirEdicao(selecionado)}>Editar Perfil</Button><a href={`/agenda?profissionalId=${selecionado.id}`} className="rounded-lg bg-[#6366F1] px-4 py-2 text-sm font-medium">Ver Agenda</a></div></aside>}
        </div>
      )}

      {modalAberto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-md rounded-2xl border border-[rgba(255,255,255,0.08)] bg-[#111116] p-6">
            <h3 className="text-lg font-semibold text-[#FAFAFA]">
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
