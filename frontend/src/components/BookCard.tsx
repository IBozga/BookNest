import React, { useState } from 'react';
import { Book } from '../types';
import { CurrencyCode, formatCurrency } from '../utils/currency';
import { Check, Star, Crown } from 'lucide-react';
import { LoadingSpinner } from './LoadingSpinner';
import { FALLBACK_COVER } from '../utils/constants';
import { formatDeliveryDate } from '../utils/delivery';

interface BookCardProps {
  book: Book;
  onSelect: (book: Book) => void;
  onAddToCart: (bookId: string) => void;
  isAdding?: boolean;
  /** Quantity of this book already in the basket; shows an "In basket" tag when > 0. */
  quantityInCart?: number;
  currency?: CurrencyCode;
}

export const BookCard: React.FC<BookCardProps> = ({
  book,
  onSelect,
  onAddToCart,
  isAdding = false,
  quantityInCart = 0,
  currency = 'EUR',
}) => {
  const [imgSrc, setImgSrc] = useState(book.coverImage || FALLBACK_COVER);
  const isAvailable = book.isAvailable && book.stockQuantity > 0;

  return (
    <div className="group w-full h-[380px] flex flex-col bg-white rounded-2xl border border-stone-200/90 hover:border-stone-400 hover:shadow-lg transition-all duration-200 overflow-hidden select-none">
      {/* 1. FIXED IMAGE CONTAINER (Exact height 200px across all cards) */}
      <div
        className="relative h-[200px] w-full shrink-0 overflow-hidden bg-stone-100 cursor-pointer"
        onClick={() => onSelect(book)}
      >
        <img
          src={imgSrc}
          alt={book.title}
          onError={() => setImgSrc(FALLBACK_COVER)}
          className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-300"
          loading="lazy"
        />

        {/* Category Pill Overlay */}
        {book.category?.name && (
          <div className="absolute top-2 right-2 px-2 py-0.5 rounded-md bg-stone-900/80 backdrop-blur-xs text-[10px] font-semibold text-white uppercase tracking-wider shadow-xs">
            {book.category.name}
          </div>
        )}

        {/* Premium badge */}
        {book.isPremium && (
          <div className="absolute top-2 left-2 flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-500 text-[10px] font-bold text-white shadow-xs" aria-label="Premium title">
            <Crown className="w-3 h-3" aria-hidden="true" />
            <span>Premium</span>
          </div>
        )}

        {/* In-basket tag */}
        {quantityInCart > 0 && (
          <div className="absolute bottom-2 left-2 z-10 flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-600 text-[10px] font-semibold text-white shadow-xs">
            <Check className="w-3 h-3" aria-hidden="true" />
            <span>In basket ({quantityInCart})</span>
          </div>
        )}

        {/* Stock Badge Overlay if out of stock */}
        {!isAvailable && (
          <div className="absolute inset-0 bg-stone-900/60 backdrop-blur-2xs flex items-center justify-center p-2">
            <span className="px-2.5 py-1 rounded-md text-[11px] font-bold bg-white text-stone-900 uppercase tracking-wider shadow-xs">
              Out of stock
            </span>
          </div>
        )}
      </div>

      {/* 2. FIXED METADATA CONTAINER (Fills remaining 180px with uniform layout) */}
      <div className="p-3.5 flex flex-col flex-1 justify-between bg-white">
        <div className="space-y-1">
          {/* Rating line */}
          <div className="flex items-center justify-between text-[11px] text-stone-500 h-4">
            <div className="flex items-center gap-1">
              <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
              <span className="font-bold text-stone-800">{Number(book.rating || 4.5).toFixed(1)}</span>
              <span className="text-stone-400">({book.numReviews || 12})</span>
            </div>
            <span className="text-[10px] font-medium text-stone-400 truncate max-w-[80px]">
              {book.brand?.name || book.format || 'eBook'}
            </span>
          </div>

          {/* Title - Fixed height 2-line box (38px) */}
          <h3
            className="font-bold text-stone-900 text-sm leading-snug line-clamp-2 h-[38px] hover:text-stone-600 cursor-pointer transition-colors"
            onClick={() => onSelect(book)}
            title={book.title}
          >
            {book.title}
          </h3>

          {/* Author - Fixed height 1-line box (18px) */}
          <p className="text-xs text-stone-500 truncate h-[18px]">by {book.author}</p>

          {/* Tentative delivery date tag */}
          {isAvailable && (
            <p className="inline-block px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 text-[10px] font-semibold">
              Delivery by {formatDeliveryDate(book.deliveryDays)}
            </p>
          )}
        </div>

        {/* Bottom Price & Add to Cart row */}
        <div className="pt-2 border-t border-stone-100 flex items-center justify-between gap-2 shrink-0">
          <span className="text-sm font-bold text-stone-900">
            {formatCurrency(Number(book.price), currency)}
          </span>

          <button
            onClick={(e) => {
              e.stopPropagation();
              onAddToCart(book.id);
            }}
            disabled={!isAvailable || isAdding}
            aria-label={isAdding ? 'Adding to cart…' : `Add ${book.title} to cart`}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all shrink-0 flex items-center gap-1.5 ${
              !isAvailable
                ? 'bg-stone-100 text-stone-400 cursor-not-allowed'
                : isAdding
                ? 'bg-stone-900 text-white cursor-wait'
                : 'bg-stone-100 hover:bg-stone-900 hover:text-white text-stone-800 active:scale-95'
            }`}
          >
            {isAdding ? (
              <>
                <LoadingSpinner size="sm" className="border-white/40 border-t-white" />
                <span>Adding…</span>
              </>
            ) : (
              'Add to cart'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
