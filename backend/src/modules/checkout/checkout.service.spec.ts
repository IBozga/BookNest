import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { CheckoutService } from './checkout.service';
import {
  User,
  Address,
  CartItem,
  Order,
  OrderItem,
  PaymentTransaction,
  GiftPointLedger,
  Book,
} from '../../entities';
import { UserService } from '../user/user.service';
import { CartService } from '../cart/cart.service';
import { CouponService } from '../coupon/coupon.service';
import { MockPaymentGateway } from './mock-payment-gateway';

const realCouponFor = (percent: number) => ({ code: 'BOOKNEST10', discountPercent: percent });

const buildCouponService = () => ({
  findValid: jest.fn().mockResolvedValue(realCouponFor(10)),
  discountFor: jest.fn((coupon: any, subtotal: number) => Number(((subtotal * coupon.discountPercent) / 100).toFixed(2))),
  redeem: jest.fn().mockResolvedValue(true),
  release: jest.fn().mockResolvedValue(undefined),
});

describe('CheckoutService', () => {
  let service: CheckoutService;
  let mockCartService: any;

  beforeEach(async () => {
    mockCartService = {
      getCart: jest.fn().mockResolvedValue({
        userId: 'user-1',
        totalItems: 1,
        subtotal: 40.0,
        items: [
          {
            id: 'cart-1',
            quantity: 1,
            book: { id: 'book-1', price: 40.0, isAvailable: true, stockQuantity: 5 },
          },
        ],
      }),
    };

    const mockUserService = {
      getDefaultUser: jest.fn().mockResolvedValue({ id: 'user-1', name: 'Alex Johnson', rewardPoints: 500 }),
      getUserById: jest.fn().mockResolvedValue({ id: 'user-1', name: 'Alex Johnson', rewardPoints: 500 }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CheckoutService,
        MockPaymentGateway,
        { provide: getRepositoryToken(User), useValue: { save: jest.fn((u) => Promise.resolve(u)) } },
        { provide: getRepositoryToken(Address), useValue: {} },
        { provide: getRepositoryToken(CartItem), useValue: {} },
        { provide: getRepositoryToken(Order), useValue: {} },
        { provide: getRepositoryToken(OrderItem), useValue: {} },
        { provide: getRepositoryToken(PaymentTransaction), useValue: {} },
        { provide: getRepositoryToken(GiftPointLedger), useValue: {} },
        { provide: getRepositoryToken(Book), useValue: {} },
        { provide: UserService, useValue: mockUserService },
        { provide: CartService, useValue: mockCartService },
        { provide: CouponService, useValue: buildCouponService() },
        { provide: DataSource, useValue: {} },
      ],
    }).compile();

    service = module.get<CheckoutService>(CheckoutService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should calculate checkout pricing with gift points redemption', async () => {
    // 200 points = $2.00 discount
    const calc = await service.calculateCheckout({ redeemPoints: 200 }, 'user-1');

    expect(calc.subtotal).toBe(40.0);
    expect(calc.pointsRedeemed).toBe(200);
    expect(calc.discountAmount).toBe(2.0);
    // Discounted subtotal: $38 > $35 -> shipping: $0
    expect(calc.shippingAmount).toBe(0);
    // Tax 8% on $38 = $3.04
    expect(calc.taxAmount).toBe(3.04);
    // Final total = 38 + 0 + 3.04 = 41.04
    expect(calc.finalTotal).toBe(41.04);
    expect(calc.amountDue).toBe(41.04);
  });

  it('applies a coupon on top of the points discount', async () => {
    // 40 - 2 (points) = 38; 10% coupon of the 40 subtotal = 4.00 -> 34; shipping 4.99; tax 2.72
    const calc = await service.calculateCheckout({ redeemPoints: 200, couponCode: 'booknest10' }, 'user-1');

    expect(calc.couponCode).toBe('BOOKNEST10');
    expect(calc.couponDiscount).toBe(4);
    expect(calc.discountAmount).toBe(6);
    expect(calc.shippingAmount).toBe(4.99);
    expect(calc.taxAmount).toBe(2.72);
    expect(calc.finalTotal).toBe(41.71);
  });

  describe('processOrder', () => {
    const book = { id: 'book-1', title: 'Dune', price: 40, isAvailable: true, stockQuantity: 5 };

    const buildService = async (user: any, couponService = buildCouponService()) => {
      const orderRepo = {
        create: jest.fn((o) => o),
        save: jest.fn((o) => Promise.resolve({ ...o, id: 'order-1' })),
        findOne: jest.fn().mockResolvedValue({ id: 'order-1' }),
      };
      const pointRepo = { create: jest.fn((p) => p), save: jest.fn() };
      const cartRepo = {
        find: jest.fn().mockResolvedValue([{ id: 'c1', quantity: 1, book: { ...book } }]),
        delete: jest.fn(),
      };
      const userRepo = { save: jest.fn((u) => Promise.resolve(u)), update: jest.fn() };
      const bookRepo = { save: jest.fn() };
      const paymentRepo = { create: jest.fn((t) => t), save: jest.fn() };

      const module = await Test.createTestingModule({
        providers: [
          CheckoutService,
          MockPaymentGateway,
          { provide: getRepositoryToken(User), useValue: userRepo },
          { provide: getRepositoryToken(Address), useValue: { findOne: jest.fn().mockResolvedValue({ id: 'addr-1' }) } },
          { provide: getRepositoryToken(CartItem), useValue: cartRepo },
          { provide: getRepositoryToken(Order), useValue: orderRepo },
          { provide: getRepositoryToken(OrderItem), useValue: { create: jest.fn((i) => i), save: jest.fn() } },
          { provide: getRepositoryToken(PaymentTransaction), useValue: paymentRepo },
          { provide: getRepositoryToken(GiftPointLedger), useValue: pointRepo },
          { provide: getRepositoryToken(Book), useValue: bookRepo },
          { provide: UserService, useValue: { getUserById: jest.fn().mockResolvedValue(user) } },
          { provide: CartService, useValue: mockCartService },
          { provide: CouponService, useValue: couponService },
          { provide: DataSource, useValue: {} },
        ],
      }).compile();

      return {
        service: module.get(CheckoutService),
        orderRepo,
        pointRepo,
        cartRepo,
        userRepo,
        bookRepo,
        paymentRepo,
        couponService,
      };
    };

    describe('as a guest', () => {
      it('completes the order, stores the contact email, clears the cart and awards no points', async () => {
        const guest = { id: 'guest-1', name: 'Guest', isGuest: true, rewardPoints: 0 };
        const { service: svc, orderRepo, pointRepo, cartRepo, userRepo } = await buildService(guest);

        const result = await svc.processOrder(
          { addressId: 'addr-1', paymentMethod: 'CREDIT_CARD' as any, email: ' Guest@Example.com ' },
          'guest-1',
        );

        expect(result.success).toBe(true);
        expect(result.pointsEarned).toBe(0);
        expect(result.remainingPoints).toBe(0);
        expect(orderRepo.create).toHaveBeenCalledWith(
          expect.objectContaining({ userId: 'guest-1', contactEmail: 'guest@example.com' }),
        );
        expect(pointRepo.save).not.toHaveBeenCalled();
        expect(cartRepo.delete).toHaveBeenCalledWith({ userId: 'guest-1' });
        expect(userRepo.save).toHaveBeenCalledWith(expect.objectContaining({ rewardPoints: 0 }));
      });

      it('still awards points to a registered user (guest rule does not leak)', async () => {
        const member = { id: 'user-1', name: 'Alex', isGuest: false, rewardPoints: 500 };
        const { service: svc, pointRepo } = await buildService(member);

        const result = await svc.processOrder(
          { addressId: 'addr-1', paymentMethod: 'CREDIT_CARD' as any },
          'user-1',
        );

        expect(result.pointsEarned).toBeGreaterThan(0);
        expect(pointRepo.save).toHaveBeenCalled();
      });

      it('rejects a guest checkout with an empty cart', async () => {
        const guest = { id: 'guest-1', name: 'Guest', isGuest: true, rewardPoints: 0 };
        const { service: svc, cartRepo } = await buildService(guest);
        cartRepo.find.mockResolvedValue([]);

        await expect(
          svc.processOrder({ addressId: 'addr-1', paymentMethod: 'CREDIT_CARD' as any }, 'guest-1'),
        ).rejects.toThrow('Cannot checkout with an empty cart');
      });

      it('rejects a guest attempting to redeem gift points', async () => {
        const guest = { id: 'guest-1', name: 'Guest', isGuest: true, rewardPoints: 0 };
        const { service: svc, orderRepo } = await buildService(guest);

        await expect(
          svc.processOrder({ addressId: 'addr-1', paymentMethod: 'CREDIT_CARD' as any, redeemPoints: 100 }, 'guest-1'),
        ).rejects.toThrow('Requested points exceed available balance');
        expect(orderRepo.save).not.toHaveBeenCalled();
      });
    });

    describe('mock payment gateway', () => {
      const member = () => ({ id: 'user-1', name: 'Alex', isGuest: false, rewardPoints: 500, walletBalance: 0 });

      it('declines a card starting with 0000 without creating an order or touching stock', async () => {
        const { service: svc, orderRepo, bookRepo, cartRepo, paymentRepo } = await buildService(member());

        await expect(
          svc.processOrder(
            {
              addressId: 'addr-1',
              paymentMethod: 'CREDIT_CARD' as any,
              paymentDetails: { cardNumber: '0000 1111 2222 3333' },
            },
            'user-1',
          ),
        ).rejects.toThrow('Payment could not be processed. Please try again.');

        expect(orderRepo.save).not.toHaveBeenCalled();
        expect(bookRepo.save).not.toHaveBeenCalled();
        expect(paymentRepo.save).not.toHaveBeenCalled();
        expect(cartRepo.delete).not.toHaveBeenCalled();
      });

      it('releases a claimed coupon when the payment is declined', async () => {
        const { service: svc, couponService } = await buildService(member());

        await expect(
          svc.processOrder(
            {
              addressId: 'addr-1',
              paymentMethod: 'CREDIT_CARD' as any,
              couponCode: 'BOOKNEST10',
              paymentDetails: { cardNumber: '0000222233334444' },
            },
            'user-1',
          ),
        ).rejects.toThrow('Payment could not be processed');

        expect(couponService.redeem).toHaveBeenCalledWith('BOOKNEST10');
        expect(couponService.release).toHaveBeenCalledWith('BOOKNEST10');
      });

      it('accepts any other card number', async () => {
        const { service: svc } = await buildService(member());
        const result = await svc.processOrder(
          {
            addressId: 'addr-1',
            paymentMethod: 'CREDIT_CARD' as any,
            paymentDetails: { cardNumber: '4242424242424242' },
          },
          'user-1',
        );
        expect(result.success).toBe(true);
      });
    });

    describe('coupons', () => {
      it('stores the coupon code, applies the discount and claims one use', async () => {
        const { service: svc, orderRepo, couponService } = await buildService({
          id: 'user-1',
          isGuest: false,
          rewardPoints: 0,
        });

        const result = await svc.processOrder(
          { addressId: 'addr-1', paymentMethod: 'CREDIT_CARD' as any, couponCode: 'booknest10' },
          'user-1',
        );

        // 40 - 4 = 36 -> free shipping, tax 2.88 -> 38.88
        expect(result.finalAmount).toBe(38.88);
        expect(orderRepo.create).toHaveBeenCalledWith(
          expect.objectContaining({ couponCode: 'BOOKNEST10', discountAmount: 4, finalAmount: 38.88 }),
        );
        expect(couponService.redeem).toHaveBeenCalledWith('BOOKNEST10');
        expect(couponService.release).not.toHaveBeenCalled();
      });

      it('rejects when the coupon ran out between validation and redemption', async () => {
        const couponService = buildCouponService();
        couponService.redeem.mockResolvedValue(false);
        const { service: svc, orderRepo } = await buildService(
          { id: 'user-1', isGuest: false, rewardPoints: 0 },
          couponService,
        );

        await expect(
          svc.processOrder(
            { addressId: 'addr-1', paymentMethod: 'CREDIT_CARD' as any, couponCode: 'BOOKNEST10' },
            'user-1',
          ),
        ).rejects.toThrow('This coupon code is not valid');
        expect(orderRepo.save).not.toHaveBeenCalled();
      });
    });

    describe('wallet', () => {
      it('deducts the wallet first, records walletAmount and charges only the rest', async () => {
        const { service: svc, orderRepo, userRepo, paymentRepo } = await buildService({
          id: 'user-1',
          isGuest: false,
          rewardPoints: 0,
          walletBalance: '25.00',
        });

        const result = await svc.processOrder(
          { addressId: 'addr-1', paymentMethod: 'CREDIT_CARD' as any, useWallet: true },
          'user-1',
        );

        // 40 + 0 shipping + 3.20 tax = 43.20; wallet covers 25 -> 18.20 due
        expect(result.walletApplied).toBe(25);
        expect(orderRepo.create).toHaveBeenCalledWith(
          expect.objectContaining({ finalAmount: 43.2, walletAmount: 25 }),
        );
        expect(paymentRepo.create).toHaveBeenCalledWith(expect.objectContaining({ amount: 18.2 }));
        expect(userRepo.update).toHaveBeenCalledWith('user-1', { walletBalance: 0 });
      });

      it('does not touch the wallet unless requested', async () => {
        const { service: svc, userRepo } = await buildService({
          id: 'user-1',
          isGuest: false,
          rewardPoints: 0,
          walletBalance: '25.00',
        });

        const result = await svc.processOrder(
          { addressId: 'addr-1', paymentMethod: 'CREDIT_CARD' as any },
          'user-1',
        );

        expect(result.walletApplied).toBe(0);
        expect(userRepo.update).not.toHaveBeenCalled();
      });

      it('a wallet that covers the whole total cannot be declined by a 0000 card', async () => {
        const { service: svc } = await buildService({
          id: 'user-1',
          isGuest: false,
          rewardPoints: 0,
          walletBalance: '100.00',
        });

        const result = await svc.processOrder(
          {
            addressId: 'addr-1',
            paymentMethod: 'CREDIT_CARD' as any,
            useWallet: true,
            paymentDetails: { cardNumber: '0000000000000000' },
          },
          'user-1',
        );
        expect(result.success).toBe(true);
      });
    });
  });
});
