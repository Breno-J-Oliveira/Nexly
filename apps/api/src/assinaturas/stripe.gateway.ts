import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import Stripe from 'stripe';
import { z } from 'zod';
import { PLANOS, PLANOS_LIVE, PORTAL_LIVE, PORTAL_SANDBOX } from './catalogo';

const settings = z.object({
  STRIPE_ENABLED: z.literal('true'),
  key: z.string().min(1),
  webhookSecret: z.string().startsWith('whsec_'),
  STRIPE_RETURN_ORIGIN: z.string().url(),
});

@Injectable()
export class StripeGateway {
  readonly mode = process.env.STRIPE_MODE === 'live' ? 'live' : 'test';
  private readonly config = settings.safeParse({
    ...process.env,
    key:
      this.mode === 'live'
        ? process.env.STRIPE_LIVE_RESTRICTED_KEY
        : process.env.STRIPE_RESTRICTED_KEY,
    webhookSecret:
      this.mode === 'live'
        ? process.env.STRIPE_LIVE_WEBHOOK_SECRET
        : process.env.STRIPE_WEBHOOK_SECRET,
  });
  private readonly instance =
    this.config.success && this.validConfiguration()
      ? new Stripe(this.config.data.key, { maxNetworkRetries: 1, timeout: 10_000 })
      : null;

  private validConfiguration(): boolean {
    if (!this.config.success || !['test', 'live'].includes(process.env.STRIPE_MODE ?? 'test'))
      return false;
    const { key, STRIPE_RETURN_ORIGIN } = this.config.data;
    const url = new URL(STRIPE_RETURN_ORIGIN);
    const local = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
    if (
      url.username ||
      url.password ||
      (url.protocol !== 'https:' && !(local && url.protocol === 'http:'))
    )
      return false;
    return this.mode === 'live'
      ? process.env.NODE_ENV === 'production' && /^rk_live_/.test(key) && !local
      : /^(rk|sk)_test_/.test(key);
  }

  get livemode(): boolean {
    return this.mode === 'live';
  }

  get planos() {
    return this.livemode ? PLANOS_LIVE : PLANOS;
  }

  get portalId(): string {
    return this.livemode ? PORTAL_LIVE : PORTAL_SANDBOX;
  }

  get enabled(): boolean {
    return this.instance !== null;
  }

  get client(): Stripe {
    if (!this.instance)
      throw new ServiceUnavailableException(
        'As assinaturas estão em preparação. Nenhuma cobrança foi iniciada.',
      );
    return this.instance;
  }

  get origin(): string {
    if (!this.config.success || !this.enabled)
      throw new ServiceUnavailableException('Assinaturas indisponíveis.');
    const url = new URL(this.config.data.STRIPE_RETURN_ORIGIN);
    if (
      url.protocol !== 'https:' &&
      !(url.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(url.hostname))
    ) {
      throw new ServiceUnavailableException('Endereço de retorno inválido.');
    }
    return url.origin;
  }

  verify(body: Buffer, signature: string): Stripe.Event {
    if (!this.config.success) throw new ServiceUnavailableException('Assinaturas indisponíveis.');
    return this.client.webhooks.constructEvent(body, signature, this.config.data.webhookSecret);
  }
}
