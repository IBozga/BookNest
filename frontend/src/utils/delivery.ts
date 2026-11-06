const DEFAULT_DELIVERY_DAYS = 3;

/** Tentative delivery date: today plus the book's lead time. */
export function getTentativeDeliveryDate(deliveryDays?: number, from: Date = new Date()): Date {
  const date = new Date(from);
  date.setDate(date.getDate() + (deliveryDays ?? DEFAULT_DELIVERY_DAYS));
  return date;
}

/** Human-readable tentative delivery date, e.g. "Mon, 12 May". */
export function formatDeliveryDate(deliveryDays?: number, from: Date = new Date()): string {
  return getTentativeDeliveryDate(deliveryDays, from).toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
}
