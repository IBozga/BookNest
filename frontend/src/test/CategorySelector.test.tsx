import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { CategorySelector } from '../components/CategorySelector';
import { Category } from '../types';

const categories: Category[] = [
  { id: '1', name: 'Technology & AI', slug: 'technology-ai', icon: 'cpu' },
  { id: '2', name: 'Sci-Fi & Fantasy', slug: 'scifi-fantasy', icon: 'sparkles' },
  { id: '3', name: 'Business & Leadership', slug: 'business-leadership', icon: 'briefcase' },
  { id: '4', name: 'Fiction & Literature', slug: 'fiction-literature', icon: 'book-open' },
  { id: '5', name: 'Mystery & Thriller', slug: 'mystery-thriller', icon: 'search' },
  { id: '6', name: 'Science & Nature', slug: 'science-nature', icon: 'globe' },
  { id: '7', name: 'Other Genre', slug: 'other-genre', icon: 'other' },
];

describe('CategorySelector Component', () => {
  it('renders category cards in grid mode and triggers selection', () => {
    const handleSelect = vi.fn();
    render(
      <CategorySelector
        categories={categories}
        selectedCategorySlug={null}
        onSelectCategory={handleSelect}
        variant="grid"
      />,
    );

    expect(screen.getByText('Shop by category')).toBeInTheDocument();
    expect(screen.getByText('Technology')).toBeInTheDocument();
    expect(screen.getByText('Sci-Fi')).toBeInTheDocument();
    expect(screen.getByText('Business')).toBeInTheDocument();
    expect(screen.getByText('Fiction')).toBeInTheDocument();
    expect(screen.getByText('Mystery')).toBeInTheDocument();
    expect(screen.getByText('Science')).toBeInTheDocument();
    expect(screen.getByText('Other Genre')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Technology'));
    expect(handleSelect).toHaveBeenCalledWith('technology-ai');
  });

  it('renders sidebar mode and triggers selection and All selection', () => {
    const handleSelect = vi.fn();

    render(
      <CategorySelector
        categories={categories}
        selectedCategorySlug="technology-ai"
        onSelectCategory={handleSelect}
        variant="sidebar"
      />,
    );

    expect(screen.getByText('Categories')).toBeInTheDocument();
    expect(screen.getByText('All')).toBeInTheDocument();

    // Click 'All'
    fireEvent.click(screen.getByText('All'));
    expect(handleSelect).toHaveBeenCalledWith(null);

    // Click another category in sidebar
    fireEvent.click(screen.getByText('Science & Nature'));
    expect(handleSelect).toHaveBeenCalledWith('science-nature');
  });

  it('renders horizontal pills mode and unselects active category', () => {
    const handleSelect = vi.fn();

    render(
      <CategorySelector
        categories={categories}
        selectedCategorySlug="business-leadership"
        onSelectCategory={handleSelect}
        variant="pills"
      />,
    );

    // Click active pill to toggle off
    fireEvent.click(screen.getByText('Business & Leadership'));
    expect(handleSelect).toHaveBeenCalledWith(null);
  });
});
