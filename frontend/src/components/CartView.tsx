import React, { useState } from 'react';
import { CartResponse, Book, User } from '../types';
import { api } from '../services/api';
import { CurrencyCode, formatCurrency } from '../utils/currency';
import { Trash2, Plus, Minus, ArrowRight, ShoppingBag, Sparkles, Tag } from 'lucide-react';
import { FALLBACK_COVER } from '../utils/constants';

interface CartViewProps {
  cart: CartResponse | null;
  user: User | null;
  onUpdateQuantity: (cartItemId: string, quantity: number) => void;
  onRemoveItem: (cartItemId: string) => void;
  onProceedToCheckout: () => void;
  onExploreCatalogue: () => void;
  onSelectBook: (book: Book) => void;
  redeemPoints: number;
  onPointsChange: (points: number) => void;
  couponCode: string;
  couponDiscount: number;
  onCouponChange: (code: string, discount: number) => void;
  currency?: CurrencyCode;
}

export const CartView: React.FC<CartViewProps> = ({
  cart,
  user,
  onUpdateQuantity,
  onRemoveItem,
  onProceedToCheckout,
  onExploreCatalogue,
  onSelectBook,
  redeemPoints,
  onPointsChange,
  couponCode,
  couponDiscount,
  onCouponChange,
  currency = 'EUR',
}) => {
  const [promoInput, setPromoInput] = useState(couponCode);
  const [promoError, setPromoError] = useState<string | null>(null);
  const [promoLoading, setPromoLoading] = useState(false);

  const items = cart?.items || [];
  const totalItems = cart?.totalItems || 0;
  const subtotal = cart?.subtotal || 0;

  const pointsDiscount = redeemPoints * 0.01;
  const totalDiscount = Math.min(subtotal, pointsDiscount + couponDiscount);
  const finalTotal = Math.max(0, subtotal - totalDiscount);

  const handleApplyPromo = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = promoInput.trim();
    if (!code) {
      onCouponChange('', 0);
      setPromoError(null);
      return;
    }
    setPromoLoading(true);
    setPromoError(null);
    try {
      const result = await api.validateCoupon(code);
      onCouponChange(result.code, result.discountAmount);
    } catch (err: any) {
      setPromoError(err.message || 'This coupon code is not valid');
      onCouponChange('', 0);
    } finally {
      setPromoLoading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto my-8 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-stone-200">
        <h1 className="text-3xl font-serif text-stone-900 font-semibold tracking-tight">
          Your Cart
        </h1>
        <span className="text-sm text-stone-700 font-medium">
          {totalItems} {totalItems === 1 ? 'item' : 'items'}
        </span>
      </div>

      {items.length === 0 ? (
        <div className="py-20 text-center bg-white rounded-3xl border border-stone-200 p-8 space-y-4 shadow-2xs">
          <div className="w-16 h-16 rounded-full bg-stone-100 text-stone-500 mx-auto flex items-center justify-center">
            <ShoppingBag className="w-8 h-8" aria-hidden="true" />
          </div>
          <h2 className="text-xl font-serif font-semibold text-stone-900">Your cart is empty</h2>
          <p className="text-xs text-stone-600 max-w-sm mx-auto">
            Discover thousands of ebooks from bestselling authors across technology, fiction, science, and more.
          </p>
          <button
            onClick={onExploreCatalogue}
            className="px-6 py-2.5 rounded-xl bg-stone-900 text-white font-semibold text-xs hover:bg-stone-800 transition-colors focus:outline-none focus:ring-2 focus:ring-stone-900"
          >
            Explore Books
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left: Cart Items List */}
          <div className="lg:col-span-8 bg-white rounded-3xl border border-stone-200 p-6 space-y-5">
            <div className="divide-y divide-stone-100">
              {items.map((item) => (
                <div key={item.id} className="py-4 first:pt-0 last:pb-0 flex items-center justify-between gap-4">
                  {/* Book Thumbnail & Info */}
                  <button
                    type="button"
                    className="flex items-center gap-4 cursor-pointer min-w-0 flex-1 text-left focus:outline-none focus:ring-2 focus:ring-stone-900 rounded-xl p-1"
                    onClick={() => {
                      if (item.book) onSelectBook(item.book);
                    }}
                    aria-label={`View details for ${item.book?.title || 'Book'}`}
                  >
                    <div className="w-16 h-22 rounded-xl overflow-hidden bg-stone-100 border border-stone-200 shrink-0">
                      <img
                        src={item.book?.coverImage || FALLBACK_COVER}
                        alt={`Cover of ${item.book?.title || 'Book'}`}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-bold text-stone-900 text-sm hover:text-stone-700 truncate">
                        {item.book?.title}
                      </h3>
                      <p className="text-xs text-stone-600 truncate mt-0.5">{item.book?.author}</p>
                      <span className="inline-block mt-1 text-[11px] font-semibold text-stone-800">
                        {formatCurrency(Number(item.book?.price || 0), currency)}
                      </span>
                    </div>
                  </button>

                  {/* Quantity Stepper */}
                  <div className="flex items-center border border-stone-300 rounded-xl overflow-hidden bg-white shrink-0">
                    <button
                      onClick={() => onUpdateQuantity(item.id, item.quantity - 1)}
                      className="px-2.5 py-1 text-xs text-stone-700 hover:bg-stone-100 font-bold focus:outline-none focus:ring-1 focus:ring-stone-900"
                      aria-label={`Decrease quantity of ${item.book?.title || 'item'}`}
                    >
                      <Minus className="w-3 h-3" aria-hidden="true" />
                    </button>
                    <span
                      className="px-2.5 text-xs font-bold text-stone-900 min-w-[24px] text-center"
                      aria-label={`Current quantity: ${item.quantity}`}
                    >
                      {item.quantity}
                    </span>
                    <button
                      onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}
                      className="px-2.5 py-1 text-xs text-stone-700 hover:bg-stone-100 font-bold focus:outline-none focus:ring-1 focus:ring-stone-900"
                      aria-label={`Increase quantity of ${item.book?.title || 'item'}`}
                    >
                      <Plus className="w-3 h-3" aria-hidden="true" />
                    </button>
                  </div>

                  {/* Line Total & Trash */}
                  <div className="flex items-center gap-4 shrink-0">
                    <span className="text-sm font-bold text-stone-900 min-w-[56px] text-right">
                      {formatCurrency(Number(item.book?.price || 0) * item.quantity, currency)}
                    </span>
                    <button
                      onClick={() => onRemoveItem(item.id)}
                      className="text-stone-500 hover:text-red-700 p-1.5 rounded-lg hover:bg-stone-100 transition-colors focus:outline-none focus:ring-2 focus:ring-stone-900"
                      aria-label={`Remove ${item.book?.title || 'item'} from cart`}
                    >
                      <Trash2 className="w-4 h-4" aria-hidden="true" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Promo Code & Gift Points */}
            <div className="pt-6 border-t border-stone-200 space-y-4">
              <form onSubmit={handleApplyPromo} className="space-y-2">
                <div className="flex gap-2">
                  <label htmlFor="cart-promo-code" className="sr-only">
                    Promo code
                  </label>
                  <input
                    id="cart-promo-code"
                    type="text"
                    placeholder="Enter promo code (e.g. BOOKNEST10)"
                    value={promoInput}
                    onChange={(e) => setPromoInput(e.target.value.toUpperCase())}
                    className="flex-1 px-4 py-2 text-xs bg-stone-50 border border-stone-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-stone-900 uppercase font-medium text-stone-900"
                    disabled={promoLoading}
                  />
                  <button
                    type="submit"
                    disabled={promoLoading}
                    className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-900 text-xs font-semibold rounded-xl transition-colors focus:outline-none focus:ring-2 focus:ring-stone-900 disabled:opacity-50"
                  >
                    {promoLoading ? '…' : 'Apply'}
                  </button>
                </div>
                {promoError && (
                  <p role="alert" className="text-xs text-red-700 font-semibold">{promoError}</p>
                )}
                {couponCode && couponDiscount > 0 && (
                  <p className="flex items-center gap-1 text-xs text-emerald-800 font-semibold">
                    <Tag className="w-3 h-3" aria-hidden="true" />
                    Coupon {couponCode} applied — -{formatCurrency(couponDiscount, currency)}
                  </p>
                )}
              </form>

              {user && user.rewardPoints > 0 && (
                <div className="p-4 rounded-2xl bg-[#faf6f0] border border-amber-300 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5 font-semibold text-stone-900">
                      <Sparkles className="w-3.5 h-3.5 text-amber-700" aria-hidden="true" />
                      <span>Redeem Gift Points ({user.rewardPoints} available)</span>
                    </div>
                    <span className="font-bold text-amber-900">
                      -{formatCurrency(pointsDiscount, currency)}
                    </span>
                  </div>
                  <label htmlFor="cart-reward-points-slider" className="sr-only">
                    Reward points redemption amount
                  </label>
                  <input
                    id="cart-reward-points-slider"
                    type="range"
                    min="0"
                    max={Math.min(user.rewardPoints, Math.floor(subtotal * 100))}
                    step="50"
                    value={redeemPoints}
                    onChange={(e) => onPointsChange(Number(e.target.value))}
                    className="w-full accent-stone-900 cursor-pointer"
                    aria-valuemin={0}
                    aria-valuemax={Math.min(user.rewardPoints, Math.floor(subtotal * 100))}
                    aria-valuenow={redeemPoints}
                    aria-valuetext={`${redeemPoints} reward points`}
                  />
                </div>
              )}
            </div>
          </div>

          {/* Right: Order Summary Card (Screen 06) */}
          <div className="lg:col-span-4 bg-white rounded-3xl border border-stone-200 p-6 space-y-5 sticky top-24">
            <h2 className="text-base font-semibold text-stone-900 pb-3 border-b border-stone-100">
              Order Summary
            </h2>

            <div className="space-y-2.5 text-xs text-stone-700">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span className="font-medium text-stone-900">{formatCurrency(subtotal, currency)}</span>
              </div>

              {pointsDiscount > 0 && (
                <div className="flex justify-between text-emerald-800 font-semibold">
                  <span>Gift points</span>
                  <span>-{formatCurrency(pointsDiscount, currency)}</span>
                </div>
              )}
              {couponDiscount > 0 && (
                <div className="flex justify-between text-emerald-800 font-semibold">
                  <span>Coupon ({couponCode})</span>
                  <span>-{formatCurrency(couponDiscount, currency)}</span>
                </div>
              )}

              <div className="pt-3 border-t border-stone-200 flex justify-between items-baseline">
                <span className="text-sm font-bold text-stone-900">Total</span>
                <span className="text-2xl font-bold text-stone-900">
                  {formatCurrency(finalTotal, currency)}
                </span>
              </div>
            </div>

            <button
              onClick={onProceedToCheckout}
              className="w-full py-3.5 rounded-xl bg-stone-900 hover:bg-stone-800 text-white font-semibold text-xs tracking-wide flex items-center justify-center gap-2 shadow-md transition-all hover:translate-y-[-1px] focus:outline-none focus:ring-2 focus:ring-stone-900"
            >
              <span>Proceed to Checkout</span>
              <ArrowRight className="w-4 h-4" aria-hidden="true" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
