import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Navbar } from '../components/Navbar';
import { User, CartResponse } from '../types';

const mockUser: User = {
  id: 'u1',
  name: 'Alex Reed',
  email: 'alex@example.com',
  rewardPoints: 250,
};

const mockCart: CartResponse = {
  userId: 'u1',
  totalItems: 3,
  subtotal: 75.5,
  items: [],
};

describe('Navbar Component', () => {
  it('renders brand logo, desktop links, currency switcher and badge', () => {
    const handleNavigate = vi.fn();
    const handleSearchChange = vi.fn();
    const handleCurrencyChange = vi.fn();

    render(
      <Navbar
        user={mockUser}
        cart={mockCart}
        activeView="home"
        onNavigate={handleNavigate}
        searchTerm=""
        onSearchChange={handleSearchChange}
        currency="EUR"
        onCurrencyChange={handleCurrencyChange}
      />,
    );

    expect(screen.getByText('BookNest')).toBeInTheDocument();
    expect(screen.getByText('Books')).toBeInTheDocument();
    expect(screen.getByText('Categories')).toBeInTheDocument();
    expect(screen.getByText('New Releases')).toBeInTheDocument();
    expect(screen.getByText('Publishers')).toBeInTheDocument();
    expect(screen.getByText('About')).toBeInTheDocument();
    expect(screen.getByText('250 pts')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument(); // Cart badge
  });

  it('handles navigation clicks on desktop links and logo', () => {
    const handleNavigate = vi.fn();

    render(
      <Navbar
        user={mockUser}
        cart={mockCart}
        activeView="catalogue"
        onNavigate={handleNavigate}
        searchTerm=""
        onSearchChange={vi.fn()}
        currency="EUR"
        onCurrencyChange={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByText('BookNest'));
    expect(handleNavigate).toHaveBeenCalledWith('home', null, null);

    fireEvent.click(screen.getByText('Categories'));
    expect(handleNavigate).toHaveBeenCalledWith('categories', null, null);

    fireEvent.click(screen.getByText('New Releases'));
    expect(handleNavigate).toHaveBeenCalledWith('new-releases', null, null);

    fireEvent.click(screen.getByText('Publishers'));
    expect(handleNavigate).toHaveBeenCalledWith('brands', null, null);

    fireEvent.click(screen.getByText('About'));
    expect(handleNavigate).toHaveBeenCalledWith('about', null, null);

    // Cart button
    fireEvent.click(screen.getByLabelText(/Shopping cart/i));
    expect(handleNavigate).toHaveBeenCalledWith('cart', null, null);

    // User button — aria-label includes user name & points
    fireEvent.click(screen.getByLabelText(/gift points/i));
    expect(handleNavigate).toHaveBeenCalledWith('account', null, null);
  });

  it('sends signed-out visitors to the login page from the account icon', () => {
    const handleNavigate = vi.fn();

    render(
      <Navbar
        user={null}
        cart={null}
        activeView="home"
        onNavigate={handleNavigate}
        searchTerm=""
        onSearchChange={vi.fn()}
        currency="EUR"
        onCurrencyChange={vi.fn()}
        onLogout={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));
    expect(handleNavigate).toHaveBeenCalledWith('login', null, null);
    expect(screen.queryByRole('button', { name: 'Sign out' })).not.toBeInTheDocument();
  });

  it('shows a Crown icon for premium users instead of the regular user icon', () => {
    const premiumUser = { ...mockUser, role: 'premium' as const };

    render(
      <Navbar
        user={premiumUser}
        cart={mockCart}
        activeView="home"
        onNavigate={vi.fn()}
        searchTerm=""
        onSearchChange={vi.fn()}
        currency="EUR"
        onCurrencyChange={vi.fn()}
      />,
    );

    // The account button's aria-label still includes the name and points
    expect(screen.getByLabelText(/gift points/i)).toBeInTheDocument();
    // The Crown icon has aria-label="Premium member"
    expect(screen.getByLabelText('Premium member')).toBeInTheDocument();
  });

  it('shows a Sign out button for signed-in users and calls onLogout', () => {
    const handleLogout = vi.fn();

    render(
      <Navbar
        user={mockUser}
        cart={mockCart}
        activeView="home"
        onNavigate={vi.fn()}
        searchTerm=""
        onSearchChange={vi.fn()}
        currency="EUR"
        onCurrencyChange={vi.fn()}
        onLogout={handleLogout}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Sign out' }));
    expect(handleLogout).toHaveBeenCalledTimes(1);
  });

  it('offers "Sign in" instead of "Orders & Account" in the mobile menu when signed out', () => {
    const handleNavigate = vi.fn();

    render(
      <Navbar
        user={null}
        cart={null}
        activeView="home"
        onNavigate={handleNavigate}
        searchTerm=""
        onSearchChange={vi.fn()}
        currency="EUR"
        onCurrencyChange={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByLabelText('Toggle navigation menu'));
    expect(screen.queryByText('Orders & Account')).not.toBeInTheDocument();

    fireEvent.click(screen.getByText('Sign in'));
    expect(handleNavigate).toHaveBeenCalledWith('login', null, null);
  });


  it('handles search toggle and input typing', () => {
    const handleNavigate = vi.fn();
    const handleSearchChange = vi.fn();

    render(
      <Navbar
        user={null}
        cart={null}
        activeView="home"
        onNavigate={handleNavigate}
        searchTerm=""
        onSearchChange={handleSearchChange}
        currency="USD"
        onCurrencyChange={vi.fn()}
      />,
    );

    // Open search input
    const searchBtn = screen.getByLabelText('Open search');
    fireEvent.click(searchBtn);

    const input = screen.getByPlaceholderText('Search books...');
    expect(input).toBeInTheDocument();

    fireEvent.change(input, { target: { value: 'quantum' } });
    expect(handleSearchChange).toHaveBeenCalledWith('quantum');
    expect(handleNavigate).toHaveBeenCalledWith('catalogue');

    // Close search input
    const closeBtn = input.nextElementSibling?.nextElementSibling;
    if (closeBtn) {
      fireEvent.click(closeBtn);
      expect(handleSearchChange).toHaveBeenCalledWith('');
    }
  });

  it('handles currency dropdown change', () => {
    const handleCurrencyChange = vi.fn();

    render(
      <Navbar
        user={null}
        cart={null}
        activeView="home"
        onNavigate={vi.fn()}
        searchTerm=""
        onSearchChange={vi.fn()}
        currency="EUR"
        onCurrencyChange={handleCurrencyChange}
      />,
    );

    const select = screen.getByLabelText('Select currency');
    fireEvent.change(select, { target: { value: 'GBP' } });
    expect(handleCurrencyChange).toHaveBeenCalledWith('GBP');
  });

  it('toggles mobile menu and navigates from mobile menu links', () => {
    const handleNavigate = vi.fn();

    render(
      <Navbar
        user={mockUser}
        cart={mockCart}
        activeView="home"
        onNavigate={handleNavigate}
        searchTerm=""
        onSearchChange={vi.fn()}
        currency="EUR"
        onCurrencyChange={vi.fn()}
      />,
    );

    const toggleBtn = screen.getByLabelText('Toggle navigation menu');
    fireEvent.click(toggleBtn);

    expect(screen.getByText('Books Catalogue')).toBeInTheDocument();
    expect(screen.getByText('Categories Hub')).toBeInTheDocument();
    expect(screen.getByText('Publishers Directory')).toBeInTheDocument();
    expect(screen.getByText('Your Cart (3)')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Books Catalogue'));
    expect(handleNavigate).toHaveBeenCalledWith('catalogue', null, null);

    // Reopen and click another
    fireEvent.click(toggleBtn);
    fireEvent.click(screen.getByText('Categories Hub'));
    expect(handleNavigate).toHaveBeenCalledWith('categories', null, null);

    // Reopen and click New Releases (desktop nav also has 'New Releases', so pick the mobile one)
    fireEvent.click(toggleBtn);
    fireEvent.click(screen.getAllByText('New Releases')[1]);
    expect(handleNavigate).toHaveBeenCalledWith('new-releases', null, null);

    // Reopen and click Publishers Directory
    fireEvent.click(toggleBtn);
    fireEvent.click(screen.getByText('Publishers Directory'));
    expect(handleNavigate).toHaveBeenCalledWith('brands', null, null);

    // Reopen and click About
    fireEvent.click(toggleBtn);
    fireEvent.click(screen.getAllByText('About')[0]);
    expect(handleNavigate).toHaveBeenCalledWith('about', null, null);

    // Reopen and click My Account
    fireEvent.click(toggleBtn);
    fireEvent.click(screen.getByText('My Account'));
    expect(handleNavigate).toHaveBeenCalledWith('account', null, null);

    // Reopen and click My Orders
    fireEvent.click(toggleBtn);
    fireEvent.click(screen.getByText('My Orders'));
    expect(handleNavigate).toHaveBeenCalledWith('orders', null, null);

    // Reopen and click Your Cart
    fireEvent.click(toggleBtn);
    fireEvent.click(screen.getByText('Your Cart (3)'));
    expect(handleNavigate).toHaveBeenCalledWith('cart', null, null);
  });
});
