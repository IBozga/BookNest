import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomBytes } from 'crypto';
import { DataSource, Repository } from 'typeorm';
import {
  Order,
  OrderItem,
  Book,
  User,
  PaymentTransaction,
  GiftPointLedger,
  OrderStatus,
  PointTransactionType,
} from '../../entities';
import { UserService } from '../user/user.service';
import { CartService } from '../cart/cart.service';
import { STORE } from '../store/store.config';
import { ModifyOrderDto } from '../../common/dto/modify-order.dto';
import { round2 } from '../../common/utils/money';

/** A completed order can be cancelled for this long after it was placed. */
export const CANCEL_WINDOW_HOURS = 48;
/** After the cancel window, a completed order can be returned for this many days. */
export const RETURN_WINDOW_DAYS = 30;

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

@Injectable()
export class OrderService {
  constructor(
    @InjectRepository(Order)
    private readonly orderRepo: Repository<Order>,
    @InjectRepository(OrderItem)
    private readonly orderItemRepo: Repository<OrderItem>,
    @InjectRepository(Book)
    private readonly bookRepo: Repository<Book>,
    private readonly userService: UserService,
    private readonly cartService: CartService,
    private readonly dataSource: DataSource,
  ) {}

  /** Single source of truth for whether an order can still be cancelled, returned or modified. */
  private eligibility(order: Order, now = Date.now()) {
    const age = now - new Date(order.createdAt).getTime();
    const completed = order.status === OrderStatus.COMPLETED;
    const withinCancelWindow = age <= CANCEL_WINDOW_HOURS * HOUR_MS;
    return {
      canCancel: completed && withinCancelWindow,
      canReturn: completed && !withinCancelWindow && age <= RETURN_WINDOW_DAYS * DAY_MS,
      canModify: completed && withinCancelWindow,
    };
  }

  private withEligibility(order: Order): Order {
    return Object.assign(order, this.eligibility(order));
  }

  async getOrders(userId?: string): Promise<Order[]> {
    const user = userId ? await this.userService.getUserById(userId) : await this.userService.getDefaultUser();

    const orders = await this.orderRepo.find({
      where: { userId: user.id },
      relations: [
        'items',
        'items.book',
        'items.book.category',
        'items.book.brand',
        'address',
        'transactions',
      ],
      order: { createdAt: 'DESC' },
    });
    return orders.map((order) => this.withEligibility(order));
  }

  async getOrderById(orderId: string, userId?: string): Promise<Order> {
    const user = userId ? await this.userService.getUserById(userId) : await this.userService.getDefaultUser();

    const order = await this.orderRepo.findOne({
      where: { id: orderId, userId: user.id },
      relations: [
        'items',
        'items.book',
        'items.book.category',
        'items.book.brand',
        'address',
        'transactions',
      ],
    });

    if (!order) {
      throw new NotFoundException(`Order with ID ${orderId} not found`);
    }

    return this.withEligibility(order);
  }

  async buyAgain(orderId: string, userId?: string) {
    const user = userId ? await this.userService.getUserById(userId) : await this.userService.getDefaultUser();
    const order = await this.getOrderById(orderId, user.id);

    if (!order.items || order.items.length === 0) {
      throw new BadRequestException('Order has no items to re-purchase');
    }

    let addedCount = 0;
    const skippedBooks: string[] = [];

    for (const item of order.items) {
      if (item.book && item.book.isAvailable && item.book.stockQuantity > 0) {
        await this.cartService.addToCart(
          {
            bookId: item.book.id,
            quantity: Math.min(item.quantity, item.book.stockQuantity),
          },
          user.id,
        );
        addedCount++;
      } else {
        skippedBooks.push(item.book ? item.book.title : 'Unavailable book');
      }
    }

    const updatedCart = await this.cartService.getCart(user.id);

    return {
      success: true,
      message:
        addedCount > 0
          ? `Added ${addedCount} item(s) from order ${order.orderNumber} into your shopping cart.`
          : 'Could not re-add items due to stock unavailability.',
      skippedBooks,
      cart: updatedCart,
    };
  }

  /**
   * Reduces or removes line items while the order is inside the modify window.
   * Mock pricing: discount, final amount and wallet portion are scaled by the subtotal ratio,
   * the difference is refunded, and earned points are re-based on the new final amount.
   */
  async modifyOrder(orderId: string, dto: ModifyOrderDto, userId: string) {
    const order = await this.getOrderById(orderId, userId);
    if (!order.canModify) {
      throw new BadRequestException('This order can no longer be modified');
    }

    const bookIds = dto.items.map((change) => change.bookId);
    if (new Set(bookIds).size !== bookIds.length) {
      throw new BadRequestException('Each book can only appear once in a modification');
    }

    const changes = dto.items.map((change) => {
      const line = order.items?.find((item) => item.bookId === change.bookId);
      if (!line || change.quantity >= line.quantity) {
        throw new BadRequestException('Items can only be reduced or removed from this order');
      }
      return { line, quantity: change.quantity };
    });

    const oldSubtotal = Number(order.totalAmount);
    const newSubtotal = round2(
      (order.items ?? []).reduce((sum, item) => {
        const change = changes.find((c) => c.line.id === item.id);
        return sum + Number(item.unitPrice) * (change ? change.quantity : item.quantity);
      }, 0),
    );
    if (newSubtotal <= 0) {
      throw new BadRequestException('To remove every item, cancel the order instead');
    }

    const ratio = newSubtotal / oldSubtotal;
    const oldFinal = Number(order.finalAmount);
    const newFinal = round2(oldFinal * ratio);
    const oldWallet = Number(order.walletAmount) || 0;
    const newWallet = round2(oldWallet * ratio);
    const refundAmount = round2(oldFinal - newFinal);
    const walletRefund = round2(oldWallet - newWallet);

    await this.dataSource.transaction(async (manager) => {
      for (const { line, quantity } of changes) {
        if (quantity === 0) {
          await manager.delete(OrderItem, { id: line.id });
        } else {
          await manager.update(
            OrderItem,
            { id: line.id },
            { quantity, totalPrice: round2(Number(line.unitPrice) * quantity) },
          );
        }
        // Restock the freed units; a title that sold out becomes available again.
        await manager.update(Book, { id: line.bookId, stockQuantity: 0 }, { isAvailable: true });
        await manager.increment(Book, { id: line.bookId }, 'stockQuantity', line.quantity - quantity);
      }

      // Conditional update so a concurrent cancel/return cannot be combined with a modification.
      const updated = await manager.update(
        Order,
        { id: order.id, userId, status: OrderStatus.COMPLETED },
        {
          totalAmount: newSubtotal,
          discountAmount: round2(Number(order.discountAmount) * ratio),
          finalAmount: newFinal,
          walletAmount: newWallet,
        },
      );
      if (!updated.affected) {
        throw new BadRequestException('This order can no longer be modified');
      }

      if (refundAmount > 0) {
        await manager.save(
          manager.create(PaymentTransaction, {
            orderId: order.id,
            amount: refundAmount,
            paymentMethod: order.paymentMethod,
            transactionRef: `RFD-${randomBytes(8).toString('hex')}`,
            status: 'REFUNDED',
          }),
        );
      }

      const user = await manager.findOne(User, { where: { id: userId } });
      if (walletRefund > 0) {
        const wallet = round2(Math.min((Number(user?.walletBalance) || 0) + walletRefund, STORE.wallet.maxBalance));
        await manager.update(User, { id: userId }, { walletBalance: wallet });
      }

      // Re-base earned points on the smaller final amount.
      const entries = await manager.find(GiftPointLedger, { where: { orderId: order.id, userId } });
      const earned = entries
        .filter((entry) => entry.type === PointTransactionType.EARNED)
        .reduce((sum, entry) => sum + entry.pointsChanged, 0);
      const delta = earned > 0 ? Math.floor(newFinal * STORE.pricing.pointsEarnedPerUnit) - earned : 0;
      if (delta < 0) {
        const balance = user?.rewardPoints || 0;
        const newBalance = Math.max(0, balance + delta);
        await manager.update(User, { id: userId }, { rewardPoints: newBalance });
        await manager.save(
          manager.create(GiftPointLedger, {
            userId,
            orderId: order.id,
            pointsChanged: newBalance - balance,
            type: PointTransactionType.REVERSAL,
            balanceAfter: newBalance,
            description: `Points adjusted for modification of ${order.orderNumber}`,
          }),
        );
      }
    });

    return {
      success: true,
      message: `Order ${order.orderNumber} updated. ${refundAmount.toFixed(2)} will be refunded to your original payment method.`,
      refundAmount,
      order: await this.getOrderById(orderId, userId),
    };
  }

  /** Cancels a completed order within the cancel window: restocks, refunds and reverses points. */
  cancelOrder(orderId: string, userId: string) {
    return this.reverseOrder(orderId, userId, 'cancel');
  }

  /** Returns a completed order after the cancel window: restocks, refunds and reverses points. */
  returnOrder(orderId: string, userId: string) {
    return this.reverseOrder(orderId, userId, 'return');
  }

  private async reverseOrder(orderId: string, userId: string, action: 'cancel' | 'return') {
    const order = await this.getOrderById(orderId, userId);
    const allowed = action === 'cancel' ? order.canCancel : order.canReturn;
    if (!allowed) {
      throw new BadRequestException(
        action === 'cancel' ? 'This order can no longer be cancelled' : 'This order is not eligible for return',
      );
    }

    const targetStatus = action === 'cancel' ? OrderStatus.CANCELLED : OrderStatus.RETURNED;
    const label = action === 'cancel' ? 'cancellation' : 'return';
    const refundAmount = Number(order.finalAmount);
    const walletAmount = Number(order.walletAmount) || 0;

    // Generate a stub return label only for returns
    const returnLabel = action === 'return'
      ? `RTN-${randomBytes(4).toString('hex').toUpperCase()}`
      : null;

    const extraUpdate: Partial<Order> = { status: targetStatus };
    if (returnLabel) extraUpdate.returnLabel = returnLabel;

    const pointsAdjustment = await this.dataSource.transaction(async (manager) => {
      // Conditional update guards against concurrent or repeated reversal.
      const updated = await manager.update(
        Order,
        { id: order.id, userId, status: OrderStatus.COMPLETED },
        extraUpdate,
      );
      if (!updated.affected) {
        throw new BadRequestException(
          action === 'cancel' ? 'This order can no longer be cancelled' : 'This order is not eligible for return',
        );
      }

      // Restock; a title that sold out becomes available again.
      for (const item of order.items ?? []) {
        if (!item.bookId) continue;
        await manager.update(Book, { id: item.bookId, stockQuantity: 0 }, { isAvailable: true });
        await manager.increment(Book, { id: item.bookId }, 'stockQuantity', item.quantity);
      }

      await manager.save(
        manager.create(PaymentTransaction, {
          orderId: order.id,
          amount: refundAmount,
          paymentMethod: order.paymentMethod,
          transactionRef: `RFD-${randomBytes(8).toString('hex')}`,
          status: 'REFUNDED',
        }),
      );

      // Refund wallet portion
      if (walletAmount > 0) {
        const user = await manager.findOne(User, { where: { id: userId } });
        const newWallet = round2(Math.min((Number(user?.walletBalance) || 0) + walletAmount, STORE.wallet.maxBalance));
        await manager.update(User, { id: userId }, { walletBalance: newWallet });
      }

      // Undo every point movement tied to this order (redeemed points come back, earned points are removed).
      const entries = await manager.find(GiftPointLedger, { where: { orderId: order.id, userId } });
      const delta = -entries.reduce((sum, entry) => sum + entry.pointsChanged, 0);
      if (delta === 0) return 0;

      const user = await manager.findOne(User, { where: { id: userId } });
      const balance = user?.rewardPoints || 0;
      const newBalance = Math.max(0, balance + delta);
      await manager.update(User, { id: userId }, { rewardPoints: newBalance });
      await manager.save(
        manager.create(GiftPointLedger, {
          userId,
          orderId: order.id,
          pointsChanged: newBalance - balance,
          type: PointTransactionType.REVERSAL,
          balanceAfter: newBalance,
          description: `Points adjusted for ${label} of ${order.orderNumber}`,
        }),
      );
      return newBalance - balance;
    });

    return {
      success: true,
      message: `Order ${order.orderNumber} ${action === 'cancel' ? 'cancelled' : 'returned'}. ${refundAmount.toFixed(2)} will be refunded to your original payment method.`,
      refundAmount,
      pointsAdjustment,
      returnLabel,
      order: await this.getOrderById(orderId, userId),
    };
  }
}
