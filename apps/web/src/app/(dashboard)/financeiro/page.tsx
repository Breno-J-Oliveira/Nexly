'use client';
import { useState } from 'react';
import { api } from '@/lib/api';
import { useApi } from '@/lib/useApi';
import { formatarMoeda, formatarDataHora } from '@/lib/format';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Pagination } from '@/components/ui/Pagination';
import { Modal } from '@/components/ui/Modal';
import {
  ActionStatus,
  LoadState,
  Panel,
  SelectField,
  Titulo,
  useAction,
} from '@/components/gestao/GestaoUI';
type Baixa = { id: string; valor: number; data: string; estornada: boolean };
type Conta = {
  id: string;
  descricao: string;
  tipo: string;
  categoria: string;
  valor: number;
  valorPago: number;
  status: string;
  vencimento: string;
  vendaId: string | null;
  baixas: Baixa[];
};
type Resumo = {
  receita: number;
  despesas: number;
  cmv: number | null;
  resultado: number | null;
  entradas: number;
  saidas: number;
  saldoCaixa: number;
  aReceber: number;
  aPagar: number;
  custosDisponiveis: boolean;
};
export default function FinanceiroPage() {
  const hoje = new Date().toISOString().slice(0, 10);
  const [inicio, setInicio] = useState(`${hoje.slice(0, 7)}-01`),
    [fim, setFim] = useState(hoje),
    [filialId, setFilial] = useState('');
  const [pagina, setPagina] = useState(1);
  const params = { inicio, fim, filialId: filialId || undefined };
  const contas = useApi<{ data: Conta[]; total: number }>('/gestao/financeiro', {
    params: { ...params, pagina },
  });
  const resumo = useApi<Resumo>('/gestao/financeiro/resumo', { params });
  const unidades = useApi<{ id: string; nome: string }[]>('/gestao/unidades');
  const [novo, setNovo] = useState(false),
    [descricao, setDescricao] = useState(''),
    [tipo, setTipo] = useState('DESPESA'),
    [categoria, setCategoria] = useState('GERAL'),
    [valor, setValor] = useState(''),
    [vencimento, setVencimento] = useState(hoje);
  const [pagamento, setPagamento] = useState<Conta | null>(null),
    [valorPago, setValorPago] = useState(''),
    [chave, setChave] = useState('');
  const [confirmacao, setConfirmacao] = useState<{ url: string; texto: string } | null>(null);
  const action = useAction();
  async function atualizar() {
    await Promise.all([contas.refetch(), resumo.refetch()]);
  }
  const cards: [string, number | undefined][] = [
    ['A receber', resumo.data?.aReceber],
    ['A pagar', resumo.data?.aPagar],
    ['Entradas de caixa', resumo.data?.entradas],
    ['Saídas de caixa', resumo.data?.saidas],
  ];
  return (
    <div className="space-y-6">
      <Titulo
        nome="Financeiro"
        descricao="Organize contas, registre recebimentos e pagamentos parciais e acompanhe o resultado. Os filtros de período usam dias UTC; as contas são selecionadas pelo vencimento e o caixa pela data do pagamento."
      />
      <Panel title="Período e unidade">
        <div className="grid items-end gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Input
            label="De"
            type="date"
            value={inicio}
            onChange={(e) => {
              setInicio(e.target.value);
              setPagina(1);
            }}
          />
          <Input
            label="Até"
            type="date"
            value={fim}
            onChange={(e) => {
              setFim(e.target.value);
              setPagina(1);
            }}
          />
          <SelectField
            label="Unidade"
            value={filialId}
            onChange={(e) => {
              setFilial(e.target.value);
              setPagina(1);
            }}
          >
            <option value="">Todas as unidades</option>
            {unidades.data?.map((f) => (
              <option key={f.id} value={f.id}>
                {f.nome}
              </option>
            ))}
          </SelectField>
          <Button onClick={() => setNovo(true)}>Nova conta</Button>
        </div>
      </Panel>
      <ActionStatus {...action} />
      <LoadState loading={resumo.loading} error={resumo.error} retry={resumo.refetch} />
      {!resumo.loading && !resumo.error && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {cards.map(([label, n]) => (
              <div key={label} className="rounded-xl border border-white/10 bg-[#111116] p-5">
                <p className="text-sm text-[#A1A1AA]">{label}</p>
                <p className="mt-3 text-2xl font-semibold">{formatarMoeda(Number(n ?? 0))}</p>
              </div>
            ))}
          </div>
          <Panel title="Resultado do período">
            <dl className="grid gap-4 sm:grid-cols-4">
              {[
                ['Receita líquida', resumo.data?.receita],
                ['Despesas', resumo.data?.despesas],
                ['Custo dos produtos vendidos', resumo.data?.cmv],
                ['Resultado', resumo.data?.resultado],
              ].map(([label, n]) => (
                <div key={String(label)}>
                  <dt className="text-sm text-[#A1A1AA]">{label}</dt>
                  <dd className="mt-2 text-lg font-semibold">
                    {n == null ? 'Não disponível' : formatarMoeda(Number(n))}
                  </dd>
                </div>
              ))}
            </dl>
            {!resumo.data?.custosDisponiveis && (
              <p className="mt-4 text-sm text-amber-200">
                Há vendas sem custo de aquisição registrado. O resultado fica indisponível para
                evitar uma margem incorreta. Preencha o custo no produto para as próximas vendas.
              </p>
            )}
          </Panel>
        </>
      )}
      <Panel title="Contas do período">
        <LoadState loading={contas.loading} error={contas.error} retry={contas.refetch} />
        {!contas.loading && !contas.error && (
          <>
            <p className="mb-4 text-sm text-[#A1A1AA]">
              {contas.data?.total ?? 0} contas. Vendas antigas migradas ficam em aberto até você
              confirmar o recebimento.
            </p>
            {!contas.data?.data.length && (
              <p className="py-6 text-sm text-[#A1A1AA]">
                Nenhuma conta neste período. Cadastre uma despesa ou registre uma venda no PDV.
              </p>
            )}
            <div className="space-y-3">
              {contas.data?.data.map((c) => (
                <details key={c.id} className="rounded-lg border border-white/10 p-4">
                  <summary className="cursor-pointer">
                    <span className="font-medium">{c.descricao}</span>
                    <span className="ml-3 text-xs text-[#A5B4FC]">
                      {c.tipo === 'RECEITA' ? 'Receita' : 'Despesa'} · {c.status}
                    </span>
                    <span className="mt-2 block text-sm text-[#A1A1AA]">
                      Vence em {c.vencimento.slice(0, 10).split('-').reverse().join('/')} ·{' '}
                      {formatarMoeda(Number(c.valor))} · Pago: {formatarMoeda(Number(c.valorPago))}
                    </span>
                  </summary>
                  <div className="mt-4 space-y-3">
                    <p className="text-sm text-[#A1A1AA]">
                      Categoria: {c.categoria}
                      {c.vendaId ? ' · Receita vinculada a uma venda' : ''}
                    </p>
                    <div className="flex flex-wrap gap-3">
                      {c.status !== 'CANCELADO' && Number(c.valor) > Number(c.valorPago) && (
                        <Button
                          disabled={action.busy}
                          onClick={() => {
                            setPagamento(c);
                            setValorPago((Number(c.valor) - Number(c.valorPago)).toFixed(2));
                            setChave(crypto.randomUUID());
                          }}
                        >
                          Registrar pagamento
                        </Button>
                      )}
                      {!c.vendaId && c.status !== 'CANCELADO' && Number(c.valorPago) === 0 && (
                        <Button
                          variant="secondary"
                          onClick={() =>
                            setConfirmacao({
                              url: `/gestao/financeiro/${c.id}/cancelar`,
                              texto: `Cancelar a conta “${c.descricao}”? O registro será preservado no histórico.`,
                            })
                          }
                        >
                          Cancelar conta
                        </Button>
                      )}
                    </div>
                    {c.baixas.map((b) => (
                      <div
                        key={b.id}
                        className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-3 text-sm"
                      >
                        <span>
                          {formatarDataHora(b.data)} · {formatarMoeda(Number(b.valor))}
                          {b.estornada ? ' · Estornado' : ''}
                        </span>
                        {!b.estornada && c.status !== 'CANCELADO' && (
                          <Button
                            variant="ghost"
                            onClick={() =>
                              setConfirmacao({
                                url: `/gestao/financeiro/${c.id}/baixas/${b.id}/estornar`,
                                texto:
                                  'Estornar este pagamento e reabrir o saldo da conta? Confirme que a devolução foi realizada fora do Nexly.',
                              })
                            }
                          >
                            Estornar pagamento
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                </details>
              ))}
            </div>
            <Pagination
              page={pagina}
              total={contas.data?.total ?? 0}
              limit={50}
              loading={contas.loading}
              onChange={setPagina}
            />
          </>
        )}
      </Panel>
      <Modal
        open={novo}
        title="Nova conta"
        onClose={() => {
          if (!action.busy) setNovo(false);
        }}
      >
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            void action.run(async () => {
              await api.post('/gestao/financeiro', {
                descricao,
                tipo,
                categoria,
                valor: Number(valor),
                vencimento,
                filialId: filialId || undefined,
              });
              setNovo(false);
              setDescricao('');
              setValor('');
              await atualizar();
            });
          }}
        >
          <Input
            label="Descrição"
            required
            minLength={2}
            maxLength={160}
            value={descricao}
            onChange={(e) => setDescricao(e.target.value)}
          />
          <SelectField label="Tipo" value={tipo} onChange={(e) => setTipo(e.target.value)}>
            <option value="DESPESA">Despesa a pagar</option>
            <option value="RECEITA">Receita a receber</option>
          </SelectField>
          <Input
            label="Categoria"
            required
            minLength={2}
            maxLength={60}
            value={categoria}
            onChange={(e) => setCategoria(e.target.value)}
          />
          <Input
            label="Valor (R$)"
            required
            type="number"
            step="0.01"
            min="0.01"
            max="99999999.99"
            value={valor}
            onChange={(e) => setValor(e.target.value)}
          />
          <Input
            label="Vencimento"
            required
            type="date"
            value={vencimento}
            onChange={(e) => setVencimento(e.target.value)}
          />
          <p className="text-xs text-[#A1A1AA]">
            Unidade: {unidades.data?.find((f) => f.id === filialId)?.nome ?? 'Central'}. Este
            cadastro não registra um pagamento.
          </p>
          <ActionStatus {...action} />
          <Button type="submit" loading={action.busy}>
            Criar conta
          </Button>
        </form>
      </Modal>
      <Modal
        open={!!pagamento}
        title="Registrar pagamento"
        onClose={() => {
          if (!action.busy) setPagamento(null);
        }}
      >
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (pagamento)
              void action.run(async () => {
                await api.post(`/gestao/financeiro/${pagamento.id}/baixar`, {
                  chave,
                  valor: Number(valorPago),
                });
                setPagamento(null);
                await atualizar();
              }, 'Pagamento registrado.');
          }}
        >
          <p className="text-sm text-[#A1A1AA]">
            {pagamento?.descricao}. Registre somente valores já pagos ou recebidos. O Nexly não
            movimenta dinheiro.
          </p>
          <Input
            required
            label="Valor pago (R$)"
            type="number"
            min="0.01"
            step="0.01"
            max={pagamento ? Number(pagamento.valor) - Number(pagamento.valorPago) : undefined}
            value={valorPago}
            onChange={(e) => {
              setValorPago(e.target.value);
              setChave(crypto.randomUUID());
            }}
          />
          <ActionStatus {...action} />
          <Button loading={action.busy} type="submit">
            Confirmar pagamento
          </Button>
        </form>
      </Modal>
      <Modal
        open={!!confirmacao}
        title="Confirmar alteração"
        onClose={() => {
          if (!action.busy) setConfirmacao(null);
        }}
      >
        <p className="mb-5 text-sm leading-6 text-[#D4D4D8]">{confirmacao?.texto}</p>
        <ActionStatus {...action} />
        <Button
          variant="danger"
          loading={action.busy}
          onClick={() => {
            if (confirmacao)
              void action.run(async () => {
                await api.post(confirmacao.url);
                setConfirmacao(null);
                await atualizar();
              });
          }}
        >
          Confirmar
        </Button>
      </Modal>
    </div>
  );
}
