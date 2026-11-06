import React from 'react';

/**
 * Placeholder card shown while books are loading.
 * Matches the fixed 380px height of BookCard so the layout doesn't shift.
 */
export const SkeletonCard: React.FC = () => (
  <div className="w-full h-[380px] flex flex-col bg-white rounded-2xl border border-stone-200 overflow-hidden animate-pulse">
    {/* Image placeholder */}
    <div className="h-[200px] w-full shrink-0 bg-stone-100" />

    {/* Metadata placeholder */}
    <div className="p-3.5 flex flex-col flex-1 justify-between">
      <div className="space-y-2">
        {/* Rating row */}
        <div className="h-4 w-24 rounded bg-stone-100" />
        {/* Title */}
        <div className="h-5 w-full rounded bg-stone-100" />
        <div className="h-5 w-3/4 rounded bg-stone-100" />
        {/* Author */}
        <div className="h-3.5 w-1/2 rounded bg-stone-100 mt-1" />
      </div>

      {/* Price + button row */}
      <div className="pt-2 border-t border-stone-100 flex items-center justify-between gap-2">
        <div className="h-5 w-14 rounded bg-stone-100" />
        <div className="h-7 w-20 rounded-lg bg-stone-100" />
      </div>
    </div>
  </div>
);
