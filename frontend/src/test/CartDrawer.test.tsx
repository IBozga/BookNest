import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { CartDrawer } from '../components/CartDrawer';
import { CartResponse } from '../types';
import { api } from '../services/api';

vi.mock('../services/api', () => ({
  api: {
    getOrderHistoryRecommendations: vi.fn(),
  },
}));

const mockCart: CartResponse = {
  userId: 'u1',
  totalItems: 1,
  subtotal: 25.0,
  items: [
    {
      id: 'item-1',
      bookId: 'b1',
      quantity: 1,
      book: {
        id: 'b1',
        title: 'JavaScript: The Good Parts',
        author: 'Douglas Crockford',
        price: 25.0,
      } as any,
    },
  ],
};

describe('CartDrawer Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders nothing when isOpen is false', () => {
    const { container } = render(
      <CartDrawer
        isOpen={false}
        onClose={vi.fn()}
        cart={mockCart}
        onUpdateQuantity={vi.fn()}
        onRemoveItem={vi.fn()}
        onClearCart={vi.fn()}
        onProceedToCheckout={vi.fn()}
        onAddToCart={vi.fn()}
        onSelectBook={vi.fn()}
      />,
    );

    expect(container.firstChild).toBeNull();
  });

  it('renders basket items, fetches recommendations and triggers events', async () => {
    (api.getOrderHistoryRecommendations as any).mockResolvedValue([
      { id: 'rec-1', title: 'You Don’t Know JS', price: 18.0, coverImage: '' },
    ]);

    const handleClose = vi.fn();
    const handleClear = vi.fn();
    const handleUpdateQuantity = vi.fn();
    const handleRemoveItem = vi.fn();
    const handleProceed = vi.fn();
    const handleAddToCart = vi.fn();
    const handleSelectBook = vi.fn();

    render(
      <CartDrawer
        isOpen={true}
        onClose={handleClose}
        cart={mockCart}
        onUpdateQuantity={handleUpdateQuantity}
        onRemoveItem={handleRemoveItem}
        onClearCart={handleClear}
        onProceedToCheckout={handleProceed}
        onAddToCart={handleAddToCart}
        onSelectBook={handleSelectBook}
      />,
    );

    expect(screen.getByText('Your Basket')).toBeInTheDocument();
    expect(screen.getByText('JavaScript: The Good Parts')).toBeInTheDocument();

    // Close button
    fireEvent.click(screen.getByLabelText('Close cart drawer'));
    expect(handleClose).toHaveBeenCalled();

    // Clear cart button
    fireEvent.click(screen.getByText('Clear all'));
    expect(handleClear).toHaveBeenCalled();

    // Quantity change
    const minusBtn = screen.getByLabelText(/Decrease quantity/i);
    fireEvent.click(minusBtn);
    expect(handleUpdateQuantity).toHaveBeenCalledWith('item-1', 0);

    const plusBtn = screen.getByLabelText(/Increase quantity/i);
    fireEvent.click(plusBtn);
    expect(handleUpdateQuantity).toHaveBeenCalledWith('item-1', 2);

    // Remove item
    fireEvent.click(screen.getByLabelText(/Remove JavaScript/i));
    expect(handleRemoveItem).toHaveBeenCalledWith('item-1');

    // Wait for recommendation
    await waitFor(() => {
      expect(screen.getByText('You Don’t Know JS')).toBeInTheDocument();
    });

    const addRecBtn = screen.getByText('+ Add');
    fireEvent.click(addRecBtn);
    expect(handleAddToCart).toHaveBeenCalledWith('rec-1');

    // Click on recommendation title/image
    fireEvent.click(screen.getByText('You Don’t Know JS'));
    expect(handleSelectBook).toHaveBeenCalled();

    // Click on cart item title
    fireEvent.click(screen.getByText('JavaScript: The Good Parts'));
    expect(handleSelectBook).toHaveBeenCalled();

    // Checkout button
    const checkoutBtn = screen.getByText('Proceed to Checkout');
    fireEvent.click(checkoutBtn);
    expect(handleProceed).toHaveBeenCalled();
  });

  it('renders empty basket state when cart has no items', () => {
    (api.getOrderHistoryRecommendations as any).mockResolvedValue([]);

    render(
      <CartDrawer
        isOpen={true}
        onClose={vi.fn()}
        cart={{ id: 'c0', userId: 'u1', totalItems: 0, subtotal: 0, items: [] }}
        onUpdateQuantity={vi.fn()}
        onRemoveItem={vi.fn()}
        onClearCart={vi.fn()}
        onProceedToCheckout={vi.fn()}
        onAddToCart={vi.fn()}
        onSelectBook={vi.fn()}
      />,
    );

    expect(screen.getByText('Your basket is empty')).toBeInTheDocument();
  });
});
