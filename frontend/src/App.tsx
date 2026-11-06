import React, { useEffect, useState, useCallback } from 'react';
import {
  Book,
  Category,
  Brand,
  CartResponse,
  User,
  OrderConfirmation,
} from './types';
import { api } from './services/api';
import { CurrencyCode } from './utils/currency';
import { Navbar, NavView } from './components/Navbar';
import { HeroBanner } from './components/HeroBanner';
import { CategorySelector } from './components/CategorySelector';
import { BookCard } from './components/BookCard';
import { CatalogueView } from './components/CatalogueView';
import { CategoriesHubView } from './components/CategoriesHubView';
import { NewReleasesView } from './components/NewReleasesView';
import { BrandBrowseView } from './components/BrandBrowseView';
import { AboutView } from './components/AboutView';
import { ProductDetailModal } from './components/ProductDetailModal';
import { CartView } from './components/CartView';
import { CheckoutView } from './components/CheckoutView';
import { ConfirmationView } from './components/ConfirmationView';
import { AccountView } from './components/AccountView';
import { LoginView } from './components/LoginView';
import { ArrowRight } from 'lucide-react';
import { GlobalLoadingBar } from './components/GlobalLoadingBar';

// Views that require a registered account. Cart, checkout and confirmation are open to guests.
const PROTECTED_VIEWS: NavView[] = ['orders', 'account'];

// Minimum time the "Adding…" spinner is shown on an Add to cart button
const ADD_TO_CART_MIN_DELAY_MS = 600;

// URL path helper
function getPathForView(view: NavView): string {
  switch (view) {
    case 'login':
      return '/login';
    case 'home':
      return '/';
    case 'catalogue':
      return '/books';
    case 'categories':
      return '/categories';
    case 'new-releases':
      return '/new-releases';
    case 'brands':
      return '/publishers';
    case 'about':
      return '/about';
    case 'cart':
      return '/cart';
    case 'checkout':
      return '/checkout';
    case 'orders':
      return '/orders';
    case 'account':
      return '/account';
    case 'confirmation':
      return '/confirmation';
    default:
      return '/';
  }
}

function getViewFromPath(pathname: string): NavView {
  const cleanPath = pathname.replace(/\/+$/, '') || '/';
  if (cleanPath === '/' || cleanPath === '/home') return 'home';
  if (cleanPath === '/login') return 'login';
  if (cleanPath === '/books' || cleanPath === '/catalogue') return 'catalogue';
  if (cleanPath === '/categories') return 'categories';
  if (cleanPath === '/new-releases' || cleanPath === '/releases') return 'new-releases';
  if (cleanPath === '/publishers' || cleanPath === '/brands') return 'brands';
  if (cleanPath === '/about') return 'about';
  if (cleanPath === '/cart') return 'cart';
  if (cleanPath === '/checkout') return 'checkout';
  if (cleanPath === '/orders' || cleanPath === '/my-orders') return 'orders';
  if (cleanPath === '/account' || cleanPath === '/my-account') return 'account';
  if (cleanPath === '/confirmation') return 'confirmation';
  return 'home';
}

export const App: React.FC = () => {
  // Navigation & URL Routing
  const [activeView, setActiveView] = useState<NavView>(() =>
    typeof window !== 'undefined' ? getViewFromPath(window.location.pathname) : 'home'
  );

  // Localization / Currency State
  const [currency, setCurrency] = useState<CurrencyCode>('EUR');

  // Core Data
  const [user, setUser] = useState<User | null>(null);
  // False while a stored session token is being verified, to avoid flashing the login page
  const [authReady, setAuthReady] = useState<boolean>(() => !api.hasAuthToken());
  const [recommendations, setRecommendations] = useState<Book[]>([]);
  // Guest sessions exist only to hold a cart and place an order; they are not "signed in"
  const registeredUser = user && !user.isGuest ? user : null;
  const [cart, setCart] = useState<CartResponse | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [books, setBooks] = useState<Book[]>([]);
  const [loadingBooks, setLoadingBooks] = useState(false);

  // Filters & Search
  const [selectedCategorySlug, setSelectedCategorySlug] = useState<string | null>(null);
  const [selectedBrandSlug, setSelectedBrandSlug] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('rating_desc');

  // Checkout & Confirmation State
  const [redeemPoints, setRedeemPoints] = useState<number>(0);
  const [couponCode, setCouponCode] = useState('');
  const [couponDiscount, setCouponDiscount] = useState(0);
  const [orderConfirmation, setOrderConfirmation] = useState<OrderConfirmation | null>(null);

  // Modals & Active Selections
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [addingBookId, setAddingBookId] = useState<string | null>(null);

  // Handle Browser Back/Forward navigation
  useEffect(() => {
    const handlePopState = () => {
      const view = getViewFromPath(window.location.pathname);
      setActiveView(view);
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Initial Data Fetch (public catalogue data)
  useEffect(() => {
    api.getCategories().then((cats) => setCategories(cats)).catch(() => {});
    api.getBrands().then((brs) => setBrands(brs)).catch(() => {});
  }, []);

  // Restore an existing session from a stored token
  useEffect(() => {
    if (!api.hasAuthToken()) return;
    api
      .getCurrentUser()
      .then((u) => setUser(u))
      .catch(() => api.logout())
      .finally(() => setAuthReady(true));
  }, []);

  // Load user-scoped data (cart + order-history recommendations) once signed in
  useEffect(() => {
    if (!user) {
      setRecommendations([]);
      return;
    }
    api.getCart().then((c) => setCart(c)).catch(() => {});
    if (user.isGuest) {
      setRecommendations([]);
      return;
    }
    api
      .getOrderHistoryRecommendations(4)
      .then((recs) => setRecommendations(recs))
      .catch(() => setRecommendations([]));
  }, [user?.id]);

  // Fetch books
  const fetchBooks = useCallback(() => {
    setLoadingBooks(true);
    api
      .getBooks({
        categorySlug: selectedCategorySlug || undefined,
        brandSlug: selectedBrandSlug || undefined,
        search: searchTerm || undefined,
        sortBy,
      })
      .then((res) => setBooks(res))
      .catch(() => setBooks([]))
      .finally(() => setLoadingBooks(false));
  }, [selectedCategorySlug, selectedBrandSlug, searchTerm, sortBy]);

  useEffect(() => {
    fetchBooks();
  }, [fetchBooks]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleNavigate = (
    view: NavView,
    catSlug: string | null = null,
    brandSlug: string | null = null,
    updateHistory = true
  ) => {
    setActiveView(view);
    if (catSlug !== undefined) setSelectedCategorySlug(catSlug);
    if (brandSlug !== undefined) setSelectedBrandSlug(brandSlug);

    if (updateHistory && typeof window !== 'undefined') {
      const newPath = getPathForView(view);
      if (window.location.pathname !== newPath) {
        window.history.pushState({}, '', newPath);
      }
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleLoginSuccess = (u: User) => {
    setUser(u);
    setAuthReady(true);
    // Return to the protected page the visitor was trying to reach, otherwise go home
    if (!PROTECTED_VIEWS.includes(activeView)) {
      handleNavigate('home');
    }
  };

  const handleLogout = () => {
    api.logout();
    setUser(null);
    setCart(null);
    setRedeemPoints(0);
    setCouponCode('');
    setCouponDiscount(0);
    setOrderConfirmation(null);
    handleNavigate('home');
  };

  // Visitors without a session get an anonymous guest session on their first cart action
  const ensureSession = async () => {
    if (api.hasAuthToken()) return;
    const { user: guest } = await api.startGuestSession();
    setUser(guest);
    setAuthReady(true);
  };

  // Cart operations
  const handleAddToCart = async (bookId: string, quantity = 1) => {
    setAddingBookId(bookId);
    try {
      // Keep the spinner visible for at least ADD_TO_CART_MIN_DELAY_MS, running alongside the request
      const [updatedCart] = await Promise.all([
        ensureSession().then(() => api.addToCart(bookId, quantity)),
        new Promise((resolve) => setTimeout(resolve, ADD_TO_CART_MIN_DELAY_MS)),
      ]);
      setCart(updatedCart);
      showToast('Added to cart!');
    } catch (err: any) {
      showToast(err.message || 'Failed to add item');
    } finally {
      setAddingBookId(null);
    }
  };

  const handleUpdateQuantity = async (cartItemId: string, qty: number) => {
    try {
      const updatedCart = await api.updateCartItem(cartItemId, qty);
      setCart(updatedCart);
    } catch (err: any) {
      showToast(err.message || 'Failed to update quantity');
    }
  };

  const handleRemoveItem = async (cartItemId: string) => {
    try {
      const updatedCart = await api.removeFromCart(cartItemId);
      setCart(updatedCart);
      showToast('Item removed from cart');
    } catch (err: any) {
      showToast(err.message || 'Failed to remove item');
    }
  };

  const handleOrderCompleted = (conf: OrderConfirmation) => {
    setOrderConfirmation(conf);
    setCouponCode('');
    setCouponDiscount(0);
    setRedeemPoints(0);
    handleNavigate('confirmation');
    api.getCart().then((c) => setCart(c)).catch(() => {});
    api.getCurrentUser().then((u) => setUser(u)).catch(() => {});
    fetchBooks();
  };

  // Quantity of each book already in the basket, used to tag products across the catalogue
  const cartQuantities: Record<string, number> = {};
  cart?.items.forEach((item) => {
    cartQuantities[item.bookId] = item.quantity;
  });

  // Protected views fall back to the login page for anonymous visitors
  const isProtected = PROTECTED_VIEWS.includes(activeView);
  const currentView: NavView = isProtected && !registeredUser ? 'login' : activeView;

  return (
    <div className="min-h-screen flex flex-col bg-white text-stone-900 font-sans antialiased">
      {/* Global API loading indicator */}
      <GlobalLoadingBar />

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl bg-stone-900 text-white text-xs font-semibold shadow-xl border border-stone-800 animate-slide-up">
          {toastMessage}
        </div>
      )}

      {/* Navbar (BookNest Header) */}
      <Navbar
        user={registeredUser}
        cart={cart}
        activeView={activeView}
        onNavigate={(view, cat, brand) => handleNavigate(view, cat, brand)}
        searchTerm={searchTerm}
        onSearchChange={(val) => setSearchTerm(val)}
        currency={currency}
        onCurrencyChange={(curr) => setCurrency(curr)}
        onLogout={handleLogout}
      />

      {/* Main Views Container */}
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2 w-full">
        {/* 0. LOGIN ('/login') — also shown in place of protected views for anonymous visitors */}
        {currentView === 'login' && authReady && !registeredUser && (
          <LoginView
            onLoginSuccess={handleLoginSuccess}
            onContinueBrowsing={() => handleNavigate('home')}
          />
        )}
        {currentView === 'login' && registeredUser && (
          <div className="py-16 text-center text-xs text-stone-500 space-y-3">
            <p>You are signed in as {registeredUser.name}.</p>
            <button
              onClick={() => handleNavigate('orders')}
              className="font-semibold text-stone-900 underline"
            >
              View my orders
            </button>
          </div>
        )}
        {isProtected && !authReady && (
          <div className="py-16 text-center text-xs text-stone-400">Checking your session...</div>
        )}

        {/* 1. HOMEPAGE ('/') */}
        {activeView === 'home' && (
          <div className="space-y-12 my-4">
            {/* Hero Section */}
            <HeroBanner
              onSearch={(query) => {
                setSearchTerm(query);
                handleNavigate('catalogue');
              }}
            />

            {/* Shop By Category */}
            <CategorySelector
              categories={categories}
              selectedCategorySlug={selectedCategorySlug}
              onSelectCategory={(slug) => {
                setSelectedCategorySlug(slug);
                handleNavigate('catalogue', slug);
              }}
              variant="grid"
            />

            {/* Recommended for you (based on order history; signed-in users only) */}
            {registeredUser && recommendations.length > 0 && (
              <section className="space-y-4" aria-labelledby="recommended-heading">
                <div>
                  <h2
                    id="recommended-heading"
                    className="text-xl font-serif text-stone-900 font-semibold tracking-tight"
                  >
                    Recommended for you
                  </h2>
                  <p className="text-xs text-stone-500">Based on your order history</p>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-5">
                  {recommendations.map((book) => (
                    <BookCard
                      key={book.id}
                      book={book}
                      onSelect={(b) => setSelectedBook(b)}
                      onAddToCart={(id) => handleAddToCart(id)}
                      isAdding={addingBookId === book.id}
                      quantityInCart={cartQuantities[book.id] ?? 0}
                      currency={currency}
                    />
                  ))}
                </div>
              </section>
            )}

            {/* Best Sellers Section */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-serif text-stone-900 font-semibold tracking-tight">
                    Best sellers
                  </h2>
                  <p className="text-xs text-stone-500">Most read books this month</p>
                </div>

                <button
                  onClick={() => handleNavigate('catalogue', null, null)}
                  className="text-xs text-stone-500 hover:text-stone-900 font-medium flex items-center gap-1"
                >
                  <span>View all books</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {loadingBooks ? (
                <div className="py-12 text-center text-xs text-stone-400">Loading bestsellers...</div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-5">
                  {books.slice(0, 4).map((book) => (
                    <BookCard
                      key={book.id}
                      book={book}
                      onSelect={(b) => setSelectedBook(b)}
                      onAddToCart={(id) => handleAddToCart(id)}
                      isAdding={addingBookId === book.id}
                      quantityInCart={cartQuantities[book.id] ?? 0}
                      currency={currency}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* 2. BOOKS CATALOGUE ('/books') */}
        {activeView === 'catalogue' && (
          <CatalogueView
            categories={categories}
            selectedCategorySlug={selectedCategorySlug}
            onSelectCategory={(slug) => setSelectedCategorySlug(slug)}
            brands={brands}
            selectedBrandSlug={selectedBrandSlug}
            onSelectBrand={(slug) => setSelectedBrandSlug(slug)}
            books={books}
            loading={loadingBooks}
            onSelectBook={(b) => setSelectedBook(b)}
            onAddToCart={(id) => handleAddToCart(id)}
            addingBookId={addingBookId}
            cartQuantities={cartQuantities}
            sortBy={sortBy}
            onSortChange={(val) => setSortBy(val)}
            currency={currency}
          />
        )}

        {/* 3. CATEGORIES HUB ('/categories') */}
        {activeView === 'categories' && (
          <CategoriesHubView
            categories={categories}
            books={books}
            onSelectCategory={(catSlug) => {
              setSelectedCategorySlug(catSlug);
              handleNavigate('catalogue', catSlug);
            }}
            onSelectBook={(b) => setSelectedBook(b)}
            currency={currency}
          />
        )}

        {/* 4. NEW RELEASES ('/new-releases') */}
        {activeView === 'new-releases' && (
          <NewReleasesView
            books={books}
            categories={categories}
            onSelectBook={(b) => setSelectedBook(b)}
            onAddToCart={(id) => handleAddToCart(id)}
            addingBookId={addingBookId}
            cartQuantities={cartQuantities}
            currency={currency}
          />
        )}

        {/* 5. PUBLISHERS / BRANDS ('/publishers') */}
        {activeView === 'brands' && (
          <BrandBrowseView
            brands={brands}
            onSelectBrand={(brandSlug) => {
              setSelectedBrandSlug(brandSlug);
              handleNavigate('catalogue', null, brandSlug);
            }}
          />
        )}

        {/* 6. ABOUT PAGE ('/about') */}
        {activeView === 'about' && (
          <AboutView onExploreBooks={() => handleNavigate('catalogue')} />
        )}

        {/* 7. CART ('/cart') */}
        {currentView === 'cart' && (
          <CartView
            cart={cart}
            user={registeredUser}
            onUpdateQuantity={handleUpdateQuantity}
            onRemoveItem={handleRemoveItem}
            onProceedToCheckout={() => handleNavigate('checkout')}
            onExploreCatalogue={() => handleNavigate('catalogue')}
            onSelectBook={(b) => setSelectedBook(b)}
            redeemPoints={redeemPoints}
            onPointsChange={(pts) => setRedeemPoints(pts)}
            couponCode={couponCode}
            couponDiscount={couponDiscount}
            onCouponChange={(code, discount) => {
              setCouponCode(code);
              setCouponDiscount(discount);
            }}
            currency={currency}
          />
        )}

        {/* 7 & 8. CHECKOUT & PAYMENT ('/checkout') */}
        {currentView === 'checkout' && (
          <CheckoutView
            cart={cart}
            user={registeredUser}
            redeemPoints={redeemPoints}
            couponCode={couponCode}
            onOrderCompleted={handleOrderCompleted}
            onBackToCart={() => handleNavigate('cart')}
            currency={currency}
          />
        )}

        {/* 9. ORDER CONFIRMATION ('/confirmation') */}
        {currentView === 'confirmation' && orderConfirmation && (
          <ConfirmationView
            confirmation={orderConfirmation}
            onGoToOrders={() => handleNavigate('orders')}
            onContinueShopping={() => handleNavigate('home')}
            currency={currency}
          />
        )}

        {/* 10 & 11. MY ACCOUNT: My Addresses ('/account') and My Orders ('/orders') tabs */}
        {(currentView === 'account' || currentView === 'orders') && registeredUser && (
          <AccountView
            user={registeredUser}
            tab={currentView === 'orders' ? 'orders' : 'addresses'}
            onTabChange={(tab) => handleNavigate(tab === 'orders' ? 'orders' : 'account')}
            onBuyAgainSuccess={(updatedCart, message) => {
              setCart(updatedCart);
              showToast(message);
              handleNavigate('cart');
            }}
            onExploreCatalogue={() => handleNavigate('catalogue')}
          />
        )}
      </main>

      {/* PRODUCT DETAIL & RELATED PRODUCTS MODAL */}
      <ProductDetailModal
        cartQuantities={cartQuantities}
        book={selectedBook}
        onClose={() => setSelectedBook(null)}
        onAddToCart={(id, qty) => {
          handleAddToCart(id, qty);
          setSelectedBook(null);
        }}
        onSelectBook={(b) => setSelectedBook(b)}
        currency={currency}
      />

      {/* Footer */}
      <footer className="mt-20 border-t border-stone-200 py-10 text-center text-xs text-stone-500">
        <div className="max-w-7xl mx-auto px-4 space-y-2">
          <p className="font-semibold text-stone-900">BookNest</p>
          <p>© 2025 BookNest Platform. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};
