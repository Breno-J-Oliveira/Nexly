import Stripe from 'stripe';
import { StripeGateway } from './stripe.gateway';
import { PLANOS, PLANOS_LIVE, PORTAL_LIVE } from './catalogo';

describe('Credenciais e assinatura criptográfica do Stripe', () => {
  const original = { ...process.env };
  beforeEach(() => {
    process.env.STRIPE_MODE = 'test';
    process.env.STRIPE_ENABLED = 'true';
    process.env.STRIPE_RESTRICTED_KEY = 'rk_test_unit_only';
    process.env.STRIPE_WEBHOOK_SECRET = 'whsec_unit_only';
    process.env.STRIPE_RETURN_ORIGIN = 'http://localhost:3002';
  });
  afterEach(() => {
    process.env = { ...original };
  });

  it('fica desativado sem credenciais e rejeita chaves de produção', () => {
    process.env.STRIPE_RESTRICTED_KEY = 'rk_live_unit_only';
    expect(new StripeGateway().enabled).toBe(false);
    delete process.env.STRIPE_RESTRICTED_KEY;
    expect(new StripeGateway().enabled).toBe(false);
  });

  it('usa origem fixa e recusa retorno HTTP fora de localhost', () => {
    process.env.STRIPE_RETURN_ORIGIN = 'https://nexly-web.vercel.app/assinatura';
    expect(new StripeGateway().origin).toBe('https://nexly-web.vercel.app');
    process.env.STRIPE_RETURN_ORIGIN = 'http://example.com';
    expect(new StripeGateway().enabled).toBe(false);
  });

  it('uma chave real isolada não ativa cobranças e não é usada pelo ambiente local', () => {
    process.env.STRIPE_LIVE_RESTRICTED_KEY = 'rk_live_unit_only';
    expect(new StripeGateway().livemode).toBe(false);
    process.env.STRIPE_MODE = 'live';
    process.env.NODE_ENV = 'development';
    process.env.STRIPE_LIVE_WEBHOOK_SECRET = 'whsec_live_unit_only';
    process.env.STRIPE_RETURN_ORIGIN = 'https://nexly-web.vercel.app';
    expect(new StripeGateway().enabled).toBe(false);
  });

  it('produção exige ativação explícita, chave restrita, webhook próprio e HTTPS remoto', () => {
    process.env.NODE_ENV = 'production';
    process.env.STRIPE_MODE = 'live';
    process.env.STRIPE_LIVE_RESTRICTED_KEY = 'rk_live_unit_only';
    delete process.env.STRIPE_LIVE_WEBHOOK_SECRET;
    process.env.STRIPE_RETURN_ORIGIN = 'https://nexly-web.vercel.app';
    expect(new StripeGateway().enabled).toBe(false);
    process.env.STRIPE_LIVE_WEBHOOK_SECRET = 'whsec_live_unit_only';
    const gateway = new StripeGateway();
    expect(gateway.enabled).toBe(true);
    expect(gateway.livemode).toBe(true);
    expect(gateway.planos).toEqual(PLANOS_LIVE);
    expect(gateway.planos[0]?.precoId).not.toBe(PLANOS[0].precoId);
    expect(gateway.portalId).toBe(PORTAL_LIVE);
    process.env.STRIPE_LIVE_RESTRICTED_KEY = 'sk_live_unit_only';
    expect(new StripeGateway().enabled).toBe(false);
    process.env.STRIPE_LIVE_RESTRICTED_KEY = 'rk_live_unit_only';
    process.env.STRIPE_RETURN_ORIGIN = 'https://localhost:3002';
    expect(new StripeGateway().enabled).toBe(false);
    process.env.STRIPE_RETURN_ORIGIN = 'https://nexly-web.vercel.app';
    process.env.STRIPE_ENABLED = 'false';
    expect(new StripeGateway().enabled).toBe(false);
  });

  it('recusa modo desconhecido e chave de teste no modo real', () => {
    process.env.STRIPE_MODE = 'unknown';
    expect(new StripeGateway().enabled).toBe(false);
    process.env.NODE_ENV = 'production';
    process.env.STRIPE_MODE = 'live';
    process.env.STRIPE_LIVE_RESTRICTED_KEY = 'rk_test_unit_only';
    process.env.STRIPE_LIVE_WEBHOOK_SECRET = 'whsec_live_unit_only';
    process.env.STRIPE_RETURN_ORIGIN = 'https://nexly-web.vercel.app';
    expect(new StripeGateway().enabled).toBe(false);
  });

  it('valida assinatura sobre os bytes originais e recusa alteração do payload', () => {
    const payload = JSON.stringify({
      id: 'evt_signed',
      type: 'invoice.paid',
      livemode: false,
      data: { object: {} },
    });
    const header = Stripe.webhooks.generateTestHeaderString({ payload, secret: 'whsec_unit_only' });
    const gateway = new StripeGateway();
    expect(gateway.verify(Buffer.from(payload), header).id).toBe('evt_signed');
    expect(() =>
      gateway.verify(Buffer.from(payload.replace('evt_signed', 'evt_changed')), header),
    ).toThrow();
  });

  it('recusa replay com timestamp expirado', () => {
    const payload = '{}';
    const header = Stripe.webhooks.generateTestHeaderString({
      payload,
      secret: 'whsec_unit_only',
      timestamp: Math.floor(Date.now() / 1000) - 600,
    });
    expect(() => new StripeGateway().verify(Buffer.from(payload), header)).toThrow();
  });
});
