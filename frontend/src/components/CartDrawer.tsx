import React, { useEffect, useState } from 'react';
import { CartResponse, Book } from '../types';
import { api } from '../services/api';
import {
  X,
  Trash2,
  Plus,
  Minus,
  ShoppingBag,
  Sparkles,
  ArrowRight,
} from 'lucide-react';
import { LoadingSpinner } from './LoadingSpinner';
import { formatCurrency } from '../utils/currency';
import type { CurrencyCode } from '../utils/currency';
import { FALLBACK_COVER } from '../utils/constants';

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  cart: CartResponse | null;
  onUpdateQuantity: (cartItemId: string, quantity: number) => void;
  onRemoveItem: (cartItemId: string) => void;
  onClearCart: () => void;
  onProceedToCheckout: () => void;
  onAddToCart: (bookId: string) => void;
  onSelectBook: (book: Book) => void;
  currency?: CurrencyCode;
}

export const CartDrawer: React.FC<CartDrawerProps> = ({
  isOpen,
  onClose,
  cart,
  onUpdateQuantity,
  onRemoveItem,
  onClearCart,
  onProceedToCheckout,
  onAddToCart,
  onSelectBook,
  currency = 'EUR',
}) => {
  const [recommendations, setRecommendations] = useState<Book[]>([]);
  const [loadingRecs, setLoadingRecs] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setLoadingRecs(true);
      api
        .getOrderHistoryRecommendations(3)
        .then((res) => setRecommendations(res))
        .catch(() => setRecommendations([]))
        .finally(() => setLoadingRecs(false));
    }
  }, [isOpen, cart?.totalItems]);

  if (!isOpen) return null;

  const items = cart?.items || [];
  const subtotal = cart?.subtotal || 0;
  const totalItems = cart?.totalItems || 0;

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-stone-900/60 backdrop-blur-sm animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-label="Shopping cart"
    >
      {/* Backdrop click to close */}
      <button
        type="button"
        className="absolute inset-0 w-full h-full cursor-default"
        onClick={onClose}
        aria-label="Close cart"
        tabIndex={-1}
      />

      <div className="relative w-full max-w-md bg-white h-full shadow-2xl flex flex-col">
        {/* Cart Header */}
        <div className="px-5 py-4 border-b border-stone-200 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-stone-900 text-white">
              <ShoppingBag className="w-4.5 h-4.5" aria-hidden="true" />
            </div>
            <div>
              <h2 className="text-base font-bold text-stone-900">Your Basket</h2>
              <p className="text-xs text-stone-500">
                {totalItems} {totalItems === 1 ? 'book' : 'books'} selected
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {items.length > 0 && (
              <button
                onClick={onClearCart}
                className="text-xs text-stone-400 hover:text-red-600 transition-colors px-2 py-1 rounded-lg hover:bg-stone-100"
              >
                Clear all
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 rounded-full hover:bg-stone-100 text-stone-600 transition-colors"
              aria-label="Close cart drawer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Cart Items List */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {items.length === 0 ? (
            <div className="py-12 text-center space-y-3">
              <div className="w-16 h-16 rounded-full bg-stone-100 mx-auto flex items-center justify-center text-stone-400">
                <ShoppingBag className="w-8 h-8" aria-hidden="true" />
              </div>
              <h3 className="font-bold text-stone-800 text-base">Your basket is empty</h3>
              <p className="text-xs text-stone-500 max-w-xs mx-auto">
                Explore our catalogue to find bestselling books across technology, science, fantasy, and more!
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {items.map((item) => (
                <div
                  key={item.id}
                  className="flex gap-3 p-3 rounded-2xl bg-stone-50 border border-stone-200 items-center"
                >
                  <button
                    type="button"
                    className="w-14 h-[72px] rounded-xl overflow-hidden bg-white shrink-0 border border-stone-200 focus:outline-none focus:ring-2 focus:ring-stone-900"
                    onClick={() => { if (item.book) onSelectBook(item.book); }}
                    aria-label={`View details for ${item.book?.title || 'book'}`}
                  >
                    <img
                      src={item.book?.coverImage || FALLBACK_COVER}
                      alt={`Cover of ${item.book?.title || 'book'}`}
                      className="w-full h-full object-cover"
                    />
                  </button>

                  <div className="flex-1 min-w-0">
                    <button
                      type="button"
                      className="font-bold text-stone-900 text-xs sm:text-sm line-clamp-1 text-left hover:text-stone-600 transition-colors w-full focus:outline-none focus:ring-1 focus:ring-stone-900 rounded"
                      onClick={() => { if (item.book) onSelectBook(item.book); }}
                    >
                      {item.book?.title}
                    </button>
                    <p className="text-[11px] text-stone-500 truncate mt-0.5">{item.book?.author}</p>
                    <span className="text-xs font-bold text-stone-900 mt-1 block">
                      {formatCurrency(Number(item.book?.price || 0), currency)}
                    </span>
                  </div>

                  <div className="flex flex-col items-end gap-2 shrink-0">
                    <button
                      onClick={() => onRemoveItem(item.id)}
                      className="text-stone-400 hover:text-red-600 transition-colors p-1 rounded-lg hover:bg-stone-100"
                      aria-label={`Remove ${item.book?.title || 'item'} from cart`}
                    >
                      <Trash2 className="w-4 h-4" aria-hidden="true" />
                    </button>

                    <div className="flex items-center border border-stone-300 rounded-xl overflow-hidden bg-white">
                      <button
                        onClick={() => onUpdateQuantity(item.id, item.quantity - 1)}
                        className="px-2.5 py-1 text-xs text-stone-700 hover:bg-stone-100 font-bold focus:outline-none focus:ring-1 focus:ring-stone-900"
                        aria-label={`Decrease quantity of ${item.book?.title || 'item'}`}
                      >
                        <Minus className="w-3 h-3" aria-hidden="true" />
                      </button>
                      <span
                        className="px-2.5 text-xs font-bold text-stone-900 min-w-[24px] text-center"
                        aria-label={`Quantity: ${item.quantity}`}
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
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Recommendations from order history */}
          <div className="pt-4 border-t border-stone-200 space-y-3">
            <div className="flex items-center gap-1.5 text-xs font-bold text-stone-700">
              <Sparkles className="w-3.5 h-3.5 text-amber-600" aria-hidden="true" />
              <span>You may also enjoy</span>
            </div>

            {loadingRecs ? (
              <div className="flex items-center gap-2 text-xs text-stone-400 py-2">
                <LoadingSpinner size="sm" />
                <span>Loading recommendations…</span>
              </div>
            ) : recommendations.length === 0 ? (
              <p className="text-xs text-stone-400">Discover more in our catalogue.</p>
            ) : (
              <div className="space-y-2">
                {recommendations.map((rec) => (
                  <div
                    key={rec.id}
                    className="flex items-center justify-between gap-2 p-2.5 rounded-xl border border-stone-200 bg-stone-50 hover:border-stone-300 transition-colors"
                  >
                    <button
                      type="button"
                      className="flex items-center gap-2 min-w-0 focus:outline-none focus:ring-1 focus:ring-stone-900 rounded"
                      onClick={() => onSelectBook(rec)}
                      aria-label={`View ${rec.title}`}
                    >
                      <img
                        src={rec.coverImage || FALLBACK_COVER}
                        alt={`Cover of ${rec.title}`}
                        className="w-8 h-10 rounded-md object-cover border border-stone-200 shrink-0"
                      />
                      <div className="min-w-0 text-left">
                        <p className="font-semibold text-xs text-stone-900 truncate">{rec.title}</p>
                        <p className="text-[10px] text-stone-500">{formatCurrency(Number(rec.price), currency)}</p>
                      </div>
                    </button>

                    <button
                      onClick={() => onAddToCart(rec.id)}
                      className="px-2.5 py-1 rounded-lg bg-stone-900 hover:bg-stone-800 text-white text-[11px] font-bold shrink-0 transition-colors"
                      aria-label={`Add ${rec.title} to cart`}
                    >
                      + Add
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Cart Footer */}
        {items.length > 0 && (
          <div className="px-5 py-4 border-t border-stone-200 bg-stone-50 space-y-4">
            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between text-stone-600">
                <span>Subtotal</span>
                <span className="font-semibold text-stone-900">{formatCurrency(subtotal, currency)}</span>
              </div>
              <div className="flex justify-between text-stone-400 text-[11px]">
                <span>Shipping &amp; points discount</span>
                <span>Calculated at checkout</span>
              </div>
            </div>

            <button
              onClick={onProceedToCheckout}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl bg-stone-900 hover:bg-stone-800 text-white font-bold text-sm shadow-lg transition-all hover:-translate-y-px focus:outline-none focus:ring-2 focus:ring-stone-900"
            >
              <span>Proceed to Checkout</span>
              <ArrowRight className="w-4 h-4" aria-hidden="true" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
