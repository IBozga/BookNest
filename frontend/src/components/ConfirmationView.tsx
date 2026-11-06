import React from 'react';
import { OrderConfirmation } from '../types';
import { CurrencyCode, formatCurrency } from '../utils/currency';
import { Check, Download, BookOpen, Share2, ArrowRight } from 'lucide-react';

interface ConfirmationViewProps {
  confirmation: OrderConfirmation;
  onGoToOrders: () => void;
  onContinueShopping: () => void;
  currency?: CurrencyCode;
}

export const ConfirmationView: React.FC<ConfirmationViewProps> = ({
  confirmation,
  onGoToOrders,
  onContinueShopping,
  currency = 'EUR',
}) => {
  const orderDate = new Date(confirmation.order?.createdAt || Date.now()).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <div className="max-w-3xl mx-auto my-8 space-y-10 animate-fade-in">
      {/* 3-Step Stepper Header */}
      <div className="flex items-center justify-center gap-4 sm:gap-12 pb-6 border-b border-stone-200">
        <div className="flex items-center gap-2">
          <span className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xs font-bold">
            <Check className="w-3.5 h-3.5" />
          </span>
          <span className="text-xs font-semibold text-stone-500">Shipping</span>
        </div>

        <div className="w-12 sm:w-20 h-px bg-stone-200" />

        <div className="flex items-center gap-2">
          <span className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xs font-bold">
            <Check className="w-3.5 h-3.5" />
          </span>
          <span className="text-xs font-semibold text-stone-500">Payment</span>
        </div>

        <div className="w-12 sm:w-20 h-px bg-stone-200" />

        <div className="flex items-center gap-2">
          <span className="w-6 h-6 rounded-full bg-stone-900 text-white flex items-center justify-center text-xs font-bold">
            3
          </span>
          <span className="text-xs font-bold text-stone-900">Confirmation</span>
        </div>
      </div>

      {/* Confirmation Content Card */}
      <div className="bg-white rounded-3xl border border-stone-200 p-8 sm:p-12 text-center space-y-6">
        {/* Green Checkmark Circle */}
        <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-700 mx-auto flex items-center justify-center shadow-inner">
          <Check className="w-8 h-8 stroke-[2.5]" />
        </div>

        {/* Headings — message comes from the backend */}
        <div className="space-y-1.5">
          <h1 className="text-2xl sm:text-3xl font-serif font-normal text-stone-900">
            Thank you for your purchase!
          </h1>
          <p className="text-xs text-stone-500">
            {confirmation.message || 'Your order has been confirmed.'}
          </p>
        </div>

        {/* 3-Column Order Summary Box */}
        <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200/80 grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs sm:divide-x divide-stone-200 divide-y sm:divide-y-0">
          <div className="px-2 py-1 sm:py-0">
            <span className="text-stone-400 block font-normal">Order number</span>
            <span className="font-bold text-stone-900 font-mono mt-0.5 block break-all">
              #{confirmation.orderNumber}
            </span>
          </div>

          <div className="px-2 py-1 sm:py-0">
            <span className="text-stone-400 block font-normal">Date</span>
            <span className="font-bold text-stone-900 mt-0.5 block">{orderDate}</span>
          </div>

          <div className="px-2 py-1 sm:py-0">
            <span className="text-stone-400 block font-normal">Total</span>
            <span className="font-bold text-stone-900 mt-0.5 block">
              {formatCurrency(Number(confirmation.finalAmount), currency)}
            </span>
          </div>
        </div>

        {/* Points & wallet summary — shown only when relevant */}
        {(confirmation.pointsEarned > 0 || confirmation.pointsRedeemed > 0 || (confirmation.walletApplied ?? 0) > 0) && (
          <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-xs space-y-1.5 text-left">
            {confirmation.pointsRedeemed > 0 && (
              <p className="text-stone-700">
                <span className="font-semibold">{confirmation.pointsRedeemed} gift points</span> redeemed on this order.
              </p>
            )}
            {(confirmation.walletApplied ?? 0) > 0 && (
              <p className="text-stone-700">
                <span className="font-semibold">{formatCurrency(confirmation.walletApplied!, currency)}</span> applied from your wallet.
              </p>
            )}
            {confirmation.pointsEarned > 0 && (
              <p className="text-emerald-800 font-semibold">
                +{confirmation.pointsEarned} gift points earned — balance now {confirmation.remainingPoints} pts.
              </p>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="space-y-3 pt-2 max-w-sm mx-auto">
          <button
            onClick={onGoToOrders}
            className="w-full py-3.5 rounded-xl bg-stone-900 hover:bg-stone-800 text-white font-semibold text-xs tracking-wide flex items-center justify-center gap-2 shadow-md transition-all hover:translate-y-[-1px]"
          >
            <span>Go to my library</span>
            <ArrowRight className="w-4 h-4" />
          </button>

          <button
            onClick={onContinueShopping}
            className="w-full py-2.5 text-xs text-stone-600 hover:text-stone-900 font-medium transition-colors"
          >
            Continue shopping
          </button>
        </div>

        {/* What's Next 3-Column Feature Cards */}
        <div className="pt-8 border-t border-stone-100 space-y-4 text-left">
          <h2 className="text-xs font-semibold text-stone-400 uppercase tracking-wider text-center">
            What&apos;s next?
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200/60 flex flex-col items-center text-center gap-2">
              <div className="w-8 h-8 rounded-full bg-stone-200/80 flex items-center justify-center text-stone-800">
                <Download className="w-4 h-4" />
              </div>
              <h3 className="text-xs font-bold text-stone-900">1. Download</h3>
              <p className="text-[11px] text-stone-500 leading-tight">
                Your eBooks will be available immediately.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200/60 flex flex-col items-center text-center gap-2">
              <div className="w-8 h-8 rounded-full bg-stone-200/80 flex items-center justify-center text-stone-800">
                <BookOpen className="w-4 h-4" />
              </div>
              <h3 className="text-xs font-bold text-stone-900">2. Read</h3>
              <p className="text-[11px] text-stone-500 leading-tight">
                Enjoy your new books on any device.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200/60 flex flex-col items-center text-center gap-2">
              <div className="w-8 h-8 rounded-full bg-stone-200/80 flex items-center justify-center text-stone-800">
                <Share2 className="w-4 h-4" />
              </div>
              <h3 className="text-xs font-bold text-stone-900">3. Share</h3>
              <p className="text-[11px] text-stone-500 leading-tight">
                Discover more great reads.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
