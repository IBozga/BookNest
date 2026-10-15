import React from 'react';
import { Book, Brand, Category } from '../types';
import { BookCard } from './BookCard';
import { BrandFilter } from './BrandFilter';
import { CategorySelector } from './CategorySelector';
import { SkeletonCard } from './SkeletonCard';
import { CurrencyCode } from '../utils/currency';

interface CatalogueViewProps {
  categories: Category[];
  selectedCategorySlug: string | null;
  onSelectCategory: (slug: string | null) => void;
  brands?: Brand[];
  selectedBrandSlug?: string | null;
  onSelectBrand?: (slug: string | null) => void;
  books: Book[];
  loading: boolean;
  onSelectBook: (book: Book) => void;
  onAddToCart: (bookId: string) => void;
  addingBookId: string | null;
  /** Map of bookId to quantity already in the basket. */
  cartQuantities?: Record<string, number>;
  sortBy: string;
  onSortChange: (sort: string) => void;
  currency?: CurrencyCode;
}

export const CatalogueView: React.FC<CatalogueViewProps> = ({
  categories,
  selectedCategorySlug,
  onSelectCategory,
  brands = [],
  selectedBrandSlug = null,
  onSelectBrand,
  books,
  loading,
  onSelectBook,
  onAddToCart,
  addingBookId,
  cartQuantities = {},
  sortBy,
  onSortChange,
  currency = 'EUR',
}) => {
  const currentCategory = categories.find((c) => c.slug === selectedCategorySlug);
  const title = currentCategory ? currentCategory.name : 'All Books';
  const subtitle = currentCategory
    ? `Explore our collection of ${currentCategory.name.toLowerCase()} books`
    : 'Explore thousands of eBooks across all genres and publishers';

  return (
    <div className="space-y-6 my-6">
      {/* Category Header (Screen 02) */}
      <div className="space-y-1 pb-4 border-b border-stone-200">
        <h1 className="text-3xl font-serif text-stone-900 font-semibold tracking-tight">
          {title}
        </h1>
        <p className="text-xs text-stone-500">{subtitle}</p>
      </div>

      {/* Main 2-Column PLP Layout */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
        {/* Left Sidebar (Categories) */}
        <aside className="md:col-span-3 bg-white rounded-3xl border border-stone-200 p-5 space-y-4">
          <CategorySelector
            categories={categories}
            selectedCategorySlug={selectedCategorySlug}
            onSelectCategory={onSelectCategory}
            variant="sidebar"
          />
          {onSelectBrand && brands.length > 0 && (
            <div className="pt-4 border-t border-stone-100">
              <BrandFilter
                brands={brands}
                selectedBrandSlug={selectedBrandSlug}
                onSelectBrand={onSelectBrand}
              />
            </div>
          )}
        </aside>

        {/* Right Main Grid */}
        <section className="md:col-span-9 space-y-5">
          {/* Top Bar: Count & Sort */}
          <div className="flex items-center justify-between text-xs text-stone-500 pb-2 border-b border-stone-100">
            <span>
              <strong className="text-stone-900 font-semibold">{books.length}</strong> results
            </span>

            <div className="flex items-center gap-1.5">
              <label htmlFor="catalogue-sort-select" className="text-stone-400">Sort by:</label>
              <select
                id="catalogue-sort-select"
                value={sortBy}
                onChange={(e) => onSortChange(e.target.value)}
                className="bg-transparent font-semibold text-stone-900 outline-none cursor-pointer"
              >
                <option value="rating_desc">Recommended</option>
                <option value="price_asc">Price: Low to High</option>
                <option value="price_desc">Price: High to Low</option>
                <option value="newest">Newest Releases</option>
              </select>
            </div>
          </div>

          {/* Book Cards Grid (3 columns on desktop) */}
          {loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-5" aria-busy="true" aria-label="Loading books">
              {Array.from({ length: 6 }).map((_, i) => (
                <SkeletonCard key={i} />
              ))}
            </div>
          ) : books.length === 0 ? (
            <div className="py-16 text-center bg-white rounded-3xl border border-stone-200 p-8 space-y-3">
              <p className="text-sm font-bold text-stone-800">No books found in this category</p>
              <p className="text-xs text-stone-500">Try selecting &quot;All&quot; or browsing other categories.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-5">
              {books.map((book) => (
                <BookCard
                  key={book.id}
                  book={book}
                  onSelect={onSelectBook}
                  onAddToCart={onAddToCart}
                  isAdding={addingBookId === book.id}
                  quantityInCart={cartQuantities[book.id] ?? 0}
                  currency={currency}
                />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
};
