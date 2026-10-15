import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { CatalogueView } from '../components/CatalogueView';
import { Book, Brand, Category } from '../types';

const mockCategories: Category[] = [
  { id: 'cat-1', name: 'Technology & AI', slug: 'technology-ai' },
  { id: 'cat-2', name: 'Science & Nature', slug: 'science-nature' },
];

const mockBrands: Brand[] = [
  { id: 'brand-1', name: "O'Reilly Media", slug: 'oreilly-media' },
  { id: 'brand-2', name: 'MIT Press', slug: 'mit-press' },
];

const mockBooks: Book[] = [
  {
    id: 'book-1',
    title: 'Clean Architecture',
    author: 'Robert C. Martin',
    isbn: '978-0134494166',
    price: 34.99,
    stockQuantity: 10,
    isAvailable: true,
    rating: 4.8,
    numReviews: 120,
    format: 'eBook',
  },
  {
    id: 'book-2',
    title: 'Cosmos',
    author: 'Carl Sagan',
    isbn: '978-0345331359',
    price: 24.99,
    stockQuantity: 5,
    isAvailable: true,
    rating: 4.9,
    numReviews: 350,
    format: 'eBook',
  },
];

describe('CatalogueView Component', () => {
  it('renders all books title, category sidebar and sort selector', () => {
    const handleSelectCategory = vi.fn();
    const handleSelectBook = vi.fn();
    const handleAddToCart = vi.fn();
    const handleSortChange = vi.fn();

    render(
      <CatalogueView
        categories={mockCategories}
        selectedCategorySlug={null}
        onSelectCategory={handleSelectCategory}
        books={mockBooks}
        loading={false}
        onSelectBook={handleSelectBook}
        onAddToCart={handleAddToCart}
        addingBookId={null}
        sortBy="rating_desc"
        onSortChange={handleSortChange}
        currency="EUR"
      />,
    );

    expect(screen.getByText('All Books')).toBeInTheDocument();
    expect(screen.getByText((_, el) => el?.textContent?.trim() === '2 results')).toBeInTheDocument();
    expect(screen.getByText('Clean Architecture')).toBeInTheDocument();
    expect(screen.getByText('Cosmos')).toBeInTheDocument();

    // Sort change
    const sortSelect = screen.getByLabelText(/Sort by:/i);
    fireEvent.change(sortSelect, { target: { value: 'price_asc' } });
    expect(handleSortChange).toHaveBeenCalledWith('price_asc');
  });

  it('renders specific category title and description when category is selected', () => {
    render(
      <CatalogueView
        categories={mockCategories}
        selectedCategorySlug="technology-ai"
        onSelectCategory={vi.fn()}
        books={mockBooks}
        loading={false}
        onSelectBook={vi.fn()}
        onAddToCart={vi.fn()}
        addingBookId={null}
        sortBy="rating_desc"
        onSortChange={vi.fn()}
        currency="EUR"
      />,
    );

    expect(screen.getByRole('heading', { name: 'Technology & AI' })).toBeInTheDocument();
    expect(screen.getByText(/Explore our collection of technology & ai books/i)).toBeInTheDocument();
  });

  it('renders loading state when loading is true', () => {
    render(
      <CatalogueView
        categories={mockCategories}
        selectedCategorySlug={null}
        onSelectCategory={vi.fn()}
        books={[]}
        loading={true}
        onSelectBook={vi.fn()}
        onAddToCart={vi.fn()}
        addingBookId={null}
        sortBy="rating_desc"
        onSortChange={vi.fn()}
      />,
    );

    // Skeleton grid is rendered with aria-busy="true"
    expect(document.querySelector('[aria-busy="true"]')).toBeTruthy();
  });

  it('renders empty state when no books found', () => {
    render(
      <CatalogueView
        categories={mockCategories}
        selectedCategorySlug="unknown"
        onSelectCategory={vi.fn()}
        books={[]}
        loading={false}
        onSelectBook={vi.fn()}
        onAddToCart={vi.fn()}
        addingBookId={null}
        sortBy="rating_desc"
        onSortChange={vi.fn()}
      />,
    );

    expect(screen.getByText('No books found in this category')).toBeInTheDocument();
  });

  it('lets the user browse and select a brand from the sidebar', () => {
    const handleSelectBrand = vi.fn();

    render(
      <CatalogueView
        categories={mockCategories}
        selectedCategorySlug={null}
        onSelectCategory={vi.fn()}
        brands={mockBrands}
        selectedBrandSlug={null}
        onSelectBrand={handleSelectBrand}
        books={mockBooks}
        loading={false}
        onSelectBook={vi.fn()}
        onAddToCart={vi.fn()}
        addingBookId={null}
        sortBy="rating_desc"
        onSortChange={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /MIT Press/i }));
    expect(handleSelectBrand).toHaveBeenCalledWith('mit-press');
  });

  it('shows a tentative delivery date on available products', () => {
    render(
      <CatalogueView
        categories={mockCategories}
        selectedCategorySlug={null}
        onSelectCategory={vi.fn()}
        books={mockBooks}
        loading={false}
        onSelectBook={vi.fn()}
        onAddToCart={vi.fn()}
        addingBookId={null}
        sortBy="rating_desc"
        onSortChange={vi.fn()}
      />,
    );

    expect(screen.getAllByText(/Delivery by/i)).toHaveLength(mockBooks.length);
  });
});
