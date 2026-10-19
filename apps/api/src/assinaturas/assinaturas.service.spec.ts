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
import { PLANOS } from './catalogo';

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
    origin: 'http://localhost:3002',
    client: stripe,
    verify: jest.fn(),
  };
  const db = {
    assinatura: {
      findUnique: jest.fn(),
      upsert: jest.fn(),
      update: jest.fn(({ data }: { data: Record<string, unknown> }) => {
        row = { ...row, ...data };
        return Promise.resolve(row);
      }),
    },
    empresa: { findUniqueOrThrow: jest.fn().mockResolvedValue({ nome: 'Empresa local' }) },
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
    receipts = new Set();
    row = {
      empresaId: 'e1',
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

  it('não expõe identificadores internos no status', async () => {
    const result = await service.status('e1');
    expect(result.planos.map((p) => p.centavos)).toEqual([4900, 9900, 19900]);
    expect(result).not.toHaveProperty('customerId');
    expect(result).not.toHaveProperty('checkoutChave');
    expect(db.assinatura.findUnique).toHaveBeenCalledWith({ where: { empresaId: 'e1' } });
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
});
