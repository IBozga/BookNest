import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { AccountView } from '../components/AccountView';
import { User } from '../types';
import { api } from '../services/api';

vi.mock('../services/api', () => ({
  api: {
    getAddresses: vi.fn(),
    updateAddress: vi.fn(),
    getOrders: vi.fn(),
    topUpWallet: vi.fn(),
  },
}));

const user: User = { id: 'u1', name: 'Alex Reed', email: 'alex@example.com', rewardPoints: 120, walletBalance: 10 };

const addresses = [
  { id: 'a1', fullName: 'Alex Home', street: '1 Home Rd', city: 'Berlin', state: 'BE', zipCode: '10115', country: 'Germany', isDefault: true },
  { id: 'a2', fullName: 'Alex Work', street: '2 Office Ave', city: 'Paris', state: 'IDF', zipCode: '75001', country: 'France', isDefault: false },
];

const renderAccount = (props: Partial<React.ComponentProps<typeof AccountView>> = {}) =>
  render(
    <AccountView
      user={user}
      tab="addresses"
      onTabChange={vi.fn()}
      onBuyAgainSuccess={vi.fn()}
      onExploreCatalogue={vi.fn()}
      {...props}
    />,
  );

describe('AccountView Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (api.getAddresses as any).mockResolvedValue(addresses);
    (api.getOrders as any).mockResolvedValue([]);
  });

  describe('tabs', () => {
    it('shows the profile summary and the two tabs with My Addresses selected', async () => {
      renderAccount();

      expect(screen.getByRole('heading', { name: 'My Account' })).toBeInTheDocument();
      expect(screen.getByText(/alex@example.com/)).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: 'My Addresses' })).toHaveAttribute('aria-selected', 'true');
      expect(screen.getByRole('tab', { name: 'My Orders' })).toHaveAttribute('aria-selected', 'false');
      await screen.findByText('Alex Home');
    });

    it('reports the tab the user clicks', async () => {
      const onTabChange = vi.fn();
      renderAccount({ onTabChange });

      await screen.findByText('Alex Home');
      fireEvent.click(screen.getByRole('tab', { name: 'My Orders' }));
      expect(onTabChange).toHaveBeenCalledWith('orders');
    });

    it('shows the order history on the My Orders tab', async () => {
      (api.getOrders as any).mockResolvedValue([
        { id: 'o1', orderNumber: 'BN100', status: 'COMPLETED', createdAt: '2025-01-10T10:00:00Z', items: [] },
      ]);
      renderAccount({ tab: 'orders' });

      expect(screen.getByRole('tab', { name: 'My Orders' })).toHaveAttribute('aria-selected', 'true');
      expect(await screen.findByText('#BN100')).toBeInTheDocument();
      expect(api.getAddresses).not.toHaveBeenCalled();
    });
  });

  describe('Wallet', () => {
    it('shows the wallet balance and updates it after a top-up', async () => {
      (api.topUpWallet as any).mockResolvedValue({ walletBalance: 35, credited: 25 });
      renderAccount();

      // initial balance: 10 USD * 0.92 EUR rate = €9.20
      expect(screen.getByTestId('wallet-balance')).toHaveTextContent('€9.20');
      fireEvent.click(screen.getByRole('button', { name: 'Top up wallet' }));

      // updated balance: 35 USD * 0.92 = €32.20
      await waitFor(() => expect(screen.getByTestId('wallet-balance')).toHaveTextContent('€32.20'));
      expect(api.topUpWallet).toHaveBeenCalledTimes(1);
      expect(screen.getByRole('status')).toHaveTextContent(/Added/);
      await screen.findByText('Alex Home');
    });

    it('shows an error when the top-up is refused', async () => {
      (api.topUpWallet as any).mockRejectedValue(new Error('Wallet limit reached'));
      renderAccount();

      fireEvent.click(screen.getByRole('button', { name: 'Top up wallet' }));

      expect(await screen.findByRole('alert')).toHaveTextContent('Wallet limit reached');
      // balance stays at 10 USD * 0.92 = €9.20
      expect(screen.getByTestId('wallet-balance')).toHaveTextContent('€9.20');
      await screen.findByText('Alex Home');
    });
  });

  describe('My Addresses', () => {
    it('lists every saved address and marks only the default', async () => {
      renderAccount();

      expect(await screen.findByText('Alex Home')).toBeInTheDocument();
      expect(screen.getByText('1 Home Rd')).toBeInTheDocument();
      expect(screen.getByText('10115 Berlin, BE')).toBeInTheDocument();
      expect(screen.getByText('Alex Work')).toBeInTheDocument();
      expect(screen.getAllByText('Default')).toHaveLength(1);
    });

    it('shows an empty state when there are no saved addresses', async () => {
      (api.getAddresses as any).mockResolvedValue([]);
      renderAccount();

      expect(await screen.findByText(/no saved addresses yet/i)).toBeInTheDocument();
    });

    it('shows an error when the addresses cannot be loaded', async () => {
      (api.getAddresses as any).mockRejectedValue(new Error('boom'));
      renderAccount();

      expect(await screen.findByRole('alert')).toHaveTextContent(/could not load your addresses/i);
    });

    it('edits an address and shows the saved values', async () => {
      (api.updateAddress as any).mockResolvedValue({ ...addresses[1], street: '9 New Street', city: 'Lyon' });
      renderAccount();

      fireEvent.click(await screen.findByRole('button', { name: 'Edit address Alex Work' }));
      const form = screen.getByRole('form', { name: 'Edit address' });
      fireEvent.change(within(form).getByLabelText(/Street address/), { target: { value: '9 New Street' } });
      fireEvent.change(within(form).getByLabelText(/City/), { target: { value: 'Lyon' } });
      fireEvent.click(within(form).getByRole('button', { name: 'Save address' }));

      await waitFor(() => expect(screen.getByText('9 New Street')).toBeInTheDocument());
      expect(api.updateAddress).toHaveBeenCalledWith(
        'a2',
        expect.objectContaining({ street: '9 New Street', city: 'Lyon', zipCode: '75001', country: 'France' }),
      );
      expect(screen.queryByRole('form', { name: 'Edit address' })).not.toBeInTheDocument();
      expect(screen.getByText('75001 Lyon, IDF')).toBeInTheDocument();
    });

    it('moves the Default badge when another address is made the default', async () => {
      (api.updateAddress as any).mockResolvedValue({ ...addresses[1], isDefault: true });
      renderAccount();

      fireEvent.click(await screen.findByRole('button', { name: 'Edit address Alex Work' }));
      fireEvent.click(screen.getByLabelText(/Use as my default address/));
      fireEvent.click(screen.getByRole('button', { name: 'Save address' }));

      await waitFor(() => expect(screen.queryByRole('form', { name: 'Edit address' })).not.toBeInTheDocument());
      const badges = screen.getAllByText('Default');
      expect(badges).toHaveLength(1);
      expect(badges[0].closest('li')).toHaveTextContent('Alex Work');
    });

    it('does not save when a required field is empty', async () => {
      renderAccount();

      fireEvent.click(await screen.findByRole('button', { name: 'Edit address Alex Home' }));
      fireEvent.change(screen.getByLabelText(/Street address/), { target: { value: '  ' } });
      fireEvent.click(screen.getByRole('button', { name: 'Save address' }));

      expect(screen.getByRole('alert')).toHaveTextContent(/fill in all required fields/i);
      expect(api.updateAddress).not.toHaveBeenCalled();
    });

    it('keeps the form open and shows the error when saving fails', async () => {
      (api.updateAddress as any).mockRejectedValue(new Error('Address with ID a1 not found'));
      renderAccount();

      fireEvent.click(await screen.findByRole('button', { name: 'Edit address Alex Home' }));
      fireEvent.click(screen.getByRole('button', { name: 'Save address' }));

      expect(await screen.findByRole('alert')).toHaveTextContent('Address with ID a1 not found');
      expect(screen.getByRole('form', { name: 'Edit address' })).toBeInTheDocument();
    });

    it('discards the changes when editing is cancelled', async () => {
      renderAccount();

      fireEvent.click(await screen.findByRole('button', { name: 'Edit address Alex Home' }));
      fireEvent.change(screen.getByLabelText(/Street address/), { target: { value: 'Somewhere else' } });
      fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

      expect(screen.getByText('1 Home Rd')).toBeInTheDocument();
      expect(screen.queryByText('Somewhere else')).not.toBeInTheDocument();
      expect(api.updateAddress).not.toHaveBeenCalled();
    });
  });
});
