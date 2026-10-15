import React, { useEffect, useState } from 'react';
import { Address, CartResponse, User } from '../types';
import { api } from '../services/api';
import { EUROPEAN_COUNTRIES, formatCurrency } from '../utils/currency';
import { MapPin, Pencil, Wallet } from 'lucide-react';
import { LoadingSpinner } from './LoadingSpinner';
import { OrderHistoryView } from './OrderHistoryView';

export type AccountTab = 'addresses' | 'orders';

interface AccountViewProps {
  user: User;
  tab: AccountTab;
  onTabChange: (tab: AccountTab) => void;
  onBuyAgainSuccess: (cart: CartResponse, message: string) => void;
  onExploreCatalogue: () => void;
}

type AddressForm = Pick<Address, 'fullName' | 'street' | 'city' | 'state' | 'zipCode' | 'country' | 'isDefault'>;

const inputClass =
  'w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-stone-900 text-stone-900 text-xs';

const toForm = (a: Address): AddressForm => ({
  fullName: a.fullName,
  street: a.street,
  city: a.city,
  state: a.state,
  zipCode: a.zipCode,
  country: a.country,
  isDefault: a.isDefault,
});

const AddressCard: React.FC<{ address: Address; onSaved: (saved: Address) => void }> = ({ address, onSaved }) => {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<AddressForm>(toForm(address));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const field = (name: keyof AddressForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((prev) => ({ ...prev, [name]: e.target.value }));

  const startEditing = () => {
    setForm(toForm(address));
    setError(null);
    setEditing(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const required: (keyof AddressForm)[] = ['fullName', 'street', 'city', 'state', 'zipCode'];
    if (required.some((name) => !String(form[name]).trim())) {
      setError('Please fill in all required fields.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const saved = await api.updateAddress(address.id, form);
      onSaved(saved);
      setEditing(false);
    } catch (err: any) {
      setError(err.message || 'Could not save the address. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (!editing) {
    return (
      <li className="bg-white rounded-3xl border border-stone-200 p-5 space-y-1 text-xs text-stone-700">
        <div className="flex items-center justify-between gap-2">
          <span className="font-semibold text-stone-900 text-sm">{address.fullName}</span>
          <div className="flex items-center gap-2">
            {address.isDefault && (
              <span className="px-2 py-0.5 rounded-full bg-stone-200 text-stone-800 text-[10px] font-bold">Default</span>
            )}
            <button
              type="button"
              onClick={startEditing}
              aria-label={`Edit address ${address.fullName}`}
              className="p-1.5 rounded-full text-stone-600 hover:bg-stone-100 hover:text-stone-900"
            >
              <Pencil className="w-3.5 h-3.5" aria-hidden="true" />
            </button>
          </div>
        </div>
        <p>{address.street}</p>
        <p>
          {address.zipCode} {address.city}
          {address.state ? `, ${address.state}` : ''}
        </p>
        <p>{address.country}</p>
      </li>
    );
  }

  const id = (name: string) => `${name}-${address.id}`;
  const countries = EUROPEAN_COUNTRIES.includes(form.country) ? EUROPEAN_COUNTRIES : [form.country, ...EUROPEAN_COUNTRIES];

  return (
    <li className="bg-white rounded-3xl border border-stone-900 p-5 text-xs font-medium text-stone-800">
      <form onSubmit={handleSave} className="space-y-3" aria-label="Edit address">
        {error && (
          <div role="alert" className="p-2.5 rounded-xl bg-red-50 border border-red-200 text-red-800 font-semibold">
            {error}
          </div>
        )}
        <div>
          <label htmlFor={id('fullName')} className="block mb-1 font-semibold">Full name *</label>
          <input id={id('fullName')} value={form.fullName} onChange={field('fullName')} className={inputClass} />
        </div>
        <div>
          <label htmlFor={id('street')} className="block mb-1 font-semibold">Street address *</label>
          <input id={id('street')} value={form.street} onChange={field('street')} className={inputClass} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor={id('city')} className="block mb-1 font-semibold">City *</label>
            <input id={id('city')} value={form.city} onChange={field('city')} className={inputClass} />
          </div>
          <div>
            <label htmlFor={id('state')} className="block mb-1 font-semibold">State / Region *</label>
            <input id={id('state')} value={form.state} onChange={field('state')} className={inputClass} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor={id('zipCode')} className="block mb-1 font-semibold">Postal / ZIP code *</label>
            <input id={id('zipCode')} value={form.zipCode} onChange={field('zipCode')} className={inputClass} />
          </div>
          <div>
            <label htmlFor={id('country')} className="block mb-1 font-semibold">Country</label>
            <select id={id('country')} value={form.country} onChange={field('country')} className={inputClass}>
              {countries.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
        </div>
        <label className="flex items-center gap-2 text-stone-700 cursor-pointer">
          <input
            type="checkbox"
            checked={form.isDefault}
            onChange={(e) => setForm((prev) => ({ ...prev, isDefault: e.target.checked }))}
            className="rounded text-stone-900 focus:ring-stone-900 w-4 h-4"
          />
          <span>Use as my default address</span>
        </label>
        <div className="flex justify-end gap-2 pt-1">
          <button
            type="button"
            onClick={() => setEditing(false)}
            disabled={saving}
            className="px-4 py-2 rounded-xl border border-stone-300 text-stone-800 font-semibold hover:bg-stone-100 disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 rounded-xl bg-stone-900 text-white font-semibold hover:bg-stone-800 disabled:opacity-60 disabled:cursor-wait"
          >
            {saving ? 'Saving…' : 'Save address'}
          </button>
        </div>
      </form>
    </li>
  );
};

const AddressesTab: React.FC = () => {
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    api
      .getAddresses()
      .then((res) => setAddresses(res))
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  /** Replaces the saved address; only one address can be the default. */
  const handleSaved = (saved: Address) =>
    setAddresses((prev) =>
      prev.map((a) => (a.id === saved.id ? saved : saved.isDefault ? { ...a, isDefault: false } : a)),
    );

  if (loading) {
    return (
      <div className="py-12 flex flex-col items-center gap-3 text-xs text-stone-400">
        <LoadingSpinner size="lg" />
        <span>Loading your addresses…</span>
      </div>
    );
  }
  if (error) {
    return (
      <div role="alert" className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs font-semibold">
        We could not load your addresses. Please try again later.
      </div>
    );
  }
  if (addresses.length === 0) {
    return (
      <div className="py-12 text-center bg-white rounded-3xl border border-stone-200 p-8 space-y-3">
        <div className="w-14 h-14 rounded-full bg-stone-100 text-stone-400 mx-auto flex items-center justify-center">
          <MapPin className="w-7 h-7" aria-hidden="true" />
        </div>
        <p className="text-xs text-stone-500 max-w-sm mx-auto">
          You have no saved addresses yet. An address is saved when you place an order.
        </p>
      </div>
    );
  }
  return (
    <ul className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-start">
      {addresses.map((a) => (
        <AddressCard key={a.id} address={a} onSaved={handleSaved} />
      ))}
    </ul>
  );
};

const WalletCard: React.FC<{ initialBalance: number }> = ({ initialBalance }) => {
  const [balance, setBalance] = useState(initialBalance);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);

  const handleTopUp = async () => {
    setBusy(true);
    setMessage(null);
    try {
      const result = await api.topUpWallet();
      setBalance(Number(result.walletBalance));
      setMessage({ kind: 'ok', text: `Added ${formatCurrency(Number(result.credited), 'EUR')} to your wallet.` });
    } catch (err: any) {
      setMessage({ kind: 'error', text: err.message || 'Could not top up your wallet. Please try again.' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-2xl bg-white border border-stone-200 text-xs">
      <div className="flex items-center gap-2 text-stone-900 font-semibold">
        <Wallet className="w-4 h-4 text-stone-600" aria-hidden="true" />
        <span>Wallet balance</span>
        <span data-testid="wallet-balance" className="font-bold">{formatCurrency(balance, 'EUR')}</span>
      </div>
      <div className="flex items-center gap-3">
        {message && (
          <span
            role={message.kind === 'error' ? 'alert' : 'status'}
            className={message.kind === 'error' ? 'text-red-700 font-semibold' : 'text-emerald-800 font-semibold'}
          >
            {message.text}
          </span>
        )}
        <button
          type="button"
          onClick={handleTopUp}
          disabled={busy}
          className="px-4 py-2 rounded-xl bg-stone-900 text-white font-semibold hover:bg-stone-800 disabled:opacity-60 disabled:cursor-wait"
        >
          {busy ? 'Adding…' : 'Top up wallet'}
        </button>
      </div>
    </div>
  );
};

export const AccountView: React.FC<AccountViewProps> = ({
  user,
  tab,
  onTabChange,
  onBuyAgainSuccess,
  onExploreCatalogue,
}) => (
  <div className="max-w-5xl mx-auto my-8 space-y-6">
    <div className="space-y-1">
      <h1 className="text-3xl font-serif text-stone-900 font-semibold tracking-tight">My Account</h1>
      <p className="text-xs text-stone-500">
        {user.name} · {user.email} · {user.rewardPoints} gift points
      </p>
    </div>

    <WalletCard initialBalance={Number(user.walletBalance ?? 0)} />

    <div role="tablist" aria-label="Account sections" className="flex items-center gap-6 border-b border-stone-200 text-xs font-semibold">
      {(
        [
          { id: 'addresses', label: 'My Addresses' },
          { id: 'orders', label: 'My Orders' },
        ] as { id: AccountTab; label: string }[]
      ).map(({ id, label }) => (
        <button
          key={id}
          type="button"
          role="tab"
          aria-selected={tab === id}
          onClick={() => onTabChange(id)}
          className={`pb-3 transition-colors ${
            tab === id ? 'text-stone-900 border-b-2 border-stone-900 font-bold' : 'text-stone-400 hover:text-stone-700'
          }`}
        >
          {label}
        </button>
      ))}
    </div>

    <div role="tabpanel">
      {tab === 'addresses' ? (
        <AddressesTab />
      ) : (
        <OrderHistoryView onBuyAgainSuccess={onBuyAgainSuccess} onExploreCatalogue={onExploreCatalogue} />
      )}
    </div>
  </div>
);
