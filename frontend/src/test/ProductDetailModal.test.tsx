import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render as rtlRender, screen, fireEvent, act } from '@testing-library/react';
import { ProductDetailModal } from '../components/ProductDetailModal';
import { Book } from '../types';
import { api } from '../services/api';
import { FALLBACK_COVER } from '../utils/constants';
import { formatCurrency } from '../utils/currency';
import type { ComponentProps } from 'react';

/**
 * Render the modal and flush all pending async effects (avoids act() warnings).
 * Always use this instead of rtlRender directly to keep act-wrapping consistent.
 */
async function renderModal(props: ComponentProps<typeof ProductDetailModal>) {
  const result = rtlRender(<ProductDetailModal {...props} />);
  await act(async () => {});
  return result;
}

vi.mock('../services/api', () => ({
  api: {
    getRelatedBooks: vi.fn(),
    getUpsellBooks: vi.fn(),
  },
}));

const mockBook: Book = {
  id: 'b1',
  title: 'Dune Messiah',
  author: 'Frank Herbert',
  isbn: '978-0441172696',
  price: 21.99,
  stockQuantity: 10,
  isAvailable: true,
  rating: 4.7,
  numReviews: 310,
  format: 'eBook (EPUB)',
  description: 'The continuing saga of Paul Atreides.',
  category: { id: 'c1', name: 'Sci-Fi & Fantasy', slug: 'scifi-fantasy' },
  brand: { id: 'br1', name: 'Ace Books', slug: 'ace-books' },
};

const relatedBook: Book = {
  id: 'b2',
  title: 'Children of Dune',
  author: 'Frank Herbert',
  isbn: '978-0441172697',
  price: 22.0,
  stockQuantity: 5,
  isAvailable: true,
  rating: 4.2,
  numReviews: 150,
  format: 'eBook (EPUB)',
};

describe('ProductDetailModal Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (api.getRelatedBooks as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    (api.getUpsellBooks as ReturnType<typeof vi.fn>).mockResolvedValue([]);
  });

  // ─── null guard ────────────────────────────────────────────────────────────

  it('renders nothing when book is null', async () => {
    const { container } = await renderModal({
      book: null,
      onClose: vi.fn(),
      onAddToCart: vi.fn(),
      onSelectBook: vi.fn(),
    });

    expect(container.firstChild).toBeNull();
  });

  // ─── metadata ──────────────────────────────────────────────────────────────

  it('renders book title, author and category', async () => {
    await renderModal({
      book: mockBook,
      onClose: vi.fn(),
      onAddToCart: vi.fn(),
      onSelectBook: vi.fn(),
    });

    expect(screen.getByRole('heading', { name: 'Dune Messiah' })).toBeInTheDocument();
    expect(screen.getByText('by Frank Herbert')).toBeInTheDocument();
    expect(screen.getByText('Sci-Fi & Fantasy')).toBeInTheDocument();
  });

  it('shows an accessible rating label', async () => {
    await renderModal({
      book: mockBook,
      onClose: vi.fn(),
      onAddToCart: vi.fn(),
      onSelectBook: vi.fn(),
    });

    expect(
      screen.getByLabelText(/Rated 4\.7 out of 5 stars with 310 reviews/i),
    ).toBeInTheDocument();
  });

  // ─── price & discount ──────────────────────────────────────────────────────

  it('displays the sale price formatted in the requested currency', async () => {
    await renderModal({
      book: mockBook,
      onClose: vi.fn(),
      onAddToCart: vi.fn(),
      onSelectBook: vi.fn(),
      currency: 'GBP',
    });

    // Derive expected string from the same utility the component uses —
    // avoids hardcoding a magic number that silently goes stale.
    expect(screen.getByText(formatCurrency(mockBook.price, 'GBP'))).toBeInTheDocument();
  });

  it('shows the 25% OFF badge and the mathematically correct original price', async () => {
    await renderModal({
      book: mockBook,
      onClose: vi.fn(),
      onAddToCart: vi.fn(),
      onSelectBook: vi.fn(),
    });

    // Badge text
    expect(screen.getByText('25% OFF')).toBeInTheDocument();

    // original = price / 0.75 — asserting the aria-label on the struck-through span
    // ensures the formula itself is correct, not just that the badge string exists.
    const expectedOriginal = formatCurrency(mockBook.price / 0.75, 'EUR');
    expect(screen.getByLabelText(`Original price ${expectedOriginal}`)).toBeInTheDocument();
  });

  // ─── close behaviour ───────────────────────────────────────────────────────

  it('calls onClose when the close button is clicked', async () => {
    const handleClose = vi.fn();
    await renderModal({
      book: mockBook,
      onClose: handleClose,
      onAddToCart: vi.fn(),
      onSelectBook: vi.fn(),
    });

    fireEvent.click(screen.getByLabelText('Close product details modal'));
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when the Escape key is pressed', async () => {
    const handleClose = vi.fn();
    await renderModal({
      book: mockBook,
      onClose: handleClose,
      onAddToCart: vi.fn(),
      onSelectBook: vi.fn(),
    });

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  // ─── image fallback ────────────────────────────────────────────────────────

  it('falls back to FALLBACK_COVER when the cover image errors', async () => {
    await renderModal({
      book: mockBook,
      onClose: vi.fn(),
      onAddToCart: vi.fn(),
      onSelectBook: vi.fn(),
    });

    const mainImg = screen.getByAltText('Cover of Dune Messiah by Frank Herbert');
    fireEvent.error(mainImg);
    expect(mainImg).toHaveAttribute('src', FALLBACK_COVER);
  });

  // ─── tabs ──────────────────────────────────────────────────────────────────

  it('shows the description in the default "about" tab panel', async () => {
    await renderModal({
      book: mockBook,
      onClose: vi.fn(),
      onAddToCart: vi.fn(),
      onSelectBook: vi.fn(),
    });

    expect(screen.getByRole('tabpanel')).toHaveTextContent(
      /The continuing saga of Paul Atreides/i,
    );
  });

  it('switches to the details tab and shows ISBN and publisher', async () => {
    await renderModal({
      book: mockBook,
      onClose: vi.fn(),
      onAddToCart: vi.fn(),
      onSelectBook: vi.fn(),
    });

    fireEvent.click(screen.getByRole('tab', { name: /details/i }));
    expect(screen.getByText('978-0441172696')).toBeInTheDocument();
    expect(screen.getByText('Ace Books')).toBeInTheDocument();
  });

  it('switches to the reviews tab and shows the rating summary', async () => {
    await renderModal({
      book: mockBook,
      onClose: vi.fn(),
      onAddToCart: vi.fn(),
      onSelectBook: vi.fn(),
    });

    fireEvent.click(screen.getByRole('tab', { name: /reviews/i }));
    expect(
      screen.getByText(/Rated 4\.7 out of 5 stars based on 310 customer reviews/i),
    ).toBeInTheDocument();
  });

  it('resets to the "about" tab when the book prop changes', async () => {
    const { rerender } = await renderModal({
      book: mockBook,
      onClose: vi.fn(),
      onAddToCart: vi.fn(),
      onSelectBook: vi.fn(),
    });

    // Navigate away from the default tab
    fireEvent.click(screen.getByRole('tab', { name: /reviews/i }));
    expect(screen.getByRole('tab', { name: /reviews/i })).toHaveAttribute(
      'aria-selected',
      'true',
    );

    // Swap the book prop (simulates onSelectBook completing)
    const secondBook: Book = { ...mockBook, id: 'b3', title: 'God Emperor of Dune' };
    await act(async () => {
      rerender(
        <ProductDetailModal
          book={secondBook}
          onClose={vi.fn()}
          onAddToCart={vi.fn()}
          onSelectBook={vi.fn()}
        />,
      );
    });

    expect(screen.getByRole('tab', { name: /about/i })).toHaveAttribute('aria-selected', 'true');
  });

  // ─── format selector ───────────────────────────────────────────────────────

  it('updates the selected format when the dropdown changes', async () => {
    await renderModal({
      book: mockBook,
      onClose: vi.fn(),
      onAddToCart: vi.fn(),
      onSelectBook: vi.fn(),
    });

    const formatSelect = screen.getByLabelText('Format');
    fireEvent.change(formatSelect, { target: { value: 'Hardcover' } });
    expect((formatSelect as HTMLSelectElement).value).toBe('Hardcover');
  });

  // ─── add to cart ───────────────────────────────────────────────────────────

  it('calls onAddToCart with the book id and quantity 1 when "Add to cart" is clicked', async () => {
    const handleAddToCart = vi.fn();
    await renderModal({
      book: mockBook,
      onClose: vi.fn(),
      onAddToCart: handleAddToCart,
      onSelectBook: vi.fn(),
    });

    fireEvent.click(screen.getByRole('button', { name: 'Add to cart' }));
    expect(handleAddToCart).toHaveBeenCalledWith('b1', 1);
  });

  it('shows "Out of stock" and disables the add-to-cart button when unavailable', async () => {
    await renderModal({
      book: { ...mockBook, isAvailable: false, stockQuantity: 0 },
      onClose: vi.fn(),
      onAddToCart: vi.fn(),
      onSelectBook: vi.fn(),
    });

    const btn = screen.getByRole('button', { name: 'Out of stock' });
    expect(btn).toBeDisabled();
  });

  // ─── cart quantities badge ─────────────────────────────────────────────────

  it('shows an "In basket" badge on the main book when cartQuantities contains it', async () => {
    await renderModal({
      book: mockBook,
      onClose: vi.fn(),
      onAddToCart: vi.fn(),
      onSelectBook: vi.fn(),
      cartQuantities: { b1: 3 },
    });

    expect(screen.getByText('In basket (3)')).toBeInTheDocument();
  });

  it('shows an "In basket" badge on a related book when cartQuantities contains it', async () => {
    (api.getRelatedBooks as ReturnType<typeof vi.fn>).mockResolvedValue([relatedBook]);

    await renderModal({
      book: mockBook,
      onClose: vi.fn(),
      onAddToCart: vi.fn(),
      onSelectBook: vi.fn(),
      cartQuantities: { b2: 2 },
    });

    expect(screen.getByText('In basket (2)')).toBeInTheDocument();
  });

  // ─── premium badge ─────────────────────────────────────────────────────────

  it('shows a Premium badge for premium books', async () => {
    await renderModal({
      book: { ...mockBook, isPremium: true },
      onClose: vi.fn(),
      onAddToCart: vi.fn(),
      onSelectBook: vi.fn(),
    });

    expect(screen.getByText(/Premium/i)).toBeInTheDocument();
  });

  // ─── related books — API calls ─────────────────────────────────────────────

  it('calls getRelatedBooks and getUpsellBooks with the correct arguments on mount', async () => {
    await renderModal({
      book: mockBook,
      onClose: vi.fn(),
      onAddToCart: vi.fn(),
      onSelectBook: vi.fn(),
    });

    expect(api.getRelatedBooks).toHaveBeenCalledWith('b1', 4);
    expect(api.getUpsellBooks).toHaveBeenCalledWith('b1', 3);
  });

  // ─── related books — render ────────────────────────────────────────────────

  it('renders the related books section when the API returns books', async () => {
    (api.getRelatedBooks as ReturnType<typeof vi.fn>).mockResolvedValue([relatedBook]);

    await renderModal({
      book: mockBook,
      onClose: vi.fn(),
      onAddToCart: vi.fn(),
      onSelectBook: vi.fn(),
    });

    expect(screen.getByText('Children of Dune')).toBeInTheDocument();
  });

  // ─── related books — quick-add ─────────────────────────────────────────────

  it('calls onAddToCart with the related book id when its quick-add button is clicked', async () => {
    (api.getRelatedBooks as ReturnType<typeof vi.fn>).mockResolvedValue([relatedBook]);
    const handleAddToCart = vi.fn();

    await renderModal({
      book: mockBook,
      onClose: vi.fn(),
      onAddToCart: handleAddToCart,
      onSelectBook: vi.fn(),
    });

    fireEvent.click(screen.getByRole('button', { name: /Add Children of Dune to cart/i }));
    expect(handleAddToCart).toHaveBeenCalledWith('b2', 1);
  });

  // ─── related books — title-click ───────────────────────────────────────────

  it('calls onSelectBook with the related book when its title is clicked', async () => {
    (api.getRelatedBooks as ReturnType<typeof vi.fn>).mockResolvedValue([relatedBook]);
    const handleSelectBook = vi.fn();

    await renderModal({
      book: mockBook,
      onClose: vi.fn(),
      onAddToCart: vi.fn(),
      onSelectBook: handleSelectBook,
    });

    fireEvent.click(screen.getByRole('button', { name: 'Children of Dune' }));
    expect(handleSelectBook).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'b2', title: 'Children of Dune' }),
    );
  });

  // ─── upsell books ──────────────────────────────────────────────────────────

  it('shows pricier same-category alternatives in the "You might prefer" section', async () => {
    (api.getUpsellBooks as ReturnType<typeof vi.fn>).mockResolvedValue([
      { id: 'b9', title: 'Dune Deluxe Edition', author: 'Frank Herbert', price: 39.0 },
    ]);

    await renderModal({
      book: mockBook,
      onClose: vi.fn(),
      onAddToCart: vi.fn(),
      onSelectBook: vi.fn(),
    });

    expect(api.getUpsellBooks).toHaveBeenCalledWith('b1', 3);
    expect(screen.getByText('Dune Deluxe Edition')).toBeInTheDocument();
    expect(screen.getByText(/You might prefer/i)).toBeInTheDocument();
  });

  // ─── API error resilience ──────────────────────────────────────────────────

  it('renders without crashing when both API calls fail, and hides the book sections', async () => {
    (api.getRelatedBooks as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('network'));
    (api.getUpsellBooks as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('network'));

    await renderModal({
      book: mockBook,
      onClose: vi.fn(),
      onAddToCart: vi.fn(),
      onSelectBook: vi.fn(),
    });

    // Main content still renders
    expect(screen.getByRole('heading', { name: 'Dune Messiah' })).toBeInTheDocument();
    // Sections that depend on successful API responses are absent
    expect(screen.queryByText('You may also like')).not.toBeInTheDocument();
    expect(screen.queryByText('You might prefer')).not.toBeInTheDocument();
  });
});
