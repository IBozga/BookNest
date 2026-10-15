import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { CartView } from '../components/CartView';
import { CartResponse, User } from '../types';
import { api } from '../services/api';

vi.mock('../services/api', () => ({
  api: {
    validateCoupon: vi.fn(),
  },
}));

const mockUser: User = {
  id: 'u1',
  name: 'Alex Reed',
  email: 'alex@example.com',
  rewardPoints: 500,
};

const mockCart: CartResponse = {
  id: 'c1',
  userId: 'u1',
  totalItems: 2,
  subtotal: 60.0,
  items: [
    {
      id: 'item-1',
      bookId: 'b1',
      quantity: 1,
      book: {
        id: 'b1',
        title: 'Pragmatic Programmer',
        author: 'Andy Hunt',
        price: 20.0,
        coverImage: 'https://example.com/cover.jpg',
      } as any,
    },
    {
      id: 'item-2',
      bookId: 'b2',
      quantity: 2,
      book: {
        id: 'b2',
        title: 'Refactoring',
        author: 'Martin Fowler',
        price: 20.0,
        coverImage: 'https://example.com/refactoring.jpg',
      } as any,
    },
  ],
};

describe('CartView Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders empty cart message when items is empty', () => {
    const handleExplore = vi.fn();

    render(
      <CartView
        cart={{ id: 'c0', userId: 'u1', totalItems: 0, subtotal: 0, items: [] }}
        user={mockUser}
        onUpdateQuantity={vi.fn()}
        onRemoveItem={vi.fn()}
        onProceedToCheckout={vi.fn()}
        onExploreCatalogue={handleExplore}
        onSelectBook={vi.fn()}
        redeemPoints={0}
        onPointsChange={vi.fn()}
        couponCode=""
        couponDiscount={0}
        onCouponChange={vi.fn()}
      />,
    );

    expect(screen.getByText('Your cart is empty')).toBeInTheDocument();
    const exploreBtn = screen.getByRole('button', { name: 'Explore Books' });
    fireEvent.click(exploreBtn);
    expect(handleExplore).toHaveBeenCalled();
  });

  it('renders cart items, quantity stepper, and removes items', () => {
    const handleUpdateQuantity = vi.fn();
    const handleRemoveItem = vi.fn();
    const handleSelectBook = vi.fn();

    render(
      <CartView
        cart={mockCart}
        user={mockUser}
        onUpdateQuantity={handleUpdateQuantity}
        onRemoveItem={handleRemoveItem}
        onProceedToCheckout={vi.fn()}
        onExploreCatalogue={vi.fn()}
        onSelectBook={handleSelectBook}
        redeemPoints={0}
        onPointsChange={vi.fn()}
        couponCode=""
        couponDiscount={0}
        onCouponChange={vi.fn()}
        currency="EUR"
      />,
    );

    expect(screen.getByText('Pragmatic Programmer')).toBeInTheDocument();
    expect(screen.getByText('Refactoring')).toBeInTheDocument();

    // Click item thumbnail to select book
    fireEvent.click(screen.getByText('Pragmatic Programmer'));
    expect(handleSelectBook).toHaveBeenCalled();

    // Quantity buttons
    const minusBtns = screen.getAllByRole('button', { name: /Decrease quantity/i });
    fireEvent.click(minusBtns[0]);
    expect(handleUpdateQuantity).toHaveBeenCalledWith('item-1', 0);

    const plusBtns = screen.getAllByRole('button', { name: /Increase quantity/i });
    fireEvent.click(plusBtns[0]);
    expect(handleUpdateQuantity).toHaveBeenCalledWith('item-1', 2);

    // Remove button
    const removeBtns = screen.getAllByRole('button', { name: /Remove .* from cart/i });
    fireEvent.click(removeBtns[0]);
    expect(handleRemoveItem).toHaveBeenCalledWith('item-1');
  });

  it('handles promo code entry and calls validateCoupon on apply', async () => {
    const handleCouponChange = vi.fn();
    (api.validateCoupon as any).mockResolvedValue({ code: 'BOOKNEST10', discountAmount: 6.0 });

    render(
      <CartView
        cart={mockCart}
        user={mockUser}
        onUpdateQuantity={vi.fn()}
        onRemoveItem={vi.fn()}
        onProceedToCheckout={vi.fn()}
        onExploreCatalogue={vi.fn()}
        onSelectBook={vi.fn()}
        redeemPoints={0}
        onPointsChange={vi.fn()}
        couponCode=""
        couponDiscount={0}
        onCouponChange={handleCouponChange}
        currency="USD"
      />,
    );

    const promoInput = screen.getByPlaceholderText(/Enter promo code/i);
    fireEvent.change(promoInput, { target: { value: 'BOOKNEST10' } });

    const applyBtn = screen.getByRole('button', { name: 'Apply' });
    fireEvent.click(applyBtn);

    await waitFor(() => {
      expect(api.validateCoupon).toHaveBeenCalledWith('BOOKNEST10');
      expect(handleCouponChange).toHaveBeenCalledWith('BOOKNEST10', 6.0);
    });
  });

  it('handles gift point redemption slider and checkout button', () => {
    const handlePointsChange = vi.fn();
    const handleProceed = vi.fn();

    render(
      <CartView
        cart={mockCart}
        user={mockUser}
        onUpdateQuantity={vi.fn()}
        onRemoveItem={vi.fn()}
        onProceedToCheckout={handleProceed}
        onExploreCatalogue={vi.fn()}
        onSelectBook={vi.fn()}
        redeemPoints={200}
        onPointsChange={handlePointsChange}
        couponCode=""
        couponDiscount={0}
        onCouponChange={vi.fn()}
        currency="EUR"
      />,
    );

    expect(screen.getByText(/Redeem Gift Points/i)).toBeInTheDocument();

    const slider = screen.getByRole('slider');
    fireEvent.change(slider, { target: { value: '300' } });
    expect(handlePointsChange).toHaveBeenCalledWith(300);

    const checkoutBtn = screen.getByRole('button', { name: /Proceed to Checkout/i });
    fireEvent.click(checkoutBtn);
    expect(handleProceed).toHaveBeenCalled();
  });
});
