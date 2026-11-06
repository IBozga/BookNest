import { describe, it, expect } from 'vitest';
import { getTentativeDeliveryDate, formatDeliveryDate } from '../utils/delivery';

describe('delivery utils', () => {
  const from = new Date(2025, 0, 10); // 10 Jan 2025

  it('adds the lead time in days to the start date', () => {
    const result = getTentativeDeliveryDate(5, from);
    expect(result.getDate()).toBe(15);
    expect(result.getMonth()).toBe(0);
  });

  it('defaults to 3 days when no lead time is provided', () => {
    expect(getTentativeDeliveryDate(undefined, from).getDate()).toBe(13);
  });

  it('rolls over month boundaries', () => {
    const result = getTentativeDeliveryDate(25, from);
    expect(result.getMonth()).toBe(1);
    expect(result.getDate()).toBe(4);
  });

  it('does not mutate the start date', () => {
    getTentativeDeliveryDate(5, from);
    expect(from.getDate()).toBe(10);
  });

  it('formats a readable date', () => {
    expect(formatDeliveryDate(5, from)).toMatch(/15/);
    expect(formatDeliveryDate(5, from)).toMatch(/Jan/);
  });
});
