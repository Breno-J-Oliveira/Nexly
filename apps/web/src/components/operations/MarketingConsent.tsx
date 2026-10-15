'use client';
import { useState, FormEvent } from 'react';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { Options } from './config';
import { operationError } from './errors';
export function MarketingConsent({
  options,
  onError,
}: {
  options: Options;
  onError: (s: string) => void;
}) {
  const [clienteId, setCliente] = useState(''),
    [busca, setBusca] = useState(''),
    [clientes, setClientes] = useState<Options['clientes'] | null>(null),
    [evidencia, setEvidencia] = useState(''),
    [autorizado, setAutorizado] = useState(false),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState('');
  async function save(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMessage('');
    try {
      await api.put('/operacoes/consentimentos', { clienteId, autorizado, evidencia });
      setMessage(autorizado ? 'Autorização registrada.' : 'Autorização revogada.');
      setEvidencia('');
      setAutorizado(false);
    } catch (e) {
      onError(operationError(e));
    } finally {
      setBusy(false);
    }
  }
  const control = 'mt-2 w-full rounded-lg border border-white/10 bg-[#18181F] p-3 text-sm';
  return (
    <details className="rounded-xl border border-white/10 bg-[#111116] p-5">
      <summary className="cursor-pointer text-sm font-medium">
        Registrar ou revogar autorização de marketing
      </summary>
      <p className="mt-3 text-sm text-[#A1A1AA]">
        Registre somente autorizações obtidas do cliente. Informe quando e como autorizou ou pediu a
        revogação. Nenhum cliente é incluído automaticamente.
      </p>
      <form
        className="mt-4 grid gap-4 sm:grid-cols-2"
        onSubmit={(e) => {
          void save(e);
        }}
      >
        <label className="text-sm">
          Buscar cliente
          <input
            className={control}
            value={busca}
            maxLength={100}
            onChange={(e) => setBusca(e.target.value)}
          />
        </label>
        <Button
          type="button"
          variant="secondary"
          className="self-end"
          onClick={() => {
            void (async () => {
              try {
                setClientes(
                  (await api.get<Options>('/operacoes/opcoes', { params: { busca } })).data
                    .clientes,
                );
              } catch (e) {
                onError(operationError(e));
              }
            })();
          }}
        >
          Buscar contatos
        </Button>
        <div className="text-sm">
          <label htmlFor="marketing-cliente">Cliente</label>
          <select
            id="marketing-cliente"
            className={control}
            value={clienteId}
            required
            onChange={(e) => setCliente(e.target.value)}
          >
            <option value="">Selecione (até 100 por busca)</option>
            {(clientes || options.clientes).map((c) => (
              <option key={c.id} value={c.id}>
                {c.nome}
              </option>
            ))}
          </select>
        </div>
        <label className="text-sm">
          Origem e data da autorização ou revogação
          <input
            className={control}
            minLength={10}
            maxLength={500}
            required
            value={evidencia}
            onChange={(e) => setEvidencia(e.target.value)}
          />
        </label>
        <label className="text-sm">
          <input
            type="checkbox"
            className="mr-2 accent-[#6366F1]"
            checked={autorizado}
            onChange={(e) => setAutorizado(e.target.checked)}
          />
          Cliente autorizou receber campanhas
        </label>
        <Button loading={busy} type="submit">
          {autorizado ? 'Registrar autorização' : 'Registrar revogação'}
        </Button>
        {message && (
          <p role="status" className="text-sm text-emerald-300">
            {message}
          </p>
        )}
      </form>
    </details>
  );
}
