import {
  Category,
  Brand,
  Book,
  User,
  LoginResponse,
  Address,
  CartResponse,
  CheckoutCalculation,
  Order,
  OrderConfirmation,
  OrderReversalResult,
  ValidateCouponResult,
  ModifyOrderResult,
} from '../types';

const API_BASE = '/api/v1';
const TOKEN_KEY = 'booknest.accessToken';

// The token lives in sessionStorage so it is dropped when the browser tab closes.
export const authToken = {
  get: (): string | null => sessionStorage.getItem(TOKEN_KEY),
  set: (token: string) => sessionStorage.setItem(TOKEN_KEY, token),
  clear: () => sessionStorage.removeItem(TOKEN_KEY),
};

// Simulated backend latency: every request takes at least this long (disabled under the test runner).
const SIMULATE_LATENCY = import.meta.env.MODE !== 'test';
const DEFAULT_MIN_DELAY_MS = 800;
const PAYMENT_MIN_DELAY_MS = 2000;

// Global in-flight request counter — listeners are notified on every change.
let _inflight = 0;
type LoadingListener = (loading: boolean) => void;
const _listeners = new Set<LoadingListener>();

export const loadingState = {
  subscribe: (fn: LoadingListener) => {
    _listeners.add(fn);
    return () => { _listeners.delete(fn); };
  },
  get isLoading() {
    return _inflight > 0;
  },
};

function setInflight(delta: 1 | -1) {
  const before = _inflight > 0;
  _inflight = Math.max(0, _inflight + delta);
  const after = _inflight > 0;
  if (before !== after) _listeners.forEach((fn) => fn(after));
}

async function request<T>(
  endpoint: string,
  options: RequestInit = {},
  minDelayMs: number = DEFAULT_MIN_DELAY_MS,
): Promise<T> {
  const url = `${API_BASE}${endpoint}`;
  const token = authToken.get();
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {}),
  };

  setInflight(1);
  const delay = SIMULATE_LATENCY ? minDelayMs : 0;
  let response: Response;
  try {
    [response] = await Promise.all([
      fetch(url, { ...options, headers }),
      new Promise<void>((resolve) => setTimeout(resolve, delay)),
    ]);
  } finally {
    setInflight(-1);
  }
  if (!response!.ok) {
    const errorData = await response.json().catch(() => ({}));
    const message =
      errorData.error?.message ||
      (Array.isArray(errorData.message) ? errorData.message.join(', ') : errorData.message) ||
      `Request failed with status ${response.status}`;
    throw new Error(message);
  }

  return response!.json();
}

export const api = {
  // Authentication
  login: async (email: string, password: string) => {
    const res = await request<LoginResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    authToken.set(res.accessToken);
    return res;
  },
  /** Starts an anonymous guest session so a visitor can add to cart and check out. */
  startGuestSession: async () => {
    const res = await request<LoginResponse>('/auth/guest', { method: 'POST' });
    authToken.set(res.accessToken);
    return res;
  },
  logout: () => authToken.clear(),
  hasAuthToken: () => authToken.get() !== null,
  getCurrentUser: () => request<User>('/auth/me'),

  // Catalogue
  getCategories: () => request<Category[]>('/categories'),
  getBrands: () => request<Brand[]>('/brands'),
  getBooks: (params: {
    categorySlug?: string;
    brandSlug?: string;
    search?: string;
    isAvailable?: boolean;
    sortBy?: string;
  } = {}) => {
    const query = new URLSearchParams();
    if (params.categorySlug) query.append('categorySlug', params.categorySlug);
    if (params.brandSlug) query.append('brandSlug', params.brandSlug);
    if (params.search) query.append('search', params.search);
    if (params.isAvailable !== undefined) query.append('isAvailable', String(params.isAvailable));
    if (params.sortBy) query.append('sortBy', params.sortBy);

    const qs = query.toString();
    return request<Book[]>(`/books${qs ? `?${qs}` : ''}`);
  },
  getBookById: (id: string) => request<Book>(`/books/${id}`),
  getRelatedBooks: (id: string, limit = 4) => request<Book[]>(`/books/${id}/related?limit=${limit}`),
  getUpsellBooks: (id: string, limit = 3) => request<Book[]>(`/books/${id}/upsell?limit=${limit}`),

  // Recommendations
  getOrderHistoryRecommendations: (limit = 4) =>
    request<Book[]>(`/recommendations/order-history?limit=${limit}`),

  // User & Addresses
  getAddresses: () => request<Address[]>('/addresses'),
  createAddress: (address: Partial<Address>) =>
    request<Address>('/addresses', {
      method: 'POST',
      body: JSON.stringify(address),
    }),
  updateAddress: (id: string, address: Partial<Omit<Address, 'id'>>) =>
    request<Address>(`/addresses/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(address),
    }),

  // Cart
  getCart: () => request<CartResponse>('/cart'),
  addToCart: (bookId: string, quantity = 1) =>
    request<CartResponse>('/cart', {
      method: 'POST',
      body: JSON.stringify({ bookId, quantity }),
    }),
  updateCartItem: (id: string, quantity: number) =>
    request<CartResponse>(`/cart/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ quantity }),
    }),
  removeFromCart: (id: string) =>
    request<CartResponse>(`/cart/${id}`, {
      method: 'DELETE',
    }),
  clearCart: () =>
    request<{ success: boolean }>('/cart', {
      method: 'DELETE',
    }),

  // Checkout & Payment
  calculateCheckout: (redeemPoints = 0, couponCode?: string, useWallet = false) =>
    request<CheckoutCalculation>('/checkout/calculate', {
      method: 'POST',
      body: JSON.stringify({ redeemPoints, couponCode, useWallet }),
    }),
  validateCoupon: (code: string) =>
    request<ValidateCouponResult>('/coupons/validate', {
      method: 'POST',
      body: JSON.stringify({ code }),
    }),
  processOrder: (payload: {
    addressId: string;
    paymentMethod: string;
    email?: string;
    redeemPoints?: number;
    couponCode?: string;
    useWallet?: boolean;
    paymentDetails?: {
      cardNumber?: string;
      cardHolder?: string;
      expiryDate?: string;
      cvv?: string;
      iban?: string;
      bic?: string;
      bankName?: string;
    };
  }) =>
    request<OrderConfirmation>(
      '/checkout/process',
      {
        method: 'POST',
        body: JSON.stringify(payload),
      },
      PAYMENT_MIN_DELAY_MS,
    ),

  // Orders
  getOrders: () => request<Order[]>('/orders'),
  getOrderById: (id: string) => request<Order>(`/orders/${id}`),
  buyAgain: (orderId: string) =>
    request<{ success: boolean; message: string; cart: CartResponse }>(
      `/orders/${orderId}/buy-again`,
      {
        method: 'POST',
      },
    ),
  cancelOrder: (orderId: string) =>
    request<OrderReversalResult>(`/orders/${orderId}/cancel`, { method: 'POST' }),
  returnOrder: (orderId: string) =>
    request<OrderReversalResult>(`/orders/${orderId}/return`, { method: 'POST' }),
  modifyOrder: (orderId: string, items: Array<{ bookId: string; quantity: number }>) =>
    request<ModifyOrderResult>(`/orders/${orderId}`, {
      method: 'PATCH',
      body: JSON.stringify({ items }),
    }),

  // Wallet
  topUpWallet: () =>
    request<{ walletBalance: number; credited: number }>('/users/wallet/topup', { method: 'POST' }),
  getStore: () => request<{ wallet: { topUpAmount: number; maxBalance: number }; pricing: Record<string, number>; policies: Record<string, number> }>('/store'),
};
