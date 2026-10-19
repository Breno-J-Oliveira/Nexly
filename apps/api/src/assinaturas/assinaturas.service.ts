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
import { ESTADOS_EM_ANDAMENTO } from './catalogo';
import { StripeGateway } from './stripe.gateway';

/** Só a reconciliação autenticada com o Stripe altera o plano comercial em produção. */
@Injectable()
export class AssinaturasService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly gateway: StripeGateway,
    private readonly redis: RedisService,
  ) {}

  async status(empresaId: string) {
    const assinatura = await this.prisma.client.assinatura.findUnique({ where: { empresaId } });
    const incompativel = assinatura && assinatura.ambiente !== this.gateway.mode;
    return {
      disponivel: this.gateway.enabled && !incompativel,
      ambiente: this.gateway.mode,
      plano: !incompativel && assinatura ? assinatura.plano : Plano.FREE,
      status: incompativel ? 'environment_mismatch' : (assinatura?.status ?? 'none'),
      periodoFim: !incompativel ? (assinatura?.periodoFim ?? null) : null,
      cancelarEm: !incompativel ? (assinatura?.cancelarEm ?? null) : null,
      podeGerenciar: !incompativel && Boolean(assinatura?.customerId && assinatura?.subscriptionId),
      emAndamento: !incompativel && ESTADOS_EM_ANDAMENTO.has(assinatura?.status ?? ''),
      planos: this.gateway.planos.map(({ id, nome, centavos }) => ({ id, nome, centavos })),
    };
  }

  private validarAmbiente(assinatura: { ambiente: string }): void {
    if (assinatura.ambiente !== this.gateway.mode)
      throw new ConflictException(
        'Há um vínculo de cobrança de outro ambiente. Solicite a revisão antes de contratar.',
      );
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
    const tier = this.gateway.planos.find((item) => item.id === plano);
    if (!tier) throw new BadRequestException('Plano inválido.');
    const stripe = this.gateway.client;
    const origin = this.gateway.origin;
    await this.limitar(empresaId);
    // Confere a oferta no provedor antes de iniciar qualquer checkout.
    const price = await stripe.prices.retrieve(tier.precoId);
    if (
      price.livemode !== this.gateway.livemode ||
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
        create: { empresaId, ambiente: this.gateway.mode },
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
        this.validarAmbiente(row);
        try {
          if (!row.customerId) {
            const customer = await stripe.customers.create(
              {},
              { idempotencyKey: `nexly-customer-${this.gateway.mode}-${empresaId}` },
            );
            if (customer.livemode !== this.gateway.livemode)
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
            if (session.livemode !== this.gateway.livemode)
              throw new ServiceUnavailableException('Ambiente de cobrança inválido.');
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
          if (session.livemode !== this.gateway.livemode || !session.url)
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
    this.validarAmbiente(row);
    const session = await stripe.billingPortal.sessions.create({
      customer: row.customerId,
      configuration: this.gateway.portalId,
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
    if (event.livemode !== this.gateway.livemode || event.account)
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
    if (!owner || owner.ambiente !== this.gateway.mode) return { received: true };
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
        this.validarAmbiente(row);
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
          if (current.livemode !== this.gateway.livemode)
            throw new BadRequestException('Ambiente da assinatura inválido.');
          const item = current.items.data[0];
          const tier =
            current.items.data.length === 1 && item?.quantity === 1
              ? this.gateway.planos.find((plan) => plan.precoId === item.price.id)
              : undefined;
          if (!tier || !item) throw new BadRequestException('Preço da assinatura não reconhecido.');
          const invoice =
            typeof current.latest_invoice === 'object' ? current.latest_invoice : null;
          const periodoVigente = Boolean(
            item.current_period_end && item.current_period_end * 1000 > Date.now(),
          );
          // Um aumento pendente não remove o plano anterior já pago nem libera o novo.
          const manterPlanoPago = Boolean(
            current.pending_update &&
            row.plano === tier.id &&
            row.periodoFim &&
            row.periodoFim.getTime() > Date.now(),
          );
          const paid =
            current.status === 'active' &&
            !current.pause_collection &&
            periodoVigente &&
            ((!current.pending_update && invoice?.status === 'paid') || manterPlanoPago);
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
          if (this.gateway.livemode) {
            await tx.empresa.update({
              where: { id: row.empresaId },
              data: { plano: paid ? tier.id : Plano.FREE },
            });
          }
        } else if (row.subscriptionId) {
          // Ausência no estado canônico nunca deve deixar um plano pago ativo.
          await tx.assinatura.update({
            where: { empresaId: row.empresaId },
            data: { plano: Plano.FREE, status: 'canceled', periodoFim: null, cancelarEm: null },
          });
          if (this.gateway.livemode)
            await tx.empresa.update({ where: { id: row.empresaId }, data: { plano: Plano.FREE } });
        }
        if (event) await tx.eventoStripe.create({ data: { id: event.id, tipo: event.type } });
      },
      { maxWait: 5000, timeout: 30_000 },
    );
  }
}
