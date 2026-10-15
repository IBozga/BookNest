export interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string;
  icon?: string;
}

export interface Brand {
  id: string;
  name: string;
  slug: string;
  description?: string;
  logoUrl?: string;
}

export interface Book {
  id: string;
  title: string;
  author: string;
  isbn: string;
  price: number;
  stockQuantity: number;
  isAvailable: boolean;
  coverImage?: string;
  description?: string;
  rating: number;
  numReviews: number;
  format: string;
  /** Lead time in days; the tentative delivery date is today + deliveryDays. */
  deliveryDays?: number;
  tags?: string[];
  categoryId?: string;
  category?: Category;
  brandId?: string;
  brand?: Brand;
  /** Visible only to premium and admin users. */
  isPremium?: boolean;
}

export interface User {
  id: string;
  name: string;
  email: string;
  rewardPoints: number;
  walletBalance?: number;
  role?: 'customer' | 'premium' | 'admin';
  /** True for anonymous guest-checkout sessions. */
  isGuest?: boolean;
}

export interface LoginResponse {
  accessToken: string
  user: User
}

export interface Address {
  id: string;
  fullName: string;
  street: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  isDefault: boolean;
}

export interface CartItem {
  id: string;
  bookId: string;
  quantity: number;
  book: Book;
}

export interface CartResponse {
  id?: string;
  userId: string;
  items: CartItem[];
  totalItems: number;
  subtotal: number;
}

export interface CheckoutCalculation {
  subtotal: number;
  pointsAvailable: number;
  pointsRedeemed: number;
  discountAmount: number;
  couponDiscount?: number;
  couponCode?: string | null;
  shippingAmount: number;
  taxAmount: number;
  walletApplied?: number;
  walletBalance?: number;
  finalTotal: number;
  amountDue?: number;
}

export interface OrderItem {
  id: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  book: Book;
}

export interface Order {
  id: string;
  orderNumber: string;
  totalAmount: number;
  discountAmount: number;
  pointsRedeemed: number;
  finalAmount: number;
  walletAmount?: number;
  couponCode?: string | null;
  paymentMethod: string;
  status: string;
  createdAt: string;
  items: OrderItem[];
  address?: Address;
  /** Stub return-shipment label generated on return. */
  returnLabel?: string | null;
  /** Computed by the backend from the order status and age. */
  canCancel?: boolean;
  canReturn?: boolean;
  /** Whether items can still be reduced within the 48h modify window. */
  canModify?: boolean;
}

export interface OrderReversalResult {
  success: boolean;
  message: string;
  refundAmount: number;
  pointsAdjustment: number;
  returnLabel?: string | null;
  order: Order;
}

export interface ValidateCouponResult {
  code: string;
  discountPercent: number;
  discountAmount: number;
}

export interface ModifyOrderResult {
  success: boolean;
  message: string;
  refundAmount: number;
  order: Order;
}

export interface OrderConfirmation {
  success: boolean;
  orderId: string;
  orderNumber: string;
  message: string;
  finalAmount: number;
  pointsRedeemed: number;
  pointsEarned: number;
  remainingPoints: number;
  walletApplied?: number;
  order: Order;
}
