import React from 'react';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizeMap = {
  sm: 'w-3.5 h-3.5 border-[2px]',
  md: 'w-5 h-5 border-2',
  lg: 'w-8 h-8 border-[3px]',
};

/**
 * Accessible inline spinner. Uses a border-based CSS animation so it
 * works with any background colour.
 */
export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'md',
  className = '',
}) => (
  <span
    role="status"
    aria-label="Loading"
    className={`inline-block rounded-full border-stone-300 border-t-stone-700 animate-spin ${sizeMap[size]} ${className}`}
  />
);
