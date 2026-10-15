export type CurrencyCode = 'USD' | 'EUR' | 'GBP';

export interface CurrencyConfig {
  code: CurrencyCode;
  symbol: string;
  name: string;
  rate: number; // relative to USD base
  symbolPosition: 'before' | 'after';
}

export const CURRENCIES: Record<CurrencyCode, CurrencyConfig> = {
  EUR: {
    code: 'EUR',
    symbol: '€',
    name: 'Euro (€)',
    rate: 0.92,
    symbolPosition: 'before',
  },
  USD: {
    code: 'USD',
    symbol: '$',
    name: 'US Dollar ($)',
    rate: 1.0,
    symbolPosition: 'before',
  },
  GBP: {
    code: 'GBP',
    symbol: '£',
    name: 'British Pound (£)',
    rate: 0.79,
    symbolPosition: 'before',
  },
};

export function formatCurrency(amountInUSD: number, currencyCode: CurrencyCode = 'EUR'): string {
  const config = CURRENCIES[currencyCode] || CURRENCIES.EUR;
  const converted = amountInUSD * config.rate;
  const formattedNumber = converted.toFixed(2);

  if (config.symbolPosition === 'after') {
    return `${formattedNumber} ${config.symbol}`;
  }
  return `${config.symbol}${formattedNumber}`;
}

export const EUROPEAN_COUNTRIES = [
  'Germany',
  'France',
  'United Kingdom',
  'Italy',
  'Spain',
  'Netherlands',
  'Belgium',
  'Sweden',
  'Poland',
  'Austria',
  'Switzerland',
  'Denmark',
  'Norway',
  'Finland',
  'Portugal',
  'Ireland',
  'Greece',
  'Romania',
  'Czech Republic',
  'Hungary',
  'United States',
  'Canada',
];
