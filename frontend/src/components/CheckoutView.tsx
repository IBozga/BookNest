import React, { useState, useEffect } from 'react';
import { CartResponse, User, OrderConfirmation, Address, CheckoutCalculation } from '../types';
import { api } from '../services/api';
import { CurrencyCode, formatCurrency, EUROPEAN_COUNTRIES } from '../utils/currency';
import { Check, Lock, ArrowRight, ArrowLeft, Wallet } from 'lucide-react';
import { LoadingSpinner } from './LoadingSpinner';
import { FALLBACK_COVER } from '../utils/constants';

interface CheckoutViewProps {
  cart: CartResponse | null;
  user: User | null;
  redeemPoints: number;
  couponCode?: string;
  onOrderCompleted: (confirmation: OrderConfirmation) => void;
  onBackToCart: () => void;
  currency?: CurrencyCode;
}

type PaymentMethodOption = 'credit' | 'sepa' | 'ideal' | 'sofort' | 'bancontact' | 'paypal' | 'apple';

/** Validates an email address format. */
function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

/** Validates a basic card number (digits + spaces, 13–19 chars). */
function isValidCardNumber(num: string): boolean {
  const digits = num.replace(/\s/g, '');
  return /^\d{13,19}$/.test(digits);
}

/** Sentinel for "the form holds a new address that is not saved yet". */
const NEW_ADDRESS = 'new';

export const CheckoutView: React.FC<CheckoutViewProps> = ({
  cart,
  user,
  redeemPoints,
  couponCode = '',
  onOrderCompleted,
  onBackToCart,
  currency = 'EUR',
}) => {
  const [step, setStep] = useState<'shipping' | 'payment'>('shipping');
  const [addresses, setAddresses] = useState<Address[]>([]);
  /** Id of the saved address the form is filled from, or NEW_ADDRESS when the user typed their own. */
  const [selectedAddressId, setSelectedAddressId] = useState<string>(NEW_ADDRESS);

  // Shipping Form State (Screen 07)
  const [fullName, setFullName] = useState(user?.name || 'Alex Reed');
  const [email, setEmail] = useState(user?.email || 'alex.reed@example.com');
  const [address, setAddress] = useState('123 Maple Street');
  const [city, setCity] = useState('Frankfurt');
  const [state, setState] = useState('HE');
  const [zipCode, setZipCode] = useState('60311');
  const [country, setCountry] = useState('Germany');
  const [phoneNumber, setPhoneNumber] = useState('+49 151 555 0123');
  const [saveInfo, setSaveInfo] = useState(true);

  // Payment Form State (Screen 08)
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethodOption>('credit');
  const [cardNumber, setCardNumber] = useState('1234 5678 9012 3456');
  const [expiryDate, setExpiryDate] = useState('12 / 28');
  const [cvc, setCvc] = useState('123');
  const [cardHolder, setCardHolder] = useState(user?.name || 'Alex Reed');

  // European Bank details (SEPA / iDEAL / Sofort / Bancontact)
  const [iban, setIban] = useState('DE89 3704 0044 0532 0130 00');
  const [bic, setBic] = useState('DBEEDDFDXXX');
  const [bankName, setBankName] = useState('Deutsche Bank');

  const [isProcessing, setIsProcessing] = useState(false);
  const [isValidatingShipping, setIsValidatingShipping] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Wallet and server-side price breakdown
  const [useWallet, setUseWallet] = useState(false);
  const [calculation, setCalculation] = useState<CheckoutCalculation | null>(null);
  const walletBalance = Number(user?.walletBalance ?? 0);

  const applySavedAddress = (saved: Address) => {
    setFullName(saved.fullName || user?.name || 'Alex Reed');
    setAddress(saved.street || '123 Maple Street');
    setCity(saved.city || 'Frankfurt');
    setState(saved.state || 'HE');
    setZipCode(saved.zipCode || '60311');
    if (saved.country) setCountry(saved.country);
    setSelectedAddressId(saved.id);
  };

  useEffect(() => {
    api.getAddresses().then((res) => {
      setAddresses(res);
      if (res.length > 0) {
        applySavedAddress(res.find((a) => a.isDefault) || res[0]);
      }
    }).catch(() => {});
  }, [user]);

  /** Editing any address field means the form no longer matches a saved address. */
  const editAddressField = (setter: (value: string) => void) => (e: { target: { value: string } }) => {
    setter(e.target.value);
    setSelectedAddressId(NEW_ADDRESS);
  };

  // The backend is the single source of truth for shipping, tax, coupon and wallet amounts.
  useEffect(() => {
    let cancelled = false;
    Promise.resolve()
      .then(() => api.calculateCheckout(redeemPoints, couponCode || undefined, useWallet))
      .then((res) => {
        if (!cancelled) setCalculation(res);
      })
      .catch(() => {
        if (!cancelled) setCalculation(null);
      });
    return () => {
      cancelled = true;
    };
  }, [redeemPoints, couponCode, useWallet, cart]);

  const items = cart?.items || [];
  const subtotal = cart?.subtotal || 0;
  const fallbackDiscount = Number((redeemPoints * 0.01).toFixed(2));
  const discountAmount = calculation?.discountAmount ?? fallbackDiscount;
  const shippingAmount = calculation?.shippingAmount ?? 0;
  const taxAmount = calculation?.taxAmount ?? 0;
  const walletApplied = calculation?.walletApplied ?? 0;
  const orderTotal = calculation?.finalTotal ?? Math.max(0, Number((subtotal - fallbackDiscount).toFixed(2)));
  const finalTotal = calculation?.amountDue ?? orderTotal;

  const handleProceedToPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !address.trim() || !city.trim() || !zipCode.trim()) {
      setErrorMsg('Please fill in all required shipping fields.');
      return;
    }
    if (!isValidEmail(email)) {
      setErrorMsg('Please enter a valid email address.');
      return;
    }
    setErrorMsg(null);
    setIsValidatingShipping(true);
    await new Promise((resolve) => setTimeout(resolve, 700));
    setIsValidatingShipping(false);
    setStep('payment');
  };

  const handlePaySecurely = async () => {
    if (paymentMethod === 'credit' && !isValidCardNumber(cardNumber)) {
      setErrorMsg('Please enter a valid card number (13–19 digits).');
      return;
    }
    setIsProcessing(true);
    setErrorMsg(null);

    try {
      // Use the selected saved address, otherwise save what was typed in the form
      let addressId = selectedAddressId !== NEW_ADDRESS ? selectedAddressId : undefined;
      if (!addressId) {
        const newAddr = await api.createAddress({
          fullName,
          street: address,
          city,
          state,
          zipCode,
          country,
          isDefault: true,
        });
        addressId = newAddr.id;
      }

      let backendPaymentMethod = 'CREDIT_CARD';
      if (paymentMethod === 'paypal') backendPaymentMethod = 'PAYPAL';
      else if (paymentMethod === 'apple') backendPaymentMethod = 'APPLE_PAY';
      else if (paymentMethod === 'sepa') backendPaymentMethod = 'SEPA_DIRECT_DEBIT';
      else if (paymentMethod === 'ideal') backendPaymentMethod = 'IDEAL';
      else if (paymentMethod === 'sofort') backendPaymentMethod = 'SOFORT';
      else if (paymentMethod === 'bancontact') backendPaymentMethod = 'BANCONTACT';

      const confirmation = await api.processOrder({
        addressId,
        paymentMethod: backendPaymentMethod as any,
        email: email.trim(),
        redeemPoints,
        couponCode: couponCode || undefined,
        useWallet,
        paymentDetails: {
          cardNumber,
          cardHolder,
          expiryDate,
          cvv: cvc,
          iban,
          bic,
          bankName,
        },
      });

      onOrderCompleted(confirmation);
    } catch (err: any) {
      setErrorMsg(err.message || 'Payment processing failed. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto my-8 space-y-8">
      {/* 3-Step Stepper Header */}
      <div className="flex items-center justify-center gap-4 sm:gap-12 pb-6 border-b border-stone-200">
        <div className="flex items-center gap-2">
          <span
            className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
              step === 'shipping'
                ? 'bg-stone-900 text-white'
                : 'bg-emerald-700 text-white'
            }`}
          >
            {step === 'payment' ? <Check className="w-3.5 h-3.5" aria-hidden="true" /> : '1'}
          </span>
          <span
            className={`text-xs font-semibold ${
              step === 'shipping' ? 'text-stone-900' : 'text-stone-600'
            }`}
          >
            Shipping
          </span>
        </div>

        <div className="w-12 sm:w-20 h-px bg-stone-200" aria-hidden="true" />

        <div className="flex items-center gap-2">
          <span
            className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
              step === 'payment'
                ? 'bg-stone-900 text-white'
                : 'bg-stone-200 text-stone-700'
            }`}
          >
            2
          </span>
          <span
            className={`text-xs font-semibold ${
              step === 'payment' ? 'text-stone-900' : 'text-stone-600'
            }`}
          >
            Payment
          </span>
        </div>

        <div className="w-12 sm:w-20 h-px bg-stone-200" aria-hidden="true" />

        <div className="flex items-center gap-2">
          <span className="w-6 h-6 rounded-full bg-stone-200 text-stone-700 flex items-center justify-center text-xs font-bold">
            3
          </span>
          <span className="text-xs font-semibold text-stone-600">Confirmation</span>
        </div>
      </div>

      {errorMsg && (
        <div
          role="alert"
          className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs font-semibold"
        >
          {errorMsg}
        </div>
      )}

      {/* Main Form & Order Summary Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Form: Shipping or Payment */}
        <div className="lg:col-span-8 bg-white rounded-3xl border border-stone-200 p-6 sm:p-8 space-y-6">
          {/* STEP 1: SHIPPING INFORMATION (Screen 07) */}
          {step === 'shipping' && (
            <form onSubmit={handleProceedToPayment} className="space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-stone-100">
                <h2 className="text-xl font-serif font-semibold text-stone-900">
                  Shipping Information
                </h2>
                <button
                  type="button"
                  onClick={onBackToCart}
                  className="text-xs text-stone-600 hover:text-stone-900 flex items-center gap-1 font-semibold focus:outline-none focus:ring-1 focus:ring-stone-900 rounded-md p-1"
                >
                  <ArrowLeft className="w-3 h-3" aria-hidden="true" />
                  <span>Back to cart</span>
                </button>
              </div>

              <div className="space-y-4 text-xs font-medium text-stone-800">
                {addresses.length > 0 && (
                  <fieldset className="space-y-2">
                    <legend className="mb-1 font-semibold text-stone-800">Delivery address</legend>
                    <div className="space-y-2" role="radiogroup" aria-label="Saved delivery addresses">
                      {addresses.map((saved) => (
                        <label
                          key={saved.id}
                          className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                            selectedAddressId === saved.id
                              ? 'border-stone-900 bg-stone-50'
                              : 'border-stone-200 hover:border-stone-400'
                          }`}
                        >
                          <input
                            type="radio"
                            name="saved_address"
                            checked={selectedAddressId === saved.id}
                            onChange={() => applySavedAddress(saved)}
                            className="mt-0.5 text-stone-900 focus:ring-stone-900 w-4 h-4 cursor-pointer"
                          />
                          <span>
                            <span className="block font-semibold text-stone-900">
                              {saved.fullName}
                              {saved.isDefault && (
                                <span className="ml-2 px-1.5 py-0.5 rounded bg-stone-200 text-[10px] font-bold">
                                  Default
                                </span>
                              )}
                            </span>
                            <span className="block text-stone-600">
                              {saved.street}, {saved.zipCode} {saved.city}, {saved.country}
                            </span>
                          </span>
                        </label>
                      ))}
                      <label
                        className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                          selectedAddressId === NEW_ADDRESS
                            ? 'border-stone-900 bg-stone-50'
                            : 'border-stone-200 hover:border-stone-400'
                        }`}
                      >
                        <input
                          type="radio"
                          name="saved_address"
                          checked={selectedAddressId === NEW_ADDRESS}
                          onChange={() => setSelectedAddressId(NEW_ADDRESS)}
                          className="text-stone-900 focus:ring-stone-900 w-4 h-4 cursor-pointer"
                        />
                        <span className="font-semibold text-stone-900">Use a different address</span>
                      </label>
                    </div>
                  </fieldset>
                )}

                <div>
                  <label htmlFor="shipping-full-name" className="block mb-1 font-semibold text-stone-800">
                    Full name *
                  </label>
                  <input
                    id="shipping-full-name"
                    type="text"
                    required
                    value={fullName}
                    onChange={editAddressField(setFullName)}
                    className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-stone-900 text-stone-900 text-xs"
                  />
                </div>

                <div>
                  <label htmlFor="shipping-email" className="block mb-1 font-semibold text-stone-800">
                    Email address *
                  </label>
                  <input
                    id="shipping-email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-stone-900 text-stone-900 text-xs"
                  />
                </div>

                <div>
                  <label htmlFor="shipping-address" className="block mb-1 font-semibold text-stone-800">
                    Street address *
                  </label>
                  <input
                    id="shipping-address"
                    type="text"
                    required
                    value={address}
                    onChange={editAddressField(setAddress)}
                    className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-stone-900 text-stone-900 text-xs"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="shipping-city" className="block mb-1 font-semibold text-stone-800">
                      City *
                    </label>
                    <input
                      id="shipping-city"
                      type="text"
                      required
                      value={city}
                      onChange={editAddressField(setCity)}
                      className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-stone-900 text-stone-900 text-xs"
                    />
                  </div>
                  <div>
                    <label htmlFor="shipping-zip" className="block mb-1 font-semibold text-stone-800">
                      Postal / ZIP code *
                    </label>
                    <input
                      id="shipping-zip"
                      type="text"
                      required
                      value={zipCode}
                      onChange={editAddressField(setZipCode)}
                      className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-stone-900 text-stone-900 text-xs"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="shipping-country" className="block mb-1 font-semibold text-stone-800">
                      Country *
                    </label>
                    <select
                      id="shipping-country"
                      value={country}
                      onChange={editAddressField(setCountry)}
                      className="w-full px-3 py-2.5 bg-stone-50 border border-stone-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-stone-900 text-stone-900 text-xs"
                    >
                      {EUROPEAN_COUNTRIES.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label htmlFor="shipping-phone" className="block mb-1 font-semibold text-stone-800">
                      Phone number
                    </label>
                    <input
                      id="shipping-phone"
                      type="tel"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-stone-900 text-stone-900 text-xs"
                    />
                  </div>
                </div>

                <label className="flex items-center gap-2 pt-1 text-stone-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={saveInfo}
                    onChange={(e) => setSaveInfo(e.target.checked)}
                    className="rounded text-stone-900 focus:ring-stone-900 w-4 h-4"
                  />
                  <span>Save this shipping information for future orders</span>
                </label>
              </div>

              <div className="pt-4 border-t border-stone-200">
                <button
                  type="submit"
                  disabled={isValidatingShipping}
                  className="w-full py-3.5 rounded-xl bg-stone-900 hover:bg-stone-800 text-white font-semibold text-xs tracking-wide flex items-center justify-center gap-2 shadow-md transition-all hover:translate-y-[-1px] focus:outline-none focus:ring-2 focus:ring-stone-900 disabled:opacity-70 disabled:cursor-wait"
                >
                  {isValidatingShipping ? (
                    <>
                      <LoadingSpinner size="sm" />
                      <span>Validating…</span>
                    </>
                  ) : (
                    <>
                      <span>Continue to Payment</span>
                      <ArrowRight className="w-4 h-4" aria-hidden="true" />
                    </>
                  )}
                </button>
              </div>
            </form>
          )}

          {/* STEP 2: PAYMENT METHOD (Screen 08 - European & Global Gateways) */}
          {step === 'payment' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between pb-3 border-b border-stone-100">
                <h2 className="text-xl font-serif font-semibold text-stone-900">
                  Select Payment Method
                </h2>
                <button
                  type="button"
                  onClick={() => setStep('shipping')}
                  className="text-xs text-stone-600 hover:text-stone-900 flex items-center gap-1 font-semibold focus:outline-none focus:ring-1 focus:ring-stone-900 rounded-md p-1"
                >
                  <ArrowLeft className="w-3 h-3" aria-hidden="true" />
                  <span>Back to shipping</span>
                </button>
              </div>

              {/* Payment Method Radio Options */}
              <div className="space-y-2.5" role="radiogroup" aria-label="Payment method selection">
                {/* 1. Credit / Debit Card Option */}
                <div
                  className={`p-4 rounded-2xl border transition-all ${
                    paymentMethod === 'credit'
                      ? 'border-stone-900 bg-stone-50/80 shadow-2xs'
                      : 'border-stone-200 hover:border-stone-400'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <label htmlFor="pay-method-credit" className="flex items-center gap-3 text-xs font-semibold text-stone-900 cursor-pointer">
                      <input
                        id="pay-method-credit"
                        type="radio"
                        name="payment_method"
                        checked={paymentMethod === 'credit'}
                        onChange={() => setPaymentMethod('credit')}
                        className="text-stone-900 focus:ring-stone-900 w-4 h-4 cursor-pointer"
                      />
                      <span>Credit or debit card</span>
                    </label>

                    <div className="flex items-center gap-1 text-[10px] font-bold text-stone-600" aria-label="Accepted cards: VISA, Mastercard, AMEX">
                      <span className="px-1.5 py-0.5 rounded bg-blue-100 text-blue-900">VISA</span>
                      <span className="px-1.5 py-0.5 rounded bg-red-100 text-red-900">Mastercard</span>
                      <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-900">AMEX</span>
                    </div>
                  </div>

                  {paymentMethod === 'credit' && (
                    <div className="mt-4 pt-4 border-t border-stone-200 space-y-3 text-xs font-medium text-stone-800">
                      <div>
                        <label htmlFor="card-number" className="block mb-1 font-semibold">
                          Card number *
                        </label>
                        <input
                          id="card-number"
                          type="text"
                          value={cardNumber}
                          onChange={(e) => setCardNumber(e.target.value)}
                          className="w-full px-3.5 py-2.5 bg-white border border-stone-300 rounded-xl text-stone-900 font-mono text-xs focus:outline-none focus:ring-2 focus:ring-stone-900"
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label htmlFor="card-expiry" className="block mb-1 font-semibold">
                            Expiry date *
                          </label>
                          <input
                            id="card-expiry"
                            type="text"
                            placeholder="MM / YY"
                            value={expiryDate}
                            onChange={(e) => setExpiryDate(e.target.value)}
                            className="w-full px-3.5 py-2.5 bg-white border border-stone-300 rounded-xl text-stone-900 text-xs focus:outline-none focus:ring-2 focus:ring-stone-900"
                          />
                        </div>
                        <div>
                          <label htmlFor="card-cvc" className="block mb-1 font-semibold">
                            CVC / CVV *
                          </label>
                          <input
                            id="card-cvc"
                            type="text"
                            placeholder="123"
                            value={cvc}
                            onChange={(e) => setCvc(e.target.value)}
                            className="w-full px-3.5 py-2.5 bg-white border border-stone-300 rounded-xl text-stone-900 text-xs focus:outline-none focus:ring-2 focus:ring-stone-900"
                          />
                        </div>
                      </div>

                      <div>
                        <label htmlFor="card-holder" className="block mb-1 font-semibold">
                          Cardholder name *
                        </label>
                        <input
                          id="card-holder"
                          type="text"
                          value={cardHolder}
                          onChange={(e) => setCardHolder(e.target.value)}
                          className="w-full px-3.5 py-2.5 bg-white border border-stone-300 rounded-xl text-stone-900 text-xs focus:outline-none focus:ring-2 focus:ring-stone-900"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* 2. SEPA Direct Debit (European Standard) */}
                <div
                  className={`p-4 rounded-2xl border transition-all ${
                    paymentMethod === 'sepa'
                      ? 'border-stone-900 bg-stone-50/80 shadow-2xs'
                      : 'border-stone-200 hover:border-stone-400'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <label htmlFor="pay-method-sepa" className="flex items-center gap-3 text-xs font-semibold text-stone-900 cursor-pointer">
                      <input
                        id="pay-method-sepa"
                        type="radio"
                        name="payment_method"
                        checked={paymentMethod === 'sepa'}
                        onChange={() => setPaymentMethod('sepa')}
                        className="text-stone-900 focus:ring-stone-900 w-4 h-4 cursor-pointer"
                      />
                      <span>SEPA Direct Debit (EU)</span>
                    </label>
                    <span className="px-2 py-0.5 rounded bg-sky-100 text-sky-900 text-[10px] font-bold">SEPA</span>
                  </div>

                  {paymentMethod === 'sepa' && (
                    <div className="mt-4 pt-4 border-t border-stone-200 space-y-3 text-xs font-medium text-stone-800">
                      <div>
                        <label htmlFor="sepa-iban" className="block mb-1 font-semibold">
                          IBAN *
                        </label>
                        <input
                          id="sepa-iban"
                          type="text"
                          value={iban}
                          onChange={(e) => setIban(e.target.value)}
                          className="w-full px-3.5 py-2.5 bg-white border border-stone-300 rounded-xl text-stone-900 font-mono text-xs focus:outline-none focus:ring-2 focus:ring-stone-900"
                          placeholder="DE89 3704 0044 0532 0130 00"
                        />
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label htmlFor="sepa-bic" className="block mb-1 font-semibold">
                            BIC / Swift
                          </label>
                          <input
                            id="sepa-bic"
                            type="text"
                            value={bic}
                            onChange={(e) => setBic(e.target.value)}
                            className="w-full px-3.5 py-2.5 bg-white border border-stone-300 rounded-xl text-stone-900 font-mono text-xs focus:outline-none focus:ring-2 focus:ring-stone-900"
                          />
                        </div>
                        <div>
                          <label htmlFor="sepa-bank" className="block mb-1 font-semibold">
                            Bank Name
                          </label>
                          <input
                            id="sepa-bank"
                            type="text"
                            value={bankName}
                            onChange={(e) => setBankName(e.target.value)}
                            className="w-full px-3.5 py-2.5 bg-white border border-stone-300 rounded-xl text-stone-900 text-xs focus:outline-none focus:ring-2 focus:ring-stone-900"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* 3. iDEAL (Netherlands) */}
                <div
                  className={`p-4 rounded-2xl border transition-all ${
                    paymentMethod === 'ideal'
                      ? 'border-stone-900 bg-stone-50/80 shadow-2xs'
                      : 'border-stone-200 hover:border-stone-400'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <label htmlFor="pay-method-ideal" className="flex items-center gap-3 text-xs font-semibold text-stone-900 cursor-pointer">
                      <input
                        id="pay-method-ideal"
                        type="radio"
                        name="payment_method"
                        checked={paymentMethod === 'ideal'}
                        onChange={() => setPaymentMethod('ideal')}
                        className="text-stone-900 focus:ring-stone-900 w-4 h-4 cursor-pointer"
                      />
                      <span>iDEAL (Netherlands)</span>
                    </label>
                    <span className="px-2 py-0.5 rounded bg-pink-100 text-pink-900 text-[10px] font-bold">iDEAL</span>
                  </div>
                </div>

                {/* 4. Sofort / Klarna */}
                <div
                  className={`p-4 rounded-2xl border transition-all ${
                    paymentMethod === 'sofort'
                      ? 'border-stone-900 bg-stone-50/80 shadow-2xs'
                      : 'border-stone-200 hover:border-stone-400'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <label htmlFor="pay-method-sofort" className="flex items-center gap-3 text-xs font-semibold text-stone-900 cursor-pointer">
                      <input
                        id="pay-method-sofort"
                        type="radio"
                        name="payment_method"
                        checked={paymentMethod === 'sofort'}
                        onChange={() => setPaymentMethod('sofort')}
                        className="text-stone-900 focus:ring-stone-900 w-4 h-4 cursor-pointer"
                      />
                      <span>Sofort / Klarna Banking (DACH)</span>
                    </label>
                    <span className="px-2 py-0.5 rounded bg-rose-100 text-rose-900 text-[10px] font-bold">SOFORT</span>
                  </div>
                </div>

                {/* 5. PayPal Option */}
                <div
                  className={`p-4 rounded-2xl border transition-all ${
                    paymentMethod === 'paypal'
                      ? 'border-stone-900 bg-stone-50/80 shadow-2xs'
                      : 'border-stone-200 hover:border-stone-400'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <label htmlFor="pay-method-paypal" className="flex items-center gap-3 text-xs font-semibold text-stone-900 cursor-pointer">
                      <input
                        id="pay-method-paypal"
                        type="radio"
                        name="payment_method"
                        checked={paymentMethod === 'paypal'}
                        onChange={() => setPaymentMethod('paypal')}
                        className="text-stone-900 focus:ring-stone-900 w-4 h-4 cursor-pointer"
                      />
                      <span>PayPal</span>
                    </label>
                    <span className="text-xs font-bold text-blue-800">PayPal</span>
                  </div>
                </div>

                {/* 6. Apple Pay Option */}
                <div
                  className={`p-4 rounded-2xl border transition-all ${
                    paymentMethod === 'apple'
                      ? 'border-stone-900 bg-stone-50/80 shadow-2xs'
                      : 'border-stone-200 hover:border-stone-400'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <label htmlFor="pay-method-apple" className="flex items-center gap-3 text-xs font-semibold text-stone-900 cursor-pointer">
                      <input
                        id="pay-method-apple"
                        type="radio"
                        name="payment_method"
                        checked={paymentMethod === 'apple'}
                        onChange={() => setPaymentMethod('apple')}
                        className="text-stone-900 focus:ring-stone-900 w-4 h-4 cursor-pointer"
                      />
                      <span>Apple Pay</span>
                    </label>
                    <span className="text-xs font-bold text-stone-900"> Pay</span>
                  </div>
                </div>

                {/* 5b. Bancontact (Belgium) */}
                <div
                  className={`p-4 rounded-2xl border transition-all ${
                    paymentMethod === 'bancontact'
                      ? 'border-stone-900 bg-stone-50/80 shadow-2xs'
                      : 'border-stone-200 hover:border-stone-400'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <label htmlFor="pay-method-bancontact" className="flex items-center gap-3 text-xs font-semibold text-stone-900 cursor-pointer">
                      <input
                        id="pay-method-bancontact"
                        type="radio"
                        name="payment_method"
                        checked={paymentMethod === 'bancontact'}
                        onChange={() => setPaymentMethod('bancontact')}
                        className="text-stone-900 focus:ring-stone-900 w-4 h-4 cursor-pointer"
                      />
                      <span>Bancontact (Belgium)</span>
                    </label>
                    <span className="px-2 py-0.5 rounded bg-orange-100 text-orange-900 text-[10px] font-bold">Bancontact</span>
                  </div>
                </div>

              </div>

              {/* Pay Securely Button */}
              <div className="pt-4 border-t border-stone-200 space-y-3">
                <button
                  type="button"
                  onClick={handlePaySecurely}
                  disabled={isProcessing}
                  className="w-full py-3.5 rounded-xl bg-stone-900 hover:bg-stone-800 text-white font-semibold text-xs tracking-wide flex items-center justify-center gap-2 shadow-md transition-all hover:translate-y-[-1px] focus:outline-none focus:ring-2 focus:ring-stone-900"
                >
                  {isProcessing ? (
                    <>
                      <LoadingSpinner size="sm" className="border-white/40 border-t-white" />
                      <span>Processing…</span>
                    </>
                  ) : (
                    <>
                      <span>Pay {formatCurrency(finalTotal, currency)}</span>
                      <ArrowRight className="w-4 h-4" aria-hidden="true" />
                    </>
                  )}
                </button>

                <p className="text-[11px] text-stone-600 text-center flex items-center justify-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-stone-700" aria-hidden="true" />
                  <span>Your payment is encrypted with 256-bit TLS security.</span>
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Right: Order Summary Sidebar (Screens 07 & 08) */}
        <div className="lg:col-span-4 bg-white rounded-3xl border border-stone-200 p-6 space-y-5 sticky top-24">
          <h2 className="text-base font-semibold text-stone-900 pb-3 border-b border-stone-100">
            Order Summary
          </h2>

          {/* Mini Items List with Thumbnails */}
          <div className="space-y-3 max-h-60 overflow-y-auto">
            {items.map((item) => (
              <div key={item.id} className="flex items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-9 h-12 rounded-lg bg-stone-100 overflow-hidden shrink-0 border border-stone-200">
                    <img
                      src={item.book?.coverImage || FALLBACK_COVER}
                      alt={`Thumbnail of ${item.book?.title || 'Book'}`}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-stone-900 truncate">{item.book?.title}</p>
                    <p className="text-[10px] text-stone-600">Qty: {item.quantity}</p>
                  </div>
                </div>
                <span className="font-bold text-stone-900 shrink-0">
                  {formatCurrency(Number(item.book?.price || 0) * item.quantity, currency)}
                </span>
              </div>
            ))}
          </div>

          <div className="pt-3 border-t border-stone-200 space-y-2 text-xs text-stone-700">
            <div className="flex justify-between">
              <span>Subtotal</span>
              <span className="font-medium text-stone-900">{formatCurrency(subtotal, currency)}</span>
            </div>

            {discountAmount > 0 && (
              <div className="flex justify-between text-emerald-800 font-semibold">
                <span>Discount{couponCode ? ` (${couponCode})` : ''}</span>
                <span>-{formatCurrency(discountAmount, currency)}</span>
              </div>
            )}

            <div className="flex justify-between">
              <span>Shipping</span>
              <span className="font-medium text-stone-900">
                {shippingAmount > 0 ? formatCurrency(shippingAmount, currency) : 'Free'}
              </span>
            </div>

            <div className="flex justify-between">
              <span>Tax</span>
              <span className="font-medium text-stone-900">{formatCurrency(taxAmount, currency)}</span>
            </div>

            {walletBalance > 0 && (
              <label className="flex items-center justify-between gap-2 pt-1 cursor-pointer">
                <span className="flex items-center gap-1.5 font-semibold text-stone-900">
                  <Wallet className="w-3.5 h-3.5 text-stone-700" aria-hidden="true" />
                  Pay with wallet ({formatCurrency(walletBalance, currency)})
                </span>
                <input
                  type="checkbox"
                  checked={useWallet}
                  onChange={(e) => setUseWallet(e.target.checked)}
                  aria-label="Pay with wallet balance"
                  className="rounded text-stone-900 focus:ring-stone-900 w-4 h-4"
                />
              </label>
            )}

            {walletApplied > 0 && (
              <div className="flex justify-between text-emerald-800 font-semibold">
                <span>Wallet</span>
                <span>-{formatCurrency(walletApplied, currency)}</span>
              </div>
            )}

            <div className="pt-3 border-t border-stone-200 flex justify-between items-baseline">
              <span className="text-sm font-bold text-stone-900">Total</span>
              <span className="text-2xl font-bold text-stone-900">
                {formatCurrency(finalTotal, currency)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
