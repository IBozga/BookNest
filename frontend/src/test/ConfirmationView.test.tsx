import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ConfirmationView } from '../components/ConfirmationView';
import { OrderConfirmation } from '../types';

const mockConfirmation: OrderConfirmation = {
  success: true,
  orderId: 'ord-123',
  orderNumber: 'BN778899',
  message: 'Your purchase has been completed successfully! Thank you for shopping with us.',
  pointsEarned: 35,
  remainingPoints: 185,
  finalAmount: 35.0,
  pointsRedeemed: 10,
  walletApplied: 5,
  order: {
    id: '1',
    orderNumber: 'BN778899',
    totalAmount: 24,
    discountAmount: 10,
    pointsRedeemed: 10,
    finalAmount: 40,
    paymentMethod: '',
    status: '',
    createdAt: '2025-06-01T10:00:00Z',
    items: [],
  },
};

describe('ConfirmationView Component', () => {
  it('renders confirmation header, order summary box, and what next steps', () => {
    const handleGoToOrders = vi.fn();
    const handleContinueShopping = vi.fn();

    render(
      <ConfirmationView
        confirmation={mockConfirmation}
        onGoToOrders={handleGoToOrders}
        onContinueShopping={handleContinueShopping}
        currency="EUR"
      />,
    );

    expect(screen.getByText('Thank you for your purchase!')).toBeInTheDocument();
    // backend message shown in subtitle
    expect(screen.getByText(/Thank you for shopping with us/i)).toBeInTheDocument();
    // order number
    expect(screen.getByText('#BN778899')).toBeInTheDocument();
    // date comes from order.createdAt
    expect(screen.getByText('Jun 1, 2025')).toBeInTheDocument();
    // total
    expect(screen.getByText('€32.20')).toBeInTheDocument(); // 35 * 0.92 EUR
    // points & wallet summary: the bold amount sits in a <span>, so assert on its parent paragraph
    expect(screen.getByText('10 gift points').closest('p')).toHaveTextContent('10 gift points redeemed on this order.');
    expect(screen.getByText('€4.60').closest('p')).toHaveTextContent('€4.60 applied from your wallet.'); // 5 * 0.92
    expect(screen.getByText(/\+35 gift points earned/i)).toBeInTheDocument();
    // what's next
    expect(screen.getByText("What's next?")).toBeInTheDocument();
    expect(screen.getByText('1. Download')).toBeInTheDocument();
    expect(screen.getByText('2. Read')).toBeInTheDocument();
    expect(screen.getByText('3. Share')).toBeInTheDocument();

    const ordersBtn = screen.getByRole('button', { name: /Go to my library/i });
    fireEvent.click(ordersBtn);
    expect(handleGoToOrders).toHaveBeenCalled();

    const continueBtn = screen.getByRole('button', { name: /Continue shopping/i });
    fireEvent.click(continueBtn);
    expect(handleContinueShopping).toHaveBeenCalled();
  });

  it('hides points/wallet summary when none are applicable', () => {
    render(
      <ConfirmationView
        confirmation={{ ...mockConfirmation, pointsEarned: 0, pointsRedeemed: 0, walletApplied: 0 }}
        onGoToOrders={vi.fn()}
        onContinueShopping={vi.fn()}
      />,
    );
    expect(screen.queryByText(/gift points/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/from your wallet/i)).not.toBeInTheDocument();
  });
});
