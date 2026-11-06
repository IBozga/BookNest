import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BookCard } from '../components/BookCard';
import { Book } from '../types';

const sampleBook: Book = {
  id: 'book-1',
  title: 'Designing Data-Intensive Applications',
  author: 'Martin Kleppmann',
  isbn: '978-1449373320',
  price: 38.99,
  stockQuantity: 15,
  isAvailable: true,
  rating: 4.9,
  numReviews: 420,
  format: 'eBook',
  category: { id: 'cat-1', name: 'Technology & AI', slug: 'technology-ai' },
  brand: { id: 'brand-1', name: "O'Reilly Media", slug: 'oreilly-media' },
};

describe('BookCard Component', () => {
  it('renders book title, author, price and add to cart button', () => {
    const handleSelect = vi.fn();
    const handleAddToCart = vi.fn();

    render(
      <BookCard
        book={sampleBook}
        onSelect={handleSelect}
        onAddToCart={handleAddToCart}
        currency="USD"
      />,
    );

    expect(screen.getByText('Designing Data-Intensive Applications')).toBeInTheDocument();
    expect(screen.getByText(/Martin Kleppmann/i)).toBeInTheDocument();
    expect(screen.getByText('$38.99')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Add .* to cart/i })).toBeInTheDocument();

    // Click book title to select
    fireEvent.click(screen.getByText('Designing Data-Intensive Applications'));
    expect(handleSelect).toHaveBeenCalledWith(sampleBook);
  });

  it('triggers onAddToCart when Add to cart button is clicked and tests image error fallback', () => {
    const handleAddToCart = vi.fn();

    render(
      <BookCard
        book={sampleBook}
        onSelect={vi.fn()}
        onAddToCart={handleAddToCart}
      />,
    );

    const img = screen.getByAltText('Designing Data-Intensive Applications');
    fireEvent.error(img);

    const button = screen.getByRole('button', { name: /Add .* to cart/i });
    fireEvent.click(button);
    expect(handleAddToCart).toHaveBeenCalledWith('book-1');
  });

  it('shows an "In basket" tag with the quantity only when the book is in the basket', () => {
    const { rerender } = render(
      <BookCard book={sampleBook} onSelect={vi.fn()} onAddToCart={vi.fn()} />,
    );
    expect(screen.queryByText(/In basket/i)).not.toBeInTheDocument();

    rerender(
      <BookCard book={sampleBook} onSelect={vi.fn()} onAddToCart={vi.fn()} quantityInCart={2} />,
    );
    expect(screen.getByText('In basket (2)')).toBeInTheDocument();
  });

  it('renders a Premium badge for premium books', () => {
    render(
      <BookCard
        book={{ ...sampleBook, isPremium: true }}
        onSelect={vi.fn()}
        onAddToCart={vi.fn()}
      />,
    );

    expect(screen.getByLabelText('Premium title')).toBeInTheDocument();
    expect(screen.getByText('Premium')).toBeInTheDocument();
  });

  it('renders Out of stock overlay and disables button when unavailable, and shows Adding... state', () => {
    const unavailableBook: Book = {
      ...sampleBook,
      isAvailable: false,
      stockQuantity: 0,
    };

    const { rerender } = render(
      <BookCard
        book={unavailableBook}
        onSelect={vi.fn()}
        onAddToCart={vi.fn()}
      />,
    );

    expect(screen.getByText(/Out of stock/i)).toBeInTheDocument();
    const button = screen.getByRole('button', { name: /Add .* to cart/i });
    expect(button).toBeDisabled();

    // Rerender with isAdding true — aria-label changes to "Adding to cart…"
    rerender(
      <BookCard
        book={sampleBook}
        onSelect={vi.fn()}
        onAddToCart={vi.fn()}
        isAdding={true}
      />,
    );

    expect(screen.getByRole('button', { name: /Adding to cart/i })).toBeInTheDocument();
  });
});
