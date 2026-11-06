import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { OrderHistoryView } from '../components/OrderHistoryView';
import { api } from '../services/api';

vi.mock('../services/api', () => ({
  api: {
    getOrders: vi.fn(),
    buyAgain: vi.fn(),
    cancelOrder: vi.fn(),
    returnOrder: vi.fn(),
    modifyOrder: vi.fn(),
  },
}));

vi.stubGlobal('confirm', vi.fn(() => true));

describe('OrderHistoryView Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders order history and handles Buy It Again trigger', async () => {
    (api.getOrders as any).mockResolvedValue([
      {
        id: 'ord-100',
        orderNumber: 'BN582394',
        finalAmount: 49.5,
        status: 'COMPLETED',
        paymentMethod: 'CREDIT_CARD',
        createdAt: '2025-01-15T12:00:00Z',
        items: [
          {
            id: 'item-1',
            quantity: 1,
            unitPrice: 49.5,
            totalPrice: 49.5,
            book: {
              id: 'book-1',
              title: 'Deep Learning & Neural Networks',
              price: 49.5,
              coverImage: '',
            },
          },
        ],
      },
    ]);

    (api.buyAgain as any).mockResolvedValue({
      success: true,
      message: 'Added 1 item to your basket.',
      cart: { totalItems: 1, items: [] },
    });

    const handleBuyAgainSuccess = vi.fn();
    const handleExplore = vi.fn();

    render(
      <OrderHistoryView
        onBuyAgainSuccess={handleBuyAgainSuccess}
        onExploreCatalogue={handleExplore}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText(/#BN582394/)).toBeInTheDocument();
      expect(screen.getAllByText('Completed').length).toBeGreaterThan(0);
    });

    const buyAgainBtn = screen.getByRole('button', { name: /Buy again/i });
    expect(buyAgainBtn).toBeInTheDocument();
    fireEvent.click(buyAgainBtn);

    await waitFor(() => {
      expect(api.buyAgain).toHaveBeenCalledWith('ord-100');
      expect(handleBuyAgainSuccess).toHaveBeenCalled();
    });
  });

  it('shows Cancel order button when canCancel is true and calls cancelOrder on click', async () => {
    (api.getOrders as any).mockResolvedValue([
      {
        id: 'ord-200',
        orderNumber: 'BN200',
        finalAmount: 49.5,
        status: 'COMPLETED',
        paymentMethod: 'CREDIT_CARD',
        createdAt: new Date().toISOString(),
        canCancel: true,
        canReturn: false,
        items: [],
      },
    ]);
    (api.cancelOrder as any).mockResolvedValue({
      success: true,
      message: 'Order BN200 cancelled.',
      refundAmount: 49.5,
      pointsAdjustment: 0,
      order: { id: 'ord-200', orderNumber: 'BN200', status: 'CANCELLED', canCancel: false, canReturn: false, items: [] },
    });

    render(
      <OrderHistoryView onBuyAgainSuccess={vi.fn()} onExploreCatalogue={vi.fn()} />,
    );

    await waitFor(() => expect(screen.getByText('Cancel order')).toBeInTheDocument());
    fireEvent.click(screen.getByText('Cancel order'));
    await waitFor(() => {
      expect(api.cancelOrder).toHaveBeenCalledWith('ord-200');
      expect(screen.getByText('Order BN200 cancelled.')).toBeInTheDocument();
    });
  });

  it('shows Return order button when canReturn is true and calls returnOrder on click', async () => {
    (api.getOrders as any).mockResolvedValue([
      {
        id: 'ord-300',
        orderNumber: 'BN300',
        finalAmount: 49.5,
        status: 'COMPLETED',
        paymentMethod: 'CREDIT_CARD',
        createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        canCancel: false,
        canReturn: true,
        items: [],
      },
    ]);
    (api.returnOrder as any).mockResolvedValue({
      success: true,
      message: 'Order BN300 returned.',
      refundAmount: 49.5,
      pointsAdjustment: -200,
      order: { id: 'ord-300', orderNumber: 'BN300', status: 'RETURNED', canCancel: false, canReturn: false, items: [] },
    });

    render(
      <OrderHistoryView onBuyAgainSuccess={vi.fn()} onExploreCatalogue={vi.fn()} />,
    );

    await waitFor(() => expect(screen.getByText('Return order')).toBeInTheDocument());
    fireEvent.click(screen.getByText('Return order'));
    await waitFor(() => {
      expect(api.returnOrder).toHaveBeenCalledWith('ord-300');
      expect(screen.getByText('Order BN300 returned.')).toBeInTheDocument();
    });
  });

  it('shows the Returned tab and filters to RETURNED orders', async () => {
    (api.getOrders as any).mockResolvedValue([
      {
        id: 'ord-400',
        orderNumber: 'BN400',
        finalAmount: 29,
        status: 'RETURNED',
        paymentMethod: 'CREDIT_CARD',
        createdAt: '2025-03-01T12:00:00Z',
        canCancel: false,
        canReturn: false,
        items: [],
      },
    ]);

    render(
      <OrderHistoryView onBuyAgainSuccess={vi.fn()} onExploreCatalogue={vi.fn()} />,
    );

    await waitFor(() => expect(screen.getByText(/#BN400/)).toBeInTheDocument());

    // Cancelled tab should show nothing
    fireEvent.click(screen.getByRole('button', { name: 'Cancelled' }));
    await waitFor(() => expect(screen.getByText('No orders found')).toBeInTheDocument());

    // Returned tab should show the order
    fireEvent.click(screen.getByRole('button', { name: 'Returned' }));
    await waitFor(() => expect(screen.getByText(/#BN400/)).toBeInTheDocument());
  });

  it('renders empty orders state when orders list is empty', async () => {
    (api.getOrders as any).mockResolvedValue([]);
    const handleExplore = vi.fn();

    render(
      <OrderHistoryView
        onBuyAgainSuccess={vi.fn()}
        onExploreCatalogue={handleExplore}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText('No orders found')).toBeInTheDocument();
    });

    const exploreBtn = screen.getByRole('button', { name: 'Start Browsing' });
    fireEvent.click(exploreBtn);
    expect(handleExplore).toHaveBeenCalled();
  });

  it('shows Edit items button when canModify is true and saves via modifyOrder', async () => {
    (api.getOrders as any).mockResolvedValue([
      {
        id: 'ord-500',
        orderNumber: 'BN500',
        finalAmount: 30,
        status: 'COMPLETED',
        paymentMethod: 'CREDIT_CARD',
        createdAt: new Date().toISOString(),
        canCancel: true,
        canReturn: false,
        canModify: true,
        items: [
          {
            id: 'item-5',
            quantity: 2,
            unitPrice: 15,
            totalPrice: 30,
            book: { id: 'book-5', title: 'Clean Code', price: 15, coverImage: '' },
          },
        ],
      },
    ]);

    (api.modifyOrder as any).mockResolvedValue({
      success: true,
      message: 'Order updated.',
      order: {
        id: 'ord-500',
        orderNumber: 'BN500',
        status: 'COMPLETED',
        canModify: true,
        canCancel: true,
        canReturn: false,
        items: [
          { id: 'item-5', quantity: 1, unitPrice: 15, totalPrice: 15, book: { id: 'book-5', title: 'Clean Code', price: 15, coverImage: '' } },
        ],
      },
    });

    render(<OrderHistoryView onBuyAgainSuccess={vi.fn()} onExploreCatalogue={vi.fn()} />);

    await waitFor(() => expect(screen.getByText(/#BN500/)).toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: 'Edit items' }));
    expect(screen.getByText('Reduce or remove items')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Decrease quantity of Clean Code' }));
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));

    await waitFor(() =>
      expect(api.modifyOrder).toHaveBeenCalledWith('ord-500', [{ bookId: 'book-5', quantity: 1 }]),
    );
    expect(await screen.findByText('Order updated.')).toBeInTheDocument();
  });

  it('shows return label with Print label button for RETURNED orders', async () => {
    (api.getOrders as any).mockResolvedValue([
      {
        id: 'ord-600',
        orderNumber: 'BN600',
        finalAmount: 20,
        status: 'RETURNED',
        paymentMethod: 'CREDIT_CARD',
        createdAt: '2025-02-01T10:00:00Z',
        canCancel: false,
        canReturn: false,
        returnLabel: 'RTN-ABCD1234',
        items: [],
      },
    ]);

    render(<OrderHistoryView onBuyAgainSuccess={vi.fn()} onExploreCatalogue={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText('RTN-ABCD1234')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Print label/i })).toBeInTheDocument();
    });
  });

  it('renders error state or fallback when getOrders fails', async () => {
    (api.getOrders as any).mockRejectedValue(new Error('Network failure'));

    render(
      <OrderHistoryView
        onBuyAgainSuccess={vi.fn()}
        onExploreCatalogue={vi.fn()}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText('No orders found')).toBeInTheDocument();
    });
  });
});
