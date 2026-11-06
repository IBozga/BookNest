import React, { useEffect, useState } from 'react';
import {
  Address,
  CartResponse,
  User,
  CheckoutCalculation,
  OrderConfirmation,
} from '../types';
import { api } from '../services/api';
import {
  X,
  MapPin,
  Sparkles,
  CreditCard,
  CheckCircle2,
  ShieldCheck,
  Plus,
  ArrowRight,
  Receipt,
} from 'lucide-react';

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User | null;
  cart: CartResponse | null;
  onOrderCompleted: (confirmation: OrderConfirmation) => void;
  onViewOrderHistory: () => void;
}

export const CheckoutModal: React.FC<CheckoutModalProps> = ({
  isOpen,
  onClose,
  user,
  cart,
  onOrderCompleted,
  onViewOrderHistory,
}) => {
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string>('');
  const [showNewAddressForm, setShowNewAddressForm] = useState(false);
  const [newAddress, setNewAddress] = useState({
    fullName: '',
    street: '',
    city: '',
    state: '',
    zipCode: '',
  });

  const [pointsToRedeem, setPointsToRedeem] = useState<number>(0);
  const [calculation, setCalculation] = useState<CheckoutCalculation | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<string>('CREDIT_CARD');
  const [paymentDetails, setPaymentDetails] = useState({
    cardNumber: '4242 •••• •••• 4242',
    cardHolder: user?.name || 'Alex Johnson',
    expiryDate: '12/28',
    cvv: '888',
  });

  const [isProcessing, setIsProcessing] = useState(false);
  const [confirmation, setConfirmation] = useState<OrderConfirmation | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Load addresses & initial calculation
  useEffect(() => {
    if (isOpen) {
      setConfirmation(null);
      setErrorMsg(null);
      setPointsToRedeem(0);

      api.getAddresses().then((res) => {
        setAddresses(res);
        if (res.length > 0) {
          const defaultAddr = res.find((a) => a.isDefault) || res[0];
          setSelectedAddressId(defaultAddr.id);
        }
      });

      api
        .calculateCheckout(0)
        .then((res) => setCalculation(res))
        .catch((err) => setErrorMsg(err.message));
    }
  }, [isOpen, cart?.subtotal]);

  // Recalculate when points change
  const handlePointsChange = (points: number) => {
    const maxUsable = Math.min(
      user?.rewardPoints || 0,
      Math.floor((cart?.subtotal || 0) * 100),
    );
    const sanitized = Math.max(0, Math.min(points, maxUsable));
    setPointsToRedeem(sanitized);

    api
      .calculateCheckout(sanitized)
      .then((res) => setCalculation(res))
      .catch((err) => setErrorMsg(err.message));
  };

  const handleCreateAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const created = await api.createAddress({
        ...newAddress,
        isDefault: addresses.length === 0,
      });
      setAddresses([...addresses, created]);
      setSelectedAddressId(created.id);
      setShowNewAddressForm(false);
      setNewAddress({ fullName: '', street: '', city: '', state: '', zipCode: '' });
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to create address');
    }
  };

  const handleCompletePayment = async () => {
    if (!selectedAddressId) {
      setErrorMsg('Please select or add a delivery address');
      return;
    }

    setIsProcessing(true);
    setErrorMsg(null);

    try {
      const result = await api.processOrder({
        addressId: selectedAddressId,
        paymentMethod,
        redeemPoints: pointsToRedeem,
        paymentDetails,
      });
      setConfirmation(result);
      onOrderCompleted(result);
    } catch (err: any) {
      setErrorMsg(err.message || 'Payment processing failed');
    } finally {
      setIsProcessing(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto animate-fade-in">
      <div className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden my-8 max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                {confirmation ? 'Purchase Confirmed' : 'Payment & Checkout'}
              </h2>
              <p className="text-xs text-slate-500">
                {confirmation
                  ? 'Your order has been placed successfully'
                  : 'Review order, redeem gift points, and complete payment'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            aria-label="Close checkout modal"
            className="p-2 rounded-full hover:bg-slate-200 text-slate-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {errorMsg && (
            <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-medium">
              {errorMsg}
            </div>
          )}

          {/* CONFIRMATION SCREEN */}
          {confirmation ? (
            <div className="py-4 space-y-6 text-center animate-fade-in">
              <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 mx-auto flex items-center justify-center shadow-inner">
                <CheckCircle2 className="w-10 h-10" />
              </div>

              <div className="space-y-1.5">
                <h3 className="text-2xl font-black text-slate-900">
                  Purchase Completed Successfully!
                </h3>
                <p className="text-sm text-slate-600 max-w-md mx-auto">
                  {confirmation.message}
                </p>
              </div>

              {/* Order Receipt Box */}
              <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 text-left space-y-3">
                <div className="flex justify-between items-center pb-2 border-b border-slate-200 text-xs font-semibold text-slate-500">
                  <span>Order Number</span>
                  <span className="font-mono text-blue-700 font-bold">
                    {confirmation.orderNumber}
                  </span>
                </div>

                <div className="space-y-2 text-xs">
                  {confirmation.order?.items?.map((item) => (
                    <div key={item.id} className="flex justify-between text-slate-700">
                      <span className="truncate max-w-[280px]">
                        {item.book?.title} (x{item.quantity})
                      </span>
                      <span className="font-semibold">${Number(item.totalPrice).toFixed(2)}</span>
                    </div>
                  ))}

                  <div className="pt-2 border-t border-slate-200 flex justify-between font-bold text-sm text-slate-900">
                    <span>Total Paid</span>
                    <span>${Number(confirmation.finalAmount).toFixed(2)}</span>
                  </div>
                </div>

                {/* Points Earned & Remaining summary */}
                <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 flex items-center justify-between text-xs font-medium">
                  <div className="flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-amber-600" />
                    <span>Earned +{confirmation.pointsEarned} Gift Points</span>
                  </div>
                  <span className="font-bold">
                    New Balance: {confirmation.remainingPoints} pts
                  </span>
                </div>
              </div>

              {/* Next Steps Buttons */}
              <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                <button
                  onClick={() => {
                    onClose();
                    onViewOrderHistory();
                  }}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-600/20"
                >
                  <Receipt className="w-4 h-4" />
                  <span>View in Order History</span>
                </button>

                <button
                  onClick={onClose}
                  className="px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs"
                >
                  Continue Browsing
                </button>
              </div>
            </div>
          ) : (
            /* CHECKOUT FLOW (Address + Gift Points + Payment Options) */
            <div className="space-y-6">
              {/* 1. Address Selection */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900 uppercase tracking-wider">
                    <MapPin className="w-4 h-4 text-blue-600" />
                    <span>1. Delivery Address</span>
                  </div>

                  {!showNewAddressForm && (
                    <button
                      onClick={() => setShowNewAddressForm(true)}
                      className="text-xs text-blue-600 hover:text-blue-800 font-semibold flex items-center gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add New</span>
                    </button>
                  )}
                </div>

                {showNewAddressForm ? (
                  <form onSubmit={handleCreateAddress} className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3 text-xs">
                    <h4 className="font-bold text-slate-900">New Delivery Address</h4>
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="text"
                        placeholder="Full Name"
                        aria-label="Full name"
                        required
                        value={newAddress.fullName}
                        onChange={(e) => setNewAddress({ ...newAddress, fullName: e.target.value })}
                        className="col-span-2 p-2 rounded-lg border border-slate-300 bg-white"
                      />
                      <input
                        type="text"
                        placeholder="Street Address"
                        aria-label="Street address"
                        required
                        value={newAddress.street}
                        onChange={(e) => setNewAddress({ ...newAddress, street: e.target.value })}
                        className="col-span-2 p-2 rounded-lg border border-slate-300 bg-white"
                      />
                      <input
                        type="text"
                        placeholder="City"
                        aria-label="City"
                        required
                        value={newAddress.city}
                        onChange={(e) => setNewAddress({ ...newAddress, city: e.target.value })}
                        className="p-2 rounded-lg border border-slate-300 bg-white"
                      />
                      <input
                        type="text"
                        placeholder="State"
                        aria-label="State or region"
                        required
                        value={newAddress.state}
                        onChange={(e) => setNewAddress({ ...newAddress, state: e.target.value })}
                        className="p-2 rounded-lg border border-slate-300 bg-white"
                      />
                      <input
                        type="text"
                        placeholder="ZIP Code"
                        aria-label="ZIP or postal code"
                        required
                        value={newAddress.zipCode}
                        onChange={(e) => setNewAddress({ ...newAddress, zipCode: e.target.value })}
                        className="p-2 rounded-lg border border-slate-300 bg-white"
                      />
                    </div>
                    <div className="flex justify-end gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => setShowNewAddressForm(false)}
                        className="px-3 py-1.5 rounded-lg text-slate-600 font-medium"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="px-3 py-1.5 rounded-lg bg-blue-600 text-white font-bold"
                      >
                        Save Address
                      </button>
                    </div>
                  </form>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {addresses.map((addr) => {
                      const isSelected = selectedAddressId === addr.id;
                      return (
                        <div
                          key={addr.id}
                          onClick={() => setSelectedAddressId(addr.id)}
                          className={`p-3 rounded-2xl border cursor-pointer transition-all text-xs flex flex-col justify-between ${
                            isSelected
                              ? 'border-blue-600 bg-blue-50/50 shadow-xs'
                              : 'border-slate-200 bg-white hover:bg-slate-50'
                          }`}
                        >
                          <div>
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-slate-900">{addr.fullName}</span>
                              {addr.isDefault && (
                                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                                  Default
                                </span>
                              )}
                            </div>
                            <p className="text-slate-600 mt-1">{addr.street}</p>
                            <p className="text-slate-500">
                              {addr.city}, {addr.state} {addr.zipCode}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* 2. Gift Points Redemption */}
              <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-amber-900">
                    <Sparkles className="w-4 h-4 text-amber-600 fill-amber-500" />
                    <span>2. Redeem Gift Points (100 pts = $1.00)</span>
                  </div>
                  <span className="text-xs font-bold text-amber-800">
                    Available: {user?.rewardPoints || 0} pts
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    aria-label="Gift points to redeem"
                    min="0"
                    max={Math.min(
                      user?.rewardPoints || 0,
                      Math.floor((cart?.subtotal || 0) * 100),
                    )}
                    step="50"
                    value={pointsToRedeem}
                    onChange={(e) => handlePointsChange(Number(e.target.value))}
                    className="flex-1 accent-amber-600 cursor-pointer"
                  />
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      aria-label="Gift points amount"
                      min="0"
                      max={user?.rewardPoints || 0}
                      value={pointsToRedeem}
                      onChange={(e) => handlePointsChange(Number(e.target.value))}
                      className="w-20 px-2 py-1 text-xs font-bold text-slate-900 border border-amber-300 rounded-lg bg-white text-center"
                    />
                    <span className="text-xs text-amber-800 font-semibold">pts</span>
                  </div>
                </div>

                {pointsToRedeem > 0 && (
                  <p className="text-[11px] font-semibold text-emerald-700">
                    Applied discount: ${(pointsToRedeem * 0.01).toFixed(2)} off your order!
                  </p>
                )}
              </div>

              {/* 3. Payment Method Selection */}
              <div className="space-y-3">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900 uppercase tracking-wider">
                  <CreditCard className="w-4 h-4 text-blue-600" />
                  <span>3. Payment Option</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { id: 'CREDIT_CARD', label: 'Credit Card', icon: '💳' },
                    { id: 'PAYPAL', label: 'PayPal', icon: '🅿️' },
                    { id: 'APPLE_PAY', label: 'Apple Pay', icon: '🍎' },
                    { id: 'GIFT_POINTS_FULL', label: 'Points Only', icon: '🎁' },
                  ].map((method) => {
                    const isSelected = paymentMethod === method.id;
                    return (
                      <button
                        key={method.id}
                        type="button"
                        onClick={() => setPaymentMethod(method.id)}
                        className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                          isSelected
                            ? 'border-blue-600 bg-blue-600 text-white shadow-xs'
                            : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        <span>{method.icon}</span>
                        <span>{method.label}</span>
                      </button>
                    );
                  })}
                </div>

                {paymentMethod === 'CREDIT_CARD' && (
                  <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 grid grid-cols-2 gap-2 text-xs">
                    <input
                      type="text"
                      placeholder="Card Number"
                      aria-label="Card number"
                      value={paymentDetails.cardNumber}
                      onChange={(e) =>
                        setPaymentDetails({ ...paymentDetails, cardNumber: e.target.value })
                      }
                      className="col-span-2 p-2 rounded-lg border border-slate-300 bg-white"
                    />
                    <input
                      type="text"
                      placeholder="Cardholder Name"
                      aria-label="Cardholder name"
                      value={paymentDetails.cardHolder}
                      onChange={(e) =>
                        setPaymentDetails({ ...paymentDetails, cardHolder: e.target.value })
                      }
                      className="p-2 rounded-lg border border-slate-300 bg-white"
                    />
                    <div className="grid grid-cols-2 gap-1">
                      <input
                        type="text"
                        placeholder="MM/YY"
                        aria-label="Card expiry date"
                        value={paymentDetails.expiryDate}
                        onChange={(e) =>
                          setPaymentDetails({ ...paymentDetails, expiryDate: e.target.value })
                        }
                        className="p-2 rounded-lg border border-slate-300 bg-white"
                      />
                      <input
                        type="text"
                        placeholder="CVV"
                        aria-label="Card CVV security code"
                        value={paymentDetails.cvv}
                        onChange={(e) =>
                          setPaymentDetails({ ...paymentDetails, cvv: e.target.value })
                        }
                        className="p-2 rounded-lg border border-slate-300 bg-white"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* 4. Order Summary & Complete Button */}
              {calculation && (
                <div className="p-4 rounded-2xl bg-slate-900 text-white space-y-3">
                  <div className="space-y-1.5 text-xs text-slate-300">
                    <div className="flex justify-between">
                      <span>Subtotal</span>
                      <span>${(calculation.subtotal || 0).toFixed(2)}</span>
                    </div>
                    {(calculation.discountAmount || 0) > 0 && (
                      <div className="flex justify-between text-emerald-400 font-semibold">
                        <span>Gift Points Discount</span>
                        <span>-${(calculation.discountAmount || 0).toFixed(2)}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span>Shipping</span>
                      <span>
                        {!calculation.shippingAmount
                          ? 'FREE'
                          : `$${calculation.shippingAmount.toFixed(2)}`}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Estimated Tax</span>
                      <span>${(calculation.taxAmount || 0).toFixed(2)}</span>
                    </div>
                    <div className="pt-2 border-t border-slate-800 flex justify-between text-sm font-extrabold text-white">
                      <span>Final Total</span>
                      <span>${(calculation.finalTotal || calculation.subtotal || 0).toFixed(2)}</span>
                    </div>
                  </div>

                  <button
                    onClick={handleCompletePayment}
                    disabled={isProcessing}
                    className="w-full py-3 rounded-xl bg-blue-500 hover:bg-blue-400 text-white font-extrabold text-sm shadow-lg shadow-blue-500/20 transition-all flex items-center justify-center gap-2"
                  >
                    {isProcessing ? (
                      <span>Processing Payment securely...</span>
                    ) : (
                      <>
                        <span>Complete Payment (${calculation.finalTotal.toFixed(2)})</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
