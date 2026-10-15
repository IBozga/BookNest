import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { api, authToken } from '../services/api';

describe('api service client', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    vi.clearAllMocks();
    authToken.clear();
  });

  afterEach(() => {
    global.fetch = originalFetch;
    authToken.clear();
  });

  const mockResponse = (data: any, status = 200, ok = true) => {
    global.fetch = vi.fn().mockResolvedValue({
      ok,
      status,
      json: vi.fn().mockResolvedValue(data),
    });
  };

  it('login posts credentials, stores the token, and attaches it to later requests', async () => {
    mockResponse({ accessToken: 'jwt-token', user: { id: 'u1', name: 'Alex' } });
    const res = await api.login('alex@example.com', 'secret-pw');

    expect(global.fetch).toHaveBeenCalledWith(
      '/api/v1/auth/login',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ email: 'alex@example.com', password: 'secret-pw' }),
      }),
    );
    expect(res.user.id).toBe('u1');
    expect(api.hasAuthToken()).toBe(true);

    mockResponse({ id: 'u1' });
    await api.getCurrentUser();
    expect(global.fetch).toHaveBeenCalledWith(
      '/api/v1/auth/me',
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: 'Bearer jwt-token' }),
      }),
    );
  });

  it('does not store a token when login fails, and logout clears a stored token', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      json: vi.fn().mockResolvedValue({ error: { message: 'Invalid email or password' } }),
    });
    await expect(api.login('a@b.com', 'bad')).rejects.toThrow('Invalid email or password');
    expect(api.hasAuthToken()).toBe(false);

    authToken.set('stale');
    api.logout();
    expect(api.hasAuthToken()).toBe(false);
  });

  it('omits the Authorization header when no token is stored', async () => {
    mockResponse([]);
    await api.getCategories();
    const [, init] = (global.fetch as any).mock.calls[0];
    expect(init.headers.Authorization).toBeUndefined();
  });

  it('getCategories calls /api/v1/categories', async () => {
    mockResponse([{ id: '1', name: 'Tech' }]);
    const result = await api.getCategories();
    expect(global.fetch).toHaveBeenCalledWith('/api/v1/categories', expect.any(Object));
    expect(result).toEqual([{ id: '1', name: 'Tech' }]);
  });

  it('getBrands calls /api/v1/brands', async () => {
    mockResponse([{ id: '1', name: 'OReilly' }]);
    const result = await api.getBrands();
    expect(global.fetch).toHaveBeenCalledWith('/api/v1/brands', expect.any(Object));
    expect(result).toEqual([{ id: '1', name: 'OReilly' }]);
  });

  it('getBooks formats query parameters correctly', async () => {
    mockResponse([{ id: 'book-1' }]);
    const result = await api.getBooks({
      categorySlug: 'tech',
      brandSlug: 'oreilly',
      search: 'data',
      isAvailable: true,
      sortBy: 'rating_desc',
    });
    expect(global.fetch).toHaveBeenCalledWith(
      '/api/v1/books?categorySlug=tech&brandSlug=oreilly&search=data&isAvailable=true&sortBy=rating_desc',
      expect.any(Object),
    );
    expect(result).toEqual([{ id: 'book-1' }]);
  });

  it('getBookById and getRelatedBooks call correct endpoints', async () => {
    mockResponse({ id: 'b1', title: 'Book 1' });
    const b = await api.getBookById('b1');
    expect(global.fetch).toHaveBeenCalledWith('/api/v1/books/b1', expect.any(Object));
    expect(b.id).toBe('b1');

    mockResponse([{ id: 'b2' }]);
    const related = await api.getRelatedBooks('b1', 3);
    expect(global.fetch).toHaveBeenCalledWith('/api/v1/books/b1/related?limit=3', expect.any(Object));
    expect(related.length).toBe(1);
  });

  it('getOrderHistoryRecommendations calls recommendations endpoint', async () => {
    mockResponse([{ id: 'rec-1' }]);
    const result = await api.getOrderHistoryRecommendations(2);
    expect(global.fetch).toHaveBeenCalledWith(
      '/api/v1/recommendations/order-history?limit=2',
      expect.any(Object),
    );
    expect(result.length).toBe(1);
  });

  it('address methods call endpoints correctly', async () => {
    mockResponse([{ id: 'a1', street: 'Main' }]);
    const addrs = await api.getAddresses();
    expect(addrs.length).toBe(1);

    mockResponse({ id: 'a2', street: 'Oak' });
    const created = await api.createAddress({ street: 'Oak' });
    expect(created.id).toBe('a2');
  });

  it('cart operations call endpoints correctly', async () => {
    mockResponse({ totalItems: 2, items: [] });
    const cart = await api.getCart();
    expect(cart.totalItems).toBe(2);

    mockResponse({ totalItems: 3 });
    const updated = await api.addToCart('b1', 2);
    expect(updated.totalItems).toBe(3);

    mockResponse({ totalItems: 4 });
    const patchCart = await api.updateCartItem('item-1', 3);
    expect(patchCart.totalItems).toBe(4);

    mockResponse({ totalItems: 0 });
    const removeCart = await api.removeFromCart('item-1');
    expect(removeCart.totalItems).toBe(0);

    mockResponse({ success: true });
    const clear = await api.clearCart();
    expect(clear.success).toBe(true);
  });

  it('checkout and order operations call endpoints correctly', async () => {
    mockResponse({ finalAmount: 50 });
    await api.calculateCheckout(100);

    mockResponse({ orderNumber: 'BN123', finalAmount: 50 });
    const conf = await api.processOrder({
      addressId: 'a1',
      paymentMethod: 'CREDIT_CARD',
      redeemPoints: 100,
    });
    expect(conf.orderNumber).toBe('BN123');

    mockResponse([{ id: 'ord-1' }]);
    const orders = await api.getOrders();
    expect(orders.length).toBe(1);

    mockResponse({ id: 'ord-1' });
    const order = await api.getOrderById('ord-1');
    expect(order.id).toBe('ord-1');

    mockResponse({ success: true, message: 'Added' });
    const buyAgain = await api.buyAgain('ord-1');
    expect(buyAgain.success).toBe(true);

    mockResponse({ success: true, message: 'Cancelled', refundAmount: 50, pointsAdjustment: 0, order: {} });
    const cancelled = await api.cancelOrder('ord-1');
    expect(cancelled.message).toBe('Cancelled');
    expect(global.fetch as any).toHaveBeenLastCalledWith(
      '/api/v1/orders/ord-1/cancel',
      expect.objectContaining({ method: 'POST' }),
    );

    mockResponse({ success: true, message: 'Returned', refundAmount: 50, pointsAdjustment: -200, order: {} });
    const returned = await api.returnOrder('ord-1');
    expect(returned.message).toBe('Returned');
    expect(global.fetch as any).toHaveBeenLastCalledWith(
      '/api/v1/orders/ord-1/return',
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('throws structured error message when response is not ok', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      json: vi.fn().mockResolvedValue({ message: 'Validation failed' }),
    });

    await expect(api.getCategories()).rejects.toThrow('Validation failed');
  });

  it('handles array message error and generic fallback', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 422,
      json: vi.fn().mockResolvedValue({ message: ['Name is required', 'Invalid email'] }),
    });

    await expect(api.getCurrentUser()).rejects.toThrow('Name is required, Invalid email');

    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: vi.fn().mockRejectedValue(new Error('Invalid JSON')),
    });

    await expect(api.getCart()).rejects.toThrow('Request failed with status 500');
  });
});
