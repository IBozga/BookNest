import React, { useState } from 'react';
import { Search, User as UserIcon, ShoppingBag, X, Menu, Globe, LogOut, Crown } from 'lucide-react';
import { User, CartResponse } from '../types';
import { CurrencyCode } from '../utils/currency';

export type NavView =
  | 'home'
  | 'catalogue'
  | 'categories'
  | 'brands'
  | 'new-releases'
  | 'about'
  | 'cart'
  | 'orders'
  | 'account'
  | 'checkout'
  | 'confirmation'
  | 'login';

interface NavbarProps {
  user: User | null;
  cart: CartResponse | null;
  activeView: NavView;
  onNavigate: (view: NavView, categorySlug?: string | null, brandSlug?: string | null) => void;
  searchTerm: string;
  onSearchChange: (value: string) => void;
  currency: CurrencyCode;
  onCurrencyChange: (currency: CurrencyCode) => void;
  onLogout?: () => void;
}

/** Returns Tailwind class string for a desktop nav link. */
function navLinkClass(active: boolean): string {
  return active
    ? 'text-stone-900 font-semibold border-b-2 border-stone-900 py-1 hover:text-stone-900 transition-colors'
    : 'py-1 hover:text-stone-900 transition-colors';
}

/** Returns Tailwind class string for a mobile nav item. */
function mobileNavLinkClass(active: boolean): string {
  return `w-full text-left px-3 py-2 rounded-lg text-xs font-semibold ${
    active ? 'bg-stone-100 text-stone-900' : 'text-stone-700 hover:bg-stone-100'
  }`;
}

export const Navbar: React.FC<NavbarProps> = ({
  user,
  cart,
  activeView,
  onNavigate,
  searchTerm,
  onSearchChange,
  currency,
  onCurrencyChange,
  onLogout,
}) => {
  const [showSearchInput, setShowSearchInput] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const totalItems = cart?.totalItems || 0;

  const handleNavClick = (view: NavView) => {
    onNavigate(view, null, null);
    setMobileMenuOpen(false);
  };

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-stone-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Left: Mobile Menu Button & Brand Logo */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-1.5 rounded-lg text-stone-700 hover:bg-stone-100"
            aria-label="Toggle navigation menu"
            aria-expanded={mobileMenuOpen}
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>

          <button
            type="button"
            className="cursor-pointer flex items-center gap-2 group text-left"
            onClick={() => handleNavClick('home')}
            aria-label="Go to homepage"
          >
            <span className="text-2xl font-bold tracking-tight text-stone-900 group-hover:text-stone-700 transition-colors">
              BookNest
            </span>
          </button>
        </div>

        {/* Center Navigation Links (Desktop) */}
        <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-stone-600" aria-label="Main navigation">
          <button onClick={() => handleNavClick('catalogue')} className={navLinkClass(activeView === 'catalogue')}>
            Books
          </button>
          <button onClick={() => handleNavClick('categories')} className={navLinkClass(activeView === 'categories')}>
            Categories
          </button>
          <button onClick={() => handleNavClick('new-releases')} className={navLinkClass(activeView === 'new-releases')}>
            New Releases
          </button>
          <button onClick={() => handleNavClick('brands')} className={navLinkClass(activeView === 'brands')}>
            Publishers
          </button>
          <button onClick={() => handleNavClick('about')} className={navLinkClass(activeView === 'about')}>
            About
          </button>
        </nav>

        {/* Right Action Icons: Currency Switcher, Search, User/Points, Cart */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* European & Global Currency Selector */}
          <div className="flex items-center bg-stone-100 rounded-lg px-2 py-1 text-xs font-semibold text-stone-700">
            <Globe className="w-3.5 h-3.5 text-stone-500 mr-1 hidden sm:inline" aria-hidden="true" />
            <select
              value={currency}
              onChange={(e) => onCurrencyChange(e.target.value as CurrencyCode)}
              className="bg-transparent text-stone-800 font-semibold outline-none cursor-pointer text-xs"
              aria-label="Select currency"
            >
              <option value="EUR">EUR (€)</option>
              <option value="GBP">GBP (£)</option>
              <option value="USD">USD ($)</option>
            </select>
          </div>

          {/* Search Toggle */}
          {showSearchInput ? (
            <div className="relative flex items-center">
              <Search className="w-3.5 h-3.5 text-stone-400 absolute left-2 top-1/2 -translate-y-1/2 pointer-events-none" aria-hidden="true" />
              <input
                type="search"
                placeholder="Search books..."
                value={searchTerm}
                onChange={(e) => {
                  onSearchChange(e.target.value);
                  if (activeView !== 'catalogue') onNavigate('catalogue');
                }}
                autoFocus
                className="w-32 sm:w-52 pl-7 pr-7 py-1 text-xs bg-stone-100 border border-stone-200 rounded-full focus:bg-white focus:outline-none focus:ring-1 focus:ring-stone-400"
                aria-label="Search books"
              />
              <button
                onClick={() => {
                  setShowSearchInput(false);
                  onSearchChange('');
                }}
                className="absolute right-2 text-stone-400 hover:text-stone-600"
                aria-label="Close search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowSearchInput(true)}
              className="p-1.5 rounded-full text-stone-700 hover:bg-stone-100 transition-colors"
              aria-label="Open search"
              title="Search"
            >
              <Search className="w-[18px] h-[18px]" />
            </button>
          )}

          {/* User Account / Points */}
          <button
            onClick={() => handleNavClick(user ? 'account' : 'login')}
            className="p-1.5 rounded-full text-stone-700 hover:bg-stone-100 transition-colors flex items-center gap-1.5"
            aria-label={user ? `${user.name} — ${user.rewardPoints} gift points` : 'Sign in'}
            title={user ? `${user.name} (${user.rewardPoints} gift points)` : 'Sign in'}
          >
            {user && (user.role === 'premium' || user.role === 'admin') ? (
              <Crown className="w-[18px] h-[18px] text-amber-500" aria-label="Premium member" />
            ) : (
              <UserIcon className="w-[18px] h-[18px]" />
            )}
            {user && (
              <span className="hidden lg:inline-flex text-xs font-semibold text-stone-700">
                {user.rewardPoints} pts
              </span>
            )}
          </button>

          {user && onLogout && (
            <button
              onClick={() => {
                onLogout();
                setMobileMenuOpen(false);
              }}
              className="p-1.5 rounded-full text-stone-700 hover:bg-stone-100 transition-colors"
              aria-label="Sign out"
              title="Sign out"
            >
              <LogOut className="w-[18px] h-[18px]" />
            </button>
          )}

          {/* Shopping Cart Icon with Badge */}
          <button
            onClick={() => handleNavClick('cart')}
            className="p-1.5 rounded-full text-stone-900 hover:bg-stone-100 transition-colors relative"
            aria-label={`Shopping cart — ${totalItems} ${totalItems === 1 ? 'item' : 'items'}`}
          >
            <ShoppingBag className="w-[18px] h-[18px]" />
            {totalItems > 0 && (
              <span
                aria-hidden="true"
                className="absolute -top-1 -right-1 w-[18px] h-[18px] rounded-full bg-amber-600 text-white text-[10px] font-bold flex items-center justify-center"
              >
                {totalItems}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Mobile Navigation Drawer */}
      {mobileMenuOpen && (
        <nav
          className="md:hidden border-t border-stone-200 bg-white px-4 py-3 space-y-1 animate-fade-in"
          aria-label="Mobile navigation"
        >
          {(
            [
              { view: 'home', label: 'Home' },
              { view: 'catalogue', label: 'Books Catalogue' },
              { view: 'categories', label: 'Categories Hub' },
              { view: 'new-releases', label: 'New Releases' },
              { view: 'brands', label: 'Publishers Directory' },
              { view: 'about', label: 'About' },
              ...(user
                ? [
                    { view: 'account', label: 'My Account' },
                    { view: 'orders', label: 'My Orders' },
                  ]
                : [{ view: 'login', label: 'Sign in' }]),
              { view: 'cart', label: `Your Cart (${totalItems})` },
            ] as { view: NavView; label: string }[]
          ).map(({ view, label }) => (
            <button
              key={view}
              onClick={() => handleNavClick(view)}
              className={mobileNavLinkClass(activeView === view)}
            >
              {label}
            </button>
          ))}
        </nav>
      )}
    </header>
  );
};
