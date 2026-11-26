'use client';

import { useEffect, useRef, useState } from 'react';
import { hasPermission } from '@nexly/shared';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { CadastroRapido } from '@/components/gestao/CadastroRapido';

interface Cliente {
  id: string;
  nome: string;
}

export function ClienteSelect({
  value,
  onChange,
}: {
  value: string;
  onChange: (id: string) => void;
}) {
  const { user } = useAuth();
  const [cadastrando, setCadastrando] = useState(false);
  const [criado, setCriado] = useState(false);
  const seletor = useRef<HTMLSelectElement>(null);
  const fecharCadastro = () => {
    setCadastrando(false);
    seletor.current?.focus();
  };
  const [busca, setBusca] = useState('');
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [selecionado, setSelecionado] = useState<Cliente | null>(null);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [tentativa, setTentativa] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(false);
    const timer = setTimeout(() => {
      void api
        .get<{ data: Cliente[]; total: number }>('/clientes', {
          params: { search: busca.trim() || undefined, limit: 50 },
          signal: controller.signal,
        })
        .then(({ data }) => {
          if (controller.signal.aborted) return;
          setClientes(data.data);
          setTotal(data.total);
        })
        .catch(() => {
          if (!controller.signal.aborted) setError(true);
        })
        .finally(() => {
          if (!controller.signal.aborted) setLoading(false);
        });
    }, 250);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [busca, tentativa]);

  const opcoes = loading || error ? [] : clientes;
  const preservarSelecionado =
    value && selecionado?.id === value && !opcoes.some((c) => c.id === value);
  return (
    <div className="space-y-2">
      <Input
        label="Buscar cliente"
        placeholder="Nome, telefone ou e-mail"
        value={busca}
        onChange={(e) => setBusca(e.target.value)}
      />
      <label htmlFor="pdv-cliente" className="block text-sm font-medium text-[#D4D4D8]">
        Cliente (opcional)
      </label>
      <select
        ref={seletor}
        id="pdv-cliente"
        value={value}
        onChange={(e) => {
          const id = e.target.value;
          setCriado(false);
          setSelecionado(clientes.find((c) => c.id === id) ?? null);
          onChange(id);
        }}
        className="w-full min-w-0 rounded-lg border border-white/10 bg-[#111116] px-3 py-2 text-sm text-[#FAFAFA] focus:outline-none focus:ring-2 focus:ring-[#6366F1]"
      >
        <option value="">Venda sem cliente identificado</option>
        {preservarSelecionado && <option value={selecionado.id}>{selecionado.nome}</option>}
        {opcoes.map((c) => (
          <option key={c.id} value={c.id}>
            {c.nome}
          </option>
        ))}
      </select>
      {loading && (
        <p role="status" className="text-xs text-[#A1A1AA]">
          Buscando clientes…
        </p>
      )}
      {error && (
        <p role="alert" className="text-sm text-red-200">
          Não foi possível buscar os clientes.{' '}
          <button type="button" className="underline" onClick={() => setTentativa((v) => v + 1)}>
            Tentar carregar clientes novamente
          </button>
        </p>
      )}
      {!loading && !error && (
        <p role="status" className="text-xs text-[#A1A1AA]">
          {total === 0
            ? 'Nenhum cliente encontrado. Você pode continuar sem identificar o cliente.'
            : total > clientes.length
              ? `Mostrando ${clientes.length} de ${total}. Use a busca para encontrar qualquer cliente.`
              : `${total} ${total === 1 ? 'cliente encontrado' : 'clientes encontrados'}.`}
        </p>
      )}
      {hasPermission(user?.role, 'clientes:create') && (
        <Button
          type="button"
          variant="secondary"
          aria-expanded={cadastrando}
          onClick={() => {
            setCriado(false);
            setCadastrando(true);
          }}
        >
          + Cadastrar cliente
        </Button>
      )}
      {cadastrando && (
        <CadastroRapido
          recurso="clientes"
          onCancel={fecharCadastro}
          onCreated={(cliente) => {
            setSelecionado(cliente);
            onChange(cliente.id);
            setTentativa((v) => v + 1);
            setCriado(true);
            fecharCadastro();
          }}
        />
      )}
      {criado && value === selecionado?.id && (
        <p role="status" className="text-sm text-emerald-300">
          Cliente cadastrado e selecionado.
        </p>
      )}
    </div>
  );
}
