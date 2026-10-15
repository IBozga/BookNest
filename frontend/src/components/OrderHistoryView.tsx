import React, { useEffect, useState } from 'react';
import { Order, CartResponse } from '../types';
import { api } from '../services/api';
import { RotateCcw, ShoppingBag, ArrowRight, XCircle, Undo2, Pencil, Printer } from 'lucide-react';
import { LoadingSpinner } from './LoadingSpinner';
import { FALLBACK_COVER } from '../utils/constants';

/** Returns badge colour classes based on order status. */
function statusBadgeClass(status: string): string {
  switch (status) {
    case 'COMPLETED':
      return 'bg-emerald-100 text-emerald-800';
    case 'PENDING':
      return 'bg-amber-100 text-amber-800';
    case 'CANCELLED':
      return 'bg-red-100 text-red-800';
    case 'RETURNED':
      return 'bg-sky-100 text-sky-800';
    default:
      return 'bg-stone-100 text-stone-700';
  }
}

function statusLabel(status: string): string {
  switch (status) {
    case 'COMPLETED':  return 'Completed';
    case 'PENDING':    return 'Processing';
    case 'CANCELLED':  return 'Cancelled';
    case 'RETURNED':   return 'Returned';
    default:           return status;
  }
}

interface OrderHistoryViewProps {
  onBuyAgainSuccess: (cart: CartResponse, message: string) => void;
  onExploreCatalogue: () => void;
}

export const OrderHistoryView: React.FC<OrderHistoryViewProps> = ({
  onBuyAgainSuccess,
  onExploreCatalogue,
}) => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [activeTab, setActiveTab] = useState<'All' | 'Completed' | 'Processing' | 'Cancelled' | 'Returned'>('All');
  const [loading, setLoading] = useState(true);
  const [processingOrderId, setProcessingOrderId] = useState<string | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
  /** Order currently being edited and its draft quantities, keyed by book id. */
  const [editingOrderId, setEditingOrderId] = useState<string | null>(null);
  const [draftQuantities, setDraftQuantities] = useState<Record<string, number>>({});

  const fetchOrders = () => {
    setLoading(true);
    api
      .getOrders()
      .then((res) => setOrders(res))
      .catch(() => setOrders([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const handleBuyAgain = async (orderId: string) => {
    setProcessingOrderId(orderId);
    setFeedbackMessage(null);
    try {
      const res = await api.buyAgain(orderId);
      setFeedbackMessage(res.message);
      onBuyAgainSuccess(res.cart, res.message);
    } catch (err: any) {
      setFeedbackMessage(err.message || 'Failed to re-add items to basket');
    } finally {
      setProcessingOrderId(null);
    }
  };

  const startEditing = (order: Order) => {
    setEditingOrderId(order.id);
    setDraftQuantities(Object.fromEntries(order.items.map((item) => [item.book.id, item.quantity])));
    setFeedbackMessage(null);
  };

  /** Quantities can only be lowered, never raised above what was ordered. */
  const changeDraftQuantity = (order: Order, bookId: string, delta: number) => {
    const ordered = order.items.find((item) => item.book.id === bookId)?.quantity ?? 0;
    setDraftQuantities((prev) => ({
      ...prev,
      [bookId]: Math.min(ordered, Math.max(0, (prev[bookId] ?? ordered) + delta)),
    }));
  };

  const handleSaveChanges = async (order: Order) => {
    const changes = order.items
      .filter((item) => (draftQuantities[item.book.id] ?? item.quantity) < item.quantity)
      .map((item) => ({ bookId: item.book.id, quantity: draftQuantities[item.book.id] }));
    if (changes.length === 0) {
      setEditingOrderId(null);
      return;
    }

    setProcessingOrderId(order.id);
    setFeedbackMessage(null);
    try {
      const res = await api.modifyOrder(order.id, changes);
      setOrders((prev) => prev.map((o) => (o.id === order.id ? res.order : o)));
      setFeedbackMessage(res.message);
      setEditingOrderId(null);
    } catch (err: any) {
      setFeedbackMessage(err.message || 'Failed to update the order');
    } finally {
      setProcessingOrderId(null);
    }
  };

  const handleReverse = async (order: Order, action: 'cancel' | 'return') => {
    const question =
      action === 'cancel'
        ? `Cancel order #${order.orderNumber}? You will be refunded to your original payment method.`
        : `Return order #${order.orderNumber}? You will be refunded to your original payment method.`;
    if (!window.confirm(question)) return;

    setProcessingOrderId(order.id);
    setFeedbackMessage(null);
    try {
      const res = action === 'cancel' ? await api.cancelOrder(order.id) : await api.returnOrder(order.id);
      setOrders((prev) => prev.map((o) => (o.id === order.id ? res.order : o)));
      setFeedbackMessage(res.message);
    } catch (err: any) {
      setFeedbackMessage(err.message || `Failed to ${action} the order`);
    } finally {
      setProcessingOrderId(null);
    }
  };

  const filteredOrders = orders.filter((order) => {
    if (activeTab === 'All') return true;
    if (activeTab === 'Completed') return order.status === 'COMPLETED';
    if (activeTab === 'Processing') return order.status === 'PENDING';
    if (activeTab === 'Cancelled') return order.status === 'CANCELLED';
    if (activeTab === 'Returned') return order.status === 'RETURNED';
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Status filter tabs (Screen 10) */}
      <div className="flex items-center gap-6 border-b border-stone-200 text-xs font-semibold">
        {(['All', 'Completed', 'Processing', 'Cancelled', 'Returned'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`pb-3 transition-colors ${
              activeTab === tab
                ? 'text-stone-900 border-b-2 border-stone-900 font-bold'
                : 'text-stone-400 hover:text-stone-700'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {feedbackMessage && (
        <div className="p-3.5 rounded-2xl bg-stone-100 border border-stone-200 text-stone-900 text-xs font-semibold">
          {feedbackMessage}
        </div>
      )}

      {loading ? (
        <div className="py-16 flex flex-col items-center gap-3 text-xs text-stone-400">
          <LoadingSpinner size="lg" />
          <span>Loading your orders…</span>
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="py-16 text-center bg-white rounded-3xl border border-stone-200 p-8 space-y-4">
          <div className="w-16 h-16 rounded-full bg-stone-100 text-stone-400 mx-auto flex items-center justify-center">
            <ShoppingBag className="w-8 h-8" />
          </div>
          <h2 className="text-lg font-serif font-semibold text-stone-900">No orders found</h2>
          <p className="text-xs text-stone-500 max-w-sm mx-auto">
            You don&apos;t have any {activeTab !== 'All' ? activeTab.toLowerCase() : ''} orders yet.
          </p>
          <button
            onClick={onExploreCatalogue}
            className="px-6 py-2.5 rounded-xl bg-stone-900 text-white font-semibold text-xs hover:bg-stone-800 transition-colors"
          >
            Start Browsing
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredOrders.map((order) => {
            const isReordering = processingOrderId === order.id;
            const formattedDate = new Date(order.createdAt).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            });

            return (
              <div
                key={order.id}
                className="bg-white rounded-3xl border border-stone-200 p-5 sm:p-6 space-y-4 shadow-2xs hover:border-stone-300 transition-all"
              >
                {/* Top Row: Order #, Date, Status */}
                <div className="flex items-center justify-between text-xs pb-3 border-b border-stone-100">
                  <div className="space-y-0.5">
                    <span className="font-mono font-bold text-stone-900 block">
                      #{order.orderNumber}
                    </span>
                    <span className="text-stone-400 text-[11px]">{formattedDate}</span>
                  </div>

                  <span className={`px-2.5 py-1 rounded-full text-[11px] font-semibold ${statusBadgeClass(order.status)}`}>
                    {statusLabel(order.status)}
                  </span>
                </div>

                {/* Return label (stub) once the order has been returned */}
                {order.status === 'RETURNED' && order.returnLabel && (
                  <div className="flex items-center justify-between gap-3 p-3 rounded-2xl bg-sky-50 border border-sky-200 text-xs">
                    <div>
                      <span className="block font-semibold text-sky-900">Return label</span>
                      <span className="font-mono font-bold text-sky-900">{order.returnLabel}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => window.print()}
                      className="px-3 py-1.5 rounded-xl border border-sky-300 text-sky-900 hover:bg-sky-100 font-semibold flex items-center gap-1.5"
                    >
                      <Printer className="w-3.5 h-3.5" aria-hidden="true" />
                      <span>Print label</span>
                    </button>
                  </div>
                )}

                {/* Edit items (reduce or remove) inside the modify window */}
                {editingOrderId === order.id && (
                  <div className="space-y-2 p-3 rounded-2xl bg-stone-50 border border-stone-200 text-xs">
                    <p className="font-semibold text-stone-900">Reduce or remove items</p>
                    {order.items.map((item) => {
                      const quantity = draftQuantities[item.book.id] ?? item.quantity;
                      return (
                        <div key={item.id} className="flex items-center justify-between gap-3">
                          <span className="truncate text-stone-800">{item.book.title}</span>
                          <div className="flex items-center gap-2 shrink-0">
                            <button
                              type="button"
                              onClick={() => changeDraftQuantity(order, item.book.id, -1)}
                              disabled={quantity <= 0}
                              aria-label={`Decrease quantity of ${item.book.title}`}
                              className="w-6 h-6 rounded-lg border border-stone-300 font-bold hover:bg-stone-100 disabled:opacity-40"
                            >
                              −
                            </button>
                            <span className="min-w-[20px] text-center font-bold" aria-label={`Quantity of ${item.book.title}`}>
                              {quantity}
                            </span>
                            <button
                              type="button"
                              onClick={() => changeDraftQuantity(order, item.book.id, 1)}
                              disabled={quantity >= item.quantity}
                              aria-label={`Increase quantity of ${item.book.title}`}
                              className="w-6 h-6 rounded-lg border border-stone-300 font-bold hover:bg-stone-100 disabled:opacity-40"
                            >
                              +
                            </button>
                          </div>
                        </div>
                      );
                    })}
                    <div className="flex justify-end gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => setEditingOrderId(null)}
                        className="px-3 py-1.5 rounded-xl border border-stone-300 font-semibold hover:bg-stone-100"
                      >
                        Discard
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSaveChanges(order)}
                        disabled={isReordering}
                        className="px-3 py-1.5 rounded-xl bg-stone-900 text-white font-semibold hover:bg-stone-800 disabled:opacity-60 disabled:cursor-wait"
                      >
                        Save changes
                      </button>
                    </div>
                  </div>
                )}

                {/* Bottom Row: Book Cover Thumbnails + Buy Again Button */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  {/* Thumbnails Row */}
                  <div className="flex items-center gap-2.5 overflow-x-auto pb-1 max-w-full">
                    {order.items?.map((item) => (
                      <div
                        key={item.id}
                        className="w-12 h-16 rounded-xl overflow-hidden bg-stone-100 border border-stone-200 shrink-0"
                        title={item.book?.title}
                      >
                        <img
                          src={
                            item.book?.coverImage || FALLBACK_COVER
                          }
                          alt={item.book?.title}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ))}
                  </div>

                  {/* Right Actions: Buy Again + View Details */}
                  <div className="flex items-center gap-3 w-full sm:w-auto justify-end shrink-0">
                    <button
                      onClick={() => handleBuyAgain(order.id)}
                      disabled={isReordering}
                      className="px-4 py-2 rounded-xl bg-stone-100 hover:bg-stone-900 hover:text-white text-stone-900 font-semibold text-xs transition-colors flex items-center gap-1.5 disabled:opacity-60 disabled:cursor-wait"
                    >
                      {isReordering ? (
                        <LoadingSpinner size="sm" />
                      ) : (
                        <RotateCcw className="w-3.5 h-3.5" />
                      )}
                      <span>{isReordering ? 'Adding…' : 'Buy again'}</span>
                    </button>

                    {order.canModify && editingOrderId !== order.id && (
                      <button
                        onClick={() => startEditing(order)}
                        disabled={isReordering}
                        className="px-4 py-2 rounded-xl border border-stone-300 text-stone-800 hover:bg-stone-100 font-semibold text-xs transition-colors flex items-center gap-1.5 disabled:opacity-60 disabled:cursor-wait"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                        <span>Edit items</span>
                      </button>
                    )}

                    {order.canCancel && (
                      <button
                        onClick={() => handleReverse(order, 'cancel')}
                        disabled={isReordering}
                        className="px-4 py-2 rounded-xl border border-red-200 text-red-700 hover:bg-red-50 font-semibold text-xs transition-colors flex items-center gap-1.5 disabled:opacity-60 disabled:cursor-wait"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        <span>Cancel order</span>
                      </button>
                    )}

                    {order.canReturn && (
                      <button
                        onClick={() => handleReverse(order, 'return')}
                        disabled={isReordering}
                        className="px-4 py-2 rounded-xl border border-stone-300 text-stone-800 hover:bg-stone-100 font-semibold text-xs transition-colors flex items-center gap-1.5 disabled:opacity-60 disabled:cursor-wait"
                      >
                        <Undo2 className="w-3.5 h-3.5" />
                        <span>Return order</span>
                      </button>
                    )}

                    <button
                      onClick={onExploreCatalogue}
                      className="text-xs text-stone-500 hover:text-stone-900 font-medium flex items-center gap-1"
                    >
                      <span>View details</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
