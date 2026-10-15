import { BadRequestException } from '@nestjs/common';
import { CouponService } from './coupon.service';

const buildService = (coupon: any, cartSubtotal = 40) => {
  const execute = jest.fn().mockResolvedValue({ affected: 1 });
  const where = jest.fn().mockReturnThis();
  const set = jest.fn().mockReturnThis();
  const qb = { update: jest.fn().mockReturnThis(), set, where, execute };
  const couponRepo = {
    findOne: jest.fn().mockResolvedValue(coupon),
    createQueryBuilder: jest.fn(() => qb),
  };
  const cartService = { getCart: jest.fn().mockResolvedValue({ subtotal: cartSubtotal }) };
  const service = new CouponService(couponRepo as any, cartService as any);
  return { service, couponRepo, cartService, qb, where, execute };
};

const activeCoupon = (overrides: any = {}) => ({
  code: 'BOOKNEST10',
  discountPercent: 10,
  maxUses: 5,
  usedCount: 0,
  expiresAt: null,
  ...overrides,
});

describe('CouponService', () => {
  it('normalises the code (trim + uppercase) for the lookup', async () => {
    const { service, couponRepo } = buildService(activeCoupon());
    await service.findValid('  booknest10 ');
    expect(couponRepo.findOne).toHaveBeenCalledWith({ where: { code: 'BOOKNEST10' } });
  });

  it('accepts an active coupon', async () => {
    const { service } = buildService(activeCoupon());
    await expect(service.findValid('BOOKNEST10')).resolves.toMatchObject({ code: 'BOOKNEST10' });
  });

  it.each([
    ['unknown', null],
    ['expired', activeCoupon({ expiresAt: new Date(Date.now() - 1000).toISOString() })],
    ['exhausted', activeCoupon({ usedCount: 5 })],
  ])('rejects a %s coupon with the same generic message', async (_label, coupon) => {
    const { service } = buildService(coupon);
    await expect(service.findValid('X')).rejects.toThrow(
      new BadRequestException('This coupon code is not valid'),
    );
  });

  it('computes the discount as a percentage rounded to cents', () => {
    const { service } = buildService(activeCoupon());
    expect(service.discountFor(activeCoupon() as any, 33.33)).toBe(3.33);
    expect(service.discountFor(activeCoupon({ discountPercent: 25 }) as any, 40)).toBe(10);
  });

  it('previews the discount against the caller cart', async () => {
    const { service, cartService } = buildService(activeCoupon(), 60);
    await expect(service.validate('booknest10', 'user-1')).resolves.toEqual({
      code: 'BOOKNEST10',
      discountPercent: 10,
      discountAmount: 6,
    });
    expect(cartService.getCart).toHaveBeenCalledWith('user-1');
  });

  it('redeem claims a use atomically and reports whether a row was affected', async () => {
    const { service, where, execute } = buildService(activeCoupon());
    await expect(service.redeem('booknest10')).resolves.toBe(true);
    expect(where).toHaveBeenCalledWith('code = :code AND "usedCount" < "maxUses"', { code: 'BOOKNEST10' });

    execute.mockResolvedValue({ affected: 0 });
    await expect(service.redeem('booknest10')).resolves.toBe(false);
  });

  it('release gives a use back but never below zero', async () => {
    const { service, where } = buildService(activeCoupon());
    await service.release('booknest10');
    expect(where).toHaveBeenCalledWith('code = :code AND "usedCount" > 0', { code: 'BOOKNEST10' });
  });
});
