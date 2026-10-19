'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/Button';

interface SubscriptionState {
  disponivel: boolean;
  ambiente: 'test' | 'live';
  plano: string;
  status: string;
  periodoFim: string | null;
  cancelarEm: string | null;
  podeGerenciar: boolean;
  emAndamento: boolean;
  planos: { id: string; nome: string; centavos: number }[];
}

const labels: Record<string, string> = {
  none: 'Sem assinatura',
  active: 'Ativa',
  trialing: 'Em avaliação',
  past_due: 'Pagamento em atraso',
  unpaid: 'Pagamento pendente',
  canceled: 'Cancelada',
  incomplete: 'Aguardando pagamento',
  incomplete_expired: 'Tentativa expirada',
  paused: 'Pausada',
  environment_mismatch: 'Vínculo de outro ambiente: solicite uma revisão ao suporte',
};
const money = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const date = (value: string) =>
  new Date(value).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });

export default function AssinaturaPage() {
  const { user } = useAuth();
  const [data, setData] = useState<SubscriptionState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [retorno, setRetorno] = useState('');
  const load = useCallback(
    async (reconcile = false) => {
      if (user?.role !== 'ADMIN') return;
      setLoading(true);
      setError('');
      try {
        setData(
          (reconcile
            ? await api.post<SubscriptionState>('/assinaturas/atualizar-status', {})
            : await api.get<SubscriptionState>('/assinaturas')
          ).data,
        );
      } catch {
        setError('Não foi possível carregar sua assinatura. Tente novamente.');
      } finally {
        setLoading(false);
      }
    },
    [user?.role],
  );
  useEffect(() => {
    void load();
  }, [load]);
  useEffect(() => {
    setRetorno(new URLSearchParams(window.location.search).get('retorno') ?? '');
  }, []);

  async function open(path: 'checkout' | 'portal', plano?: string) {
    setBusy(plano ?? 'portal');
    setError('');
    try {
      const response = await api.post<{ url: string }>(
        `/assinaturas/${path}`,
        plano ? { plano } : {},
      );
      const url = new URL(response.data.url);
      if (
        url.protocol !== 'https:' ||
        !['checkout.stripe.com', 'billing.stripe.com'].includes(url.hostname)
      )
        throw new Error('Invalid destination');
      window.location.assign(url.toString());
    } catch {
      setError(
        'Não foi possível abrir o Stripe. Sua assinatura não foi confirmada nesta tela. Tente novamente ou atualize o status.',
      );
      setBusy(null);
    }
  }

  if (user?.role !== 'ADMIN')
    return (
      <section className="mx-auto max-w-2xl p-6">
        <h1 className="text-2xl font-semibold">Plano e assinatura</h1>
        <p className="mt-4 text-[#A1A1AA]">
          Somente o administrador do negócio pode contratar ou gerenciar a assinatura.
        </p>
        <Link href="/dashboard" className="mt-6 inline-flex text-indigo-300">
          Voltar ao painel
        </Link>
      </section>
    );

  return (
    <div className="mx-auto max-w-5xl space-y-7 pb-12">
      <header>
        <Link href="/configuracoes" className="inline-flex py-3 text-sm text-indigo-300">
          ← Configurações
        </Link>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">Plano e assinatura</h1>
        <p className="mt-3 text-sm leading-7 text-[#A1A1AA]">
          Escolha o próximo passo para o seu negócio e acompanhe sua assinatura.
        </p>
      </header>
      {data?.ambiente === 'test' && (
        <div className="rounded-xl border border-amber-400/25 bg-amber-400/5 p-5 text-sm leading-7 text-amber-100">
          <strong>Ambiente de testes do Stripe.</strong> Use apenas dados de teste. Nenhum dinheiro
          real será movimentado e seu acesso atual ao Nexly será preservado.
        </div>
      )}
      {data?.ambiente === 'live' && (
        <p className="rounded-xl border border-indigo-400/25 bg-indigo-400/5 p-5 text-sm leading-7 text-indigo-100">
          Assinatura mensal com renovação automática. Você confere o valor antes de pagar no
          checkout seguro do Stripe e pode gerenciar ou cancelar a assinatura por aqui.
        </p>
      )}
      {retorno === 'sucesso' && (
        <p
          role="status"
          className="rounded-xl border border-indigo-400/20 bg-indigo-500/10 p-5 text-sm leading-7"
        >
          Você voltou do checkout. A assinatura só fica ativa após a confirmação do Stripe. Use
          Atualizar status para acompanhar.
        </p>
      )}
      {retorno === 'cancelado' && (
        <p role="status" className="text-sm text-[#A1A1AA]">
          Você saiu do checkout. Pode escolher um plano e tentar novamente.
        </p>
      )}
      {error && (
        <p role="alert" className="rounded-xl border border-red-400/25 p-4 text-sm text-red-200">
          {error}
        </p>
      )}
      {loading && (
        <p role="status" className="text-sm text-[#A1A1AA]">
          Carregando assinatura…
        </p>
      )}
      {!loading && !data && (
        <Button type="button" onClick={() => void load()}>
          Tentar novamente
        </Button>
      )}
      {data && (
        <>
          <section
            aria-label="Sua assinatura"
            className="rounded-2xl border border-white/10 bg-[#111116] p-6"
          >
            <div className="flex flex-wrap items-start justify-between gap-5">
              <div>
                <p className="text-sm text-[#A1A1AA]">
                  {data.ambiente === 'test' ? 'Assinatura no Sandbox' : 'Sua assinatura Nexly'}
                </p>
                <h2 className="mt-2 text-xl font-semibold">
                  {data.planos.find((plan) => plan.id === data.plano)?.nome ?? 'Acesso gratuito'}
                </h2>
                <p className="mt-2 text-sm text-indigo-200">
                  {labels[data.status] ?? 'Aguardando atualização'}
                </p>
                {data.periodoFim && (
                  <p className="mt-3 text-sm text-[#A1A1AA]">
                    Fim do período atual: {date(data.periodoFim)}
                  </p>
                )}
                {data.cancelarEm && (
                  <p className="mt-2 text-sm text-amber-200">
                    Cancelamento agendado para {date(data.cancelarEm)}.
                  </p>
                )}
              </div>
              <div className="flex flex-wrap gap-3">
                <Button
                  type="button"
                  variant="secondary"
                  disabled={Boolean(busy) || loading}
                  onClick={() => void load(true)}
                >
                  Atualizar status
                </Button>
                {data.podeGerenciar && (
                  <Button
                    type="button"
                    disabled={!data.disponivel || Boolean(busy)}
                    loading={busy === 'portal'}
                    onClick={() => void open('portal')}
                  >
                    Gerenciar assinatura
                  </Button>
                )}
              </div>
            </div>
            {!data.disponivel && (
              <p className="mt-5 border-t border-white/10 pt-4 text-sm leading-7 text-[#A1A1AA]">
                A contratação está em preparação. O checkout será liberado após configurar e validar
                as credenciais e a confirmação dos pagamentos.
              </p>
            )}
          </section>
          <section aria-label="Planos mensais" className="grid gap-5 md:grid-cols-3">
            {data.planos.map((plan) => (
              <article
                key={plan.id}
                className={`flex flex-col rounded-2xl border bg-[#111116] p-6 ${plan.id === 'PRO' ? 'border-indigo-400/50' : 'border-white/10'}`}
              >
                <h2 className="text-xl font-semibold">{plan.nome}</h2>
                <p className="mt-5 text-3xl font-semibold">
                  {money.format(plan.centavos / 100)}
                  <span className="text-sm font-normal text-[#A1A1AA]"> / mês</span>
                </p>
                <p className="mb-6 mt-4 flex-1 text-sm leading-7 text-[#A1A1AA]">
                  Assinatura mensal recorrente. Você confirma os detalhes no checkout seguro do
                  Stripe.
                </p>
                <Button
                  type="button"
                  variant={plan.id === 'PRO' ? 'primary' : 'secondary'}
                  disabled={!data.disponivel || Boolean(busy) || data.emAndamento}
                  loading={busy === plan.id}
                  onClick={() => void open('checkout', plan.id)}
                >
                  {data.ambiente === 'live' ? 'Assinar' : 'Testar'} {plan.nome}
                </Button>
              </article>
            ))}
          </section>
          <p className="text-sm leading-7 text-[#A1A1AA]">
            No portal você pode consultar faturas, atualizar a forma de pagamento e cancelar ao fim
            do período. Reduções de plano ficam para o próximo período; aumentos mostram o ajuste
            proporcional antes da confirmação.
          </p>
        </>
      )}
    </div>
  );
}
