import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { App } from '../App';
import { api } from '../services/api';

vi.mock('../services/api', () => ({
  api: {
    hasAuthToken: vi.fn(),
    getCurrentUser: vi.fn(),
    login: vi.fn(),
    startGuestSession: vi.fn(),
    logout: vi.fn(),
    getOrderHistoryRecommendations: vi.fn(),
    getCart: vi.fn(),
    getCategories: vi.fn(),
    getBrands: vi.fn(),
    getBooks: vi.fn(),
    addToCart: vi.fn(),
    updateCartItem: vi.fn(),
    removeFromCart: vi.fn(),
    getRelatedBooks: vi.fn(),
    getAddresses: vi.fn(),
    createAddress: vi.fn(),
    processOrder: vi.fn(),
    getOrders: vi.fn(),
    buyAgain: vi.fn(),
    validateCoupon: vi.fn(),
    getUpsellBooks: vi.fn(),
    modifyOrder: vi.fn(),
    topUpWallet: vi.fn(),
    calculateCheckout: vi.fn(),
  },
  loadingState: {
    subscribe: () => () => {},
    isLoading: false,
  },
  authToken: {
    get: vi.fn(() => null),
    set: vi.fn(),
    clear: vi.fn(),
  },
}));

const mockUser = {
  id: 'u1',
  name: 'Alex Reed',
  email: 'alex@example.com',
  rewardPoints: 150,
};

const mockCategories = [
  { id: 'cat-1', name: 'Technology & AI', slug: 'technology-ai' },
  { id: 'cat-2', name: 'Sci-Fi & Fantasy', slug: 'scifi-fantasy' },
];

const mockBrands = [
  { id: 'b1', name: "O'Reilly Media", slug: 'oreilly-media' },
];

const mockBooks = [
  {
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
    category: mockCategories[0],
    brand: mockBrands[0],
  },
];

const mockCart = {
  id: 'cart-1',
  userId: 'u1',
  totalItems: 1,
  subtotal: 38.99,
  items: [
    {
      id: 'item-1',
      bookId: 'book-1',
      quantity: 1,
      book: mockBooks[0],
    },
  ],
};

describe('App Component Flow & Navigation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.history.pushState({}, '', '/');
    (api.hasAuthToken as any).mockReturnValue(true);
    (api.getCurrentUser as any).mockResolvedValue(mockUser);
    (api.getOrderHistoryRecommendations as any).mockResolvedValue([]);
    (api.getCart as any).mockResolvedValue(mockCart);
    (api.getCategories as any).mockResolvedValue(mockCategories);
    (api.getBrands as any).mockResolvedValue(mockBrands);
    (api.getBooks as any).mockResolvedValue(mockBooks);
    (api.getRelatedBooks as any).mockResolvedValue([]);
    (api.getUpsellBooks as any).mockResolvedValue([]);
    (api.getAddresses as any).mockResolvedValue([]);
    (api.getOrders as any).mockResolvedValue([]);
  });

  it('renders home view with navbar, hero banner, best sellers, and footer', async () => {
    render(<App />);

    expect(screen.getAllByText('BookNest').length).toBeGreaterThan(0);
    expect(screen.getByText(/Discover/i)).toBeInTheDocument();
    expect(screen.getByText('Best sellers')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getAllByText('Designing Data-Intensive Applications').length).toBeGreaterThan(0);
    });
  });

  it('navigates through views: Catalogue, Categories, New Releases, Publishers, About, Cart', async () => {
    render(<App />);

    // Navigate to Catalogue
    fireEvent.click(screen.getByRole('button', { name: 'Books' }));
    await waitFor(() => {
      expect(screen.getByText('All Books')).toBeInTheDocument();
    });

    // Navigate to Categories
    fireEvent.click(screen.getByRole('button', { name: 'Categories' }));
    await waitFor(() => {
      expect(screen.getByText('Category Hub & Directory')).toBeInTheDocument();
    });

    // Navigate to New Releases
    fireEvent.click(screen.getByRole('button', { name: 'New Releases' }));
    await waitFor(() => {
      expect(screen.getByText(/Spring 2025 Catalogue Releases/i)).toBeInTheDocument();
    });

    // Navigate to Publishers
    fireEvent.click(screen.getByRole('button', { name: 'Publishers' }));
    await waitFor(() => {
      expect(screen.getByText('Browse by Brand')).toBeInTheDocument();
    });

    // Navigate to About
    fireEvent.click(screen.getByRole('button', { name: 'About' }));
    await waitFor(() => {
      expect(screen.getByText('About BookNest')).toBeInTheDocument();
    });

    await screen.findByRole('button', { name: /gift points/i }); // session restored

    // Navigate to Cart
    fireEvent.click(screen.getByLabelText(/Shopping cart/i));
    await waitFor(() => {
      expect(screen.getByText('Your Cart')).toBeInTheDocument();
    });
  });

  it('handles cart item updates and deletion from CartView', async () => {
    (api.updateCartItem as any).mockResolvedValue({
      ...mockCart,
      totalItems: 2,
    });
    (api.removeFromCart as any).mockResolvedValue({
      ...mockCart,
      totalItems: 0,
      items: [],
    });

    render(<App />);
    await screen.findByRole('button', { name: /gift points/i }); // session restored

    // Navigate to Cart
    fireEvent.click(screen.getByLabelText(/Shopping cart/i));
    await waitFor(() => {
      expect(screen.getByText('Your Cart')).toBeInTheDocument();
    });

    // Increase quantity
    const plusBtn = screen.getByRole('button', { name: /Increase quantity/i });
    fireEvent.click(plusBtn);
    await waitFor(() => {
      expect(api.updateCartItem).toHaveBeenCalledWith('item-1', 2);
    });

    // Remove item
    const removeBtn = screen.getByRole('button', { name: /Remove .* from cart/i });
    fireEvent.click(removeBtn);
    await waitFor(() => {
      expect(api.removeFromCart).toHaveBeenCalledWith('item-1');
    });
  });

  it('handles add to cart and updates cart state and shows toast', async () => {
    (api.addToCart as any).mockResolvedValue({
      ...mockCart,
      totalItems: 2,
    });

    render(<App />);

    await waitFor(() => {
      expect(screen.getByText('Designing Data-Intensive Applications')).toBeInTheDocument();
    });

    const addBtn = screen.getByRole('button', { name: /Add .* to cart/i });
    fireEvent.click(addBtn);

    await waitFor(() => {
      expect(api.addToCart).toHaveBeenCalledWith('book-1', 1);
      expect(screen.getByText('Added to cart!')).toBeInTheDocument();
    });
  });

  it('handles modal opening and adding to cart from modal', async () => {
    (api.addToCart as any).mockResolvedValue({
      ...mockCart,
      totalItems: 2,
    });

    render(<App />);

    await waitFor(() => {
      expect(screen.getByText('Designing Data-Intensive Applications')).toBeInTheDocument();
    });

    // Click on book title to open product modal
    fireEvent.click(screen.getByText('Designing Data-Intensive Applications'));

    await waitFor(() => {
      expect(screen.getByLabelText('Close product details modal')).toBeInTheDocument();
    });

    // Add to cart from modal (BookCard also has an 'Add to cart' button, so scope to the dialog)
    const dialog = screen.getByRole('dialog');
    const modalAddBtn = within(dialog).getByRole('button', { name: 'Add to cart' });
    fireEvent.click(modalAddBtn);

    await waitFor(() => {
      expect(api.addToCart).toHaveBeenCalledWith('book-1', 1);
      expect(screen.queryByLabelText('Close product details modal')).not.toBeInTheDocument();
    });
  });

  it('handles order history buy again success in App', async () => {
    (api.getOrders as any).mockResolvedValue([
      {
        id: 'ord-1',
        orderNumber: 'BN123456',
        finalAmount: 38.99,
        status: 'COMPLETED',
        createdAt: '2025-01-10T10:00:00Z',
        items: [{ id: 'it-1', book: mockBooks[0] }],
      },
    ]);
    (api.buyAgain as any).mockResolvedValue({
      success: true,
      message: 'Items re-added to basket',
      cart: mockCart,
    });

    render(<App />);

    // Open My Account (the account button shows gift points once the session is restored), then the My Orders tab
    fireEvent.click(await screen.findByRole('button', { name: /gift points/i }));
    fireEvent.click(await screen.findByRole('tab', { name: 'My Orders' }));

    await waitFor(() => {
      expect(screen.getByText('#BN123456')).toBeInTheDocument();
    });

    const buyAgainBtn = screen.getByRole('button', { name: /Buy again/i });
    fireEvent.click(buyAgainBtn);

    await waitFor(() => {
      expect(screen.getByText('Items re-added to basket')).toBeInTheDocument();
    });
  });

  it('handles popstate browser navigation', async () => {
    render(<App />);

    window.history.pushState({}, '', '/publishers');
    window.dispatchEvent(new PopStateEvent('popstate'));

    await waitFor(() => {
      expect(screen.getByText('Browse by Brand')).toBeInTheDocument();
    });
  });

  it('handles full end-to-end checkout, confirmation view, and order history navigation', async () => {
    (api.getAddresses as any).mockResolvedValue([
      {
        id: 'addr-1',
        fullName: 'Alex Reed',
        street: '123 Tech Lane',
        city: 'Berlin',
        state: 'BE',
        zipCode: '10115',
        country: 'Germany',
        isDefault: true,
      },
    ]);
    (api.processOrder as any).mockResolvedValue({
      orderNumber: 'BN777888',
      finalAmount: 38.99,
      pointsEarned: 38,
      items: mockCart.items,
    });

    render(<App />);

    await screen.findByRole('button', { name: /gift points/i }); // session restored

    // Navigate to Cart
    fireEvent.click(screen.getByLabelText(/Shopping cart/i));
    await waitFor(() => {
      expect(screen.getByText('Your Cart')).toBeInTheDocument();
    });

    // Proceed to Checkout
    const checkoutBtn = screen.getByRole('button', { name: /Proceed to Checkout/i });
    fireEvent.click(checkoutBtn);

    await waitFor(() => {
      expect(screen.getByDisplayValue('123 Tech Lane')).toBeInTheDocument();
    });

    // Continue to Payment
    fireEvent.click(screen.getByRole('button', { name: /Continue to Payment/i }));

    await waitFor(() => {
      expect(screen.getByText('Select Payment Method')).toBeInTheDocument();
    });

    // Click Pay
    fireEvent.click(screen.getByRole('button', { name: /Pay/i }));

    await waitFor(() => {
      expect(screen.getByText('Thank you for your purchase!')).toBeInTheDocument();
      expect(screen.getByText(/#BN777888/)).toBeInTheDocument();
    });

    // Click Go to my library
    fireEvent.click(screen.getByRole('button', { name: /Go to my library/i }));
    await waitFor(() => {
      expect(screen.getByRole('tab', { name: 'My Orders' })).toHaveAttribute('aria-selected', 'true');
    });
  });

  it('handles hero banner search and homepage category selection', async () => {
    render(<App />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Technology' })).toBeInTheDocument();
    });

    // Click category from home grid
    const techBtn = screen.getByRole('button', { name: 'Technology' });
    fireEvent.click(techBtn);

    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 1, name: 'Technology & AI' })).toBeInTheDocument();
    });

    // Navigate back home
    fireEvent.click(screen.getByRole('button', { name: /Go to homepage|BookNest/i }));
    await waitFor(() => {
      expect(screen.getByText(/Discover/i)).toBeInTheDocument();
    });

    // Search via hero banner
    const heroInput = screen.getByPlaceholderText(/Search for books, authors, or genres.../i);
    fireEvent.change(heroInput, { target: { value: 'Design' } });
    // The HeroBanner submit button has type="submit" and aria-label="Search"
    const heroSearchBtn = screen.getByRole('button', { name: 'Search' });
    fireEvent.click(heroSearchBtn);

    await waitFor(() => {
      expect(screen.getByText('All Books')).toBeInTheDocument();
    });
  });

  describe('login & authentication journey', () => {
    beforeEach(() => {
      (api.hasAuthToken as any).mockReturnValue(false);
    });

    it('shows the login page for an anonymous visitor opening /login', async () => {
      window.history.pushState({}, '', '/login');
      render(<App />);

      expect(await screen.findByRole('heading', { name: 'Sign in' })).toBeInTheDocument();
      expect(api.getCurrentUser).not.toHaveBeenCalled();
    });

    it('redirects anonymous visitors from order history to the login page', async () => {
      window.history.pushState({}, '', '/orders');
      render(<App />);

      expect(await screen.findByRole('heading', { name: 'Sign in' })).toBeInTheDocument();
      expect(api.getOrders).not.toHaveBeenCalled();
    });

    it('redirects anonymous visitors from My Account to the login page', async () => {
      window.history.pushState({}, '', '/account');
      render(<App />);

      expect(await screen.findByRole('heading', { name: 'Sign in' })).toBeInTheDocument();
      expect(api.getAddresses).not.toHaveBeenCalled();
    });

    describe('guest flow', () => {
      const guestUser = { id: 'g1', name: 'Guest', email: 'g@guest.invalid', rewardPoints: 0, isGuest: true };

      it('lets an anonymous visitor open the cart without signing in', async () => {
        render(<App />);

        fireEvent.click(screen.getByLabelText(/Shopping cart/i));

        expect(await screen.findByText('Your Cart')).toBeInTheDocument();
        expect(screen.queryByRole('heading', { name: 'Sign in' })).not.toBeInTheDocument();
      });

      it('starts a guest session on the first add-to-cart and adds the book', async () => {
        (api.startGuestSession as any).mockResolvedValue({ accessToken: 'guest-tok', user: guestUser });
        (api.addToCart as any).mockResolvedValue({ ...mockCart, totalItems: 1 });

        render(<App />);
        fireEvent.click(await screen.findByRole('button', { name: /Add .* to cart/i }));

        await waitFor(() => {
          expect(api.startGuestSession).toHaveBeenCalledTimes(1);
          expect(api.addToCart).toHaveBeenCalledWith('book-1', 1);
          expect(screen.getByText('Added to cart!')).toBeInTheDocument();
        });
      });

      it('does not create another guest session when a session already exists', async () => {
        (api.hasAuthToken as any).mockReturnValue(true);
        (api.getCurrentUser as any).mockResolvedValue(guestUser);
        (api.addToCart as any).mockResolvedValue({ ...mockCart, totalItems: 2 });

        render(<App />);
        fireEvent.click(await screen.findByRole('button', { name: /Add .* to cart/i }));

        await waitFor(() => expect(api.addToCart).toHaveBeenCalled());
        expect(api.startGuestSession).not.toHaveBeenCalled();
      });

      it('does not present a guest as signed in (no points, no recommendations, "Sign in" shown)', async () => {
        (api.hasAuthToken as any).mockReturnValue(true);
        (api.getCurrentUser as any).mockResolvedValue(guestUser);

        render(<App />);

        expect(await screen.findByRole('button', { name: 'Sign in' })).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: 'Sign out' })).not.toBeInTheDocument();
        expect(api.getOrderHistoryRecommendations).not.toHaveBeenCalled();
      });

      it('completes checkout as a guest and shows the confirmation', async () => {
        (api.hasAuthToken as any).mockReturnValue(true);
        (api.getCurrentUser as any).mockResolvedValue(guestUser);
        (api.getAddresses as any).mockResolvedValue([]);
        (api.createAddress as any).mockResolvedValue({ id: 'addr-g' });
        (api.processOrder as any).mockResolvedValue({
          orderNumber: 'BN999000',
          finalAmount: 38.99,
          pointsEarned: 0,
          items: mockCart.items,
        });

        render(<App />);
        await waitFor(() => expect(api.getCurrentUser).toHaveBeenCalled());

        fireEvent.click(screen.getByLabelText(/Shopping cart/i));
        fireEvent.click(await screen.findByRole('button', { name: /Proceed to Checkout/i }));
        fireEvent.click(await screen.findByRole('button', { name: /Continue to Payment/i }));
        fireEvent.click(await screen.findByRole('button', { name: /Pay/i }));

        await waitFor(() => {
          expect(screen.getByText('Thank you for your purchase!')).toBeInTheDocument();
        });
        expect(api.processOrder).toHaveBeenCalledWith(
          expect.objectContaining({ addressId: 'addr-g', email: expect.stringContaining('@') }),
        );
      });
    });

    it('opens the login page from the account icon when signed out', async () => {
      render(<App />);

      fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));

      expect(await screen.findByLabelText('Email')).toBeInTheDocument();
      expect(window.location.pathname).toBe('/login');
    });

    it('signs in, loads recommendations from order history, and signs out', async () => {
      (api.login as any).mockResolvedValue({ accessToken: 'tok', user: mockUser });
      (api.getOrderHistoryRecommendations as any).mockResolvedValue([
        { ...mockBooks[0], id: 'rec-1', title: 'Dune' },
      ]);

      window.history.pushState({}, '', '/login');
      render(<App />);

      fireEvent.change(await screen.findByLabelText('Email'), {
        target: { value: 'alex@example.com' },
      });
      fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'pw-123456' } });
      fireEvent.submit(screen.getByLabelText('Password').closest('form')!);

      await waitFor(() => {
        expect(api.login).toHaveBeenCalledWith('alex@example.com', 'pw-123456');
      });

      // Redirected to homepage, which now shows order-history recommendations
      expect(await screen.findByText('Recommended for you')).toBeInTheDocument();
      expect(screen.getByText('Dune')).toBeInTheDocument();
      expect(api.getOrderHistoryRecommendations).toHaveBeenCalledWith(4);

      // Sign out clears the session
      fireEvent.click(screen.getByRole('button', { name: 'Sign out' }));
      expect(api.logout).toHaveBeenCalled();
      await waitFor(() => {
        expect(screen.queryByText('Recommended for you')).not.toBeInTheDocument();
      });
      expect(screen.getByRole('button', { name: 'Sign in' })).toBeInTheDocument();
    });

    it('shows an error and stays on the login page when credentials are rejected', async () => {
      (api.login as any).mockRejectedValue(new Error('Invalid email or password'));

      window.history.pushState({}, '', '/login');
      render(<App />);

      fireEvent.change(await screen.findByLabelText('Email'), {
        target: { value: 'alex@example.com' },
      });
      fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'wrong' } });
      fireEvent.submit(screen.getByLabelText('Password').closest('form')!);

      expect(await screen.findByRole('alert')).toHaveTextContent('Invalid email or password');
      expect(screen.getByRole('heading', { name: 'Sign in' })).toBeInTheDocument();
    });

    it('discards an invalid stored token and shows the login page', async () => {
      (api.hasAuthToken as any).mockReturnValue(true);
      (api.getCurrentUser as any).mockRejectedValue(new Error('Authentication required'));

      window.history.pushState({}, '', '/orders');
      render(<App />);

      expect(await screen.findByRole('heading', { name: 'Sign in' })).toBeInTheDocument();
      expect(api.logout).toHaveBeenCalled();
    });
  });
});
