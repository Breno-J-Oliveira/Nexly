'use client';

import { useEffect, useState } from 'react';
import { PendenciaEstoque } from '@nexly/shared';
import { useApi } from '@/lib/useApi';
import { api } from '@/lib/api';
import { formatarDataHora } from '@/lib/format';
import { Button } from './Button';
import { ErrorState } from './ErrorState';
import { Pagination } from './Pagination';
import { Modal } from './Modal';
import { Input } from './Input';
import { toastSuccess } from './Toaster';

interface AtendimentoPendente {
  id: string;
  dataHora: string;
  pendenciasEstoque: PendenciaEstoque[];
}
export function PendingStockConsumptions({
  canManage,
  onStockChange,
}: {
  canManage: boolean;
  onStockChange: () => Promise<void>;
}) {
  const [page, setPage] = useState(1),
    [busy, setBusy] = useState<string | null>(null),
    [error, setError] = useState('');
  const [cancelando, setCancelando] = useState<AtendimentoPendente | null>(null),
    [motivo, setMotivo] = useState('');
  const result = useApi<{ data: AtendimentoPendente[]; total: number }>('/estoque/pendencias', {
    params: { page, limit: 5 },
  });
  useEffect(() => {
    const last = Math.max(1, Math.ceil((result.data?.total ?? 0) / 5));
    if (!result.loading && result.data && page > last) setPage(last);
  }, [page, result.data, result.loading]);
  const run = async (item: AtendimentoPendente, action: 'reprocessar' | 'cancelar') => {
    if (busy) return;
    setBusy(item.id);
    setError('');
    try {
      const { data } = await api.post<{ pendenciasEstoque: PendenciaEstoque[] }>(
        `/estoque/pendencias/${item.id}/${action}`,
        action === 'cancelar' ? { motivo } : {},
      );
      if (data.pendenciasEstoque.length)
        setError(
          'Ainda há insumos sem saldo ou indisponíveis. Verifique os produtos e tente reprocessar após regularizar o estoque.',
        );
      else
        toastSuccess(
          action === 'cancelar'
            ? 'Pendência desconsiderada com motivo registrado.'
            : 'Baixa de estoque regularizada!',
        );
      setCancelando(null);
      setMotivo('');
      await Promise.all([result.refetch(), onStockChange()]);
    } catch (e) {
      const r = e as { response?: { data?: { message?: string } } };
      setError(
        r.response?.data?.message ?? 'Não foi possível atualizar esta pendência. Tente novamente.',
      );
    } finally {
      setBusy(null);
    }
  };
  if (!result.loading && !result.error && !result.data?.total) return null;
  return (
    <section
      aria-labelledby="stock-pending-title"
      className="mb-6 rounded-xl border border-amber-400/20 bg-amber-500/5 p-4 sm:p-5"
    >
      <h3 id="stock-pending-title" className="font-semibold text-amber-200">
        Baixas de atendimento pendentes{result.data ? ` (${result.data.total})` : ''}
      </h3>
      <p className="mt-2 text-sm leading-6 text-[#A1A1AA]">
        Os atendimentos foram concluídos. Regularize o saldo ou a disponibilidade dos insumos e
        reprocesse a baixa. Itens já descontados não serão descontados novamente.
      </p>
      {result.error ? (
        <ErrorState
          message="Não foi possível consultar as baixas pendentes"
          onRetry={() => void result.refetch()}
        />
      ) : result.loading ? (
        <p role="status" className="mt-4 text-sm text-[#A1A1AA]">
          Consultando pendências…
        </p>
      ) : (
        <ul className="mt-4 space-y-3">
          {result.data?.data.map((item) => (
            <li key={item.id} className="rounded-xl border border-white/10 bg-[#111116] p-4">
              <p className="text-sm font-medium text-[#FAFAFA]">
                Atendimento #{item.id.slice(0, 8)}
              </p>
              <p className="mt-1 text-xs text-[#A1A1AA]">{formatarDataHora(item.dataHora)}</p>
              <ul className="mt-3 space-y-1 text-sm text-amber-100">
                {item.pendenciasEstoque.map((p) => (
                  <li key={p.produtoId} className="break-words">
                    {p.quantidade} × {p.nomeProduto}
                  </li>
                ))}
              </ul>
              {canManage && (
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button
                    type="button"
                    loading={busy === item.id}
                    disabled={busy !== null}
                    onClick={() => void run(item, 'reprocessar')}
                    aria-label={`Reprocessar baixa do atendimento ${item.id.slice(0, 8)}`}
                  >
                    Reprocessar baixa
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    disabled={busy !== null}
                    onClick={() => {
                      setError('');
                      setCancelando(item);
                      setMotivo('');
                    }}
                  >
                    Desconsiderar baixa
                  </Button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
      {!!result.data?.total && (
        <Pagination
          page={page}
          total={result.data.total}
          limit={5}
          loading={result.loading || !!busy}
          onChange={setPage}
        />
      )}
      {error && !cancelando && (
        <p role="alert" className="mt-4 text-sm text-red-300">
          {error}
        </p>
      )}
      <Modal
        open={!!cancelando}
        title="Desconsiderar baixa pendente"
        onClose={() => {
          if (!busy) setCancelando(null);
        }}
      >
        <p className="text-sm leading-6 text-[#A1A1AA]">
          Use esta opção se o insumo não foi utilizado ou a baixa já foi corrigida de outra forma. O
          saldo atual será preservado e o motivo ficará no histórico de atividades.
        </p>
        <form
          className="mt-4 space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            if (cancelando) void run(cancelando, 'cancelar');
          }}
        >
          <Input
            label="Motivo para desconsiderar"
            required
            minLength={3}
            maxLength={500}
            value={motivo}
            onChange={(event) => setMotivo(event.target.value)}
          />
          {error && (
            <p role="alert" className="text-sm text-red-300">
              {error}
            </p>
          )}
          <div className="flex flex-wrap gap-3">
            <Button
              type="button"
              variant="secondary"
              disabled={!!busy}
              onClick={() => setCancelando(null)}
            >
              Manter pendência
            </Button>
            <Button
              type="submit"
              variant="danger"
              loading={!!busy}
              disabled={motivo.trim().length < 3}
            >
              Confirmar e registrar motivo
            </Button>
          </div>
        </form>
      </Modal>
    </section>
  );
}
