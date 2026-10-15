'use client';

import { useCallback, useEffect, useState } from 'react';
import { isCancel } from 'axios';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { api } from '@/lib/api';
import { ErrorCodes, parseApiError } from '@/lib/errors';

interface Cliente {
  id: string;
  nome: string;
}
interface Profissional {
  id: string;
  nome: string;
}
interface Servico {
  id: string;
  nome: string;
  duracaoMin: number;
  preco: number;
}

interface Props {
  inline?: boolean;
  onClose: () => void;
  onSuccess: (dataHora?: string) => void;
  /** Cliente pré-selecionado (ex: vindo do drawer de histórico). */
  clienteIdInicial?: string;
  /** Nome do cliente pré-selecionado (para exibição). */
  clienteNomeInicial?: string;
}

export function AgendamentoModal({
  inline = false,
  onClose,
  onSuccess,
  clienteIdInicial,
  clienteNomeInicial,
}: Props) {
  const [step, setStep] = useState(clienteIdInicial ? 2 : 1);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [profissionais, setProfissionais] = useState<Profissional[]>([]);
  const [servicos, setServicos] = useState<Servico[]>([]);

  const [clienteId, setClienteId] = useState(clienteIdInicial ?? '');
  const [nomeClienteSelecionado, setNomeClienteSelecionado] = useState(clienteNomeInicial ?? '');
  const [novoClienteNome, setNovoClienteNome] = useState('');
  const [buscaCliente, setBuscaCliente] = useState('');
  const [profissionalId, setProfissionalId] = useState('');
  const [servicoId, setServicoId] = useState('');
  const [dataHora, setDataHora] = useState('');

  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [carregandoClientes, setCarregandoClientes] = useState(true);
  const [totalClientes, setTotalClientes] = useState(0);
  const [erroClientes, setErroClientes] = useState(false);
  const [tentativaBusca, setTentativaBusca] = useState(0);
  const [carregandoOpcoes, setCarregandoOpcoes] = useState(true);
  const [erroOpcoes, setErroOpcoes] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    setCarregandoClientes(true);
    setErroClientes(false);
    const timer = setTimeout(() => {
      void api
        .get<{ data: Cliente[]; total: number }>('/clientes', {
          signal: controller.signal,
          params: { search: buscaCliente.trim() || undefined, limit: 50 },
        })
        .then(({ data }) => {
          if (!controller.signal.aborted) {
            setClientes(data.data);
            setTotalClientes(data.total);
          }
        })
        .catch((error) => {
          if (!isCancel(error)) setErroClientes(true);
        })
        .finally(() => {
          if (!controller.signal.aborted) setCarregandoClientes(false);
        });
    }, 250);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [buscaCliente, tentativaBusca]);

  const carregarOpcoes = useCallback(async (signal?: AbortSignal) => {
    setCarregandoOpcoes(true);
    setErroOpcoes(false);
    try {
      const [profissionais, servicos] = await Promise.all([
        api.get<Profissional[]>('/profissionais', { signal }),
        api.get<Servico[]>('/servicos', { signal }),
      ]);
      if (!signal?.aborted) {
        setProfissionais(profissionais.data);
        setServicos(servicos.data);
      }
    } catch (error) {
      if (!isCancel(error)) setErroOpcoes(true);
    } finally {
      if (!signal?.aborted) setCarregandoOpcoes(false);
    }
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    void carregarOpcoes(controller.signal);
    return () => controller.abort();
  }, [carregarOpcoes]);

  const servico = servicos.find((s) => s.id === servicoId);
  const fechar = () => {
    if (!salvando) onClose();
  };

  const salvar = async (): Promise<void> => {
    if (salvando) return;
    setErro(null);
    if (
      !Number.isFinite(new Date(dataHora).getTime()) ||
      new Date(dataHora).getTime() <= Date.now()
    ) {
      setErro('Escolha um horário válido no futuro.');
      return;
    }
    setSalvando(true);
    try {
      let cId = clienteId;
      if (!cId && novoClienteNome.trim()) {
        const r = await api.post<Cliente>('/clientes', { nome: novoClienteNome.trim() });
        cId = r.data.id;
        setClienteId(cId);
        setNomeClienteSelecionado(r.data.nome);
        setNovoClienteNome('');
      }
      await api.post('/agendamentos', {
        clienteId: cId,
        profissionalId,
        servicoId,
        dataHora: new Date(dataHora).toISOString(),
      });
      onSuccess(dataHora);
    } catch (e) {
      const err = parseApiError(e);
      // Tratamento programático: código BUSY_PROFESSIONAL dá mensagem
      // específica e sugere outro horário. Sem o code, cai no message genérico.
      if (err.code === ErrorCodes.BUSY_PROFESSIONAL) {
        setErro('Profissional já tem agendamento nesse horário. Escolha outro horário.');
      } else if (err.code === ErrorCodes.DATETIME_IN_PAST) {
        setErro('Escolha um horário no futuro.');
      } else {
        setErro(err.message || 'Erro ao criar agendamento');
      }
    } finally {
      setSalvando(false);
    }
  };

  const conteudo = (
    <>
      {nomeClienteSelecionado && (
        <div className="mt-4 flex items-center gap-2 rounded-lg border border-[rgba(99,102,241,0.30)] bg-[rgba(99,102,241,0.10)] px-3 py-2">
          <span className="text-sm font-medium text-[#A5B4FC]">Cliente:</span>
          <span className="text-sm text-[#FAFAFA]">{nomeClienteSelecionado}</span>
        </div>
      )}

      {step === 1 && (
        <div className="mt-4 space-y-4">
          <Input
            label="Buscar cliente"
            value={buscaCliente}
            onChange={(e) => setBuscaCliente(e.target.value)}
            placeholder="Digite o nome"
          />
          {carregandoClientes && (
            <p role="status" className="text-sm text-[#A1A1AA]">
              Buscando clientes…
            </p>
          )}
          {erroClientes && (
            <div role="alert" className="text-sm text-red-300">
              Não foi possível buscar os clientes.{' '}
              <Button variant="ghost" onClick={() => setTentativaBusca((v) => v + 1)}>
                Tentar novamente
              </Button>
            </div>
          )}
          {!carregandoClientes && !erroClientes && !clientes.length && (
            <p className="text-sm text-[#A1A1AA]">
              Nenhum cliente encontrado. Você pode cadastrar abaixo.
            </p>
          )}
          {!carregandoClientes && totalClientes > clientes.length && (
            <p className="text-xs text-[#A1A1AA]">
              Mostrando {clientes.length} de {totalClientes}. Busque pelo nome ou telefone para
              encontrar outros clientes.
            </p>
          )}
          <div className="max-h-40 space-y-1 overflow-y-auto">
            {!carregandoClientes &&
              !erroClientes &&
              clientes.map((c) => (
                <button
                  key={c.id}
                  aria-pressed={clienteId === c.id}
                  onClick={() => {
                    setClienteId(c.id);
                    setNomeClienteSelecionado(c.nome);
                    setNovoClienteNome('');
                  }}
                  className={`w-full rounded-lg px-3 py-2 text-left text-sm ${
                    clienteId === c.id
                      ? 'bg-[rgba(99,102,241,0.10)] text-[#A5B4FC]'
                      : 'text-[#E4E4E7] hover:bg-[#18181F]'
                  }`}
                >
                  {c.nome}
                </button>
              ))}
          </div>
          <div>
            <p className="mb-1 text-sm font-medium text-[#E4E4E7]">Ou cadastre novo</p>
            <Input
              label="Nome do novo cliente"
              minLength={2}
              maxLength={120}
              value={novoClienteNome}
              onChange={(e) => {
                setNovoClienteNome(e.target.value);
                setClienteId('');
                setNomeClienteSelecionado('');
              }}
              placeholder="Nome do novo cliente"
            />
          </div>
          <Button
            onClick={() => setStep(2)}
            disabled={!clienteId && novoClienteNome.trim().length < 2}
          >
            Próximo
          </Button>
        </div>
      )}

      {step === 2 && (
        <div className="mt-4 space-y-4">
          {carregandoOpcoes && (
            <p role="status" className="text-sm text-[#A1A1AA]">
              Carregando equipe e serviços…
            </p>
          )}
          {erroOpcoes && (
            <div role="alert" className="text-sm text-red-300">
              Não foi possível carregar a equipe e os serviços.{' '}
              <Button variant="ghost" onClick={() => void carregarOpcoes()}>
                Tentar novamente
              </Button>
            </div>
          )}
          {!carregandoOpcoes && !erroOpcoes && (!profissionais.length || !servicos.length) && (
            <p role="status" className="text-sm text-amber-200">
              Cadastre pelo menos um profissional e um serviço ativo antes de agendar. Se você não
              administra o Nexly, peça esse cadastro ao responsável.
            </p>
          )}
          <div>
            <label
              htmlFor="agendamento-profissional"
              className="mb-1 block text-sm font-medium text-[#E4E4E7]"
            >
              Profissional
            </label>
            <select
              id="agendamento-profissional"
              value={profissionalId}
              onChange={(e) => setProfissionalId(e.target.value)}
              className="w-full rounded-lg border border-[rgba(255,255,255,0.10)] px-3 py-2 text-sm"
            >
              <option value="">Selecione</option>
              {profissionais.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nome}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label
              htmlFor="agendamento-servico"
              className="mb-1 block text-sm font-medium text-[#E4E4E7]"
            >
              Serviço
            </label>
            <select
              id="agendamento-servico"
              value={servicoId}
              onChange={(e) => setServicoId(e.target.value)}
              className="w-full rounded-lg border border-[rgba(255,255,255,0.10)] px-3 py-2 text-sm"
            >
              <option value="">Selecione</option>
              {servicos.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.nome} — {s.duracaoMin} min · R$ {Number(s.preco).toFixed(2)}
                </option>
              ))}
            </select>
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => setStep(1)}>
              Voltar
            </Button>
            <Button onClick={() => setStep(3)} disabled={!profissionalId || !servicoId}>
              Próximo
            </Button>
          </div>
        </div>
      )}

      {step === 3 && (
        <form
          className="mt-4 space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            void salvar();
          }}
        >
          <Input
            label="Data e hora"
            type="datetime-local"
            required
            min={new Date(Date.now() - new Date().getTimezoneOffset() * 60000)
              .toISOString()
              .slice(0, 16)}
            value={dataHora}
            onChange={(e) => setDataHora(e.target.value)}
          />
          {servico && (
            <p className="text-sm text-[#A1A1AA]">
              Duração: {servico.duracaoMin} min · R$ {Number(servico.preco).toFixed(2)}
            </p>
          )}
          {erro && (
            <p role="alert" className="text-sm text-red-300">
              {erro}
            </p>
          )}
          <div className="flex gap-2">
            <Button
              type="button"
              disabled={salvando}
              variant="secondary"
              onClick={() => setStep(2)}
            >
              Voltar
            </Button>
            <Button type="submit" loading={salvando} disabled={!dataHora}>
              Salvar
            </Button>
          </div>
        </form>
      )}
    </>
  );
  return inline ? (
    <aside
      aria-label="Novo agendamento"
      className="min-w-0 rounded-xl border border-white/10 bg-[#111116] p-5 xl:w-[300px] xl:shrink-0"
    >
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-lg font-semibold">Novo agendamento</h3>
        <button
          type="button"
          aria-label="Fechar novo agendamento"
          disabled={salvando}
          onClick={fechar}
        >
          ✕
        </button>
      </div>
      {conteudo}
    </aside>
  ) : (
    <Modal open onClose={fechar} title="Novo agendamento">
      {conteudo}
    </Modal>
  );
}
