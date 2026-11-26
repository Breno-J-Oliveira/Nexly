'use client';

import { useEffect, useId, useRef, useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { api } from '@/lib/api';
import { parseApiError } from '@/lib/errors';

type Registro = { id: string; nome: string };
type Cadastros = {
  clientes: Registro;
  profissionais: Registro;
  servicos: Registro & { duracaoMin: number; preco: number };
};

const nomes = {
  clientes: 'cliente',
  profissionais: 'profissional',
  servicos: 'serviço',
} as const;

export function CadastroRapido<T extends keyof Cadastros>({
  recurso,
  onCancel,
  onCreated,
}: {
  recurso: T;
  onCancel: () => void;
  onCreated: (registro: Cadastros[T]) => void;
}) {
  const tituloId = useId();
  const nomeRef = useRef<HTMLInputElement>(null);
  const emAndamento = useRef(false);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');
  const entidade = nomes[recurso];
  useEffect(() => nomeRef.current?.focus(), []);

  async function salvar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (emAndamento.current) return;
    const dados = new FormData(event.currentTarget);
    const nomeDigitado = dados.get('nome');
    const telefoneDigitado = dados.get('telefone');
    const nome = typeof nomeDigitado === 'string' ? nomeDigitado.trim() : '';
    const telefone = typeof telefoneDigitado === 'string' ? telefoneDigitado.trim() : '';
    if (nome.length < 2) {
      setErro('Digite um nome com pelo menos dois caracteres.');
      return;
    }
    emAndamento.current = true;
    setSalvando(true);
    setErro('');
    try {
      const { data } = await api.post<Cadastros[T]>(`/${recurso}`, {
        nome,
        ...(telefone ? { telefone } : {}),
        ...(recurso === 'servicos'
          ? { duracaoMin: Number(dados.get('duracaoMin')), preco: Number(dados.get('preco')) }
          : {}),
      });
      onCreated(data);
    } catch (error) {
      setErro(parseApiError(error).message || 'Não foi possível salvar. Tente novamente.');
    } finally {
      emAndamento.current = false;
      setSalvando(false);
    }
  }

  return (
    <form
      aria-labelledby={tituloId}
      className="space-y-3 rounded-lg border border-white/10 bg-white/[0.025] p-3"
      onSubmit={(event) => void salvar(event)}
    >
      <h5 id={tituloId} className="text-sm font-semibold text-[#FAFAFA]">
        Cadastrar {entidade}
      </h5>
      <fieldset disabled={salvando} className="min-w-0 space-y-3">
        <Input
          ref={nomeRef}
          label={`Nome do ${entidade}`}
          name="nome"
          required
          minLength={2}
          maxLength={120}
        />
        {recurso === 'clientes' && (
          <Input
            label="Telefone (opcional)"
            name="telefone"
            type="tel"
            minLength={8}
            maxLength={20}
          />
        )}
        {recurso === 'servicos' && (
          <>
            <Input
              label="Duração em minutos"
              name="duracaoMin"
              type="number"
              min={5}
              max={480}
              defaultValue={30}
              required
            />
            <Input
              label="Preço (R$)"
              name="preco"
              type="number"
              min={0}
              max={99999999.99}
              step="0.01"
              required
            />
          </>
        )}
      </fieldset>
      {erro && (
        <p role="alert" className="text-sm text-red-300">
          {erro}
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        <Button type="submit" loading={salvando}>
          Salvar e selecionar
        </Button>
        <Button type="button" variant="secondary" disabled={salvando} onClick={onCancel}>
          Voltar à seleção
        </Button>
      </div>
    </form>
  );
}
