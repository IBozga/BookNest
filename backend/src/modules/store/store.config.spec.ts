import { STORE } from './store.config';
import { CANCEL_WINDOW_HOURS, RETURN_WINDOW_DAYS } from '../order/order.service';

describe('STORE config (mock Store domain)', () => {
  it('keeps the order-service windows in sync with the store policies', () => {
    expect(CANCEL_WINDOW_HOURS).toBe(STORE.policies.cancelWindowHours);
    expect(RETURN_WINDOW_DAYS).toBe(STORE.policies.returnWindowDays);
    expect(STORE.policies.modifyWindowHours).toBe(STORE.policies.cancelWindowHours);
  });

  it('defines sane pricing and wallet limits', () => {
    expect(STORE.pricing.pointValue).toBe(0.01);
    expect(STORE.pricing.taxRate).toBeGreaterThan(0);
    expect(STORE.wallet.topUpAmount).toBeLessThanOrEqual(STORE.wallet.maxBalance);
  });
});
