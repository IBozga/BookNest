import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import {
  User,
  Address,
  CartItem,
  Order,
  OrderItem,
  OrderStatus,
  PaymentTransaction,
  GiftPointLedger,
  PointTransactionType,
  Book,
} from '../../entities';
import { CalculateCheckoutDto } from '../../common/dto/calculate-checkout.dto';
import { ProcessOrderDto } from '../../common/dto/process-order.dto';
import { UserService } from '../user/user.service';
import { CartService } from '../cart/cart.service';
import { CouponService } from '../coupon/coupon.service';
import { MockPaymentGateway } from './mock-payment-gateway';
import { STORE } from '../store/store.config';
import { round2 } from '../../common/utils/money';

@Injectable()
export class CheckoutService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(Address)
    private readonly addressRepo: Repository<Address>,
    @InjectRepository(CartItem)
    private readonly cartRepo: Repository<CartItem>,
    @InjectRepository(Order)
    private readonly orderRepo: Repository<Order>,
    @InjectRepository(OrderItem)
    private readonly orderItemRepo: Repository<OrderItem>,
    @InjectRepository(PaymentTransaction)
    private readonly paymentRepo: Repository<PaymentTransaction>,
    @InjectRepository(GiftPointLedger)
    private readonly pointRepo: Repository<GiftPointLedger>,
    @InjectRepository(Book)
    private readonly bookRepo: Repository<Book>,
    private readonly userService: UserService,
    private readonly cartService: CartService,
    private readonly couponService: CouponService,
    private readonly gateway: MockPaymentGateway,
    private readonly dataSource: DataSource,
  ) {}

  private computeAmounts(
    subtotal: number,
    redeemPoints: number,
    availablePoints: number,
    couponDiscount: number,
    walletBalance: number,
    useWallet: boolean,
  ) {
    // 1. Points
    const effectivePoints = Math.min(redeemPoints, availablePoints);
    const rawPointDiscount = effectivePoints * STORE.pricing.pointValue;
    const pointDiscount = round2(Math.min(rawPointDiscount, subtotal));
    const pointsUsed = Math.round(pointDiscount / STORE.pricing.pointValue);

    // 2. Coupon applied to the already-point-discounted subtotal
    const afterPoints = subtotal - pointDiscount;
    const couponOff = round2(Math.min(couponDiscount, afterPoints));
    const afterCoupon = afterPoints - couponOff;

    // 3. Shipping and tax on the coupon-discounted subtotal
    const shippingAmount = afterCoupon > STORE.pricing.freeShippingThreshold || afterCoupon === 0
      ? 0
      : STORE.pricing.flatShipping;
    const taxAmount = round2(afterCoupon * STORE.pricing.taxRate);
    const beforeWallet = round2(afterCoupon + shippingAmount + taxAmount);

    // 4. Wallet
    const walletOff = useWallet ? round2(Math.min(walletBalance, beforeWallet)) : 0;
    const amountDue = round2(beforeWallet - walletOff);

    return {
      pointsUsed,
      pointDiscount,
      couponOff,
      shippingAmount,
      taxAmount,
      walletOff,
      finalTotal: beforeWallet,
      amountDue,
    };
  }

  async calculateCheckout(dto: CalculateCheckoutDto, userId?: string) {
    const user = userId
      ? await this.userService.getUserById(userId)
      : await this.userService.getDefaultUser();
    const cart = await this.cartService.getCart(user.id);

    if (cart.items.length === 0) {
      throw new BadRequestException('Shopping cart is empty');
    }

    const subtotal = cart.subtotal;
    const availablePoints = user.rewardPoints || 0;
    const requestedPoints = dto.redeemPoints || 0;

    if (requestedPoints > availablePoints) {
      throw new BadRequestException('Requested points exceed available balance');
    }

    let couponDiscount = 0;
    let couponCode: string | null = null;
    if (dto.couponCode) {
      const coupon = await this.couponService.findValid(dto.couponCode);
      couponDiscount = this.couponService.discountFor(coupon, subtotal);
      couponCode = coupon.code;
    }

    const walletBalance = Number(user.walletBalance) || 0;
    const amounts = this.computeAmounts(
      subtotal,
      requestedPoints,
      availablePoints,
      couponDiscount,
      walletBalance,
      dto.useWallet ?? false,
    );

    return {
      subtotal: round2(subtotal),
      pointsAvailable: availablePoints,
      pointsRedeemed: amounts.pointsUsed,
      discountAmount: round2(amounts.pointDiscount + amounts.couponOff),
      couponDiscount: amounts.couponOff,
      couponCode,
      shippingAmount: amounts.shippingAmount,
      taxAmount: amounts.taxAmount,
      walletApplied: amounts.walletOff,
      walletBalance,
      finalTotal: amounts.finalTotal,
      amountDue: amounts.amountDue,
    };
  }

  async processOrder(dto: ProcessOrderDto, userId?: string) {
    const user = userId
      ? await this.userService.getUserById(userId)
      : await this.userService.getDefaultUser();

    // 1. Validate address
    const address = await this.addressRepo.findOne({
      where: { id: dto.addressId, userId: user.id },
    });
    if (!address) {
      throw new NotFoundException('Delivery address not found');
    }

    // 2. Fetch and validate cart
    const cartItems = await this.cartRepo.find({
      where: { userId: user.id },
      relations: ['book'],
    });

    if (cartItems.length === 0) {
      throw new BadRequestException('Cannot checkout with an empty cart');
    }

    for (const item of cartItems) {
      if (!item.book || !item.book.isAvailable || item.book.stockQuantity < item.quantity) {
        throw new BadRequestException(
          `Insufficient stock for "${item.book ? item.book.title : 'a book'}"`,
        );
      }
    }

    // 3. Pricing
    const subtotal = cartItems.reduce((acc, item) => acc + Number(item.book.price) * item.quantity, 0);
    const availablePoints = user.rewardPoints || 0;
    const requestedPoints = dto.redeemPoints || 0;

    if (requestedPoints > availablePoints) {
      throw new BadRequestException('Requested points exceed available balance');
    }

    let couponDiscount = 0;
    let resolvedCouponCode: string | null = null;
    if (dto.couponCode) {
      const coupon = await this.couponService.findValid(dto.couponCode);
      couponDiscount = this.couponService.discountFor(coupon, subtotal);
      resolvedCouponCode = coupon.code;
    }

    const walletBalance = Number(user.walletBalance) || 0;
    const amounts = this.computeAmounts(
      subtotal,
      requestedPoints,
      availablePoints,
      couponDiscount,
      walletBalance,
      dto.useWallet ?? false,
    );

    // 4. Claim coupon use before charging — release on any failure
    if (resolvedCouponCode) {
      const claimed = await this.couponService.redeem(resolvedCouponCode);
      if (!claimed) {
        throw new BadRequestException('This coupon code is not valid');
      }
    }

    // 5. Mock payment gateway
    const chargeResult = await this.gateway.charge({
      amount: amounts.amountDue,
      method: dto.paymentMethod,
      details: dto.paymentDetails,
    });

    if (!chargeResult.success) {
      if (resolvedCouponCode) {
        await this.couponService.release(resolvedCouponCode);
      }
      throw new BadRequestException('Payment could not be processed. Please try again.');
    }

    // 6. Persist order, items, payment, points, wallet — nothing above is rolled back here because
    //    the payment is already captured, so a crash would leave an orphan charge rather than a
    //    double charge.  The coupon use was already incremented atomically.
    const orderNumber = `ORD-${Date.now().toString().slice(-6)}-${Math.floor(1000 + Math.random() * 9000)}`;

    const order = await this.orderRepo.save(
      this.orderRepo.create({
        orderNumber,
        userId: user.id,
        contactEmail: dto.email ? dto.email.trim().toLowerCase() : null,
        addressId: address.id,
        totalAmount: round2(subtotal),
        discountAmount: round2(amounts.pointDiscount + amounts.couponOff),
        pointsRedeemed: amounts.pointsUsed,
        finalAmount: amounts.finalTotal,
        walletAmount: amounts.walletOff,
        couponCode: resolvedCouponCode,
        paymentMethod: dto.paymentMethod,
        status: OrderStatus.COMPLETED,
      }),
    );

    // Save order items and decrement stock
    for (const item of cartItems) {
      await this.orderItemRepo.save(
        this.orderItemRepo.create({
          orderId: order.id,
          bookId: item.book.id,
          quantity: item.quantity,
          unitPrice: Number(item.book.price),
          totalPrice: round2(Number(item.book.price) * item.quantity),
        }),
      );
      item.book.stockQuantity -= item.quantity;
      if (item.book.stockQuantity <= 0) {
        item.book.isAvailable = false;
      }
      await this.bookRepo.save(item.book);
    }

    // Record payment transaction
    await this.paymentRepo.save(
      this.paymentRepo.create({
        orderId: order.id,
        amount: amounts.amountDue,
        paymentMethod: dto.paymentMethod,
        transactionRef: chargeResult.transactionRef,
        status: 'SUCCESS',
      }),
    );

    // Deduct wallet balance
    if (amounts.walletOff > 0) {
      const newWallet = round2(walletBalance - amounts.walletOff);
      await this.userRepo.update(user.id, { walletBalance: newWallet });
      user.walletBalance = newWallet;
    }

    // Gift-point ledger
    let currentBalance = availablePoints;
    if (amounts.pointsUsed > 0) {
      currentBalance -= amounts.pointsUsed;
      await this.pointRepo.save(
        this.pointRepo.create({
          userId: user.id,
          orderId: order.id,
          pointsChanged: -amounts.pointsUsed,
          type: PointTransactionType.REDEEMED,
          balanceAfter: currentBalance,
          description: `Redeemed ${amounts.pointsUsed} points for discount on ${orderNumber}`,
        }),
      );
    }

    const earnedPoints = user.isGuest ? 0 : Math.floor(amounts.finalTotal * STORE.pricing.pointsEarnedPerUnit);
    if (earnedPoints > 0) {
      currentBalance += earnedPoints;
      await this.pointRepo.save(
        this.pointRepo.create({
          userId: user.id,
          orderId: order.id,
          pointsChanged: earnedPoints,
          type: PointTransactionType.EARNED,
          balanceAfter: currentBalance,
          description: `Earned ${earnedPoints} points from purchase on ${orderNumber}`,
        }),
      );
    }

    user.rewardPoints = currentBalance;
    await this.userRepo.save(user);

    // Clear cart
    await this.cartRepo.delete({ userId: user.id });

    // Return full order
    const fullOrder = await this.orderRepo.findOne({
      where: { id: order.id },
      relations: ['items', 'items.book', 'items.book.category', 'items.book.brand', 'address', 'transactions'],
    });

    return {
      success: true,
      orderId: order.id,
      orderNumber,
      message: 'Your purchase has been completed successfully! Thank you for shopping with us.',
      finalAmount: amounts.finalTotal,
      pointsRedeemed: amounts.pointsUsed,
      pointsEarned: earnedPoints,
      remainingPoints: currentBalance,
      walletApplied: amounts.walletOff,
      order: fullOrder,
    };
  }
}
