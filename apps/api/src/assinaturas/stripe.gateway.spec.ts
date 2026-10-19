import Stripe from 'stripe';
import { StripeGateway } from './stripe.gateway';

describe('Credenciais e assinatura criptográfica do Stripe', () => {
  const original = { ...process.env };
  beforeEach(() => {
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
    expect(() => new StripeGateway().origin).toThrow('Endereço de retorno inválido');
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
