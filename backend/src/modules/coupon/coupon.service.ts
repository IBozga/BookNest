import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Coupon } from '../../entities';
import { CartService } from '../cart/cart.service';
import { round2 } from '../../common/utils/money';

/** Generic on purpose: expired, exhausted and unknown codes are indistinguishable to the caller. */
const INVALID_COUPON_MESSAGE = 'This coupon code is not valid';

@Injectable()
export class CouponService {
  constructor(
    @InjectRepository(Coupon)
    private readonly couponRepo: Repository<Coupon>,
    private readonly cartService: CartService,
  ) {}

  static normalise(code: string): string {
    return code.trim().toUpperCase();
  }

  /** Returns the coupon when it exists, has not expired and still has uses left; throws otherwise. */
  async findValid(code: string): Promise<Coupon> {
    const coupon = await this.couponRepo.findOne({ where: { code: CouponService.normalise(code) } });
    const expired = coupon?.expiresAt ? Date.parse(coupon.expiresAt) < Date.now() : false;
    if (!coupon || expired || coupon.usedCount >= coupon.maxUses) {
      throw new BadRequestException(INVALID_COUPON_MESSAGE);
    }
    return coupon;
  }

  discountFor(coupon: Coupon, subtotal: number): number {
    return round2((subtotal * coupon.discountPercent) / 100);
  }

  /** Checks a code against the caller's current cart and previews the discount. */
  async validate(code: string, userId: string) {
    const coupon = await this.findValid(code);
    const cart = await this.cartService.getCart(userId);
    return {
      code: coupon.code,
      discountPercent: coupon.discountPercent,
      discountAmount: this.discountFor(coupon, cart.subtotal),
    };
  }

  /** Atomically claims one use; returns false when the coupon ran out in the meantime. */
  async redeem(code: string): Promise<boolean> {
    const result = await this.couponRepo
      .createQueryBuilder()
      .update(Coupon)
      .set({ usedCount: () => '"usedCount" + 1' })
      .where('code = :code AND "usedCount" < "maxUses"', { code: CouponService.normalise(code) })
      .execute();
    return !!result.affected;
  }

  /** Gives a claimed use back (e.g. when the payment was declined). */
  async release(code: string): Promise<void> {
    await this.couponRepo
      .createQueryBuilder()
      .update(Coupon)
      .set({ usedCount: () => '"usedCount" - 1' })
      .where('code = :code AND "usedCount" > 0', { code: CouponService.normalise(code) })
      .execute();
  }
}
