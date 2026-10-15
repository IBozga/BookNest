import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { OrderService, CANCEL_WINDOW_HOURS, RETURN_WINDOW_DAYS } from './order.service';
import { Order, OrderItem, Book, User, PaymentTransaction, GiftPointLedger, OrderStatus } from '../../entities';
import { UserService } from '../user/user.service';
import { CartService } from '../cart/cart.service';

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

const completedOrder = (overrides: Partial<Order> = {}): Order =>
  Object.assign(new Order(), {
    id: 'ord-1',
    orderNumber: 'ORD-123456',
    userId: 'user-1',
    paymentMethod: 'CREDIT_CARD',
    finalAmount: 49.50,
    status: OrderStatus.COMPLETED,
    createdAt: new Date(),
    items: [{ id: 'item-1', bookId: 'book-1', quantity: 1, book: { id: 'book-1', isAvailable: true, stockQuantity: 5 } }],
    transactions: [],
    ...overrides,
  } as any);

const buildModule = async (orderRepoExtra: any = {}, txResult: any = 0) => {
  const mockUserService = {
    getDefaultUser: jest.fn().mockResolvedValue({ id: 'user-1', name: 'Alex' }),
    getUserById: jest.fn().mockResolvedValue({ id: 'user-1', name: 'Alex' }),
  };

  const mockOrderRepo = {
    find: jest.fn().mockResolvedValue([completedOrder()]),
    findOne: jest.fn().mockResolvedValue(completedOrder()),
    save: jest.fn((o) => Promise.resolve(o)),
    ...orderRepoExtra,
  };

  const mockCartService = {
    addToCart: jest.fn().mockResolvedValue({}),
    getCart: jest.fn().mockResolvedValue({ totalItems: 1, items: [] }),
  };

  const mockDataSource = {
    transaction: jest.fn().mockResolvedValue(txResult),
  };

  const module: TestingModule = await Test.createTestingModule({
    providers: [
      OrderService,
      { provide: getRepositoryToken(Order), useValue: mockOrderRepo },
      { provide: getRepositoryToken(OrderItem), useValue: {} },
      { provide: getRepositoryToken(Book), useValue: {} },
      { provide: getRepositoryToken(User), useValue: {} },
      { provide: getRepositoryToken(PaymentTransaction), useValue: {} },
      { provide: getRepositoryToken(GiftPointLedger), useValue: {} },
      { provide: UserService, useValue: mockUserService },
      { provide: CartService, useValue: mockCartService },
      { provide: DataSource, useValue: mockDataSource },
    ],
  }).compile();

  return {
    service: module.get<OrderService>(OrderService),
    mockOrderRepo,
    mockCartService,
    mockDataSource,
  };
};

describe('OrderService', () => {
  it('should list user orders', async () => {
    const { service } = await buildModule();
    const orders = await service.getOrders('user-1');
    expect(orders).toHaveLength(1);
    expect(orders[0].orderNumber).toBe('ORD-123456');
  });

  it('attaches canCancel=true and canReturn=false for a brand-new COMPLETED order', async () => {
    const { service } = await buildModule();
    const orders = await service.getOrders('user-1');
    expect(orders[0].canCancel).toBe(true);
    expect(orders[0].canReturn).toBe(false);
  });

  it('attaches canCancel=true for an order 1 day old (still inside the 48h window)', async () => {
    const oneDayAgo = new Date(Date.now() - DAY_MS);
    const { service } = await buildModule({
      find: jest.fn().mockResolvedValue([completedOrder({ createdAt: oneDayAgo })]),
      findOne: jest.fn().mockResolvedValue(completedOrder({ createdAt: oneDayAgo })),
    });
    const orders = await service.getOrders('user-1');
    expect(orders[0].canCancel).toBe(true);
    expect(orders[0].canReturn).toBe(false);
  });

  it('attaches canCancel=false and canReturn=true for an order 3 days old', async () => {
    const threeDaysAgo = new Date(Date.now() - 3 * DAY_MS);
    const { service } = await buildModule({
      find: jest.fn().mockResolvedValue([completedOrder({ createdAt: threeDaysAgo })]),
      findOne: jest.fn().mockResolvedValue(completedOrder({ createdAt: threeDaysAgo })),
    });
    const orders = await service.getOrders('user-1');
    expect(orders[0].canCancel).toBe(false);
    expect(orders[0].canReturn).toBe(true);
  });

  it('attaches canCancel=false and canReturn=false for a CANCELLED order', async () => {
    const { service } = await buildModule({
      find: jest.fn().mockResolvedValue([completedOrder({ status: OrderStatus.CANCELLED })]),
      findOne: jest.fn().mockResolvedValue(completedOrder({ status: OrderStatus.CANCELLED })),
    });
    const orders = await service.getOrders('user-1');
    expect(orders[0].canCancel).toBe(false);
    expect(orders[0].canReturn).toBe(false);
  });

  it('attaches canCancel=false and canReturn=false for an order older than the return window', async () => {
    const expired = new Date(Date.now() - (RETURN_WINDOW_DAYS + 1) * DAY_MS);
    const { service } = await buildModule({
      find: jest.fn().mockResolvedValue([completedOrder({ createdAt: expired })]),
      findOne: jest.fn().mockResolvedValue(completedOrder({ createdAt: expired })),
    });
    const orders = await service.getOrders('user-1');
    expect(orders[0].canCancel).toBe(false);
    expect(orders[0].canReturn).toBe(false);
  });

  it('should support Buy It Again by re-adding items to cart', async () => {
    const { service, mockCartService } = await buildModule();
    const res = await service.buyAgain('ord-1', 'user-1');
    expect(res.success).toBe(true);
    expect(mockCartService.addToCart).toHaveBeenCalledWith(
      { bookId: 'book-1', quantity: 1 },
      'user-1',
    );
  });

  describe('cancelOrder', () => {
    it('calls reverseOrder via the DataSource transaction and returns success', async () => {
      const { service, mockDataSource } = await buildModule({}, 50);
      const res = await service.cancelOrder('ord-1', 'user-1');
      expect(mockDataSource.transaction).toHaveBeenCalled();
      expect(res.success).toBe(true);
      expect(res.refundAmount).toBe(49.50);
      expect(res.message).toContain('cancelled');
    });

    it('rejects a cancel when the order is not within the cancel window', async () => {
      const old = new Date(Date.now() - (CANCEL_WINDOW_HOURS + 1) * HOUR_MS);
      const { service } = await buildModule({
        find: jest.fn().mockResolvedValue([completedOrder({ createdAt: old })]),
        findOne: jest.fn().mockResolvedValue(completedOrder({ createdAt: old })),
      });
      await expect(service.cancelOrder('ord-1', 'user-1')).rejects.toThrow(
        'This order can no longer be cancelled',
      );
    });

    it('rejects a cancel for an already-cancelled order', async () => {
      const { service } = await buildModule({
        find: jest.fn().mockResolvedValue([completedOrder({ status: OrderStatus.CANCELLED })]),
        findOne: jest.fn().mockResolvedValue(completedOrder({ status: OrderStatus.CANCELLED })),
      });
      await expect(service.cancelOrder('ord-1', 'user-1')).rejects.toThrow(
        'This order can no longer be cancelled',
      );
    });
  });

  describe('returnOrder', () => {
    const threeDaysAgo = new Date(Date.now() - 3 * DAY_MS);

    it('calls reverseOrder via the DataSource transaction and returns success', async () => {
      const { service, mockDataSource } = await buildModule(
        {
          find: jest.fn().mockResolvedValue([completedOrder({ createdAt: threeDaysAgo })]),
          findOne: jest.fn().mockResolvedValue(completedOrder({ createdAt: threeDaysAgo })),
        },
        -200,
      );
      const res = await service.returnOrder('ord-1', 'user-1');
      expect(mockDataSource.transaction).toHaveBeenCalled();
      expect(res.success).toBe(true);
      expect(res.refundAmount).toBe(49.50);
      expect(res.message).toContain('returned');
    });

    it('rejects a return for a fresh order still within the cancel window', async () => {
      const { service } = await buildModule();
      await expect(service.returnOrder('ord-1', 'user-1')).rejects.toThrow(
        'This order is not eligible for return',
      );
    });

    it('rejects a return for an order older than the return window', async () => {
      const expired = new Date(Date.now() - (RETURN_WINDOW_DAYS + 1) * DAY_MS);
      const { service } = await buildModule({
        find: jest.fn().mockResolvedValue([completedOrder({ createdAt: expired })]),
        findOne: jest.fn().mockResolvedValue(completedOrder({ createdAt: expired })),
      });
      await expect(service.returnOrder('ord-1', 'user-1')).rejects.toThrow(
        'This order is not eligible for return',
      );
    });
  });

  describe('reversal transaction (real callback against a fake manager)', () => {
    const buildManager = (opts: { affected?: number; ledger?: any[]; balance?: number } = {}) => {
      const { affected = 1, ledger = [], balance = 100 } = opts;
      return {
        update: jest.fn().mockResolvedValue({ affected }),
        increment: jest.fn().mockResolvedValue({}),
        create: jest.fn((_entity: any, data: any) => data),
        save: jest.fn((data: any) => Promise.resolve(data)),
        find: jest.fn().mockResolvedValue(ledger),
        findOne: jest.fn().mockResolvedValue({ id: 'user-1', rewardPoints: balance }),
      };
    };

    const runWith = async (manager: any) => {
      const { service, mockDataSource } = await buildModule();
      mockDataSource.transaction.mockImplementation((cb: any) => cb(manager));
      return service;
    };

    it('cancel: marks the order, restocks, records a REFUNDED transaction and reverses points', async () => {
      // Order earned 247 points and redeemed 100: net +147, so reversing removes 147.
      const manager = buildManager({
        ledger: [{ pointsChanged: -100 }, { pointsChanged: 247 }],
        balance: 500,
      });
      const service = await runWith(manager);

      const res = await service.cancelOrder('ord-1', 'user-1');

      expect(manager.update).toHaveBeenCalledWith(
        Order,
        { id: 'ord-1', userId: 'user-1', status: OrderStatus.COMPLETED },
        { status: OrderStatus.CANCELLED },
      );
      expect(manager.increment).toHaveBeenCalledWith(Book, { id: 'book-1' }, 'stockQuantity', 1);
      expect(manager.save).toHaveBeenCalledWith(
        expect.objectContaining({ orderId: 'ord-1', amount: 49.5, status: 'REFUNDED' }),
      );
      expect(manager.update).toHaveBeenCalledWith(User, { id: 'user-1' }, { rewardPoints: 353 });
      expect(manager.save).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'REVERSAL', pointsChanged: -147, balanceAfter: 353 }),
      );
      expect(res.pointsAdjustment).toBe(-147);
    });

    it('return: sets the RETURNED status and stores a stub return label', async () => {
      const threeDaysAgo = new Date(Date.now() - 3 * DAY_MS);
      const { service, mockDataSource } = await buildModule({
        find: jest.fn().mockResolvedValue([completedOrder({ createdAt: threeDaysAgo })]),
        findOne: jest.fn().mockResolvedValue(completedOrder({ createdAt: threeDaysAgo })),
      });
      const manager = buildManager();
      mockDataSource.transaction.mockImplementation((cb: any) => cb(manager));

      const res = await service.returnOrder('ord-1', 'user-1');

      expect(manager.update).toHaveBeenCalledWith(
        Order,
        { id: 'ord-1', userId: 'user-1', status: OrderStatus.COMPLETED },
        { status: OrderStatus.RETURNED, returnLabel: expect.stringMatching(/^RTN-[0-9A-F]{8}$/) },
      );
      expect(res.returnLabel).toMatch(/^RTN-[0-9A-F]{8}$/);
    });

    it('cancel: does not generate a return label', async () => {
      const service = await runWith(buildManager());
      const res = await service.cancelOrder('ord-1', 'user-1');
      expect(res.returnLabel).toBeNull();
    });

    it('cancel: credits the wallet portion back to the wallet', async () => {
      const manager = buildManager();
      manager.findOne.mockResolvedValue({ id: 'user-1', rewardPoints: 0, walletBalance: '10.00' });
      const { service, mockDataSource } = await buildModule({
        findOne: jest.fn().mockResolvedValue(completedOrder({ walletAmount: 12.5 })),
      });
      mockDataSource.transaction.mockImplementation((cb: any) => cb(manager));

      await service.cancelOrder('ord-1', 'user-1');

      expect(manager.update).toHaveBeenCalledWith(User, { id: 'user-1' }, { walletBalance: 22.5 });
    });

    it('never drives the points balance below zero', async () => {
      const manager = buildManager({ ledger: [{ pointsChanged: 247 }], balance: 10 });
      const service = await runWith(manager);

      await service.cancelOrder('ord-1', 'user-1');

      expect(manager.update).toHaveBeenCalledWith(User, { id: 'user-1' }, { rewardPoints: 0 });
    });

    it('guest order without ledger entries leaves points untouched', async () => {
      const manager = buildManager({ ledger: [] });
      const service = await runWith(manager);

      const res = await service.cancelOrder('ord-1', 'user-1');

      expect(res.pointsAdjustment).toBe(0);
      expect(manager.update).not.toHaveBeenCalledWith(User, expect.anything(), expect.anything());
    });

    it('refuses to refund twice when the conditional status update affects no row', async () => {
      const manager = buildManager({ affected: 0 });
      const service = await runWith(manager);

      await expect(service.cancelOrder('ord-1', 'user-1')).rejects.toThrow(
        'This order can no longer be cancelled',
      );
      expect(manager.save).not.toHaveBeenCalled();
      expect(manager.increment).not.toHaveBeenCalled();
    });
  });

  describe('modifyOrder', () => {
    const twoLineOrder = (overrides: Partial<Order> = {}) =>
      completedOrder({
        totalAmount: 40,
        discountAmount: 0,
        finalAmount: 50,
        walletAmount: 10,
        items: [
          { id: 'item-1', bookId: 'book-1', quantity: 2, unitPrice: 10, totalPrice: 20 },
          { id: 'item-2', bookId: 'book-2', quantity: 1, unitPrice: 20, totalPrice: 20 },
        ] as any,
        ...overrides,
      });

    const buildManager = (ledger: any[] = [{ type: 'EARNED', pointsChanged: 250 }]) => ({
      update: jest.fn().mockResolvedValue({ affected: 1 }),
      increment: jest.fn().mockResolvedValue({}),
      delete: jest.fn().mockResolvedValue({}),
      create: jest.fn((_entity: any, data: any) => data),
      save: jest.fn((data: any) => Promise.resolve(data)),
      find: jest.fn().mockResolvedValue(ledger),
      findOne: jest.fn().mockResolvedValue({ id: 'user-1', rewardPoints: 300, walletBalance: '0' }),
    });

    const run = async (order: Order, manager: any) => {
      const { service, mockDataSource } = await buildModule({ findOne: jest.fn().mockResolvedValue(order) });
      mockDataSource.transaction.mockImplementation((cb: any) => cb(manager));
      return service;
    };

    it('is exposed as canModify only inside the 48h window of a COMPLETED order', async () => {
      const { service } = await buildModule();
      expect((await service.getOrders('user-1'))[0].canModify).toBe(true);

      const old = completedOrder({ createdAt: new Date(Date.now() - 3 * DAY_MS) });
      const { service: late } = await buildModule({ find: jest.fn().mockResolvedValue([old]) });
      expect((await late.getOrders('user-1'))[0].canModify).toBe(false);
    });

    it('reduces a line, restocks, refunds proportionally and credits the wallet portion', async () => {
      const manager = buildManager();
      const service = await run(twoLineOrder(), manager);

      // 40 -> 30 (one of two copies of book-1 removed): ratio 0.75
      const res = await service.modifyOrder('ord-1', { items: [{ bookId: 'book-1', quantity: 1 }] }, 'user-1');

      expect(manager.update).toHaveBeenCalledWith(OrderItem, { id: 'item-1' }, { quantity: 1, totalPrice: 10 });
      expect(manager.increment).toHaveBeenCalledWith(Book, { id: 'book-1' }, 'stockQuantity', 1);
      expect(manager.update).toHaveBeenCalledWith(
        Order,
        { id: 'ord-1', userId: 'user-1', status: OrderStatus.COMPLETED },
        expect.objectContaining({ totalAmount: 30, finalAmount: 37.5, walletAmount: 7.5 }),
      );
      expect(manager.save).toHaveBeenCalledWith(
        expect.objectContaining({ amount: 12.5, status: 'REFUNDED' }),
      );
      expect(manager.update).toHaveBeenCalledWith(User, { id: 'user-1' }, { walletBalance: 2.5 });
      expect(res.refundAmount).toBe(12.5);
    });

    it('re-bases earned points on the smaller final amount', async () => {
      const manager = buildManager([{ type: 'EARNED', pointsChanged: 250 }]);
      const service = await run(twoLineOrder(), manager);

      await service.modifyOrder('ord-1', { items: [{ bookId: 'book-1', quantity: 1 }] }, 'user-1');

      // floor(37.5 * 5) = 187 -> 63 points removed
      expect(manager.update).toHaveBeenCalledWith(User, { id: 'user-1' }, { rewardPoints: 237 });
    });

    it('removes a line when the new quantity is 0', async () => {
      const manager = buildManager();
      const service = await run(twoLineOrder(), manager);

      await service.modifyOrder('ord-1', { items: [{ bookId: 'book-2', quantity: 0 }] }, 'user-1');

      expect(manager.delete).toHaveBeenCalledWith(OrderItem, { id: 'item-2' });
    });

    it('rejects an increase', async () => {
      const service = await run(twoLineOrder(), buildManager());
      await expect(
        service.modifyOrder('ord-1', { items: [{ bookId: 'book-1', quantity: 3 }] }, 'user-1'),
      ).rejects.toThrow('Items can only be reduced or removed from this order');
    });

    it('rejects a book that is not part of the order', async () => {
      const service = await run(twoLineOrder(), buildManager());
      await expect(
        service.modifyOrder('ord-1', { items: [{ bookId: 'other', quantity: 0 }] }, 'user-1'),
      ).rejects.toThrow('Items can only be reduced or removed from this order');
    });

    it('rejects removing every item and points to cancellation', async () => {
      const service = await run(twoLineOrder(), buildManager());
      await expect(
        service.modifyOrder(
          'ord-1',
          { items: [{ bookId: 'book-1', quantity: 0 }, { bookId: 'book-2', quantity: 0 }] },
          'user-1',
        ),
      ).rejects.toThrow('cancel the order instead');
    });

    it('rejects duplicate book entries', async () => {
      const service = await run(twoLineOrder(), buildManager());
      await expect(
        service.modifyOrder(
          'ord-1',
          { items: [{ bookId: 'book-1', quantity: 1 }, { bookId: 'book-1', quantity: 0 }] },
          'user-1',
        ),
      ).rejects.toThrow('only appear once');
    });

    it('rejects a modification outside the window', async () => {
      const old = twoLineOrder({ createdAt: new Date(Date.now() - 3 * DAY_MS) });
      const service = await run(old, buildManager());
      await expect(
        service.modifyOrder('ord-1', { items: [{ bookId: 'book-1', quantity: 1 }] }, 'user-1'),
      ).rejects.toThrow('This order can no longer be modified');
    });
  });
});
