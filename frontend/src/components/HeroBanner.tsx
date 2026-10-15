import React, { useState } from 'react';
import { Search } from 'lucide-react';

interface HeroBannerProps {
  onSearch: (query: string) => void;
}

export const HeroBanner: React.FC<HeroBannerProps> = ({ onSearch }) => {
  const [localSearch, setLocalSearch] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (localSearch.trim()) {
      onSearch(localSearch.trim());
    }
  };

  return (
    <div className="relative overflow-hidden rounded-3xl bg-[#f5f1eb] my-6 border border-stone-200">
      <div className="grid grid-cols-1 md:grid-cols-12 items-center min-h-[380px]">
        {/* Left Text & Search */}
        <div className="p-8 sm:p-12 md:col-span-7 space-y-5">
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-serif font-normal text-stone-900 tracking-tight leading-tight">
            Discover <br />
            <span className="italic font-serif">extraordinary</span> <br />
            stories
          </h1>

          <p className="text-stone-600 text-sm sm:text-base max-w-md font-sans">
            Explore thousands of eBooks from the world&apos;s best authors.
          </p>

          {/* Embedded Search Form */}
          <form onSubmit={handleSubmit} className="pt-2 max-w-md">
            <div className="relative flex items-center shadow-xs">
              <input
                type="text"
                placeholder="Search for books, authors, or genres..."
                value={localSearch}
                onChange={(e) => setLocalSearch(e.target.value)}
                className="w-full pl-4 pr-12 py-3 text-xs sm:text-sm bg-white border border-stone-300 rounded-xl focus:outline-none focus:ring-1 focus:ring-stone-900 placeholder-stone-400 font-sans"
              />
              <button
                type="submit"
                className="absolute right-1.5 p-2 bg-stone-900 hover:bg-stone-800 text-white rounded-lg transition-colors"
                aria-label="Search"
              >
                <Search className="w-4 h-4" />
              </button>
            </div>
          </form>
        </div>

        {/* Right Aesthetic Image */}
        <div className="h-full md:col-span-5 relative min-h-[260px] md:min-h-[380px] overflow-hidden">
          <img
            src="https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=900&auto=format&fit=crop&q=80"
            alt="Books on table with coffee"
            className="w-full h-full object-cover object-center"
          />
        </div>
      </div>
    </div>
  );
};
