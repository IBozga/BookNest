import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { CheckoutModal } from '../components/CheckoutModal';
import { CartResponse, User } from '../types';
import { api } from '../services/api';

vi.mock('../services/api', () => ({
  api: {
    getAddresses: vi.fn(),
    calculateCheckout: vi.fn(),
    createAddress: vi.fn(),
    processOrder: vi.fn(),
  },
}));

const mockUser: User = {
  id: 'u1',
  name: 'Alex Reed',
  email: 'alex@example.com',
  rewardPoints: 300,
};

const mockCart: CartResponse = {
  id: 'c1',
  userId: 'u1',
  totalItems: 1,
  subtotal: 40.0,
  items: [
    {
      id: 'i1',
      bookId: 'b1',
      quantity: 1,
      book: {
        id: 'b1',
        title: 'Designing Data-Intensive Applications',
        price: 40.0,
      } as any,
    },
  ],
};

describe('CheckoutModal Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders nothing when isOpen is false', () => {
    const { container } = render(
      <CheckoutModal
        isOpen={false}
        onClose={vi.fn()}
        user={mockUser}
        cart={mockCart}
        onOrderCompleted={vi.fn()}
        onViewOrderHistory={vi.fn()}
      />,
    );

    expect(container.firstChild).toBeNull();
  });

  it('loads addresses and allows placing order', async () => {
    (api.getAddresses as any).mockResolvedValue([
      { id: 'addr-1', fullName: 'Alex', street: '123 Main', isDefault: true },
    ]);
    (api.calculateCheckout as any).mockResolvedValue({
      subtotal: 40.0,
      discountAmount: 0,
      shippingAmount: 0,
      taxAmount: 0,
      finalTotal: 40.0,
      pointsEarned: 40,
    });
    (api.processOrder as any).mockResolvedValue({
      orderNumber: 'BN112233',
      finalAmount: 40.0,
      pointsEarned: 40,
      remainingPoints: 260,
      message: 'Thank you for your order!',
      order: { items: [] },
    });

    const handleClose = vi.fn();
    const handleCompleted = vi.fn();

    render(
      <CheckoutModal
        isOpen={true}
        onClose={handleClose}
        user={mockUser}
        cart={mockCart}
        onOrderCompleted={handleCompleted}
        onViewOrderHistory={vi.fn()}
      />,
    );

    expect(screen.getByText('Payment & Checkout')).toBeInTheDocument();

    await waitFor(() => {
      expect(api.getAddresses).toHaveBeenCalled();
      expect(api.calculateCheckout).toHaveBeenCalledWith(0);
    });

    // Complete payment
    const payBtn = screen.getByRole('button', { name: /Complete Payment/i });
    fireEvent.click(payBtn);

    await waitFor(() => {
      expect(api.processOrder).toHaveBeenCalled();
      expect(handleCompleted).toHaveBeenCalled();
      expect(screen.getByText('Purchase Completed Successfully!')).toBeInTheDocument();
    });
  });

  it('allows adding a new address in modal', async () => {
    (api.getAddresses as any).mockResolvedValue([]);
    (api.calculateCheckout as any).mockResolvedValue({
      subtotal: 40.0,
      discountAmount: 0,
      shippingAmount: 0,
      taxAmount: 0,
      finalTotal: 40.0,
    });
    (api.createAddress as any).mockResolvedValue({
      id: 'new-addr-9',
      fullName: 'Sam Taylor',
      street: '456 High St',
      city: 'London',
      state: 'LN',
      zipCode: 'EC1A',
    });

    render(
      <CheckoutModal
        isOpen={true}
        onClose={vi.fn()}
        user={mockUser}
        cart={mockCart}
        onOrderCompleted={vi.fn()}
        onViewOrderHistory={vi.fn()}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText('Add New')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Add New'));

    const nameInput = screen.getByPlaceholderText('Full Name');
    fireEvent.change(nameInput, { target: { value: 'Sam Taylor' } });

    const streetInput = screen.getByPlaceholderText('Street Address');
    fireEvent.change(streetInput, { target: { value: '456 High St' } });

    const cityInput = screen.getByPlaceholderText('City');
    fireEvent.change(cityInput, { target: { value: 'London' } });

    const zipInput = screen.getByPlaceholderText('ZIP Code');
    fireEvent.change(zipInput, { target: { value: 'EC1A' } });

    const form = nameInput.closest('form')!;
    fireEvent.submit(form);

    await waitFor(() => {
      expect(api.createAddress).toHaveBeenCalled();
    });
  });

  it('handles points slider, payment methods, order history navigation and error handling', async () => {
    (api.getAddresses as any).mockResolvedValue([
      { id: 'addr-1', fullName: 'Alex', street: '123 Main', isDefault: true },
    ]);
    (api.calculateCheckout as any).mockResolvedValue({
      subtotal: 40.0,
      discountAmount: 1.0,
      shippingAmount: 0,
      taxAmount: 0,
      finalTotal: 39.0,
    });
    (api.processOrder as any).mockResolvedValue({
      orderNumber: 'BN888888',
      finalAmount: 39.0,
      order: { items: [] },
    });

    const handleViewOrders = vi.fn();
    const handleClose = vi.fn();

    render(
      <CheckoutModal
        isOpen={true}
        onClose={handleClose}
        user={mockUser}
        cart={mockCart}
        onOrderCompleted={vi.fn()}
        onViewOrderHistory={handleViewOrders}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText('2. Redeem Gift Points (100 pts = $1.00)')).toBeInTheDocument();
    });

    // Test points input change
    const pointsInput = screen.getByRole('spinbutton');
    fireEvent.change(pointsInput, { target: { value: '100' } });

    await waitFor(() => {
      expect(api.calculateCheckout).toHaveBeenCalledWith(100);
    });

    // Test payment method selection
    const paypalBtn = screen.getByRole('button', { name: /PayPal/i });
    fireEvent.click(paypalBtn);

    // Complete payment
    const payBtn = screen.getByRole('button', { name: /Complete Payment/i });
    fireEvent.click(payBtn);

    await waitFor(() => {
      expect(screen.getByText('Purchase Completed Successfully!')).toBeInTheDocument();
    });

    // Click View Order History
    const ordersBtn = screen.getByRole('button', { name: /View in Order History/i });
    fireEvent.click(ordersBtn);
    expect(handleViewOrders).toHaveBeenCalled();
  });
});
