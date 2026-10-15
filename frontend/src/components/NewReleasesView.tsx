import React, { useState } from 'react';
import { Book, Category } from '../types';
import { CurrencyCode, formatCurrency } from '../utils/currency';
import { BookCard } from './BookCard';
import { Sparkles, Calendar, Flame, Zap } from 'lucide-react';
import { FALLBACK_COVER } from '../utils/constants';

interface NewReleasesViewProps {
  books: Book[];
  categories: Category[];
  onSelectBook: (book: Book) => void;
  onAddToCart: (bookId: string) => void;
  addingBookId: string | null;
  /** Map of bookId to quantity already in the basket. */
  cartQuantities?: Record<string, number>;
  currency: CurrencyCode;
}

export const NewReleasesView: React.FC<NewReleasesViewProps> = ({
  books,
  categories,
  onSelectBook,
  onAddToCart,
  addingBookId,
  cartQuantities = {},
  currency,
}) => {
  const [selectedTag, setSelectedTag] = useState<string>('all');

  // Filter books or sort by newest
  const sortedNewReleases = [...books].sort((a, b) => {
    // Sort by rating or creation
    return Number(b.rating) - Number(a.rating);
  });

  const filteredBooks = selectedTag === 'all'
    ? sortedNewReleases
    : sortedNewReleases.filter(
        (b) => b.categoryId === selectedTag || b.category?.slug === selectedTag
      );

  const featuredDebut = sortedNewReleases[0];

  return (
    <div className="space-y-12 my-6">
      {/* New Releases Spotlight Hero Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-stone-950 bg-gradient-to-br from-amber-950 via-stone-900 to-stone-950 text-white p-8 sm:p-12 shadow-2xl border border-amber-900/60">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
          {/* Left Text */}
          <div className="md:col-span-8 space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/25 text-amber-300 border border-amber-400/40 text-xs font-semibold backdrop-blur-xs">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Spring 2025 Catalogue Releases</span>
            </div>

            <h1 className="text-3xl sm:text-4xl font-serif font-normal text-white tracking-tight leading-tight">
              Fresh Off the Press: Discover This Month&apos;s New Book Debuts
            </h1>

            <p className="text-stone-200 text-xs sm:text-sm leading-relaxed max-w-xl">
              Be the first to explore the latest publications, updated technical revisions, and highly anticipated literary sequels. Delivered straight to your device in seconds.
            </p>

            <div className="flex flex-wrap items-center gap-4 pt-2 text-xs">
              <div className="flex items-center gap-1.5 text-stone-200 font-medium">
                <Calendar className="w-4 h-4 text-amber-400" />
                <span>Updated Weekly</span>
              </div>
              <div className="flex items-center gap-1.5 text-stone-200 font-medium">
                <Flame className="w-4 h-4 text-amber-400" />
                <span>Bestselling Authors</span>
              </div>
              <div className="flex items-center gap-1.5 text-stone-200 font-medium">
                <Zap className="w-4 h-4 text-amber-400" />
                <span>Instant EPUB & PDF</span>
              </div>
            </div>
          </div>

          {/* Right Spotlight Book Card */}
          {featuredDebut && (
            <div className="md:col-span-4 bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/20 flex items-center gap-4">
              <button
                type="button"
                className="w-20 h-28 rounded-xl overflow-hidden bg-stone-100 shrink-0 border border-white/30 shadow-lg focus:outline-none focus:ring-2 focus:ring-amber-400"
                onClick={() => onSelectBook(featuredDebut)}
                aria-label={`View details for ${featuredDebut.title}`}
              >
                <img
                  src={featuredDebut.coverImage || FALLBACK_COVER}
                  alt={featuredDebut.title}
                  className="w-full h-full object-cover hover:scale-105 transition-transform"
                />
              </button>

              <div className="space-y-1 min-w-0">
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-400 text-stone-950 uppercase tracking-wider inline-block">
                  #1 New Release
                </span>
                <button
                  type="button"
                  className="text-xs font-bold text-white truncate w-full text-left hover:text-amber-300 transition-colors focus:outline-none focus:ring-1 focus:ring-amber-400 rounded"
                  onClick={() => onSelectBook(featuredDebut)}
                >
                  {featuredDebut.title}
                </button>
                <p className="text-[11px] text-stone-300 truncate">{featuredDebut.author}</p>
                <p className="text-xs font-bold text-amber-300 pt-0.5">
                  {formatCurrency(Number(featuredDebut.price), currency)}
                </p>
                <button
                  onClick={() => onAddToCart(featuredDebut.id)}
                  disabled={addingBookId === featuredDebut.id}
                  aria-label={addingBookId === featuredDebut.id ? 'Adding to cart…' : `Add ${featuredDebut.title} to cart`}
                  className="mt-1 px-3 py-1 rounded-lg text-[11px] font-bold bg-white text-stone-900 hover:bg-amber-400 transition-colors"
                >
                  {addingBookId === featuredDebut.id ? 'Adding…' : 'Add to Cart'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Genre Filter Pills */}
      <div className="flex items-center justify-between flex-wrap gap-4 pb-2 border-b border-stone-200">
        <div className="flex items-center gap-2 overflow-x-auto pb-1 max-w-full">
          <button
            onClick={() => setSelectedTag('all')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-colors shrink-0 ${
              selectedTag === 'all'
                ? 'bg-stone-900 text-white'
                : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
            }`}
          >
            All New Releases ({sortedNewReleases.length})
          </button>

          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedTag(cat.slug)}
              className={`px-4 py-2 rounded-xl text-xs font-semibold transition-colors shrink-0 ${
                selectedTag === cat.slug
                  ? 'bg-stone-900 text-white'
                  : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>

        <span className="text-xs text-stone-500 font-medium">
          Showing <strong className="text-stone-900 font-semibold">{filteredBooks.length}</strong> new arrivals
        </span>
      </div>

      {/* Books Grid */}
      <div className="space-y-4">
        {filteredBooks.length === 0 ? (
          <div className="py-16 text-center bg-white rounded-3xl border border-stone-200 p-8 space-y-3">
            <p className="text-sm font-bold text-stone-800">No new releases in this category yet</p>
            <p className="text-xs text-stone-500">Check back soon or explore other genre releases.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-5">
            {filteredBooks.map((book) => (
              <div key={book.id} className="relative">
                {/* NEW Badge Overlay */}
                <div className="absolute top-2 left-2 z-10 px-2 py-0.5 rounded-md bg-amber-500 text-stone-950 font-bold text-[10px] tracking-wider uppercase shadow-xs pointer-events-none">
                  NEW
                </div>
                <BookCard
                  book={book}
                  onSelect={onSelectBook}
                  onAddToCart={onAddToCart}
                  isAdding={addingBookId === book.id}
                  quantityInCart={cartQuantities[book.id] ?? 0}
                  currency={currency}
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
