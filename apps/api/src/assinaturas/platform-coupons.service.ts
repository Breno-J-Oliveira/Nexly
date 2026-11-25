import {
  BadRequestException,
  ConflictException,
  HttpException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import type Stripe from 'stripe';
import { StripeGateway } from './stripe.gateway';

const SOURCE = 'nexly_platform';
const CODE_PATTERN = /^[A-Z0-9]{3,32}$/;
const PROMOTION_ID_PATTERN = /^promo_[a-zA-Z0-9]{1,100}$/;
const EXPAND_COUPON = 'promotion.coupon';

type CampaignInput = {
  code: string;
  percentOff: number;
  maxRedemptions?: number;
  expiresAt?: string;
};

@Injectable()
export class PlatformCouponsService {
  constructor(private readonly gateway: StripeGateway) {}

  async list(after?: string, code?: string) {
    const mode = this.gateway.mode;
    if (!this.gateway.enabled)
      return { available: false, mode, linkBase: null, items: [], nextCursor: null };
    return this.provider(async (stripe) => {
      const page = await stripe.promotionCodes.list({
        limit: 100,
        starting_after: after,
        code,
        expand: [`data.${EXPAND_COUPON}`],
      });
      return {
        available: true,
        mode,
        linkBase: `${this.gateway.origin}/assinatura`,
        plans: this.gateway.planos.map(({ id, nome, centavos }) => ({
          id,
          name: nome,
          cents: centavos,
        })),
        items: page.data.flatMap((promotion) => {
          const coupon = this.ownedCoupon(promotion);
          return coupon ? [this.view(promotion, coupon)] : [];
        }),
        nextCursor: page.has_more ? (page.data.at(-1)?.id ?? null) : null,
      };
    });
  }

  async create(input: CampaignInput) {
    const { code, percentOff, maxRedemptions } = input;
    const expiresAt = input.expiresAt ? Math.floor(Date.parse(input.expiresAt) / 1000) : undefined;
    if (!CODE_PATTERN.test(code)) throw new BadRequestException('Código de cupom inválido.');
    if (expiresAt !== undefined && !(expiresAt * 1000 > Date.now()))
      throw new BadRequestException('A validade precisa estar no futuro.');

    return this.provider(async (stripe) => {
      const existing = await stripe.promotionCodes.list({
        code,
        limit: 10,
        expand: [`data.${EXPAND_COUPON}`],
      });
      if (existing.data.length || existing.has_more) {
        const promotion = existing.data[0];
        const coupon = promotion && this.ownedCoupon(promotion);
        if (
          existing.data.length === 1 &&
          !existing.has_more &&
          coupon &&
          promotion.active &&
          coupon.valid &&
          coupon.percent_off === percentOff &&
          promotion.max_redemptions === (maxRedemptions ?? null) &&
          promotion.expires_at === (expiresAt ?? null)
        )
          return this.view(promotion, coupon);
        throw new ConflictException('Este código já foi usado. Escolha outro código.');
      }

      // O identificador determinístico permite retomar quando o cupom foi criado
      // e a resposta do Stripe caiu antes de criar o código promocional.
      const id = this.couponId(code);
      const coupon = await stripe.coupons.retrieve(id).catch(async (error: unknown) => {
        if (this.stripeErrorCode(error) !== 'resource_missing') throw error;
        return stripe.coupons.create(
          {
            id,
            name: `Nexly ${code}`,
            duration: 'once',
            percent_off: percentOff,
            max_redemptions: maxRedemptions,
            redeem_by: expiresAt,
            metadata: { source: SOURCE },
          },
          { idempotencyKey: `nexly-coupon-${code}` },
        );
      });
      if (
        !this.validCoupon(coupon, code) ||
        !coupon.valid ||
        coupon.percent_off !== percentOff ||
        coupon.max_redemptions !== (maxRedemptions ?? null) ||
        coupon.redeem_by !== (expiresAt ?? null)
      )
        throw new ConflictException('Este código já está vinculado a outras condições.');

      const promotion = await stripe.promotionCodes.create(
        {
          code,
          promotion: { type: 'coupon', coupon: id },
          expires_at: expiresAt,
          max_redemptions: maxRedemptions,
          metadata: { source: SOURCE },
          expand: [EXPAND_COUPON],
        },
        { idempotencyKey: `nexly-promotion-${code}` },
      );
      if (!this.ownedCoupon(promotion)) throw new ServiceUnavailableException();
      return this.view(promotion, coupon);
    });
  }

  async disable(id: string) {
    if (!PROMOTION_ID_PATTERN.test(id)) throw new NotFoundException('Cupom não encontrado.');
    return this.provider(async (stripe) => {
      const promotion = await stripe.promotionCodes
        .retrieve(id, { expand: [EXPAND_COUPON] })
        .catch((error: unknown) => {
          if (this.stripeErrorCode(error) === 'resource_missing')
            throw new NotFoundException('Cupom não encontrado.');
          throw error;
        });
      const coupon = this.ownedCoupon(promotion);
      if (!coupon) throw new NotFoundException('Cupom não encontrado.');
      if (!promotion.active) return this.view(promotion, coupon);
      const result = await stripe.promotionCodes.update(id, { active: false });
      return this.view(result, coupon);
    });
  }

  async resolve(code: string): Promise<string> {
    if (!CODE_PATTERN.test(code)) throw new BadRequestException('Código de cupom inválido.');
    return this.provider(async (stripe) => {
      const page = await stripe.promotionCodes.list({
        code,
        active: true,
        limit: 10,
        expand: [`data.${EXPAND_COUPON}`],
      });
      const promotion = page.data.find((candidate) => {
        const coupon = this.ownedCoupon(candidate);
        return candidate.code === code && coupon && this.redeemable(candidate, coupon);
      });
      if (!promotion) throw new BadRequestException('Cupom indisponível, expirado ou esgotado.');
      return promotion.id;
    });
  }

  private async provider<T>(run: (stripe: Stripe) => Promise<T>): Promise<T> {
    try {
      return await run(this.gateway.client);
    } catch (error) {
      if (error instanceof HttpException) throw error;
      const code = this.stripeErrorCode(error);
      if (code === 'resource_already_exists' || code === 'idempotency_key_in_use')
        throw new ConflictException('O código está em uso. Atualize a lista antes de tentar.');
      throw new ServiceUnavailableException('Não foi possível consultar os cupons no Stripe.');
    }
  }

  private stripeErrorCode(error: unknown): string | undefined {
    return error && typeof error === 'object' && 'code' in error && typeof error.code === 'string'
      ? error.code
      : undefined;
  }

  private couponId(code: string) {
    return `nexly-${code}`;
  }

  private validCoupon(coupon: Stripe.Coupon, code: string) {
    return (
      coupon.livemode === this.gateway.livemode &&
      coupon.metadata?.source === SOURCE &&
      coupon.id === this.couponId(code) &&
      coupon.duration === 'once' &&
      coupon.percent_off !== null
    );
  }

  private ownedCoupon(promotion: Stripe.PromotionCode): Stripe.Coupon | null {
    const coupon = promotion.promotion.coupon;
    return promotion.livemode === this.gateway.livemode &&
      promotion.metadata?.source === SOURCE &&
      !promotion.customer &&
      !promotion.customer_account &&
      coupon &&
      typeof coupon === 'object' &&
      this.validCoupon(coupon, promotion.code)
      ? coupon
      : null;
  }

  private redeemable(promotion: Stripe.PromotionCode, coupon: Stripe.Coupon) {
    return (
      promotion.active &&
      coupon.valid &&
      (promotion.expires_at === null || promotion.expires_at * 1000 > Date.now()) &&
      (promotion.max_redemptions === null || promotion.times_redeemed < promotion.max_redemptions)
    );
  }

  private view(promotion: Stripe.PromotionCode, coupon: Stripe.Coupon) {
    return {
      id: promotion.id,
      code: promotion.code,
      percentOff: coupon.percent_off!,
      active: this.redeemable(promotion, coupon),
      maxRedemptions: promotion.max_redemptions,
      timesRedeemed: promotion.times_redeemed,
      expiresAt: promotion.expires_at ? new Date(promotion.expires_at * 1000) : null,
      createdAt: new Date(promotion.created * 1000),
    };
  }
}
