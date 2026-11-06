import React from 'react';
import { Category } from '../types';
import {
  BookOpen,
  Feather,
  Building2,
  Heart,
  Sparkles,
  Smile,
  Atom,
} from 'lucide-react';

interface CategorySelectorProps {
  categories: Category[];
  selectedCategorySlug: string | null;
  onSelectCategory: (slug: string | null) => void;
  variant?: 'grid' | 'sidebar' | 'pills';
}

const getCategoryIcon = (slug: string) => {
  switch (slug) {
    case 'fiction-literature':
    case 'fiction':
      return <Feather className="w-5 h-5 text-stone-700" />;
    case 'technology-ai':
    case 'non-fiction':
      return <BookOpen className="w-5 h-5 text-stone-700" />;
    case 'business-leadership':
    case 'business':
      return <Building2 className="w-5 h-5 text-stone-700" />;
    case 'mystery-thriller':
    case 'self-help':
      return <Heart className="w-5 h-5 text-stone-700" />;
    case 'scifi-fantasy':
    case 'fantasy':
      return <Sparkles className="w-5 h-5 text-stone-700" />;
    case 'science-nature':
    case 'science':
      return <Atom className="w-5 h-5 text-stone-700" />;
    case 'children':
      return <Smile className="w-5 h-5 text-stone-700" />;
    default:
      return <BookOpen className="w-5 h-5 text-stone-700" />;
  }
};

export const CategorySelector: React.FC<CategorySelectorProps> = ({
  categories,
  selectedCategorySlug,
  onSelectCategory,
  variant = 'grid',
}) => {
  // 1. Grid Variant for Homepage (Screen 01: Shop by category)
  if (variant === 'grid') {
    return (
      <div className="space-y-4">
        <h2 className="text-xl font-serif text-stone-900 font-semibold tracking-tight">
          Shop by category
        </h2>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
          {categories.map((cat) => {
            const isSelected = selectedCategorySlug === cat.slug;
            return (
              <button
                key={cat.id}
                onClick={() => onSelectCategory(isSelected ? null : cat.slug)}
                className={`p-4 rounded-2xl border text-center flex flex-col items-center justify-center gap-2.5 transition-all ${
                  isSelected
                    ? 'border-stone-900 bg-stone-900 text-white shadow-xs'
                    : 'border-stone-200 bg-white hover:border-stone-400 text-stone-800'
                }`}
              >
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                    isSelected ? 'bg-stone-800 text-white' : 'bg-stone-100 text-stone-700'
                  }`}
                >
                  {getCategoryIcon(cat.slug)}
                </div>
                <span className="text-xs font-medium tracking-tight">
                  {cat.name.split(' & ')[0]}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  // 2. Sidebar Variant for Catalogue PLP (Screen 02: Left Categories sidebar)
  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-stone-900 tracking-tight">Categories</h3>
      <div className="space-y-1">
        <button
          onClick={() => onSelectCategory(null)}
          className={`w-full text-left px-3 py-2 rounded-xl text-xs font-medium transition-colors flex items-center justify-between ${
            selectedCategorySlug === null
              ? 'bg-stone-900 text-white font-semibold'
              : 'text-stone-600 hover:bg-stone-100 hover:text-stone-900'
          }`}
        >
          <span>All</span>
        </button>

        {categories.map((cat) => {
          const isSelected = selectedCategorySlug === cat.slug;
          return (
            <button
              key={cat.id}
              onClick={() => onSelectCategory(isSelected ? null : cat.slug)}
              className={`w-full text-left px-3 py-2 rounded-xl text-xs font-medium transition-colors flex items-center justify-between ${
                isSelected
                  ? 'bg-stone-900 text-white font-semibold'
                  : 'text-stone-600 hover:bg-stone-100 hover:text-stone-900'
              }`}
            >
              <span>{cat.name}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
