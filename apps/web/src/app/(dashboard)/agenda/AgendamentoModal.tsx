'use client';

import { useEffect, useState } from 'react';
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
  onClose: () => void;
  onSuccess: () => void;
}

export function AgendamentoModal({ onClose, onSuccess }: Props) {
  const [step, setStep] = useState(1);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [profissionais, setProfissionais] = useState<Profissional[]>([]);
  const [servicos, setServicos] = useState<Servico[]>([]);

  const [clienteId, setClienteId] = useState('');
  const [novoClienteNome, setNovoClienteNome] = useState('');
  const [buscaCliente, setBuscaCliente] = useState('');
  const [profissionalId, setProfissionalId] = useState('');
  const [servicoId, setServicoId] = useState('');
  const [dataHora, setDataHora] = useState('');

  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    api
      .get<{ data: Cliente[] }>('/clientes', { params: { limit: 50 } })
      .then((r) => setClientes(r.data.data))
      .catch(() => undefined);
    api
      .get<Profissional[]>('/profissionais')
      .then((r) => setProfissionais(r.data))
      .catch(() => undefined);
    api
      .get<Servico[]>('/servicos')
      .then((r) => setServicos(r.data))
      .catch(() => undefined);
  }, []);

  const servico = servicos.find((s) => s.id === servicoId);

  const clientesFiltrados = clientes.filter((c) =>
    c.nome.toLowerCase().includes(buscaCliente.toLowerCase()),
  );

  const salvar = async (): Promise<void> => {
    setSalvando(true);
    setErro(null);
    try {
      let cId = clienteId;
      if (!cId && novoClienteNome) {
        const r = await api.post<Cliente>('/clientes', { nome: novoClienteNome });
        cId = r.data.id;
      }
      await api.post('/agendamentos', {
        clienteId: cId,
        profissionalId,
        servicoId,
        dataHora: new Date(dataHora).toISOString(),
      });
      onSuccess();
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-lg rounded-2xl bg-zinc-900 p-6">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-zinc-100">Novo agendamento</h3>
          <button onClick={onClose} className="text-zinc-500 hover:text-zinc-300">
            ✕
          </button>
        </div>

        {step === 1 && (
          <div className="mt-4 space-y-4">
            <Input
              label="Buscar cliente"
              value={buscaCliente}
              onChange={(e) => setBuscaCliente(e.target.value)}
              placeholder="Digite o nome"
            />
            <div className="max-h-40 space-y-1 overflow-y-auto">
              {clientesFiltrados.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setClienteId(c.id)}
                  className={`w-full rounded-lg px-3 py-2 text-left text-sm ${
                    clienteId === c.id
                      ? 'bg-primary-500/10 text-primary-300'
                      : 'text-zinc-200 hover:bg-zinc-800'
                  }`}
                >
                  {c.nome}
                </button>
              ))}
            </div>
            <div>
              <p className="mb-1 text-sm font-medium text-zinc-200">Ou cadastre novo</p>
              <Input
                value={novoClienteNome}
                onChange={(e) => setNovoClienteNome(e.target.value)}
                placeholder="Nome do novo cliente"
              />
            </div>
            <Button onClick={() => setStep(2)} disabled={!clienteId && !novoClienteNome}>
              Próximo
            </Button>
          </div>
        )}

        {step === 2 && (
          <div className="mt-4 space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-zinc-200">Profissional</label>
              <select
                value={profissionalId}
                onChange={(e) => setProfissionalId(e.target.value)}
                className="w-full rounded-lg border border-zinc-700 px-3 py-2 text-sm"
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
              <label className="mb-1 block text-sm font-medium text-zinc-200">Serviço</label>
              <select
                value={servicoId}
                onChange={(e) => setServicoId(e.target.value)}
                className="w-full rounded-lg border border-zinc-700 px-3 py-2 text-sm"
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
          <div className="mt-4 space-y-4">
            <Input
              label="Data e hora"
              type="datetime-local"
              value={dataHora}
              onChange={(e) => setDataHora(e.target.value)}
            />
            {servico && (
              <p className="text-sm text-zinc-400">
                Duração: {servico.duracaoMin} min · R$ {Number(servico.preco).toFixed(2)}
              </p>
            )}
            {erro && <p className="text-sm text-red-400">{erro}</p>}
            <div className="flex gap-2">
              <Button variant="secondary" onClick={() => setStep(2)}>
                Voltar
              </Button>
              <Button onClick={() => void salvar()} loading={salvando} disabled={!dataHora}>
                Salvar
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
