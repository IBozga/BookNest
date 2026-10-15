import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { NewReleasesView } from '../components/NewReleasesView';
import { Book, Category } from '../types';

const mockCategories: Category[] = [
  { id: 'cat-1', name: 'Technology & AI', slug: 'technology-ai' },
  { id: 'cat-2', name: 'Sci-Fi & Fantasy', slug: 'scifi-fantasy' },
];

const mockBooks: Book[] = [
  {
    id: 'b1',
    title: 'Generative AI in Production',
    author: 'Sam Altman',
    isbn: '978-1098100100',
    price: 45.0,
    stockQuantity: 12,
    isAvailable: true,
    rating: 4.95,
    numReviews: 120,
    format: 'eBook',
    categoryId: 'cat-1',
    category: mockCategories[0],
  },
  {
    id: 'b2',
    title: 'The Starlight Engine',
    author: 'Arthur Vance',
    isbn: '978-0441001100',
    price: 22.5,
    stockQuantity: 8,
    isAvailable: true,
    rating: 4.6,
    numReviews: 45,
    format: 'eBook',
    categoryId: 'cat-2',
    category: mockCategories[1],
  },
];

describe('NewReleasesView Component', () => {
  it('renders spotlight release banner and books with NEW badge', () => {
    const handleSelectBook = vi.fn();
    const handleAddToCart = vi.fn();

    render(
      <NewReleasesView
        books={mockBooks}
        categories={mockCategories}
        onSelectBook={handleSelectBook}
        onAddToCart={handleAddToCart}
        addingBookId={null}
        currency="EUR"
      />,
    );

    expect(screen.getByText(/Fresh Off the Press/i)).toBeInTheDocument();
    expect(screen.getByText('#1 New Release')).toBeInTheDocument();
    expect(screen.getAllByText('Generative AI in Production').length).toBeGreaterThan(0);
    expect(screen.getAllByText('NEW').length).toBeGreaterThan(0);
  });

  it('filters releases by category pill button', () => {
    render(
      <NewReleasesView
        books={mockBooks}
        categories={mockCategories}
        onSelectBook={vi.fn()}
        onAddToCart={vi.fn()}
        addingBookId={null}
        currency="EUR"
      />,
    );

    const techPill = screen.getByRole('button', { name: 'Technology & AI' });
    fireEvent.click(techPill);

    expect(screen.getAllByText('Generative AI in Production').length).toBeGreaterThan(0);
    expect(screen.queryByText('The Starlight Engine')).not.toBeInTheDocument();

    const allPill = screen.getByRole('button', { name: /All New Releases/i });
    fireEvent.click(allPill);
    expect(screen.getByText('The Starlight Engine')).toBeInTheDocument();
  });

  it('handles add to cart and book selection in spotlight card', () => {
    const handleSelectBook = vi.fn();
    const handleAddToCart = vi.fn();

    render(
      <NewReleasesView
        books={mockBooks}
        categories={mockCategories}
        onSelectBook={handleSelectBook}
        onAddToCart={handleAddToCart}
        addingBookId={null}
        currency="EUR"
      />,
    );

    // The spotlight add button is the first of the two matching buttons (spotlight banner + grid card)
    const spotlightAddBtn = screen.getAllByRole('button', { name: /Add Generative AI in Production to cart/i })[0];
    fireEvent.click(spotlightAddBtn);
    expect(handleAddToCart).toHaveBeenCalledWith('b1');

    // Click spotlight title (now a <button>)
    const spotlightTitleBtn = screen.getByRole('button', { name: /View details for Generative AI in Production/i });
    fireEvent.click(spotlightTitleBtn);
    expect(handleSelectBook).toHaveBeenCalled();
  });

  it('renders empty category message when no books match selected category', () => {
    render(
      <NewReleasesView
        books={[]}
        categories={mockCategories}
        onSelectBook={vi.fn()}
        onAddToCart={vi.fn()}
        addingBookId={null}
        currency="EUR"
      />,
    );

    expect(screen.getByText('No new releases in this category yet')).toBeInTheDocument();
  });
});
