import React from 'react';
import { Brand } from '../types';
import { Bookmark, Building2 } from 'lucide-react';

interface BrandFilterProps {
  brands: Brand[];
  selectedBrandSlug: string | null;
  onSelectBrand: (slug: string | null) => void;
}

export const BrandFilter: React.FC<BrandFilterProps> = ({
  brands,
  selectedBrandSlug,
  onSelectBrand,
}) => {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-stone-900 uppercase tracking-wider">
          Publishers &amp; Brands
        </h3>
        {selectedBrandSlug && (
          <button
            onClick={() => onSelectBrand(null)}
            className="text-xs text-stone-500 hover:text-stone-900 font-medium transition-colors"
          >
            Clear
          </button>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => onSelectBrand(null)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
            selectedBrandSlug === null
              ? 'bg-stone-900 text-white'
              : 'bg-white border border-stone-200 text-stone-700 hover:bg-stone-100'
          }`}
        >
          <Building2 className="w-3.5 h-3.5" aria-hidden="true" />
          <span>All Publishers</span>
        </button>

        {brands.map((brand) => {
          const isSelected = selectedBrandSlug === brand.slug;
          return (
            <button
              key={brand.id}
              onClick={() => onSelectBrand(isSelected ? null : brand.slug)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                isSelected
                  ? 'bg-stone-900 text-white font-semibold'
                  : 'bg-white border border-stone-200 text-stone-700 hover:bg-stone-100'
              }`}
            >
              <Bookmark className="w-3.5 h-3.5" aria-hidden="true" />
              <span>{brand.name}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
