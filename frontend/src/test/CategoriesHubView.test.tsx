import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { CategoriesHubView } from '../components/CategoriesHubView';
import { Category, Book } from '../types';

const mockCategories: Category[] = [
  { id: 'cat-1', name: 'Technology & AI', slug: 'technology-ai', description: 'AI & Data books' },
  { id: 'cat-2', name: 'Sci-Fi & Fantasy', slug: 'scifi-fantasy', description: 'Epic sagas' },
  { id: 'cat-3', name: 'Business & Leadership', slug: 'business-leadership' },
  { id: 'cat-4', name: 'Fiction & Literature', slug: 'fiction-literature' },
  { id: 'cat-5', name: 'Mystery & Thriller', slug: 'mystery-thriller' },
  { id: 'cat-6', name: 'Science & Nature', slug: 'science-nature' },
  { id: 'cat-7', name: 'General Non-Fiction', slug: 'general-non-fiction' },
];

const mockBooks: Book[] = [
  {
    id: 'book-1',
    title: 'Superintelligence',
    author: 'Nick Bostrom',
    isbn: '978-0199678112',
    price: 29.99,
    stockQuantity: 10,
    isAvailable: true,
    rating: 4.8,
    numReviews: 210,
    format: 'eBook',
    categoryId: 'cat-1',
  },
  {
    id: 'book-2',
    title: 'Dune',
    author: 'Frank Herbert',
    isbn: '978-0441172719',
    price: 19.99,
    stockQuantity: 20,
    isAvailable: true,
    rating: 4.9,
    numReviews: 890,
    format: 'eBook',
    categoryId: 'cat-2',
  },
];

describe('CategoriesHubView Component', () => {
  it('renders categories hub banner and all category cards', () => {
    const handleSelectCategory = vi.fn();
    const handleSelectBook = vi.fn();

    render(
      <CategoriesHubView
        categories={mockCategories}
        books={mockBooks}
        onSelectCategory={handleSelectCategory}
        onSelectBook={handleSelectBook}
        currency="EUR"
      />,
    );

    expect(screen.getByText('Category Hub & Directory')).toBeInTheDocument();
    expect(screen.getByText('Explore Literature by Category & Genre')).toBeInTheDocument();
    expect(screen.getByText('Technology & AI')).toBeInTheDocument();
    expect(screen.getByText('Sci-Fi & Fantasy')).toBeInTheDocument();
    expect(screen.getByText('Business & Leadership')).toBeInTheDocument();
    expect(screen.getByText('Science & Nature')).toBeInTheDocument();
  });

  it('selects category when category card is clicked', () => {
    const handleSelectCategory = vi.fn();

    render(
      <CategoriesHubView
        categories={mockCategories}
        books={mockBooks}
        onSelectCategory={handleSelectCategory}
        onSelectBook={vi.fn()}
        currency="USD"
      />,
    );

    fireEvent.click(screen.getByText('Technology & AI'));
    expect(handleSelectCategory).toHaveBeenCalledWith('technology-ai');
  });

  it('triggers book selection when clicking preview book thumbnail', () => {
    const handleSelectBook = vi.fn();

    render(
      <CategoriesHubView
        categories={mockCategories}
        books={mockBooks}
        onSelectCategory={vi.fn()}
        onSelectBook={handleSelectBook}
        currency="USD"
      />,
    );

    const bookPreview = screen.getByText('Superintelligence');
    fireEvent.click(bookPreview);
    expect(handleSelectBook).toHaveBeenCalledWith(expect.objectContaining({ title: 'Superintelligence' }));
  });
});
