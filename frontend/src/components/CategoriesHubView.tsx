import React from 'react';
import { Category, Book } from '../types';
import { CurrencyCode, formatCurrency } from '../utils/currency';
import {
  Cpu,
  Sparkles,
  Briefcase,
  BookOpen,
  Search,
  Globe,
  Layers,
  ArrowRight,
  TrendingUp,
  Zap,
} from 'lucide-react';
import { FALLBACK_COVER } from '../utils/constants';

interface CategoriesHubViewProps {
  categories: Category[];
  books: Book[];
  onSelectCategory: (categorySlug: string) => void;
  onSelectBook: (book: Book) => void;
  currency: CurrencyCode;
}

export const CategoriesHubView: React.FC<CategoriesHubViewProps> = ({
  categories,
  books,
  onSelectCategory,
  onSelectBook,
  currency,
}) => {
  // Map icons
  const getIcon = (slug: string) => {
    switch (slug) {
      case 'technology-ai':
        return <Cpu className="w-6 h-6 text-indigo-700" />;
      case 'scifi-fantasy':
        return <Sparkles className="w-6 h-6 text-purple-700" />;
      case 'business-leadership':
        return <Briefcase className="w-6 h-6 text-amber-700" />;
      case 'fiction-literature':
        return <BookOpen className="w-6 h-6 text-rose-700" />;
      case 'mystery-thriller':
        return <Search className="w-6 h-6 text-sky-700" />;
      case 'science-nature':
        return <Globe className="w-6 h-6 text-emerald-700" />;
      default:
        return <Layers className="w-6 h-6 text-stone-700" />;
    }
  };

  const getGradient = (slug: string) => {
    switch (slug) {
      case 'technology-ai':
        return 'from-indigo-50/90 to-blue-50/50 border-indigo-200 hover:border-indigo-400';
      case 'scifi-fantasy':
        return 'from-purple-50/90 to-violet-50/50 border-purple-200 hover:border-purple-400';
      case 'business-leadership':
        return 'from-amber-50/90 to-yellow-50/50 border-amber-200 hover:border-amber-400';
      case 'fiction-literature':
        return 'from-rose-50/90 to-pink-50/50 border-rose-200 hover:border-rose-400';
      case 'mystery-thriller':
        return 'from-sky-50/90 to-cyan-50/50 border-sky-200 hover:border-sky-400';
      case 'science-nature':
        return 'from-emerald-50/90 to-teal-50/50 border-emerald-200 hover:border-emerald-400';
      default:
        return 'from-stone-50 to-stone-100 border-stone-200 hover:border-stone-400';
    }
  };

  return (
    <div className="space-y-12 my-6">
      {/* High-Contrast Accessible Categories Hero Header */}
      <div className="relative overflow-hidden rounded-3xl bg-stone-900 bg-gradient-to-br from-stone-950 via-stone-900 to-stone-850 text-white p-8 sm:p-12 shadow-xl border border-stone-800">
        <div className="relative z-10 max-w-2xl space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 text-stone-100 border border-white/20 text-xs font-semibold backdrop-blur-xs">
            <Layers className="w-3.5 h-3.5 text-stone-200" />
            <span>Category Hub & Directory</span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-serif font-normal text-white tracking-tight leading-tight">
            Explore Literature by Category & Genre
          </h1>

          <p className="text-stone-200 text-xs sm:text-sm leading-relaxed">
            From breakthrough Artificial Intelligence research and astrophysics to epic fantasy sagas and bestselling literary classics. Browse our hand-curated collections.
          </p>

          <div className="grid grid-cols-3 gap-4 pt-4 border-t border-stone-700 text-center sm:text-left">
            <div>
              <div className="text-2xl font-bold text-white">{categories.length}</div>
              <div className="text-xs text-stone-300 font-medium">Curated Genres</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-white">{books.length}+</div>
              <div className="text-xs text-stone-300 font-medium">Digital Titles</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-emerald-400">100%</div>
              <div className="text-xs text-stone-300 font-medium">Instant Delivery</div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Categories Cards Showcase */}
      <div className="space-y-6">
        <div className="flex items-center justify-between pb-2 border-b border-stone-200">
          <div>
            <h2 className="text-2xl font-serif font-semibold text-stone-900">
              Browse All Categories
            </h2>
            <p className="text-xs text-stone-600 font-medium">
              Select a genre below to view full catalogues, author rankings, and book collections
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {categories.map((cat) => {
            const catBooks = books.filter((b) => b.categoryId === cat.id || b.category?.slug === cat.slug);
            const bookCount = catBooks.length > 0 ? catBooks.length : 2;

            return (
              <div
                key={cat.id}
                className={`group rounded-3xl border bg-gradient-to-b ${getGradient(cat.slug)} p-6 transition-all duration-200 hover:shadow-lg flex flex-col justify-between gap-6 cursor-pointer`}
                onClick={() => onSelectCategory(cat.slug)}
              >
                <div className="space-y-4">
                  <div className="flex items-start justify-between">
                    <div className="p-3 bg-white rounded-2xl shadow-xs border border-stone-200 group-hover:scale-105 transition-transform">
                      {getIcon(cat.slug)}
                    </div>
                    <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-white text-stone-900 border border-stone-200 shadow-2xs">
                      {bookCount} {bookCount === 1 ? 'Book' : 'Books'}
                    </span>
                  </div>

                  <div className="space-y-1.5">
                    <h3 className="text-xl font-serif font-semibold text-stone-900 group-hover:text-stone-700 transition-colors">
                      {cat.name}
                    </h3>
                    <p className="text-xs text-stone-700 font-normal line-clamp-2 leading-relaxed">
                      {cat.description || `Discover top rated titles, award winners, and bestsellers in ${cat.name}.`}
                    </p>
                  </div>
                </div>

                {/* Sample Book Previews in this category */}
                <div className="space-y-3 pt-4 border-t border-stone-200/80">
                  <span className="text-[11px] font-bold text-stone-700 uppercase tracking-wider block">
                    Featured in this category:
                  </span>

                  <div className="grid grid-cols-2 gap-2">
                    {catBooks.slice(0, 2).map((b) => (
                      <button
                        key={b.id}
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectBook(b);
                        }}
                        aria-label={`View details for ${b.title}`}
                        className="p-2 rounded-xl bg-white/95 border border-stone-200 hover:bg-white hover:border-stone-400 transition-all flex items-center gap-2 text-left shadow-2xs focus:outline-none focus:ring-2 focus:ring-stone-900"
                      >
                        <div className="w-8 h-11 rounded-lg overflow-hidden bg-stone-100 shrink-0 border border-stone-200">
                          <img
                            src={b.coverImage || FALLBACK_COVER}
                            alt={b.title}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-[11px] font-bold text-stone-900 truncate">{b.title}</p>
                          <p className="text-[10px] text-stone-600 font-bold">{formatCurrency(Number(b.price), currency)}</p>
                        </div>
                      </button>
                    ))}
                  </div>

                  <div className="flex items-center justify-between text-xs font-bold text-stone-900 pt-2 group-hover:translate-x-1 transition-transform">
                    <span>Explore {cat.name}</span>
                    <ArrowRight className="w-4 h-4 text-stone-900" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Highlights & Topic Spotlights */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-6">
        <div className="p-6 rounded-3xl bg-stone-50 border border-stone-200 space-y-3">
          <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-900 flex items-center justify-center">
            <TrendingUp className="w-5 h-5" />
          </div>
          <h4 className="font-serif font-bold text-base text-stone-900">Trending Technologies</h4>
          <p className="text-xs text-stone-700 leading-relaxed">
            Artificial intelligence, prompt engineering, and cloud architecture lead our most read technical categories this season.
          </p>
        </div>

        <div className="p-6 rounded-3xl bg-stone-50 border border-stone-200 space-y-3">
          <div className="w-10 h-10 rounded-2xl bg-purple-100 text-purple-900 flex items-center justify-center">
            <Sparkles className="w-5 h-5" />
          </div>
          <h4 className="font-serif font-bold text-base text-stone-900">Award-Winning Fiction</h4>
          <p className="text-xs text-stone-700 leading-relaxed">
            Hugo and Nebula award-winning sci-fi and fantasy masterworks curated for profound world-building enthusiasts.
          </p>
        </div>

        <div className="p-6 rounded-3xl bg-stone-50 border border-stone-200 space-y-3">
          <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-900 flex items-center justify-center">
            <Zap className="w-5 h-5" />
          </div>
          <h4 className="font-serif font-bold text-base text-stone-900">Immediate Digital Formats</h4>
          <p className="text-xs text-stone-700 leading-relaxed">
            All categories support EPUB, PDF, and high-resolution e-reader formats compatible across iOS, Android, and Kindle.
          </p>
        </div>
      </div>
    </div>
  );
};
