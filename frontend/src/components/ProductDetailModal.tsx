import React, { useEffect, useState, useCallback } from 'react';
import { Book } from '../types';
import { api } from '../services/api';
import {
  X,
  Download,
  ShieldCheck,
  Smartphone,
  Heart,
  ChevronRight,
  Crown,
  TrendingUp,
} from 'lucide-react';
import { CurrencyCode, formatCurrency } from '../utils/currency';
import { FALLBACK_COVER } from '../utils/constants';
import { formatDeliveryDate } from '../utils/delivery';

interface ProductDetailModalProps {
  book: Book | null;
  onClose: () => void;
  onAddToCart: (bookId: string, quantity?: number) => void;
  onSelectBook: (book: Book) => void;
  /** Map of bookId to quantity already in the basket. */
  cartQuantities?: Record<string, number>;
  currency?: CurrencyCode;
}

export const ProductDetailModal: React.FC<ProductDetailModalProps> = ({
  book,
  onClose,
  onAddToCart,
  onSelectBook,
  cartQuantities = {},
  currency = 'EUR',
}) => {
  const [relatedBooks, setRelatedBooks] = useState<Book[]>([]);
  const [upsellBooks, setUpsellBooks] = useState<Book[]>([]);
  const [selectedTab, setSelectedTab] = useState<'about' | 'details' | 'reviews'>('about');
  const [selectedFormat, setSelectedFormat] = useState('eBook (EPUB)');

  // Handle ESC key to close modal
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    },
    [onClose],
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  useEffect(() => {
    if (book) {
      setSelectedFormat(book.format || 'eBook (EPUB)');
      setSelectedTab('about');
      api
        .getRelatedBooks(book.id, 4)
        .then((res) => setRelatedBooks(res))
        .catch(() => setRelatedBooks([]));
      api
        .getUpsellBooks(book.id, 3)
        .then((res) => setUpsellBooks(res))
        .catch(() => setUpsellBooks([]));
    }
  }, [book]);

  if (!book) return null;

  const isAvailable = book.isAvailable && book.stockQuantity > 0;
  const originalPriceNum = Number(book.price) / 0.75;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-2xs overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="product-modal-title"
    >
      <div className="relative w-full max-w-4xl bg-white rounded-3xl shadow-2xl border border-stone-200 overflow-hidden my-6 max-h-[92vh] flex flex-col">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 p-2 rounded-full bg-stone-100 hover:bg-stone-200 text-stone-700 transition-colors focus:outline-none focus:ring-2 focus:ring-stone-900"
          aria-label="Close product details modal"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="p-6 sm:p-10 overflow-y-auto space-y-10">
          {/* Breadcrumb Navigation */}
          <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs text-stone-600">
            <span className="hover:text-stone-900">Home</span>
            <ChevronRight className="w-3.5 h-3.5 text-stone-400" aria-hidden="true" />
            <span className="hover:text-stone-900">
              {book.category?.name || 'Books'}
            </span>
            <ChevronRight className="w-3.5 h-3.5 text-stone-400" aria-hidden="true" />
            <span className="text-stone-900 font-medium truncate max-w-xs" aria-current="page">
              {book.title}
            </span>
          </nav>

          {/* Product Hero Grid (Screen 04) */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
            {/* Left Cover Image */}
            <div className="md:col-span-5 flex flex-col items-center">
              <div className="relative w-full max-w-[280px] rounded-2xl overflow-hidden shadow-xl border border-stone-200 aspect-3/4 bg-stone-100">
                <img
                  src={book.coverImage || FALLBACK_COVER}
                  alt={`Cover of ${book.title} by ${book.author}`}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).src = FALLBACK_COVER;
                  }}
                />
              </div>

              {/* Carousel Indicator Dots */}
              <div className="flex items-center gap-1.5 mt-4" aria-hidden="true">
                <span className="w-2 h-2 rounded-full bg-stone-900" />
                <span className="w-2 h-2 rounded-full bg-stone-300" />
                <span className="w-2 h-2 rounded-full bg-stone-300" />
              </div>
            </div>

            {/* Right Product Details */}
            <div className="md:col-span-7 space-y-5">
              <div className="space-y-1.5">
                {book.isPremium && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[11px] font-bold">
                    <Crown className="w-3 h-3" aria-hidden="true" />
                    Premium title
                  </span>
                )}
                <h1 id="product-modal-title" className="text-2xl sm:text-3xl font-serif font-normal text-stone-900">
                  {book.title}
                </h1>
                <p className="text-sm font-medium text-stone-700">by {book.author}</p>

                {/* Rating */}
                <div className="flex items-center gap-2 pt-1 text-xs" aria-label={`Rated ${Number(book.rating).toFixed(1)} out of 5 stars with ${book.numReviews} reviews`}>
                  <div className="flex text-amber-500" aria-hidden="true">
                    {'★'.repeat(5)}
                  </div>
                  <span className="font-bold text-stone-900">
                    {Number(book.rating).toFixed(1)}
                  </span>
                  <span className="text-stone-600">({book.numReviews} reviews)</span>
                </div>
              </div>

              {/* Price Row */}
              <div className="flex items-baseline gap-3 pt-1">
                <span className="text-2xl font-bold text-stone-900">
                  {formatCurrency(Number(book.price), currency)}
                </span>
                <span className="text-sm text-stone-500 line-through" aria-label={`Original price ${formatCurrency(originalPriceNum, currency)}`}>
                  {formatCurrency(originalPriceNum, currency)}
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-900">
                  25% OFF
                </span>
              </div>

              {/* In-basket tag */}
              {(cartQuantities[book.id] ?? 0) > 0 && (
                <p className="inline-block mr-2 px-3 py-1 rounded-lg bg-emerald-600 text-white text-xs font-semibold">
                  In basket ({cartQuantities[book.id]})
                </p>
              )}

              {/* Tentative delivery date */}
              {isAvailable && (
                <p className="inline-block px-3 py-1 rounded-lg bg-emerald-50 text-emerald-800 text-xs font-semibold">
                  Tentative delivery: {formatDeliveryDate(book.deliveryDays)}
                </p>
              )}

              {/* Synopsis */}
              <p className="text-xs sm:text-sm text-stone-700 leading-relaxed">
                {book.description ||
                  'An extraordinary story of adventure, power, politics, and survival exploring profound horizons.'}
              </p>

              {/* Format Dropdown */}
              <div className="space-y-1.5 pt-1">
                <label htmlFor="modal-format-select" className="block text-xs font-semibold text-stone-800">
                  Format
                </label>
                <select
                  id="modal-format-select"
                  value={selectedFormat}
                  onChange={(e) => setSelectedFormat(e.target.value)}
                  className="w-full p-2.5 text-xs bg-white border border-stone-300 rounded-xl font-medium text-stone-900 focus:outline-none focus:ring-2 focus:ring-stone-900"
                >
                  <option value="eBook (EPUB)">eBook (EPUB)</option>
                  <option value="eBook (PDF)">eBook (PDF)</option>
                  <option value="Hardcover">Hardcover</option>
                  <option value="Paperback">Paperback</option>
                </select>
              </div>

              {/* Action Buttons: Add to Cart + Wishlist */}
              <div className="flex items-center gap-3 pt-2">
                <button
                  onClick={() => onAddToCart(book.id, 1)}
                  disabled={!isAvailable}
                  className={`flex-1 py-3 px-6 rounded-xl text-sm font-semibold transition-all focus:outline-none focus:ring-2 focus:ring-stone-900 ${
                    !isAvailable
                      ? 'bg-stone-100 text-stone-400 cursor-not-allowed'
                      : 'bg-stone-900 hover:bg-stone-800 text-white shadow-md'
                  }`}
                >
                  {isAvailable ? 'Add to cart' : 'Out of stock'}
                </button>

                <button
                  className="p-3 rounded-xl border border-stone-200 text-stone-700 hover:bg-stone-100 transition-colors focus:outline-none focus:ring-2 focus:ring-stone-900"
                  aria-label="Save to Wishlist"
                >
                  <Heart className="w-5 h-5" aria-hidden="true" />
                </button>
              </div>

              {/* Trust Badges */}
              <div className="grid grid-cols-3 gap-2 pt-4 border-t border-stone-200 text-[11px] text-stone-600">
                <div className="flex items-center gap-1.5">
                  <Download className="w-3.5 h-3.5 text-stone-800 shrink-0" aria-hidden="true" />
                  <span>Instant download</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-stone-800 shrink-0" aria-hidden="true" />
                  <span>Secure payment</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Smartphone className="w-3.5 h-3.5 text-stone-800 shrink-0" aria-hidden="true" />
                  <span>All devices</span>
                </div>
              </div>
            </div>
          </div>

          {/* Tabs: About / Details / Reviews */}
          <div className="pt-6 border-t border-stone-200 space-y-4">
            <div className="flex items-center gap-6 border-b border-stone-200 text-xs font-semibold" role="tablist">
              {(['about', 'details', 'reviews'] as const).map((tab) => (
                <button
                  key={tab}
                  role="tab"
                  aria-selected={selectedTab === tab}
                  id={`tab-${tab}`}
                  aria-controls={`panel-${tab}`}
                  onClick={() => setSelectedTab(tab)}
                  className={`pb-2 capitalize transition-colors focus:outline-none focus:ring-1 focus:ring-stone-900 ${
                    selectedTab === tab
                      ? 'text-stone-900 border-b-2 border-stone-900 font-bold'
                      : 'text-stone-500 hover:text-stone-800'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>

            <div
              id={`panel-${selectedTab}`}
              role="tabpanel"
              aria-labelledby={`tab-${selectedTab}`}
              className="text-xs text-stone-700 leading-relaxed pt-1"
            >
              {selectedTab === 'about' && (
                <p>
                  {book.description ||
                    'Frank Herbert’s epic science fiction novel follows Paul Atreides, a young nobleman tasked with ruling the desert planet Arrakis.'}
                </p>
              )}
              {selectedTab === 'details' && (
                <div className="space-y-1">
                  <p><strong>ISBN:</strong> {book.isbn}</p>
                  <p><strong>Publisher:</strong> {book.brand?.name || 'Publisher'}</p>
                  <p><strong>Language:</strong> English</p>
                  <p><strong>Format:</strong> {selectedFormat}</p>
                </div>
              )}
              {selectedTab === 'reviews' && (
                <p>
                  Rated {Number(book.rating).toFixed(1)} out of 5 stars based on {book.numReviews} customer reviews.
                </p>
              )}
            </div>
          </div>

          {/* Up-sell: "You might prefer" (pricier alternatives in the same category) */}
          {upsellBooks.length > 0 && (
            <div className="pt-8 border-t border-stone-200 space-y-4">
              <div>
                <h2 className="text-lg font-serif text-stone-900 font-semibold flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-stone-700" aria-hidden="true" />
                  You might prefer
                </h2>
                <p className="text-xs text-stone-600">
                  Similar titles at a higher tier — more pages, more editions, more detail.
                </p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {upsellBooks.map((ups) => (
                  <div
                    key={ups.id}
                    className="p-3 rounded-2xl border border-amber-200 bg-amber-50 hover:border-amber-400 transition-all flex flex-col justify-between gap-2 group"
                  >
                    <button
                      type="button"
                      className="aspect-3/4 rounded-xl overflow-hidden bg-stone-100 cursor-pointer text-left w-full focus:outline-none focus:ring-2 focus:ring-stone-900"
                      onClick={() => onSelectBook(ups)}
                      aria-label={`View details for ${ups.title}`}
                    >
                      <img
                        src={ups.coverImage || FALLBACK_COVER}
                        alt={`Cover of ${ups.title}`}
                        className="w-full h-full object-cover group-hover:scale-103 transition-transform"
                      />
                    </button>
                    <div className="space-y-0.5">
                      <button
                        type="button"
                        className="font-bold text-stone-900 text-xs truncate w-full text-left hover:text-stone-700 transition-colors focus:outline-none focus:ring-1 focus:ring-stone-900 rounded"
                        onClick={() => onSelectBook(ups)}
                      >
                        {ups.title}
                      </button>
                      <p className="text-[11px] text-stone-600 truncate">{ups.author}</p>
                      <p className="text-xs font-bold text-amber-900 pt-0.5">
                        {formatCurrency(Number(ups.price), currency)}
                      </p>
                    </div>
                    <button
                      onClick={() => onAddToCart(ups.id, 1)}
                      aria-label={`Add ${ups.title} to cart`}
                      className="w-full py-1.5 rounded-lg text-xs font-semibold bg-amber-100 hover:bg-amber-600 hover:text-white text-amber-900 transition-colors focus:outline-none focus:ring-2 focus:ring-amber-600"
                    >
                      Add to cart
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Screen 05: Related Products ("You may also like") */}
          {relatedBooks.length > 0 && (
            <div className="pt-8 border-t border-stone-200 space-y-4">
              <div>
                <h2 className="text-lg font-serif text-stone-900 font-semibold">
                  You may also like
                </h2>
                <p className="text-xs text-stone-600">
                  Discover more books from this author and similar titles
                </p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {relatedBooks.map((relBook) => (
                  <div
                    key={relBook.id}
                    className="p-3 rounded-2xl border border-stone-200 bg-white hover:border-stone-400 transition-all flex flex-col justify-between gap-2 group"
                  >
                    <button
                      type="button"
                      className="aspect-3/4 rounded-xl overflow-hidden bg-stone-100 cursor-pointer text-left w-full focus:outline-none focus:ring-2 focus:ring-stone-900"
                      onClick={() => onSelectBook(relBook)}
                      aria-label={`View details for ${relBook.title}`}
                    >
                      <img
                        src={relBook.coverImage || FALLBACK_COVER}
                        alt={`Cover of ${relBook.title}`}
                        className="w-full h-full object-cover group-hover:scale-103 transition-transform"
                      />
                    </button>

                    <div className="space-y-0.5">
                      <button
                        type="button"
                        className="font-bold text-stone-900 text-xs truncate w-full text-left hover:text-stone-700 transition-colors focus:outline-none focus:ring-1 focus:ring-stone-900 rounded"
                        onClick={() => onSelectBook(relBook)}
                      >
                        {relBook.title}
                      </button>
                      <p className="text-[11px] text-stone-600 truncate">{relBook.author}</p>
                      {(cartQuantities[relBook.id] ?? 0) > 0 && (
                        <p className="inline-block px-1.5 py-0.5 rounded bg-emerald-600 text-white text-[10px] font-semibold">
                          In basket ({cartQuantities[relBook.id]})
                        </p>
                      )}
                      {relBook.isAvailable && relBook.stockQuantity > 0 && (
                        <p className="text-[10px] font-semibold text-emerald-800">
                          Delivery by {formatDeliveryDate(relBook.deliveryDays)}
                        </p>
                      )}
                      <p className="text-xs font-bold text-stone-900 pt-0.5">
                        {formatCurrency(Number(relBook.price), currency)}
                      </p>
                    </div>

                    <button
                      onClick={() => onAddToCart(relBook.id, 1)}
                      aria-label={`Add ${relBook.title} to cart`}
                      className="w-full py-1.5 rounded-lg text-xs font-semibold bg-stone-100 hover:bg-stone-900 hover:text-white text-stone-900 transition-colors focus:outline-none focus:ring-2 focus:ring-stone-900"
                    >
                      Add to cart
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
