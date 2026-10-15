/**
 * Mock "Store" domain: BookNest is a single-store platform, so the store, its catalogue and its
 * policies are a static configuration object instead of database entities.
 */
export const STORE = {
  id: 'booknest-main',
  name: 'BookNest',
  currency: 'EUR',
  catalogue: { id: 'booknest-catalogue', name: 'BookNest Catalogue' },
  policies: {
    /** A completed order can be cancelled for this long after it was placed. */
    cancelWindowHours: 48,
    /** After the cancel window, a completed order can be returned for this many days. */
    returnWindowDays: 30,
    /** Orders can be modified (items reduced or removed) during the cancel window. */
    modifyWindowHours: 48,
  },
  pricing: {
    /** Flat shipping fee applied below the free-shipping threshold. */
    flatShipping: 4.99,
    /** Shipping is free when the discounted subtotal exceeds this amount. */
    freeShippingThreshold: 35,
    /** Sales tax rate applied to the discounted subtotal. */
    taxRate: 0.08,
    /** 100 gift points = 1.00 discount. */
    pointValue: 0.01,
    /** Gift points earned per whole currency unit paid. */
    pointsEarnedPerUnit: 5,
  },
  wallet: {
    /** Fixed amount credited by the mock wallet top-up. */
    topUpAmount: 25,
    /** Upper limit for the wallet balance. */
    maxBalance: 500,
  },
} as const;
