import { describe, it, expect } from 'vitest';
import { formatCurrency, CURRENCIES } from '../utils/currency';

describe('currency utility', () => {
  it('formats amount in EUR by default', () => {
    const formatted = formatCurrency(100);
    expect(formatted).toBe('€92.00');
  });

  it('formats amount in USD correctly', () => {
    const formatted = formatCurrency(49.99, 'USD');
    expect(formatted).toBe('$49.99');
  });

  it('formats amount in GBP correctly', () => {
    const formatted = formatCurrency(100, 'GBP');
    expect(formatted).toBe('£79.00');
  });

  it('falls back to EUR if unknown currency code is provided', () => {
    const formatted = formatCurrency(10, 'UNKNOWN' as any);
    expect(formatted).toBe('€9.20');
  });

  it('handles custom symbol position after', () => {
    // Test branch where symbolPosition is 'after'
    const origEur = CURRENCIES.EUR.symbolPosition;
    try {
      CURRENCIES.EUR.symbolPosition = 'after';
      expect(formatCurrency(10, 'EUR')).toBe('9.20 €');
    } finally {
      CURRENCIES.EUR.symbolPosition = origEur;
    }
  });
});
