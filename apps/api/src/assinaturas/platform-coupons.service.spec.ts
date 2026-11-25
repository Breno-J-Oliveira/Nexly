import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { PlatformCouponsService } from './platform-coupons.service';
import type { StripeGateway } from './stripe.gateway';

const coupon = {
  id: 'nexly-VEMPRONEXLY',
  livemode: false,
  metadata: { source: 'nexly_platform' },
  duration: 'once',
  percent_off: 20,
  valid: true,
  max_redemptions: 10,
  redeem_by: null,
};
const promotion = {
  id: 'promo_nexly',
  livemode: false,
  metadata: { source: 'nexly_platform' },
  code: 'VEMPRONEXLY',
  active: true,
  customer: null,
  customer_account: null,
  promotion: { type: 'coupon', coupon },
  max_redemptions: 10,
  times_redeemed: 3,
  expires_at: null,
  created: 1_700_000_000,
};
const input = { code: promotion.code, percentOff: 20, maxRedemptions: 10 };

describe('PlatformCouponsService', () => {
  function setup(enabled = true) {
    const stripe = {
      coupons: {
        retrieve: jest.fn().mockRejectedValue({ code: 'resource_missing' }),
        create: jest.fn().mockResolvedValue(coupon),
      },
      promotionCodes: {
        list: jest.fn().mockResolvedValue({ data: [], has_more: false }),
        create: jest.fn().mockResolvedValue(promotion),
        retrieve: jest.fn().mockResolvedValue(promotion),
        update: jest.fn().mockResolvedValue({ ...promotion, active: false }),
      },
    };
    const service = new PlatformCouponsService({
      enabled,
      mode: 'test',
      livemode: false,
      origin: 'https://nexly.example',
      client: stripe,
    } as unknown as StripeGateway);
    return { service, stripe };
  }

  it('stores a one-invoice discount and relies on Stripe to cap redemptions', async () => {
    const { service, stripe } = setup();
    await expect(service.create(input)).resolves.toMatchObject({
      code: input.code,
      percentOff: 20,
    });
    expect(stripe.coupons.create).toHaveBeenCalledWith(
      expect.objectContaining({ id: coupon.id, duration: 'once', max_redemptions: 10 }),
      expect.objectContaining({ idempotencyKey: expect.any(String) }),
    );
    expect(stripe.promotionCodes.create).toHaveBeenCalledWith(
      expect.objectContaining({
        promotion: { type: 'coupon', coupon: coupon.id },
        max_redemptions: 10,
      }),
      expect.objectContaining({ idempotencyKey: expect.any(String) }),
    );
  });

  it('recovers a completed creation and rejects different conditions for the same code', async () => {
    const { service, stripe } = setup();
    stripe.promotionCodes.list.mockResolvedValue({ data: [promotion], has_more: false });
    await expect(service.create(input)).resolves.toMatchObject({ id: promotion.id });
    await expect(service.create({ ...input, percentOff: 80 })).rejects.toBeInstanceOf(
      ConflictException,
    );
    expect(stripe.promotionCodes.create).not.toHaveBeenCalled();
  });

  it('rejects inactive, exhausted, expired and unrelated codes', async () => {
    const { service, stripe } = setup();
    for (const invalid of [
      { ...promotion, active: false },
      { ...promotion, times_redeemed: 10 },
      { ...promotion, expires_at: 1_700_000_000 },
      { ...promotion, livemode: true },
      { ...promotion, metadata: {} },
    ]) {
      stripe.promotionCodes.list.mockResolvedValue({ data: [invalid], has_more: false });
      await expect(service.resolve(input.code)).rejects.toBeInstanceOf(BadRequestException);
    }
    stripe.promotionCodes.list.mockResolvedValue({ data: [promotion], has_more: false });
    await expect(service.resolve(input.code)).resolves.toBe(promotion.id);
  });

  it('does not deactivate Stripe promotions outside the Nexly console', async () => {
    const { service, stripe } = setup();
    stripe.promotionCodes.retrieve.mockResolvedValue({ ...promotion, metadata: {} });
    await expect(service.disable(promotion.id)).rejects.toBeInstanceOf(NotFoundException);
    expect(stripe.promotionCodes.update).not.toHaveBeenCalled();
    stripe.promotionCodes.retrieve.mockResolvedValue(promotion);
    await expect(service.disable(promotion.id)).resolves.toMatchObject({ active: false });
  });

  it('exposes an honest unavailable state when Stripe is unconfigured', async () => {
    const { service, stripe } = setup(false);
    await expect(service.list()).resolves.toEqual({
      available: false,
      mode: 'test',
      linkBase: null,
      items: [],
      nextCursor: null,
    });
    expect(stripe.promotionCodes.list).not.toHaveBeenCalled();
  });
});
