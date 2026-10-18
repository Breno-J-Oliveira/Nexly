'use client';
import Link from 'next/link';
import { useState } from 'react';
import { api } from '@/lib/api';
import { useApi } from '@/lib/useApi';
import { formatarMoeda, formatarDataHora } from '@/lib/format';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import {
  ActionStatus,
  LoadState,
  Panel,
  SelectField,
  Titulo,
  useAction,
} from '@/components/gestao/GestaoUI';
type Dados = {
  filiais: { id: string; nome: string; ativa: boolean }[];
  produtos: { id: string; nome: string; sku: string; estoqueAtual: number }[];
  saldos: { filialId: string; produtoId: string; quantidade: number }[];
  transferencias: {
    id: string;
    produtoId: string;
    origemId: string | null;
    destinoId: string | null;
    quantidade: number;
    motivo: string;
    createdAt: string;
  }[];
  vendas: { filialId: string | null; _sum: { total: number }; _count: { _all: number } }[];
};
export default function EstoqueFiliaisPage() {
  const remote = useApi<Dados>('/gestao/filiais'),
    action = useAction();
  const [origem, setOrigem] = useState(''),
    [destino, setDestino] = useState(''),
    [produto, setProduto] = useState(''),
    [quantidade, setQuantidade] = useState('1'),
    [motivo, setMotivo] = useState(''),
    [chave, setChave] = useState('');
  const data = remote.data;
  const unidade = (id: string | null) =>
    data?.filiais.find((f) => f.id === id)?.nome ?? (id ? 'Unidade indisponível' : 'Central');
  function mudar() {
    setChave(crypto.randomUUID());
  }
  const disponivel = origem
    ? (data?.saldos.find((s) => s.filialId === origem && s.produtoId === produto)?.quantidade ?? 0)
    : (data?.produtos.find((p) => p.id === produto)?.estoqueAtual ?? 0);
  return (
    <div className="space-y-6">
      <Titulo
        nome="Estoque por unidade"
        descricao="A central e cada filial têm saldos independentes. Uma transferência retira produtos da origem e os adiciona ao destino na mesma operação. Vendas de uma filial utilizam somente o estoque dela."
      />
      <LoadState loading={remote.loading} error={remote.error} retry={remote.refetch} />
      <ActionStatus {...action} />
      {data && !remote.error && (
        <>
          <Panel title="Transferir produtos">
            <form
              className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
              onSubmit={(e) => {
                e.preventDefault();
                const key = chave || crypto.randomUUID();
                setChave(key);
                void action.run(async () => {
                  await api.post('/gestao/transferencias', {
                    chave: key,
                    produtoId: produto,
                    origemId: origem || undefined,
                    destinoId: destino || undefined,
                    quantidade: Number(quantidade),
                    motivo,
                  });
                  setChave('');
                  setMotivo('');
                  await remote.refetch();
                }, 'Transferência concluída. Os dois saldos foram atualizados.');
              }}
            >
              <SelectField
                label="Origem"
                value={origem}
                onChange={(e) => {
                  setOrigem(e.target.value);
                  mudar();
                }}
              >
                <option value="">Central</option>
                {data.filiais
                  .filter((f) => f.ativa)
                  .map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.nome}
                    </option>
                  ))}
              </SelectField>
              <SelectField
                label="Destino"
                value={destino}
                onChange={(e) => {
                  setDestino(e.target.value);
                  mudar();
                }}
              >
                <option value="">Central</option>
                {data.filiais
                  .filter((f) => f.ativa)
                  .map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.nome}
                    </option>
                  ))}
              </SelectField>
              <SelectField
                required
                label="Produto"
                value={produto}
                onChange={(e) => {
                  setProduto(e.target.value);
                  mudar();
                }}
              >
                <option value="">Selecione</option>
                {data.produtos.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nome} · {p.sku}
                  </option>
                ))}
              </SelectField>
              <Input
                required
                label={`Quantidade (disponível: ${disponivel})`}
                type="number"
                min="1"
                max={disponivel}
                step="1"
                value={quantidade}
                onChange={(e) => {
                  setQuantidade(e.target.value);
                  mudar();
                }}
              />
              <Input
                required
                label="Motivo"
                minLength={10}
                maxLength={500}
                value={motivo}
                onChange={(e) => {
                  setMotivo(e.target.value);
                  mudar();
                }}
              />
              <Button
                type="submit"
                className="self-end"
                loading={action.busy}
                disabled={!produto || origem === destino || Number(quantidade) > disponivel}
              >
                Confirmar transferência
              </Button>
            </form>
            {data.filiais.length === 0 && (
              <p className="mt-4 text-sm text-[#A1A1AA]">
                Primeiro{' '}
                <Link className="text-[#A5B4FC] underline" href="/filiais">
                  cadastre uma filial
                </Link>{' '}
                para distribuir seu estoque.
              </p>
            )}
          </Panel>
          <Panel title="Saldos disponíveis">
            <p className="mb-4 text-sm text-[#A1A1AA]">
              Exibindo até 500 produtos ativos. Para repor a central, use as entradas no módulo
              Estoque.
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <caption className="sr-only">
                  Saldo de cada produto na central e nas filiais
                </caption>
                <thead>
                  <tr>
                    <th className="p-3" scope="col">
                      Produto
                    </th>
                    <th className="p-3" scope="col">
                      Central
                    </th>
                    {data.filiais.map((f) => (
                      <th key={f.id} className="p-3" scope="col">
                        {f.nome}
                        {!f.ativa ? ' (inativa)' : ''}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.produtos.map((p) => (
                    <tr key={p.id} className="border-t border-white/10">
                      <th scope="row" className="p-3 font-normal">
                        {p.nome}
                        <span className="block text-xs text-[#A1A1AA]">{p.sku}</span>
                      </th>
                      <td className="p-3">{p.estoqueAtual}</td>
                      {data.filiais.map((f) => (
                        <td key={f.id} className="p-3">
                          {data.saldos.find((s) => s.filialId === f.id && s.produtoId === p.id)
                            ?.quantidade ?? 0}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>
          <Panel title="Vendas acumuladas por unidade">
            <p className="mb-4 text-sm text-[#A1A1AA]">
              Somente vendas concluídas. Estornos são excluídos; não representa dinheiro recebido.
            </p>
            <div className="grid gap-4 sm:grid-cols-3">
              {data.vendas.map((v) => (
                <div key={v.filialId ?? 'central'} className="rounded-lg bg-[#18181F] p-4">
                  <h3>{unidade(v.filialId)}</h3>
                  <p className="mt-2 text-xl font-semibold">
                    {formatarMoeda(Number(v._sum.total ?? 0))}
                  </p>
                  <p className="mt-1 text-xs text-[#A1A1AA]">{v._count._all} vendas</p>
                </div>
              ))}
            </div>
          </Panel>
          <Panel title="Últimas 50 transferências">
            <div className="space-y-4">
              {!data.transferencias.length && (
                <p className="text-sm text-[#A1A1AA]">Nenhuma transferência registrada.</p>
              )}
              {data.transferencias.map((t) => (
                <div key={t.id} className="border-b border-white/10 pb-4 text-sm">
                  <p>
                    {data.produtos.find((p) => p.id === t.produtoId)?.nome ??
                      'Produto indisponível'}{' '}
                    · {t.quantidade} unidades
                  </p>
                  <p className="mt-1 text-[#A1A1AA]">
                    {unidade(t.origemId)} → {unidade(t.destinoId)} · {formatarDataHora(t.createdAt)}
                  </p>
                  <p className="mt-1 break-words text-[#A1A1AA]">{t.motivo}</p>
                </div>
              ))}
            </div>
          </Panel>
        </>
      )}
    </div>
  );
}
