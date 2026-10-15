import React, { useState } from 'react';
import { Brand } from '../types';
import { Building2 } from 'lucide-react';

interface BrandBrowseViewProps {
  brands: Brand[];
  onSelectBrand: (brandSlug: string) => void;
}

const alphabet = ['All', ...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')];

export const BrandBrowseView: React.FC<BrandBrowseViewProps> = ({ brands, onSelectBrand }) => {
  const [selectedLetter, setSelectedLetter] = useState('All');

  const filteredBrands = brands.filter((brand) => {
    if (selectedLetter === 'All') return true;
    return brand.name.toUpperCase().startsWith(selectedLetter);
  });

  return (
    <div className="space-y-8 my-6">
      {/* Header */}
      <div className="space-y-1 pb-4 border-b border-stone-200">
        <h1 className="text-3xl font-serif text-stone-900 font-semibold tracking-tight">
          Browse by Brand
        </h1>
        <p className="text-xs text-stone-500">
          Discover books from your favorite publishers
        </p>
      </div>

      {/* Alphabet Filter Bar */}
      <div className="flex flex-wrap items-center gap-1.5 pb-2 border-b border-stone-100 text-xs font-semibold">
        {alphabet.map((letter) => (
          <button
            key={letter}
            onClick={() => setSelectedLetter(letter)}
            className={`px-2.5 py-1 rounded-lg transition-colors ${
              selectedLetter === letter
                ? 'bg-stone-900 text-white'
                : 'text-stone-600 hover:bg-stone-100 hover:text-stone-900'
            }`}
          >
            {letter}
          </button>
        ))}
      </div>

      {/* Brand Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
        {filteredBrands.map((brand) => (
          <div
            key={brand.id}
            onClick={() => onSelectBrand(brand.slug)}
            className="p-6 rounded-2xl border border-stone-200 bg-white hover:border-stone-400 hover:shadow-md transition-all cursor-pointer flex flex-col justify-between h-44 group"
          >
            <div className="space-y-3">
              <div className="w-12 h-12 rounded-xl bg-stone-100 border border-stone-200 flex items-center justify-center text-stone-800 font-bold overflow-hidden">
                {brand.logoUrl ? (
                  <img src={brand.logoUrl} alt={brand.name} className="w-full h-full object-cover" />
                ) : (
                  <Building2 className="w-6 h-6 text-stone-600" />
                )}
              </div>

              <div>
                <h3 className="font-bold text-stone-900 text-base group-hover:text-stone-600 transition-colors">
                  {brand.name}
                </h3>
                {brand.description && (
                  <p className="text-xs text-stone-500 line-clamp-1 mt-0.5">
                    {brand.description}
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between text-xs text-stone-600 pt-2 border-t border-stone-100">
              <span className="font-medium">Browse collection</span>
              <span className="flex items-center gap-1 font-semibold group-hover:translate-x-1 transition-transform text-stone-900">
                Explore →
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
