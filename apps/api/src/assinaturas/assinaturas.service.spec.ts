import {
  BadRequestException,
  ConflictException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { Plano, Prisma } from '@prisma/client';
import { AssinaturasService } from './assinaturas.service';
import { StripeGateway } from './stripe.gateway';
import { PrismaService } from '../database/prisma.service';
import { RedisService } from '../redis/redis.service';
import { PLANOS, PLANOS_LIVE, PORTAL_SANDBOX, PORTAL_LIVE } from './catalogo';

describe('Assinaturas do Nexly no Sandbox', () => {
  let row: Record<string, unknown>;
  let receipts: Set<string>;
  const subscription = (overrides: Record<string, unknown> = {}) => ({
    id: 'sub_1',
    customer: 'cus_1',
    status: 'active',
    livemode: false,
    cancel_at: null,
    cancel_at_period_end: false,
    pause_collection: null,
    items: {
      data: [{ quantity: 1, price: { id: PLANOS[0].precoId }, current_period_end: 1_800_000_000 }],
    },
    latest_invoice: { status: 'paid' },
    ...overrides,
  });
  const stripe = {
    prices: { retrieve: jest.fn() },
    customers: { create: jest.fn() },
    subscriptions: { list: jest.fn() },
    checkout: { sessions: { retrieve: jest.fn(), create: jest.fn(), expire: jest.fn() } },
    billingPortal: { sessions: { create: jest.fn() } },
  };
  const gateway = {
    enabled: true,
    mode: 'test',
    livemode: false,
    planos: [...PLANOS] as { id: Plano; nome: string; centavos: number; precoId: string }[],
    portalId: PORTAL_SANDBOX,
    origin: 'http://localhost:3002',
    client: stripe,
    verify: jest.fn(),
  };
  const db = {
    $queryRaw: jest.fn().mockResolvedValue([{ id: 'e1' }]),
    assinatura: {
      findUnique: jest.fn(),
      upsert: jest.fn(),
      update: jest.fn(({ data }: { data: Record<string, unknown> }) => {
        row = { ...row, ...data };
        return Promise.resolve(row);
      }),
    },
    empresa: { update: jest.fn().mockResolvedValue({}) },
    eventoStripe: {
      findUnique: jest.fn(({ where }: { where: { id: string } }) =>
        Promise.resolve(receipts.has(where.id) ? { id: where.id } : null),
      ),
      create: jest.fn(({ data }: { data: { id: string } }) => {
        receipts.add(data.id);
        return Promise.resolve(data);
      }),
    },
    $transaction: jest.fn(async (work: (tx: unknown) => Promise<unknown>): Promise<unknown> =>
      work(db),
    ),
  };
  const redis = { consumeLimit: jest.fn() };
  const service = new AssinaturasService(
    { client: db } as unknown as PrismaService,
    gateway as unknown as StripeGateway,
    redis as unknown as RedisService,
  );
  const deliver = (
    id = 'evt_1',
    type = 'invoice.paid',
    overrides: Record<string, unknown> = {},
  ) => {
    gateway.verify.mockReturnValue({
      id,
      type,
      livemode: false,
      data: { object: { customer: 'cus_1' } },
      ...overrides,
    });
    return service.webhook(Buffer.from('{}'), 'signature');
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Date, 'now').mockReturnValue(1_790_000_000_000);
    receipts = new Set();
    row = {
      empresaId: 'e1',
      ambiente: 'test',
      customerId: 'cus_1',
      subscriptionId: null,
      plano: Plano.FREE,
      status: 'none',
      checkoutId: null,
      checkoutPlano: null,
      checkoutChave: null,
    };
    db.assinatura.findUnique.mockImplementation(() => Promise.resolve(row));
    gateway.enabled = true;
    gateway.origin = 'http://localhost:3002';
    gateway.mode = 'test';
    gateway.livemode = false;
    gateway.planos = [...PLANOS];
    gateway.portalId = PORTAL_SANDBOX;
    redis.consumeLimit.mockResolvedValue({ allowed: true });
    stripe.prices.retrieve.mockResolvedValue({
      active: true,
      livemode: false,
      currency: 'brl',
      unit_amount: 4900,
      recurring: { interval: 'month', interval_count: 1 },
    });
    stripe.subscriptions.list.mockResolvedValue({ data: [], has_more: false });
    stripe.checkout.sessions.create.mockResolvedValue({
      id: 'cs_1',
      url: 'https://checkout.stripe.com/test',
      livemode: false,
    });
    gateway.verify.mockReset();
  });
  afterEach(() => jest.restoreAllMocks());

  it('recupera plano pago sem webhook e sem consumir a cota do administrador', async () => {
    configurarProducao(1);
    await service.reconciliarAgendada('e1', 'live');
    expect(db.empresa.update).toHaveBeenCalledWith({
      where: { id: 'e1' },
      data: { plano: Plano.PRO },
    });
    expect(redis.consumeLimit).not.toHaveBeenCalled();
    expect(db.eventoStripe.create).not.toHaveBeenCalled();
  });

  it('recupera cancelamento não entregue pelo webhook', async () => {
    configurarProducao(1, { status: 'canceled' });
    await service.reconciliarAgendada('e1', 'live');
    expect(db.empresa.update).toHaveBeenCalledWith({
      where: { id: 'e1' },
      data: { plano: Plano.FREE },
    });
  });

  it('não altera o plano quando a consulta periódica ao Stripe falha', async () => {
    configurarProducao(1);
    stripe.subscriptions.list.mockRejectedValueOnce(new Error('timeout'));
    await expect(service.reconciliarAgendada('e1', 'live')).rejects.toThrow('timeout');
    expect(db.empresa.update).not.toHaveBeenCalled();
  });

  it('ignora jobs antigos de outro ambiente, vínculos removidos e integração desativada', async () => {
    await service.reconciliarAgendada('e1', 'live');
    row.ambiente = 'live';
    await service.reconciliarAgendada('e1', 'test');
    row.ambiente = 'test';
    gateway.enabled = false;
    await service.reconciliarAgendada('e1', 'test');
    gateway.enabled = true;
    db.assinatura.findUnique.mockResolvedValueOnce(null);
    await service.reconciliarAgendada('e1', 'test');
    expect(stripe.subscriptions.list).not.toHaveBeenCalled();
    expect(db.empresa.update).not.toHaveBeenCalled();
  });

  it('a reconciliação periódica de teste não concede plano de produção', async () => {
    stripe.subscriptions.list.mockResolvedValue({ data: [subscription()], has_more: false });
    await service.reconciliarAgendada('e1', 'test');
    expect(row.plano).toBe(Plano.BASIC);
    expect(db.empresa.update).not.toHaveBeenCalled();
  });

  it('não expõe identificadores internos no status', async () => {
    const result = await service.status('e1');
    expect(result.planos.map((p) => p.centavos)).toEqual([4900, 9900, 19900]);
    expect(result).not.toHaveProperty('customerId');
    expect(result).not.toHaveProperty('checkoutChave');
    expect(db.assinatura.findUnique).toHaveBeenCalledWith({ where: { empresaId: 'e1' } });
  });

  const validarEncerramento = (exclusaoEm?: Date) =>
    service.validarEncerramento('e1', db as unknown as Prisma.TransactionClient, exclusaoEm);

  it('não exige Stripe para excluir empresa sem vínculo de cobrança', async () => {
    db.assinatura.findUnique.mockResolvedValueOnce(null);
    await validarEncerramento();
    expect(db.$queryRaw).toHaveBeenCalled();
    expect(stripe.subscriptions.list).not.toHaveBeenCalled();
  });

  it.each(['active', 'past_due', 'unpaid', 'incomplete', 'paused', 'trialing'])(
    'impede exclusão definitiva com assinatura %s, mesmo com plano local FREE',
    async (status) => {
      stripe.subscriptions.list.mockResolvedValue({
        data: [subscription({ status })],
        has_more: false,
      });
      await expect(validarEncerramento()).rejects.toBeInstanceOf(ConflictException);
    },
  );

  it('aceita pedido com cancelamento agendado antes da exclusão, mas impede apagar até encerrar', async () => {
    stripe.subscriptions.list.mockResolvedValue({
      data: [subscription({ cancel_at_period_end: true })],
      has_more: false,
    });
    await expect(validarEncerramento(new Date(1_800_000_001_000))).resolves.toBeUndefined();
    await expect(validarEncerramento(new Date(1_799_999_999_000))).rejects.toBeInstanceOf(
      ConflictException,
    );
    await expect(validarEncerramento()).rejects.toBeInstanceOf(ConflictException);
  });

  it('falha fechada se a consulta de cobrança falhar ou estiver incompleta', async () => {
    stripe.subscriptions.list.mockRejectedValueOnce(new Error('indisponível'));
    await expect(validarEncerramento()).rejects.toThrow('indisponível');
    stripe.subscriptions.list.mockResolvedValueOnce({ data: [], has_more: true });
    await expect(validarEncerramento()).rejects.toBeInstanceOf(ConflictException);
  });

  it('não exclui com vínculo ou resposta Stripe de outro ambiente', async () => {
    row.ambiente = 'live';
    await expect(validarEncerramento()).rejects.toBeInstanceOf(ConflictException);
    row.ambiente = 'test';
    stripe.subscriptions.list.mockResolvedValueOnce({
      data: [subscription({ livemode: true, status: 'canceled' })],
      has_more: false,
    });
    await expect(validarEncerramento()).rejects.toBeInstanceOf(ConflictException);
  });

  it('preserva checkout aberto ou cuja criação ainda precisa ser recuperada', async () => {
    row.checkoutChave = 'tentativa-pendente';
    await expect(validarEncerramento()).rejects.toBeInstanceOf(ConflictException);
    row.checkoutId = 'cs_1';
    stripe.checkout.sessions.retrieve.mockResolvedValue({ livemode: false, status: 'open' });
    await expect(validarEncerramento()).rejects.toBeInstanceOf(ConflictException);
    stripe.checkout.sessions.retrieve.mockResolvedValue({ livemode: false, status: 'expired' });
    await expect(validarEncerramento()).resolves.toBeUndefined();
  });

  it('permite apagar após encerramento confirmado sem criar cobranças', async () => {
    stripe.subscriptions.list.mockResolvedValue({
      data: [subscription({ status: 'canceled' })],
      has_more: false,
    });
    await validarEncerramento();
    expect(stripe.customers.create).not.toHaveBeenCalled();
    expect(stripe.checkout.sessions.create).not.toHaveBeenCalled();
  });

  it('recusa plano arbitrário antes de acessar Stripe', async () => {
    await expect(service.checkout('e1', 'price_adulterado')).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(stripe.prices.retrieve).not.toHaveBeenCalled();
  });

  it.each([{ currency: 'usd' }, { unit_amount: 1 }, { livemode: true }, { active: false }])(
    'recusa preço incompatível %j',
    async (override) => {
      stripe.prices.retrieve.mockResolvedValue({
        active: true,
        livemode: false,
        currency: 'brl',
        unit_amount: 4900,
        recurring: { interval: 'month', interval_count: 1 },
        ...override,
      });
      await expect(service.checkout('e1', 'BASIC')).rejects.toBeInstanceOf(
        ServiceUnavailableException,
      );
      expect(stripe.customers.create).not.toHaveBeenCalled();
    },
  );

  it('falha fechado quando não consegue validar a cota', async () => {
    redis.consumeLimit.mockResolvedValue(null);
    await expect(service.checkout('e1', 'BASIC')).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });

  it('não cria segunda assinatura quando o customer já tem uma em andamento', async () => {
    stripe.subscriptions.list.mockResolvedValue({ data: [subscription()], has_more: false });
    await expect(service.checkout('e1', 'BASIC')).rejects.toBeInstanceOf(ConflictException);
    expect(stripe.checkout.sessions.create).not.toHaveBeenCalled();
  });

  it('recupera uma sessão aberta sem criar outro checkout', async () => {
    row.checkoutId = 'cs_1';
    row.checkoutPlano = Plano.BASIC;
    stripe.checkout.sessions.retrieve.mockResolvedValue({
      id: 'cs_1',
      status: 'open',
      livemode: false,
      url: 'https://checkout.stripe.com/recovered',
    });
    expect(await service.checkout('e1', 'BASIC')).toEqual({
      url: 'https://checkout.stripe.com/recovered',
    });
    expect(stripe.checkout.sessions.create).not.toHaveBeenCalled();
  });

  it('recupera a disputa de criação da linha entre réplicas', async () => {
    db.assinatura.upsert.mockRejectedValueOnce(
      new Prisma.PrismaClientKnownRequestError('unique', {
        code: 'P2002',
        clientVersion: '5.22.0',
      }),
    );
    expect(await service.checkout('e1', 'BASIC')).toEqual({
      url: 'https://checkout.stripe.com/test',
    });
  });

  it('preserva a chave idempotente após timeout e a reutiliza na tentativa seguinte', async () => {
    stripe.checkout.sessions.create.mockRejectedValueOnce(
      new Error('timeout with confidential details'),
    );
    await expect(service.checkout('e1', 'BASIC')).rejects.toThrow('O Stripe não respondeu');
    const key = row.checkoutChave;
    expect(typeof key).toBe('string');
    await service.checkout('e1', 'BASIC');
    expect(stripe.checkout.sessions.create.mock.calls[1]?.[1]).toEqual({ idempotencyKey: key });
    const params = stripe.checkout.sessions.create.mock.calls[1]?.[0] as Record<string, unknown>;
    expect(params).not.toHaveProperty('payment_method_types');
    expect(params).not.toHaveProperty('automatic_tax');
    expect(params.success_url).toBe('http://localhost:3002/assinatura?retorno=sucesso');
  });

  it('assinatura falsificada não consulta o banco', async () => {
    gateway.verify.mockImplementation(() => {
      throw new Error('invalid signature');
    });
    await expect(service.webhook(Buffer.from('{}'), 'fake')).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(db.assinatura.findUnique).not.toHaveBeenCalled();
  });

  it('recusa eventos reais mesmo com assinatura válida', async () => {
    await expect(deliver('evt_live', 'invoice.paid', { livemode: true })).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(db.assinatura.findUnique).not.toHaveBeenCalled();
  });

  it('ignora customer sem vínculo local e não confia em metadata', async () => {
    db.assinatura.findUnique.mockResolvedValue(null);
    await deliver();
    expect(stripe.subscriptions.list).not.toHaveBeenCalled();
  });

  it('processa evento somente uma vez e libera apenas plano do preço aprovado', async () => {
    stripe.subscriptions.list.mockResolvedValue({ data: [subscription()], has_more: false });
    await deliver();
    await deliver();
    expect(row.plano).toBe(Plano.BASIC);
    expect(stripe.subscriptions.list).toHaveBeenCalledTimes(1);
    expect(db.eventoStripe.create).toHaveBeenCalledTimes(1);
    expect(db.empresa.update).not.toHaveBeenCalled();
  });

  it('evento antigo de pagamento não reativa assinatura já cancelada no Stripe', async () => {
    row.subscriptionId = 'sub_1';
    row.plano = Plano.BASIC;
    stripe.subscriptions.list.mockResolvedValue({
      data: [subscription({ status: 'canceled' })],
      has_more: false,
    });
    await deliver();
    expect(row.status).toBe('canceled');
    expect(row.plano).toBe(Plano.FREE);
  });

  it('mantém acesso até o fim do período cancelado, sem tratar retorno do checkout como confirmação', async () => {
    stripe.subscriptions.list.mockResolvedValue({
      data: [subscription({ cancel_at: 1_800_000_000 })],
      has_more: false,
    });
    await deliver('evt_cancel', 'customer.subscription.updated');
    expect(row.plano).toBe(Plano.BASIC);
    expect(row.cancelarEm).toEqual(new Date(1_800_000_000_000));
  });

  it('fatura não paga impede ativação mesmo se subscription ainda estiver active', async () => {
    stripe.subscriptions.list.mockResolvedValue({
      data: [subscription({ latest_invoice: { status: 'open' } })],
      has_more: false,
    });
    await deliver('evt_pending', 'checkout.session.completed');
    expect(row.plano).toBe(Plano.FREE);
  });

  it('preço desconhecido não grava recibo e permite retentativa após reconciliação', async () => {
    stripe.subscriptions.list.mockResolvedValue({
      data: [subscription({ items: { data: [{ quantity: 1, price: { id: 'price_other' } }] } })],
      has_more: false,
    });
    await expect(deliver()).rejects.toBeInstanceOf(BadRequestException);
    expect(receipts.size).toBe(0);
  });

  it('portal usa somente o customer da empresa autenticada e retorno fixo', async () => {
    row.subscriptionId = 'sub_1';
    stripe.billingPortal.sessions.create.mockResolvedValue({
      url: 'https://billing.stripe.com/test',
    });
    await service.portal('e1');
    expect(stripe.billingPortal.sessions.create).toHaveBeenCalledWith(
      expect.objectContaining({
        customer: 'cus_1',
        return_url: 'http://localhost:3002/assinatura',
      }),
    );
  });

  it('recupera o estado canônico quando um webhook não chegou', async () => {
    stripe.subscriptions.list.mockResolvedValue({ data: [subscription()], has_more: false });
    const result = await service.atualizar('e1');
    expect(result.plano).toBe(Plano.BASIC);
    expect(receipts.size).toBe(0);
  });

  function configurarProducao(planoIndex = 0, overrides: Record<string, unknown> = {}) {
    gateway.mode = 'live';
    gateway.livemode = true;
    gateway.planos = [...PLANOS_LIVE];
    gateway.portalId = PORTAL_LIVE;
    gateway.origin = 'https://nexly-web.vercel.app';
    row.ambiente = 'live';
    stripe.subscriptions.list.mockResolvedValue({
      data: [
        subscription({
          livemode: true,
          items: {
            data: [
              {
                quantity: 1,
                price: { id: PLANOS_LIVE[planoIndex]!.precoId },
                current_period_end: 1_800_000_000,
              },
            ],
          },
          ...overrides,
        }),
      ],
      has_more: false,
    });
  }

  it('libera o plano comercial somente com confirmação canônica paga em produção', async () => {
    configurarProducao();
    await deliver('evt_live_paid', 'invoice.paid', { livemode: true });
    expect(db.empresa.update).toHaveBeenCalledWith({
      where: { id: 'e1' },
      data: { plano: Plano.BASIC },
    });
    expect(row.plano).toBe(Plano.BASIC);
    await deliver('evt_live_paid', 'invoice.paid', { livemode: true });
    expect(db.empresa.update).toHaveBeenCalledTimes(1);
  });

  it('um evento de teste nunca altera acesso em produção, mesmo com assinatura válida', async () => {
    configurarProducao();
    await expect(deliver()).rejects.toBeInstanceOf(BadRequestException);
    expect(db.empresa.update).not.toHaveBeenCalled();
    expect(stripe.subscriptions.list).not.toHaveBeenCalled();
  });

  it('não contrata, reconcilia nem abre portal para vínculo de outro ambiente', async () => {
    row.ambiente = 'live';
    row.subscriptionId = 'sub_live';
    const status = await service.status('e1');
    expect(status).toMatchObject({
      disponivel: false,
      podeGerenciar: false,
      plano: 'FREE',
      status: 'environment_mismatch',
    });
    await expect(service.checkout('e1', 'BASIC')).rejects.toBeInstanceOf(ConflictException);
    await expect(service.portal('e1')).rejects.toBeInstanceOf(ConflictException);
    await expect(service.atualizar('e1')).rejects.toBeInstanceOf(ConflictException);
    expect(stripe.checkout.sessions.create).not.toHaveBeenCalled();
    expect(stripe.billingPortal.sessions.create).not.toHaveBeenCalled();
    expect(db.empresa.update).not.toHaveBeenCalled();
  });

  it('ignora webhook de customer vinculado a outro ambiente sem alterar a empresa', async () => {
    row.ambiente = 'live';
    await deliver();
    expect(stripe.subscriptions.list).not.toHaveBeenCalled();
    expect(db.empresa.update).not.toHaveBeenCalled();
  });

  it('revoga o plano quando uma assinatura real foi cancelada', async () => {
    configurarProducao();
    row.subscriptionId = 'sub_1';
    const current = (await stripe.subscriptions.list()).data[0];
    stripe.subscriptions.list.mockResolvedValue({
      data: [{ ...current, status: 'canceled' }],
      has_more: false,
    });
    await deliver('evt_live_canceled', 'customer.subscription.deleted', { livemode: true });
    expect(db.empresa.update).toHaveBeenCalledWith({
      where: { id: 'e1' },
      data: { plano: Plano.FREE },
    });
  });

  it('não concede acesso por uma fatura antiga fora do período pago', async () => {
    stripe.subscriptions.list.mockResolvedValue({
      data: [
        subscription({
          items: {
            data: [{ quantity: 1, price: { id: PLANOS[0].precoId }, current_period_end: 1 }],
          },
        }),
      ],
      has_more: false,
    });
    await deliver();
    expect(row.plano).toBe(Plano.FREE);
  });

  it('conserva o plano já pago enquanto um aumento aguarda pagamento', async () => {
    row.plano = Plano.BASIC;
    row.periodoFim = new Date(1_800_000_000_000);
    stripe.subscriptions.list.mockResolvedValue({
      data: [
        subscription({
          pending_update: { expires_at: 1_800_000_000 },
          latest_invoice: { status: 'open' },
        }),
      ],
      has_more: false,
    });
    await deliver();
    expect(row.plano).toBe(Plano.BASIC);
  });

  it('não mantém plano real quando o Stripe já não encontra a assinatura', async () => {
    configurarProducao();
    row.subscriptionId = 'sub_1';
    stripe.subscriptions.list.mockResolvedValue({ data: [], has_more: false });
    await deliver('evt_live_missing', 'customer.subscription.deleted', { livemode: true });
    expect(db.empresa.update).toHaveBeenCalledWith({
      where: { id: 'e1' },
      data: { plano: Plano.FREE },
    });
  });

  it('cancelamento agendado mantém o plano pago e só revoga após o encerramento canônico', async () => {
    configurarProducao(1, { cancel_at_period_end: true });
    await deliver('evt_cancel_scheduled', 'customer.subscription.updated', { livemode: true });
    expect(row).toMatchObject({ plano: Plano.PRO, cancelarEm: new Date(1_800_000_000_000) });
    expect(db.empresa.update).toHaveBeenLastCalledWith({
      where: { id: 'e1' },
      data: { plano: Plano.PRO },
    });
    configurarProducao(1, { status: 'canceled' });
    await deliver('evt_cancel_finished', 'customer.subscription.deleted', { livemode: true });
    expect(row.plano).toBe(Plano.FREE);
    expect(db.empresa.update).toHaveBeenLastCalledWith({
      where: { id: 'e1' },
      data: { plano: Plano.FREE },
    });
  });

  it('renovação recusada suspende o plano e pagamento recuperado restaura somente o plano pago', async () => {
    configurarProducao(1);
    await deliver('evt_before_renewal', 'invoice.paid', { livemode: true });
    configurarProducao(1, { status: 'past_due', latest_invoice: { status: 'open' } });
    await deliver('evt_renewal_failed', 'invoice.payment_failed', { livemode: true });
    expect(row).toMatchObject({ plano: Plano.FREE, status: 'past_due' });
    expect(db.empresa.update).toHaveBeenLastCalledWith({
      where: { id: 'e1' },
      data: { plano: Plano.FREE },
    });
    configurarProducao(1);
    await deliver('evt_renewal_recovered', 'invoice.paid', { livemode: true });
    expect(row).toMatchObject({ plano: Plano.PRO, status: 'active' });
    expect(db.empresa.update).toHaveBeenLastCalledWith({
      where: { id: 'e1' },
      data: { plano: Plano.PRO },
    });
  });

  it('aumento pendente preserva Essencial e só libera Profissional após pagamento confirmado', async () => {
    configurarProducao();
    await deliver('evt_basic_paid', 'invoice.paid', { livemode: true });
    configurarProducao(0, {
      pending_update: { expires_at: 1_800_000_000 },
      latest_invoice: { status: 'open' },
    });
    await deliver('evt_upgrade_pending', 'customer.subscription.updated', { livemode: true });
    expect(row.plano).toBe(Plano.BASIC);
    expect(db.empresa.update).toHaveBeenLastCalledWith({
      where: { id: 'e1' },
      data: { plano: Plano.BASIC },
    });
    configurarProducao(1);
    await deliver('evt_upgrade_paid', 'invoice.paid', { livemode: true });
    expect(row.plano).toBe(Plano.PRO);
    expect(db.empresa.update).toHaveBeenLastCalledWith({
      where: { id: 'e1' },
      data: { plano: Plano.PRO },
    });
  });

  it('falha temporária no provedor não confirma evento e permite nova entrega', async () => {
    configurarProducao();
    stripe.subscriptions.list.mockRejectedValueOnce(new Error('temporary provider timeout'));
    await expect(deliver('evt_retryable', 'invoice.paid', { livemode: true })).rejects.toThrow();
    expect(receipts.has('evt_retryable')).toBe(false);
    expect(db.empresa.update).not.toHaveBeenCalled();
    await deliver('evt_retryable', 'invoice.paid', { livemode: true });
    expect(row.plano).toBe(Plano.BASIC);
    expect(receipts.has('evt_retryable')).toBe(true);
    expect(db.empresa.update).toHaveBeenCalledTimes(1);
  });

  it('redução agendada conserva o plano vigente até o Stripe aplicar o novo preço', async () => {
    configurarProducao(1, { schedule: 'sub_sched_downgrade' });
    await deliver('evt_downgrade_scheduled', 'customer.subscription.updated', { livemode: true });
    expect(row.plano).toBe(Plano.PRO);
    expect(db.empresa.update).toHaveBeenLastCalledWith({
      where: { id: 'e1' },
      data: { plano: Plano.PRO },
    });
    configurarProducao();
    await deliver('evt_downgrade_applied', 'invoice.paid', { livemode: true });
    expect(row.plano).toBe(Plano.BASIC);
    expect(db.empresa.update).toHaveBeenLastCalledWith({
      where: { id: 'e1' },
      data: { plano: Plano.BASIC },
    });
    await deliver('evt_delayed_failure', 'invoice.payment_failed', { livemode: true });
    expect(row.plano).toBe(Plano.BASIC);
  });
});
