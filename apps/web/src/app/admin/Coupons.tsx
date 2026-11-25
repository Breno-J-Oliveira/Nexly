'use client';

import { useState, type FormEvent } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faLink, faPlus, faTicket } from '@fortawesome/free-solid-svg-icons';
import { api } from '@/lib/api';
import {
  apiError,
  formatDate,
  formatNumber,
  usePlatformData,
  type Coupon,
  type CouponList,
} from './platform-data';
import { ActionDialog, copyText, EmptyPanel, ErrorPanel, LoadingPanel } from './ui';
import styles from './console.module.css';

function buildCouponLink(base: string | null, code: string, plan = ''): string | null {
  if (!base) return null;
  try {
    const url = new URL(base);
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return null;
    url.searchParams.set('cupom', code);
    if (plan) url.searchParams.set('plano', plan);
    return url.toString();
  } catch {
    return null;
  }
}

function couponStatus(coupon: Coupon) {
  if (coupon.expiresAt && new Date(coupon.expiresAt).getTime() <= Date.now()) {
    return { value: 'expired', text: 'Expirado', tone: 'neutral' };
  }
  if (coupon.maxRedemptions != null && coupon.timesRedeemed >= coupon.maxRedemptions) {
    return { value: 'exhausted', text: 'Limite atingido', tone: 'warning' };
  }
  return coupon.active
    ? { value: 'active', text: 'Ativo', tone: 'green' }
    : { value: 'disabled', text: 'Desativado', tone: 'neutral' };
}

const money = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

function CouponEditor({
  coupon,
  plans,
  onClose,
  onSaved,
}: {
  coupon?: Coupon;
  plans?: CouponList['plans'];
  onClose: () => void;
  onSaved: (code?: string) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [percentage, setPercentage] = useState('');
  const [expiry, setExpiry] = useState('');

  function setExpiryInDays(days: number) {
    const target = new Date();
    target.setDate(target.getDate() + days);
    const local = new Date(target.getTime() - target.getTimezoneOffset() * 60_000);
    setExpiry(local.toISOString().slice(0, 16));
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setError('');
    const form = new FormData(event.currentTarget);
    const codeField = form.get('code');
    const limitField = form.get('limit');
    const code = typeof codeField === 'string' ? codeField.trim().toUpperCase() : '';
    const percentOff = Number(percentage);
    const limit = typeof limitField === 'string' ? limitField.trim() : '';
    const expiration = expiry.trim();
    const date = expiration ? new Date(expiration) : null;

    if (date && (!Number.isFinite(date.getTime()) || date.getTime() <= Date.now())) {
      setError('Escolha uma data de expiração no futuro.');
      return;
    }
    setBusy(true);
    try {
      if (coupon) {
        await api.patch(`/platform/coupons/${encodeURIComponent(coupon.id)}`, { active: false });
        onSaved();
      } else {
        await api.post('/platform/coupons', {
          code,
          percentOff,
          ...(limit ? { maxRedemptions: Number(limit) } : {}),
          ...(date ? { expiresAt: date.toISOString() } : {}),
        });
        onSaved(code);
      }
    } catch (failure) {
      setError(
        apiError(
          failure,
          coupon ? 'Não foi possível desativar o cupom.' : 'Não foi possível criar o cupom.',
        ),
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <ActionDialog
      title={coupon ? `Desativar ${coupon.code}?` : 'Criar cupom'}
      busy={busy}
      onClose={onClose}
    >
      <form className={styles.form} onSubmit={(event) => void save(event)}>
        {coupon ? (
          <p className={styles.formHint}>
            Este código ficará indisponível para novos checkouts no Nexly. Checkouts já abertos
            podem seguir o prazo do Stripe.
          </p>
        ) : (
          <>
            <p className={styles.formHint}>
              O desconto vale na primeira cobrança de uma nova assinatura.
            </p>
            <label className={styles.field}>
              <span>Código do cupom</span>
              <input
                required
                name="code"
                placeholder="BEMVINDO15"
                pattern="[A-Z0-9]{3,32}"
                minLength={3}
                maxLength={32}
                autoComplete="off"
                disabled={busy}
                onChange={(event) => {
                  event.currentTarget.value = event.currentTarget.value.toUpperCase();
                }}
              />
              <small>Use de 3 a 32 letras ou números, sem espaços.</small>
            </label>
            <div className={styles.formColumns}>
              <label className={styles.field}>
                <span>Desconto (%)</span>
                <input
                  required
                  type="number"
                  name="percentage"
                  placeholder="15"
                  min={1}
                  max={100}
                  step={1}
                  value={percentage}
                  onChange={(event) => setPercentage(event.target.value)}
                  disabled={busy}
                />
              </label>
              <label className={styles.field}>
                <span>Limite de usos</span>
                <input
                  type="number"
                  name="limit"
                  placeholder="Sem limite"
                  min={1}
                  max={100000}
                  step={1}
                  disabled={busy}
                />
              </label>
            </div>
            <div className={styles.couponPresets} aria-label="Descontos sugeridos">
              {[10, 15, 20, 30].map((amount) => (
                <button
                  key={amount}
                  type="button"
                  className={styles.secondaryButton}
                  disabled={busy}
                  onClick={() => setPercentage(String(amount))}
                >
                  {amount}%
                </button>
              ))}
            </div>
            <label className={styles.field}>
              <span>Data e hora de expiração</span>
              <input
                type="datetime-local"
                name="expiry"
                disabled={busy}
                value={expiry}
                onChange={(event) => setExpiry(event.target.value)}
              />
              <small>Opcional. O horário segue o fuso deste dispositivo.</small>
            </label>
            <div className={styles.couponPresets} aria-label="Prazos sugeridos">
              {[7, 15, 30].map((days) => (
                <button
                  key={days}
                  type="button"
                  className={styles.secondaryButton}
                  disabled={busy}
                  onClick={() => setExpiryInDays(days)}
                >
                  {days} dias
                </button>
              ))}
              <button
                type="button"
                className={styles.textButton}
                disabled={busy || !expiry}
                onClick={() => setExpiry('')}
              >
                Remover prazo
              </button>
            </div>
            {plans?.length && Number(percentage) > 0 && Number(percentage) <= 100 ? (
              <div className={styles.couponPreview}>
                <strong>Estimativa da primeira cobrança</strong>
                <ul>
                  {plans.map((plan) => (
                    <li key={plan.id}>
                      <span>{plan.name}</span>
                      <span>
                        {money.format(
                          Math.round(plan.cents * (1 - Number(percentage) / 100)) / 100,
                        )}
                      </span>
                    </li>
                  ))}
                </ul>
                <small>O Stripe apresenta o valor final antes do pagamento.</small>
              </div>
            ) : null}
          </>
        )}
        {error && (
          <p className={styles.notice} data-tone="error" role="alert">
            {error}
          </p>
        )}
        <footer className={styles.formActions}>
          <button
            type="button"
            className={styles.secondaryButton}
            onClick={onClose}
            disabled={busy}
          >
            Cancelar
          </button>
          <button
            type="submit"
            className={coupon ? styles.destructiveButton : styles.primaryButton}
            disabled={busy}
          >
            {busy ? 'Salvando…' : coupon ? 'Desativar cupom' : 'Criar cupom'}
          </button>
        </footer>
      </form>
    </ActionDialog>
  );
}

export function Coupons() {
  const [pages, setPages] = useState<string[]>([]);
  const cursor = pages.at(-1);
  const [search, setSearch] = useState('');
  const [code, setCode] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [suggestedPlan, setSuggestedPlan] = useState('');
  const params = new URLSearchParams();
  if (code) params.set('code', code);
  if (cursor) params.set('after', cursor);
  const { state, reload } = usePlatformData<CouponList>(
    params.size ? `/platform/coupons?${params}` : '/platform/coupons',
  );
  const [editor, setEditor] = useState<Coupon | 'new' | null>(null);
  const [feedback, setFeedback] = useState('');
  const [sharedLink, setSharedLink] = useState<string | null>(null);
  const data = state.status === 'ready' ? state.data : undefined;
  const linkBase = data?.linkBase ?? null;
  const rows =
    data?.items.filter((item) => !statusFilter || couponStatus(item).value === statusFilter) ?? [];

  function saved(code?: string) {
    setEditor(null);
    setSharedLink(code ? buildCouponLink(linkBase, code, suggestedPlan) : null);
    setFeedback(code ? `Cupom ${code} criado.` : 'Cupom desativado.');
    reload();
  }

  function searchCoupons(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPages([]);
    setCode(search);
  }

  async function share(link: string) {
    setSharedLink(link);
    const copied = await copyText(link);
    setFeedback(copied ? 'Link do cupom copiado.' : 'Selecione o link abaixo para copiá-lo.');
  }

  return (
    <section className={styles.panel} aria-labelledby="platform-coupons">
      <header className={styles.panelHeader}>
        <div>
          <h2 id="platform-coupons">Cupons de assinatura</h2>
          <p>Crie descontos para a primeira cobrança e compartilhe o link do Nexly.</p>
        </div>
        {data?.available && (
          <button
            className={styles.primaryButton}
            type="button"
            onClick={() => {
              setFeedback('');
              setEditor('new');
            }}
          >
            <FontAwesomeIcon icon={faPlus} /> Criar cupom
          </button>
        )}
      </header>
      {data && (!data.available || data.mode === 'test') && (
        <p className={styles.notice} data-tone="warning">
          <FontAwesomeIcon icon={faTicket} aria-hidden="true" />
          {data.available
            ? 'Stripe em ambiente de teste. Os cupons desta lista são usados em checkouts de teste.'
            : 'Stripe indisponível neste ambiente. O gerenciamento de cupons ficará disponível quando a integração de pagamentos estiver configurada.'}
        </p>
      )}
      {feedback && (
        <p className={styles.notice} data-tone="success" role="status">
          {feedback}
        </p>
      )}
      {sharedLink && (
        <div className={styles.linkPanel}>
          <label className={styles.field}>
            <span>Link para compartilhar</span>
            <input
              type="url"
              value={sharedLink}
              readOnly
              onFocus={(event) => event.currentTarget.select()}
            />
          </label>
          <button
            type="button"
            className={styles.secondaryButton}
            onClick={() => void share(sharedLink)}
          >
            <FontAwesomeIcon icon={faLink} /> Copiar link
          </button>
        </div>
      )}
      {state.status === 'loading' && <LoadingPanel label="Carregando cupons…" />}
      {state.status === 'error' && (
        <ErrorPanel
          message={apiError(state.error, 'Não foi possível carregar os cupons.')}
          retry={reload}
        />
      )}
      {(data?.available || code) && (
        <div className={styles.couponTools}>
          <form className={styles.couponSearch} onSubmit={searchCoupons}>
            <label className={styles.field}>
              <span>Buscar por código exato</span>
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value.toUpperCase())}
                maxLength={32}
                pattern="[A-Z0-9]{3,32}"
                placeholder="BEMVINDO15"
              />
            </label>
            <button type="submit" className={styles.secondaryButton}>
              Buscar
            </button>
            {code && (
              <button
                type="button"
                className={styles.textButton}
                onClick={() => {
                  setCode('');
                  setSearch('');
                  setPages([]);
                }}
              >
                Limpar busca
              </button>
            )}
          </form>
          <label className={styles.field}>
            <span>Status nesta página</span>
            <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
              <option value="">Todos</option>
              <option value="active">Ativos</option>
              <option value="expired">Expirados</option>
              <option value="exhausted">Esgotados</option>
              <option value="disabled">Desativados</option>
            </select>
          </label>
          <label className={styles.field}>
            <span>Plano sugerido no link</span>
            <select
              value={suggestedPlan}
              onChange={(event) => {
                setSuggestedPlan(event.target.value);
                setSharedLink(null);
              }}
            >
              <option value="">Cliente escolhe</option>
              {data?.plans?.map((plan) => (
                <option key={plan.id} value={plan.id}>
                  {plan.name}
                </option>
              ))}
            </select>
          </label>
        </div>
      )}
      {data &&
        (rows.length ? (
          <div
            className={styles.tableScroll}
            // Mantém a rolagem horizontal acessível por teclado.
            // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex
            tabIndex={0}
            role="region"
            aria-label="Tabela de cupons"
          >
            <table className={styles.table}>
              <thead>
                <tr>
                  <th scope="col">Código</th>
                  <th scope="col">Desconto</th>
                  <th scope="col">Usos</th>
                  <th scope="col">Validade</th>
                  <th scope="col">Status</th>
                  <th scope="col">Ações</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((coupon) => {
                  const status = couponStatus(coupon);
                  const link =
                    status.tone === 'green' && data.available
                      ? buildCouponLink(linkBase, coupon.code, suggestedPlan)
                      : null;
                  return (
                    <tr key={coupon.id}>
                      <th scope="row">
                        <code>{coupon.code}</code>
                      </th>
                      <td>{formatNumber.format(coupon.percentOff)}%</td>
                      <td>
                        {formatNumber.format(coupon.timesRedeemed)}
                        {coupon.maxRedemptions != null && (
                          <>
                            {` / ${formatNumber.format(coupon.maxRedemptions)}`}
                            <progress
                              className={styles.couponProgress}
                              value={Math.min(coupon.timesRedeemed, coupon.maxRedemptions)}
                              max={coupon.maxRedemptions}
                              aria-label={`Usos de ${coupon.code}`}
                            />
                          </>
                        )}
                      </td>
                      <td>
                        {coupon.expiresAt ? (
                          <time dateTime={coupon.expiresAt}>{formatDate(coupon.expiresAt)}</time>
                        ) : (
                          'Sem prazo'
                        )}
                      </td>
                      <td>
                        <span className={styles.pill} data-tone={status.tone}>
                          {status.text}
                        </span>
                      </td>
                      <td>
                        <div className={styles.tableActions}>
                          {link && (
                            <button
                              type="button"
                              className={styles.secondaryButton}
                              aria-label={`Copiar link de ${coupon.code}`}
                              onClick={() => void share(link)}
                            >
                              <FontAwesomeIcon icon={faLink} /> Copiar
                            </button>
                          )}
                          {coupon.active && data.available && (
                            <button
                              type="button"
                              className={styles.textButton}
                              aria-label={`Desativar ${coupon.code}`}
                              onClick={() => {
                                setFeedback('');
                                setEditor(coupon);
                              }}
                            >
                              Desativar
                            </button>
                          )}
                          {!link && (!coupon.active || !data.available) && '—'}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyPanel>
            {data.available
              ? 'Nenhum cupom encontrado nesta página com os filtros atuais.'
              : 'A lista de cupons está indisponível.'}
          </EmptyPanel>
        ))}
      {data?.available && (pages.length > 0 || data.nextCursor) && (
        <div className={styles.formActions}>
          <button
            type="button"
            className={styles.secondaryButton}
            disabled={!pages.length}
            onClick={() => setPages((current) => current.slice(0, -1))}
          >
            Página anterior
          </button>
          <button
            type="button"
            className={styles.secondaryButton}
            disabled={!data.nextCursor}
            onClick={() => {
              if (data.nextCursor) setPages([...pages, data.nextCursor]);
            }}
          >
            Próxima página
          </button>
        </div>
      )}
      {editor && (
        <CouponEditor
          coupon={editor === 'new' ? undefined : editor}
          plans={data?.plans}
          onClose={() => setEditor(null)}
          onSaved={saved}
        />
      )}
    </section>
  );
}
