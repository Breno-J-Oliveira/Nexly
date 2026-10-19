import {
  BadRequestException,
  ConflictException,
  HttpException,
  HttpStatus,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { Plano, Prisma } from '@prisma/client';
import type Stripe from 'stripe';
import { PrismaService } from '../database/prisma.service';
import { RedisService } from '../redis/redis.service';
import { ESTADOS_EM_ANDAMENTO, PLANOS, PORTAL_SANDBOX } from './catalogo';
import { StripeGateway } from './stripe.gateway';

/** Assinaturas exclusivamente de teste; não concede nem remove módulos comerciais. */
@Injectable()
export class AssinaturasService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly gateway: StripeGateway,
    private readonly redis: RedisService,
  ) {}

  async status(empresaId: string) {
    const assinatura = await this.prisma.client.assinatura.findUnique({ where: { empresaId } });
    return {
      disponivel: this.gateway.enabled,
      ambiente: 'test' as const,
      plano: assinatura?.plano ?? Plano.FREE,
      status: assinatura?.status ?? 'none',
      periodoFim: assinatura?.periodoFim ?? null,
      cancelarEm: assinatura?.cancelarEm ?? null,
      podeGerenciar: Boolean(assinatura?.customerId && assinatura?.subscriptionId),
      emAndamento: ESTADOS_EM_ANDAMENTO.has(assinatura?.status ?? ''),
      planos: PLANOS.map(({ id, nome, centavos }) => ({ id, nome, centavos })),
    };
  }

  private async limitar(empresaId: string): Promise<void> {
    const limit = await this.redis.consumeLimit(`billing:${empresaId}`, 10, 60);
    if (!limit)
      throw new ServiceUnavailableException(
        'Não foi possível validar esta operação. Tente novamente.',
      );
    if (!limit.allowed)
      throw new HttpException(
        'Aguarde um minuto antes de tentar novamente.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
  }

  async checkout(empresaId: string, plano: string) {
    const tier = PLANOS.find((item) => item.id === plano);
    if (!tier) throw new BadRequestException('Plano inválido.');
    const stripe = this.gateway.client;
    const origin = this.gateway.origin;
    await this.limitar(empresaId);
    // Confere a oferta no provedor antes de iniciar qualquer checkout.
    const price = await stripe.prices.retrieve(tier.precoId);
    if (
      price.livemode ||
      !price.active ||
      price.currency !== 'brl' ||
      price.unit_amount !== tier.centavos ||
      price.recurring?.interval !== 'month' ||
      price.recurring.interval_count !== 1
    ) {
      throw new ServiceUnavailableException('Este plano não está disponível para contratação.');
    }
    try {
      await this.prisma.client.assinatura.upsert({
        where: { empresaId },
        create: { empresaId },
        update: {},
      });
    } catch (error) {
      // O extension pode fazer o Prisma emular upsert. Outra réplica já criou
      // a linha: continuamos pelo lock transacional da mesma empresa.
      if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== 'P2002')
        throw error;
    }

    const result = await this.prisma.client.$transaction(
      async (tx) => {
        // UPDATE obtém o lock da linha. Serializa sessões e webhooks entre réplicas.
        let row = await tx.assinatura.update({
          where: { empresaId },
          data: { updatedAt: new Date() },
        });
        try {
          if (!row.customerId) {
            const customer = await stripe.customers.create(
              {},
              { idempotencyKey: `nexly-customer-${empresaId}` },
            );
            if (customer.livemode)
              throw new ServiceUnavailableException('Ambiente de cobrança inválido.');
            row = await tx.assinatura.update({
              where: { empresaId },
              data: { customerId: customer.id },
            });
          }
          const customer = row.customerId!;
          const subscriptions = await stripe.subscriptions.list({
            customer,
            status: 'all',
            limit: 100,
          });
          if (
            subscriptions.has_more ||
            subscriptions.data.some((item) => ESTADOS_EM_ANDAMENTO.has(item.status))
          ) {
            throw new ConflictException(
              'Já existe uma assinatura em andamento. Use Gerenciar assinatura.',
            );
          }
          if (row.checkoutId) {
            const session = await stripe.checkout.sessions.retrieve(row.checkoutId);
            if (session.status === 'complete')
              throw new ConflictException('Pagamento em processamento. Aguarde a confirmação.');
            if (session.status === 'open') {
              if (row.checkoutPlano === tier.id && session.url) return { url: session.url };
              await stripe.checkout.sessions.expire(session.id);
            }
            row = await tx.assinatura.update({
              where: { empresaId },
              data: { checkoutId: null, checkoutChave: null },
            });
          }
          // A chave é persistida mesmo se o Stripe responder com timeout.
          // Repetir a tentativa recupera a mesma sessão, em vez de cobrar duas vezes.
          const key = row.checkoutChave ?? randomUUID();
          if (row.checkoutChave && row.checkoutPlano !== tier.id) {
            throw new ConflictException(
              'Tente novamente o plano anterior para recuperar o checkout pendente.',
            );
          }
          await tx.assinatura.update({
            where: { empresaId },
            data: { checkoutChave: key, checkoutPlano: tier.id },
          });
          const session = await stripe.checkout.sessions.create(
            {
              mode: 'subscription',
              customer,
              line_items: [{ price: tier.precoId, quantity: 1 }],
              subscription_data: { billing_mode: { type: 'flexible' } },
              integration_identifier: 'nexly_subscription_qihjvpxs',
              success_url: `${origin}/assinatura?retorno=sucesso`,
              cancel_url: `${origin}/assinatura?retorno=cancelado`,
              locale: 'pt-BR',
            },
            { idempotencyKey: key },
          );
          if (session.livemode || !session.url)
            throw new ServiceUnavailableException('Checkout indisponível.');
          await tx.assinatura.update({ where: { empresaId }, data: { checkoutId: session.id } });
          return { url: session.url };
        } catch (error) {
          return { error };
        }
      },
      { maxWait: 5000, timeout: 60_000 },
    );
    if ('error' in result) {
      if (result.error instanceof HttpException) throw result.error;
      throw new ServiceUnavailableException(
        'O Stripe não respondeu. Tente novamente; sua tentativa será recuperada com segurança.',
      );
    }
    return result;
  }

  async portal(empresaId: string) {
    const stripe = this.gateway.client;
    await this.limitar(empresaId);
    const row = await this.prisma.client.assinatura.findUnique({ where: { empresaId } });
    if (!row?.customerId || !row.subscriptionId)
      throw new BadRequestException('Nenhuma assinatura encontrada.');
    const session = await stripe.billingPortal.sessions.create({
      customer: row.customerId,
      configuration: PORTAL_SANDBOX,
      return_url: `${this.gateway.origin}/assinatura`,
      locale: 'pt-BR',
    });
    return { url: session.url };
  }

  async webhook(body: Buffer, signature: string) {
    let event: Stripe.Event;
    try {
      event = this.gateway.verify(body, signature);
    } catch (error) {
      if (error instanceof ServiceUnavailableException) throw error;
      throw new BadRequestException('Assinatura do webhook inválida.');
    }
    if (event.livemode || event.account)
      throw new BadRequestException('Ambiente do evento inválido.');
    const supported =
      event.type.startsWith('customer.subscription.') ||
      [
        'invoice.paid',
        'invoice.payment_failed',
        'checkout.session.completed',
        'checkout.session.async_payment_succeeded',
        'checkout.session.async_payment_failed',
      ].includes(event.type);
    if (!supported) return { received: true };
    const object = event.data.object as
      Stripe.Subscription | Stripe.Invoice | Stripe.Checkout.Session;
    const customerId = typeof object.customer === 'string' ? object.customer : object.customer?.id;
    if (!customerId) return { received: true };
    // O customer pertence à empresa no banco; nunca confiamos em metadata enviada pelo cliente.
    const owner = await this.prisma.client.assinatura.findUnique({ where: { customerId } });
    if (!owner) return { received: true };
    await this.reconcile(owner.empresaId, { id: event.id, type: event.type });
    return { received: true };
  }

  async atualizar(empresaId: string) {
    if (!this.gateway.enabled) return this.status(empresaId);
    await this.limitar(empresaId);
    const row = await this.prisma.client.assinatura.findUnique({ where: { empresaId } });
    if (row?.customerId) await this.reconcile(empresaId);
    return this.status(empresaId);
  }

  private async reconcile(empresaId: string, event?: { id: string; type: string }) {
    await this.prisma.client.$transaction(
      async (tx) => {
        const row = await tx.assinatura.update({
          where: { empresaId },
          data: { updatedAt: new Date() },
        });
        if (!row.customerId) return;
        if (event && (await tx.eventoStripe.findUnique({ where: { id: event.id } }))) return;
        const subscriptions = await this.gateway.client.subscriptions.list({
          customer: row.customerId,
          status: 'all',
          limit: 100,
          expand: ['data.latest_invoice'],
        });
        const ongoing = subscriptions.data.filter((item) => ESTADOS_EM_ANDAMENTO.has(item.status));
        if (subscriptions.has_more || ongoing.length > 1)
          throw new ConflictException('Assinaturas conflitantes; reconciliação necessária.');
        const current =
          ongoing[0] ??
          subscriptions.data.find((item) => item.id === row.subscriptionId) ??
          subscriptions.data[0];
        if (current) {
          if (current.livemode) throw new BadRequestException('Assinatura fora do Sandbox.');
          const item = current.items.data[0];
          const tier =
            current.items.data.length === 1 && item?.quantity === 1
              ? PLANOS.find((plan) => plan.precoId === item.price.id)
              : undefined;
          if (!tier || !item) throw new BadRequestException('Preço da assinatura não reconhecido.');
          const invoice =
            typeof current.latest_invoice === 'object' ? current.latest_invoice : null;
          const paid =
            current.status === 'active' && !current.pause_collection && invoice?.status === 'paid';
          await tx.assinatura.update({
            where: { empresaId: row.empresaId },
            data: {
              subscriptionId: current.id,
              status: current.status,
              plano: paid ? tier.id : Plano.FREE,
              periodoFim: item.current_period_end ? new Date(item.current_period_end * 1000) : null,
              cancelarEm: current.cancel_at
                ? new Date(current.cancel_at * 1000)
                : current.cancel_at_period_end && item.current_period_end
                  ? new Date(item.current_period_end * 1000)
                  : null,
              checkoutId: null,
              checkoutChave: null,
              checkoutPlano: null,
            },
          });
        }
        if (event) await tx.eventoStripe.create({ data: { id: event.id, tipo: event.type } });
      },
      { maxWait: 5000, timeout: 30_000 },
    );
  }
}
