import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import Stripe from 'stripe';
import { z } from 'zod';

const settings = z.object({
  STRIPE_ENABLED: z.literal('true'),
  STRIPE_RESTRICTED_KEY: z.string().regex(/^(rk|sk)_test_/),
  STRIPE_WEBHOOK_SECRET: z.string().startsWith('whsec_'),
  STRIPE_RETURN_ORIGIN: z.string().url(),
});

@Injectable()
export class StripeGateway {
  private readonly config = settings.safeParse(process.env);
  private readonly instance = this.config.success
    ? new Stripe(this.config.data.STRIPE_RESTRICTED_KEY, { maxNetworkRetries: 1, timeout: 10_000 })
    : null;

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
    if (!this.config.success) throw new ServiceUnavailableException('Assinaturas indisponíveis.');
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
    return this.client.webhooks.constructEvent(
      body,
      signature,
      this.config.data.STRIPE_WEBHOOK_SECRET,
    );
  }
}
