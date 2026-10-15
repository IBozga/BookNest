import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { CheckoutView } from '../components/CheckoutView';
import { CartResponse, User } from '../types';
import { api } from '../services/api';

vi.mock('../services/api', () => ({
  api: {
    getAddresses: vi.fn(),
    createAddress: vi.fn(),
    processOrder: vi.fn(),
    calculateCheckout: vi.fn(),
  },
}));

const mockUser: User = {
  id: 'u1',
  name: 'Alex Reed',
  email: 'alex@example.com',
  rewardPoints: 200,
};

const mockCart: CartResponse = {
  id: 'c1',
  userId: 'u1',
  totalItems: 1,
  subtotal: 50.0,
  items: [
    {
      id: 'i1',
      bookId: 'b1',
      quantity: 1,
      book: {
        id: 'b1',
        title: 'Deep Learning',
        author: 'Ian Goodfellow',
        price: 50.0,
        coverImage: 'https://example.com/cover.jpg',
      } as any,
    },
  ],
};

const defaultCalculation = {
  subtotal: 50,
  discountAmount: 0,
  shippingAmount: 4.99,
  taxAmount: 4.0,
  finalTotal: 58.99,
  walletApplied: 0,
  walletBalance: 0,
  couponDiscount: 0,
  couponCode: null,
  amountDue: 58.99,
};

describe('CheckoutView Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (api.calculateCheckout as any).mockResolvedValue(defaultCalculation);
  });

  it('renders shipping form, pre-fills default address, and edits all form inputs', async () => {
    (api.getAddresses as any).mockResolvedValue([
      {
        id: 'addr-1',
        fullName: 'Alex Reed',
        street: '123 Main St',
        city: 'Berlin',
        state: 'BE',
        zipCode: '10115',
        country: 'Germany',
        isDefault: true,
      },
    ]);

    const handleBack = vi.fn();
    const handleCompleted = vi.fn();

    render(
      <CheckoutView
        cart={mockCart}
        user={mockUser}
        redeemPoints={0}
        onOrderCompleted={handleCompleted}
        onBackToCart={handleBack}
        currency="EUR"
      />,
    );

    await waitFor(() => {
      expect(screen.getByDisplayValue('123 Main St')).toBeInTheDocument();
    });

    // Test input changes
    fireEvent.change(screen.getByLabelText(/Email address/i), { target: { value: 'alex.updated@example.com' } });
    fireEvent.change(screen.getByLabelText(/Street address/i), { target: { value: '456 Elm St' } });
    fireEvent.change(screen.getByLabelText(/City/i), { target: { value: 'Munich' } });
    fireEvent.change(screen.getByLabelText(/Postal \/ ZIP code/i), { target: { value: '80331' } });
    fireEvent.change(screen.getByLabelText(/Country/i), { target: { value: 'France' } });
    fireEvent.change(screen.getByLabelText(/Phone number/i), { target: { value: '+33 1 23 45 67 89' } });
    fireEvent.click(screen.getByLabelText(/Save this shipping information/i));

    // Test back button
    const backBtn = screen.getByText('Back to cart');
    fireEvent.click(backBtn);
    expect(handleBack).toHaveBeenCalled();

    // Proceed to Payment
    const continueBtn = screen.getByRole('button', { name: /Continue to Payment/i });
    fireEvent.click(continueBtn);

    await waitFor(() => {
      expect(screen.getByText('Select Payment Method')).toBeInTheDocument();
    });

    // Back to shipping button
    fireEvent.click(screen.getByText('Back to shipping'));
    expect(screen.getByText('Shipping Information')).toBeInTheDocument();
  });

  it('shows validation error if required shipping field is empty', async () => {
    (api.getAddresses as any).mockResolvedValue([]);

    render(
      <CheckoutView
        cart={mockCart}
        user={mockUser}
        redeemPoints={0}
        onOrderCompleted={vi.fn()}
        onBackToCart={vi.fn()}
      />,
    );

    const nameInput = screen.getByLabelText(/Full name/i);
    fireEvent.change(nameInput, { target: { value: '' } });

    const form = nameInput.closest('form')!;
    fireEvent.submit(form);

    expect(screen.getByRole('alert')).toHaveTextContent(/Please fill in all required/i);
  });

  it('tests credit card details input changes and submission', async () => {
    (api.getAddresses as any).mockResolvedValue([]);
    (api.createAddress as any).mockResolvedValue({ id: 'addr-created-1' });
    (api.processOrder as any).mockResolvedValue({
      orderNumber: 'BN111222',
      finalAmount: 48.0,
      pointsEarned: 48,
    });

    const handleCompleted = vi.fn();

    render(
      <CheckoutView
        cart={mockCart}
        user={mockUser}
        redeemPoints={0}
        onOrderCompleted={handleCompleted}
        onBackToCart={vi.fn()}
        currency="EUR"
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /Continue to Payment/i }));

    // Wait for payment step to appear
    await waitFor(() => {
      expect(screen.getByLabelText(/Card number/i)).toBeInTheDocument();
    });

    // Select credit card and edit fields
    fireEvent.change(screen.getByLabelText(/Card number/i), { target: { value: '4111 2222 3333 4444' } });
    fireEvent.change(screen.getByLabelText(/Expiry date/i), { target: { value: '11 / 27' } });
    fireEvent.change(screen.getByLabelText(/CVC \/ CVV/i), { target: { value: '999' } });
    fireEvent.change(screen.getByLabelText(/Cardholder name/i), { target: { value: 'Alex Morgan' } });

    fireEvent.click(screen.getByRole('button', { name: /Pay/i }));

    await waitFor(() => {
      expect(api.createAddress).toHaveBeenCalled();
      expect(api.processOrder).toHaveBeenCalledWith(
        expect.objectContaining({
          paymentMethod: 'CREDIT_CARD',
          paymentDetails: expect.objectContaining({
            cardNumber: '4111 2222 3333 4444',
            cardHolder: 'Alex Morgan',
            expiryDate: '11 / 27',
            cvv: '999',
          }),
        }),
      );
      expect(handleCompleted).toHaveBeenCalled();
    });
  });

  it('tests all alternative payment methods: SEPA, iDEAL, Sofort, PayPal, Apple Pay', async () => {
    (api.getAddresses as any).mockResolvedValue([
      { id: 'addr-1', isDefault: true, fullName: 'Alex', street: 'St', city: 'City', zipCode: '12345' },
    ]);
    (api.processOrder as any).mockResolvedValue({
      orderNumber: 'BN999999',
      finalAmount: 48.0,
      pointsEarned: 48,
    });

    render(
      <CheckoutView
        cart={mockCart}
        user={mockUser}
        redeemPoints={200}
        onOrderCompleted={vi.fn()}
        onBackToCart={vi.fn()}
      />,
    );

    await waitFor(() => {
      expect(screen.getByDisplayValue('Alex')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /Continue to Payment/i }));

    await waitFor(() => {
      expect(screen.getByRole('radio', { name: /SEPA Direct Debit/i })).toBeInTheDocument();
    });

    // SEPA inputs
    fireEvent.click(screen.getByRole('radio', { name: /SEPA Direct Debit/i }));
    fireEvent.change(screen.getByLabelText('IBAN *'), { target: { value: 'FR76 1234 5678 9012' } });
    fireEvent.change(screen.getByLabelText('BIC / Swift'), { target: { value: 'BNPAFRPP' } });
    fireEvent.change(screen.getByLabelText('Bank Name'), { target: { value: 'BNP Paribas' } });

    // iDEAL
    fireEvent.click(screen.getByRole('radio', { name: /iDEAL/i }));
    // Sofort
    fireEvent.click(screen.getByRole('radio', { name: /Sofort/i }));
    // Apple Pay
    fireEvent.click(screen.getByRole('radio', { name: /Apple Pay/i }));
    // PayPal
    fireEvent.click(screen.getByRole('radio', { name: /PayPal/i }));

    fireEvent.click(screen.getByRole('button', { name: /Pay/i }));

    await waitFor(() => {
      expect(api.processOrder).toHaveBeenCalledWith(
        expect.objectContaining({
          paymentMethod: 'PAYPAL',
          redeemPoints: 200,
        }),
      );
    });
  });

  describe('delivery address selection', () => {
    const savedAddresses = [
      { id: 'addr-home', fullName: 'Alex Home', street: '1 Home Rd', city: 'Berlin', state: 'BE', zipCode: '10115', country: 'Germany', isDefault: true },
      { id: 'addr-work', fullName: 'Alex Work', street: '2 Office Ave', city: 'Paris', state: 'IDF', zipCode: '75001', country: 'France', isDefault: false },
    ];

    const renderCheckout = () =>
      render(
        <CheckoutView
          cart={mockCart}
          user={mockUser}
          redeemPoints={0}
          onOrderCompleted={vi.fn()}
          onBackToCart={vi.fn()}
        />,
      );

    const payAndGetOrder = async () => {
      fireEvent.click(screen.getByRole('button', { name: /Continue to Payment/i }));
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Pay/i })).toBeInTheDocument();
      });
      fireEvent.click(screen.getByRole('button', { name: /Pay/i }));
      await waitFor(() => expect(api.processOrder).toHaveBeenCalled());
      return (api.processOrder as any).mock.calls[0][0];
    };

    beforeEach(() => {
      (api.getAddresses as any).mockResolvedValue(savedAddresses);
      (api.createAddress as any).mockResolvedValue({ id: 'addr-new' });
      (api.processOrder as any).mockResolvedValue({ orderNumber: 'BN1', finalAmount: 50, pointsEarned: 250 });
    });

    it('lists saved addresses with the default preselected', async () => {
      renderCheckout();

      const home = await screen.findByRole('radio', { name: /Alex Home/ });
      expect(home).toBeChecked();
      expect(screen.getByRole('radio', { name: /Alex Work/ })).not.toBeChecked();
      expect(screen.getByDisplayValue('1 Home Rd')).toBeInTheDocument();
    });

    it('orders to the address the user selects, not the first one', async () => {
      renderCheckout();

      fireEvent.click(await screen.findByRole('radio', { name: /Alex Work/ }));
      expect(screen.getByDisplayValue('2 Office Ave')).toBeInTheDocument();

      const order = await payAndGetOrder();
      expect(order.addressId).toBe('addr-work');
      expect(api.createAddress).not.toHaveBeenCalled();
    });

    it('saves a new address when the user edits a saved one', async () => {
      renderCheckout();

      await screen.findByDisplayValue('1 Home Rd');
      fireEvent.change(screen.getByLabelText(/Street address/i), { target: { value: '99 New Street' } });
      expect(screen.getByRole('radio', { name: /Use a different address/ })).toBeChecked();

      const order = await payAndGetOrder();
      expect(api.createAddress).toHaveBeenCalledWith(expect.objectContaining({ street: '99 New Street' }));
      expect(order.addressId).toBe('addr-new');
    });

    it('lets the user switch back to a saved address after choosing a different one', async () => {
      renderCheckout();

      fireEvent.click(await screen.findByRole('radio', { name: /Use a different address/ }));
      fireEvent.click(screen.getByRole('radio', { name: /Alex Home/ }));

      const order = await payAndGetOrder();
      expect(order.addressId).toBe('addr-home');
    });

    it('hides the address picker when the user has no saved addresses', async () => {
      (api.getAddresses as any).mockResolvedValue([]);
      renderCheckout();

      await waitFor(() => expect(api.getAddresses).toHaveBeenCalled());
      expect(screen.queryByText('Delivery address')).not.toBeInTheDocument();
    });
  });

  it('handles payment failure gracefully', async () => {
    (api.getAddresses as any).mockResolvedValue([]);
    (api.createAddress as any).mockResolvedValue({ id: 'new-addr-1' });
    (api.processOrder as any).mockRejectedValue(new Error('Card declined'));

    render(
      <CheckoutView
        cart={mockCart}
        user={mockUser}
        redeemPoints={0}
        onOrderCompleted={vi.fn()}
        onBackToCart={vi.fn()}
      />,
    );

    const continueBtn = screen.getByRole('button', { name: /Continue to Payment/i });
    fireEvent.click(continueBtn);

    const payBtn = await screen.findByRole('button', { name: /Pay/i });
    fireEvent.click(payBtn);

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('Card declined');
    });
  });
});
