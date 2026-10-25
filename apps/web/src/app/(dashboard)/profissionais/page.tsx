'use client';

import { hasPermission, PLAN_NAMES, ProfessionalQuota } from '@nexly/shared';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';

import { ResponsiveDetailPanel } from '@/components/ui/ResponsiveDetailPanel';
import { MetricGrid } from '@/components/ui/MetricGrid';
import { PageToolbar } from '@/components/ui/PageToolbar';
import { Modal } from '@/components/ui/Modal';

import { useState } from 'react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { api } from '@/lib/api';
import { useApi } from '@/lib/useApi';
import { ErrorState } from '@/components/ui/ErrorState';
import { parseApiError } from '@/lib/errors';
import { toastSuccess, toastError } from '@/components/ui/Toaster';
import { EmptyState } from '@/components/ui/EmptyState';

interface Profissional {
  id: string;
  nome: string;
  especialidade: string | null;
  agendamentos?: { id: string }[];
  comissaoPercentual?: number;
}

export default function ProfissionaisPage() {
  const { user } = useAuth();
  const podeCriar = hasPermission(user?.role, 'profissionais:create');
  const podeEditar = hasPermission(user?.role, 'profissionais:update');
  const podeExcluir = hasPermission(user?.role, 'profissionais:delete');
  const podeVerComissoes = hasPermission(user?.role, 'comissao:read');
  const [detalhesAbertos, setDetalhesAbertos] = useState(false);
  const [busca, setBusca] = useState('');
  const [selecionadoId, setSelecionadoId] = useState<string | null>(null);
  const {
    data: lista,
    loading: carregando,
    error: erroCarga,
    refetch: carregar,
  } = useApi<Profissional[]>('/profissionais');
  const profissionais = lista ?? [];
  const { data: quota, refetch: carregarLimites } =
    useApi<ProfessionalQuota>('/profissionais/limites');
  const [modalAberto, setModalAberto] = useState(false);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [nome, setNome] = useState('');
  const [especialidade, setEspecialidade] = useState('');
  const [comissao, setComissao] = useState('0');
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [erroLimite, setErroLimite] = useState(false);

  const abrirNovo = (): void => {
    setEditandoId(null);
    setNome('');
    setEspecialidade('');
    setComissao('0');
    setErro(null);
    setErroLimite(false);
    setModalAberto(true);
  };

  const abrirEdicao = (p: Profissional): void => {
    setDetalhesAbertos(false);
    setEditandoId(p.id);
    setNome(p.nome);
    setEspecialidade(p.especialidade ?? '');
    setComissao(String(p.comissaoPercentual ?? 0));
    setErro(null);
    setErroLimite(false);
    setModalAberto(true);
  };

  const salvar = async (): Promise<void> => {
    if (salvando) return;
    const rate = Number(comissao);
    if (!/^\d+(?:\.\d{0,2})?$/.test(comissao) || !Number.isFinite(rate) || rate < 0 || rate > 100) {
      setErro('Informe uma comissão de 0 a 100%, com até duas casas decimais.');
      return;
    }
    setSalvando(true);
    setErro(null);
    try {
      const payload = {
        nome,
        especialidade: especialidade.trim() || null,
        comissaoPercentual: rate,
      };
      if (editandoId) {
        await api.put(`/profissionais/${editandoId}`, payload);
      } else {
        await api.post('/profissionais', payload);
      }
      setModalAberto(false);
      toastSuccess(editandoId ? 'Profissional atualizado!' : 'Profissional cadastrado!');
      await Promise.all([carregar(), carregarLimites()]);
    } catch (e) {
      const err = parseApiError(e);
      setErro(err.message);
      setErroLimite(err.code === 'PROFESSIONAL_LIMIT_REACHED');
      if (err.code === 'PROFESSIONAL_LIMIT_REACHED')
        await Promise.all([carregar(), carregarLimites()]);
    } finally {
      setSalvando(false);
    }
  };

  const excluir = async (p: Profissional): Promise<void> => {
    if (!confirm(`Excluir o profissional "${p.nome}"?`)) return;
    try {
      await api.delete(`/profissionais/${p.id}`);
      toastSuccess('Profissional desativado');
      await Promise.all([carregar(), carregarLimites()]);
    } catch (error) {
      toastError(parseApiError(error).message);
    }
  };

  const selecionado = profissionais.find((p) => p.id === selecionadoId) || profissionais[0];

  return (
    <div>
      <PageToolbar>
        <div className="page-heading with-search flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-[#FAFAFA]">Profissionais</h2>
            <p className="mt-1 text-sm text-[#A1A1AA]">Equipe de atendimento do seu negócio</p>
          </div>
          <div className="toolbar-actions flex flex-wrap items-center gap-3">
            <div className="toolbar-search">
              <Input
                aria-label="Buscar profissional"
                placeholder="Buscar profissional..."
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
              />
            </div>
            {podeCriar && (
              <Button
                className="toolbar-primary"
                onClick={abrirNovo}
                disabled={quota?.podeAdicionar === false}
                aria-describedby={quota ? 'professional-quota' : undefined}
              >
                + Novo profissional
              </Button>
            )}
          </div>
        </div>
      </PageToolbar>

      {quota && (
        <section
          aria-label="Uso do plano"
          className="mb-6 rounded-xl border border-white/10 bg-[#111116] p-5"
        >
          <p id="professional-quota" className="text-sm leading-7 text-[#A1A1AA]">
            Plano {PLAN_NAMES[quota.plano]}: {quota.ativos}{' '}
            {quota.ativos === 1 ? 'profissional ativo' : 'profissionais ativos'}
            {quota.limite === null
              ? ' · sem limite de profissionais.'
              : ` de ${quota.limite} ${quota.limite === 1 ? 'permitido' : 'permitidos'}.`}
          </p>
          {!quota.podeAdicionar && (
            <>
              <p className="mt-2 text-sm leading-7 text-amber-200">
                Você atingiu o limite do plano. {quota.plano === 'ENTERPRISE'
                  ? 'Desative um profissional que não faz mais parte da equipe para liberar uma vaga.'
                  : 'Para adicionar outro profissional, desative um cadastro ou altere o plano.'} Os cadastros existentes continuam disponíveis.
              </p>
              {user?.role === 'ADMIN' ? (
                <Link
                  href="/assinatura"
                  className="mt-3 inline-flex min-h-11 items-center text-sm font-medium text-indigo-300 hover:underline"
                >
                  Ver planos e assinatura →
                </Link>
              ) : (
                <p className="mt-2 text-sm text-[#A1A1AA]">
                  Peça ao administrador do negócio para revisar o plano.
                </p>
              )}
            </>
          )}
        </section>
      )}

      <MetricGrid
        items={[
          { label: 'Total Profissionais', value: profissionais.length },
          ...(podeVerComissoes
            ? [
                {
                  label: 'Comissão Média',
                  value: `${profissionais.length ? Math.round(profissionais.reduce((sum, p) => sum + (p.comissaoPercentual || 0), 0) / profissionais.length) : 0}%`,
                },
              ]
            : []),
          {
            label: 'Especialidades',
            value: new Set(profissionais.map((p) => p.especialidade).filter(Boolean)).size,
          },
          ...(podeVerComissoes
            ? [
                {
                  label: 'Comissão Configurada',
                  value: profissionais.filter((p) => p.comissaoPercentual).length,
                },
              ]
            : []),
        ]}
      />
      {erroCarga ? (
        <ErrorState message={erroCarga} onRetry={() => void carregar()} />
      ) : carregando ? (
        <p className="mt-8 text-sm text-[#A1A1AA]">Carregando…</p>
      ) : profissionais.length === 0 ? (
        <EmptyState
          icon="user-tie"
          title="Equipe vazia"
          description="Adicione os profissionais do seu negocio para comecar a agendar"
          action={
            podeCriar ? (
              <Button onClick={abrirNovo} disabled={quota?.podeAdicionar === false}>
                + Novo profissional
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_300px]">
          <div className="grid content-start grid-cols-1 gap-4 sm:grid-cols-2">
            {profissionais
              .filter((p) => p.nome.toLowerCase().includes(busca.toLowerCase()))
              .map((p) => (
                <div
                  key={p.id}
                  className="rounded-xl border border-[rgba(255,255,255,0.08)] bg-[#111116] p-5"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[rgba(99,102,241,0.15)] text-sm font-semibold text-[#A5B4FC]">
                      {p.nome.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <button
                        onClick={() => {
                          setSelecionadoId(p.id);
                          setDetalhesAbertos(true);
                        }}
                        title={p.nome}
                        className="block max-w-full truncate text-left font-medium text-[#FAFAFA] hover:text-[#818CF8]"
                      >
                        {p.nome}
                      </button>
                      <p className="truncate text-xs text-[#71717A]">
                        {p.especialidade ?? 'Sem especialidade'}
                      </p>
                    </div>
                  </div>
                  <div className="mt-4 flex items-center justify-between">
                    {p.agendamentos && p.agendamentos.length > 0 ? (
                      <Badge color="CONFIRMADO">{p.agendamentos.length} atendimentos</Badge>
                    ) : (
                      <Badge>Ativo</Badge>
                    )}
                    <div>
                      {podeEditar && (
                        <Button
                          variant="ghost"
                          className="mr-1 text-xs"
                          onClick={() => abrirEdicao(p)}
                        >
                          Editar
                        </Button>
                      )}
                      {podeExcluir && (
                        <Button
                          variant="ghost"
                          className="text-xs text-red-400"
                          onClick={() => void excluir(p)}
                        >
                          Excluir
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
          </div>
          {selecionado && (
            <ResponsiveDetailPanel
              title="Perfil do Profissional"
              open={detalhesAbertos}
              onClose={() => setDetalhesAbertos(false)}
            >
              <div className="flex flex-col items-center border-b border-white/10 pb-6 text-center">
                <span className="mb-4 flex h-20 w-20 items-center justify-center rounded-full border-2 border-[#6366F1] bg-[#6366F1]/10 text-2xl text-[#818CF8]">
                  {selecionado.nome.slice(0, 1)}
                </span>
                <h3 className="text-xl font-semibold">{selecionado.nome}</h3>
                <p className="mt-2 text-xs text-[#A1A1AA]">
                  {selecionado.especialidade || 'Sem especialidade'}
                </p>
              </div>
              {podeVerComissoes && (
                <>
                  <p className="mt-6 text-xs text-[#71717A]">COMISSÃO</p>
                  <p className="mt-2 text-2xl font-semibold">
                    {selecionado.comissaoPercentual || 0}%
                  </p>
                </>
              )}
              <div className="mt-8 flex flex-wrap gap-3">
                {podeEditar && (
                  <Button variant="secondary" onClick={() => abrirEdicao(selecionado)}>
                    Editar Perfil
                  </Button>
                )}
                <a
                  href={`/agenda?profissionalId=${selecionado.id}`}
                  className="rounded-lg bg-[#6366F1] px-4 py-2 text-sm font-medium"
                >
                  Ver Agenda
                </a>
              </div>
            </ResponsiveDetailPanel>
          )}
        </div>
      )}

      {modalAberto && (
        <Modal
          open
          title={editandoId ? 'Editar profissional' : 'Novo profissional'}
          onClose={() => setModalAberto(false)}
        >
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
            <Input
              label="Comissão sobre serviços (%)"
              type="number"
              min={0}
              max={100}
              step="0.01"
              value={comissao}
              onChange={(event) => setComissao(event.target.value)}
              aria-describedby="professional-commission-help"
            />
            <p id="professional-commission-help" className="text-xs leading-6 text-[#A1A1AA]">
              Aplicada aos atendimentos concluídos a partir da configuração. Valores já registrados
              na conclusão são preservados. Use 0 para não calcular comissão.
            </p>
            {erro && (
              <p role="alert" className="text-sm text-red-400">
                {erro}
              </p>
            )}
            {erroLimite && user?.role === 'ADMIN' && (
              <Link
                href="/assinatura"
                className="inline-flex min-h-11 items-center text-sm text-indigo-300 underline"
              >
                Ver planos e assinatura
              </Link>
            )}
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="secondary" onClick={() => setModalAberto(false)}>
                Cancelar
              </Button>
              <Button onClick={() => void salvar()} loading={salvando} disabled={!nome}>
                Salvar
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
