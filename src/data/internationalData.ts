/**
 * International Countries and ISO 4217 Currencies Dataset
 * 
 * Includes comprehensive countries, ISO 4217 currency definitions,
 * zero-decimal currency mappings, and official PayPal supported currencies.
 */

export interface CountryInfo {
  code: string; // ISO 3166-1 alpha-2
  name: string;
  flag: string;
  defaultCurrency: string; // ISO 4217
}

export interface CurrencyInfo {
  code: string; // ISO 4217
  name: string;
  symbol: string;
  decimalPlaces: number;
  paypalSupported: boolean;
}

// 25 Currencies officially supported by PayPal REST APIs
export const PAYPAL_SUPPORTED_CURRENCY_CODES = new Set([
  'AUD', 'BRL', 'CAD', 'CNY', 'CZK', 'DKK', 'EUR', 'HKD', 'HUF', 'ILS',
  'JPY', 'MYR', 'MXN', 'TWD', 'NZD', 'NOK', 'PHP', 'PLN', 'GBP', 'RUB',
  'SGD', 'SEK', 'CHF', 'THB', 'USD'
]);

// Currencies with zero decimal places (e.g., JPY, KRW, VND)
export const ZERO_DECIMAL_CURRENCY_CODES = new Set([
  'BIF', 'CLP', 'DJF', 'GNF', 'HUF', 'ISK', 'JPY', 'KMF', 'KRW', 'PYG',
  'RWF', 'TWD', 'UGX', 'VND', 'VUV', 'XAF', 'XOF', 'XPF'
]);

// Currencies with 3 decimal places
export const THREE_DECIMAL_CURRENCY_CODES = new Set([
  'BHD', 'IQD', 'JOD', 'KWD', 'OMR', 'TND'
]);

export function getDecimalPlacesForCurrency(code: string): number {
  const normalized = code.toUpperCase();
  if (ZERO_DECIMAL_CURRENCY_CODES.has(normalized)) return 0;
  if (THREE_DECIMAL_CURRENCY_CODES.has(normalized)) return 3;
  return 2;
}

// Comprehensive ISO 4217 Currencies
export const ALL_CURRENCIES: CurrencyInfo[] = [
  { code: 'USD', name: 'United States Dollar', symbol: '$', decimalPlaces: 2, paypalSupported: true },
  { code: 'EUR', name: 'Euro', symbol: '€', decimalPlaces: 2, paypalSupported: true },
  { code: 'GBP', name: 'British Pound Sterling', symbol: '£', decimalPlaces: 2, paypalSupported: true },
  { code: 'JPY', name: 'Japanese Yen', symbol: '¥', decimalPlaces: 0, paypalSupported: true },
  { code: 'CAD', name: 'Canadian Dollar', symbol: 'CA$', decimalPlaces: 2, paypalSupported: true },
  { code: 'AUD', name: 'Australian Dollar', symbol: 'A$', decimalPlaces: 2, paypalSupported: true },
  { code: 'CHF', name: 'Swiss Franc', symbol: 'CHF', decimalPlaces: 2, paypalSupported: true },
  { code: 'CNY', name: 'Chinese Yuan', symbol: '¥', decimalPlaces: 2, paypalSupported: true },
  { code: 'INR', name: 'Indian Rupee', symbol: '₹', decimalPlaces: 2, paypalSupported: false },
  { code: 'BRL', name: 'Brazilian Real', symbol: 'R$', decimalPlaces: 2, paypalSupported: true },
  { code: 'SGD', name: 'Singapore Dollar', symbol: 'S$', decimalPlaces: 2, paypalSupported: true },
  { code: 'HKD', name: 'Hong Kong Dollar', symbol: 'HK$', decimalPlaces: 2, paypalSupported: true },
  { code: 'NZD', name: 'New Zealand Dollar', symbol: 'NZ$', decimalPlaces: 2, paypalSupported: true },
  { code: 'SEK', name: 'Swedish Krona', symbol: 'kr', decimalPlaces: 2, paypalSupported: true },
  { code: 'NOK', name: 'Norwegian Krone', symbol: 'kr', decimalPlaces: 2, paypalSupported: true },
  { code: 'DKK', name: 'Danish Krone', symbol: 'kr', decimalPlaces: 2, paypalSupported: true },
  { code: 'MXN', name: 'Mexican Peso', symbol: 'MX$', decimalPlaces: 2, paypalSupported: true },
  { code: 'ZAR', name: 'South African Rand', symbol: 'R', decimalPlaces: 2, paypalSupported: false },
  { code: 'AED', name: 'United Arab Emirates Dirham', symbol: 'AED', decimalPlaces: 2, paypalSupported: false },
  { code: 'SAR', name: 'Saudi Riyal', symbol: 'SAR', decimalPlaces: 2, paypalSupported: false },
  { code: 'KRW', name: 'South Korean Won', symbol: '₩', decimalPlaces: 0, paypalSupported: false },
  { code: 'PLN', name: 'Polish Złoty', symbol: 'zł', decimalPlaces: 2, paypalSupported: true },
  { code: 'TRY', name: 'Turkish Lira', symbol: '₺', decimalPlaces: 2, paypalSupported: false },
  { code: 'IDR', name: 'Indonesian Rupiah', symbol: 'Rp', decimalPlaces: 2, paypalSupported: false },
  { code: 'MYR', name: 'Malaysian Ringgit', symbol: 'RM', decimalPlaces: 2, paypalSupported: true },
  { code: 'PHP', name: 'Philippine Peso', symbol: '₱', decimalPlaces: 2, paypalSupported: true },
  { code: 'THB', name: 'Thai Baht', symbol: '฿', decimalPlaces: 2, paypalSupported: true },
  { code: 'CZK', name: 'Czech Koruna', symbol: 'Kč', decimalPlaces: 2, paypalSupported: true },
  { code: 'HUF', name: 'Hungarian Forint', symbol: 'Ft', decimalPlaces: 0, paypalSupported: true },
  { code: 'ILS', name: 'Israeli New Shekel', symbol: '₪', decimalPlaces: 2, paypalSupported: true },
  { code: 'CLP', name: 'Chilean Peso', symbol: '$', decimalPlaces: 0, paypalSupported: false },
  { code: 'COP', name: 'Colombian Peso', symbol: '$', decimalPlaces: 2, paypalSupported: false },
  { code: 'PEN', name: 'Peruvian Sol', symbol: 'S/', decimalPlaces: 2, paypalSupported: false },
  { code: 'ARS', name: 'Argentine Peso', symbol: '$', decimalPlaces: 2, paypalSupported: false },
  { code: 'EGP', name: 'Egyptian Pound', symbol: 'E£', decimalPlaces: 2, paypalSupported: false },
  { code: 'NGN', name: 'Nigerian Naira', symbol: '₦', decimalPlaces: 2, paypalSupported: false },
  { code: 'KES', name: 'Kenyan Shilling', symbol: 'KSh', decimalPlaces: 2, paypalSupported: false },
  { code: 'GHS', name: 'Ghanaian Cedi', symbol: 'GH₵', decimalPlaces: 2, paypalSupported: false },
  { code: 'PKR', name: 'Pakistani Rupee', symbol: '₨', decimalPlaces: 2, paypalSupported: false },
  { code: 'BDT', name: 'Bangladeshi Taka', symbol: '৳', decimalPlaces: 2, paypalSupported: false },
  { code: 'VND', name: 'Vietnamese Đồng', symbol: '₫', decimalPlaces: 0, paypalSupported: false },
  { code: 'TWD', name: 'New Taiwan Dollar', symbol: 'NT$', decimalPlaces: 0, paypalSupported: true },
  { code: 'QAR', name: 'Qatari Riyal', symbol: 'QR', decimalPlaces: 2, paypalSupported: false },
  { code: 'KWD', name: 'Kuwaiti Dinar', symbol: 'KD', decimalPlaces: 3, paypalSupported: false },
  { code: 'BHD', name: 'Bahraini Dinar', symbol: 'BD', decimalPlaces: 3, paypalSupported: false },
  { code: 'OMR', name: 'Omani Rial', symbol: 'OMR', decimalPlaces: 3, paypalSupported: false },
  { code: 'JOD', name: 'Jordanian Dinar', symbol: 'JD', decimalPlaces: 3, paypalSupported: false },
  { code: 'MAD', name: 'Moroccan Dirham', symbol: 'MAD', decimalPlaces: 2, paypalSupported: false },
  { code: 'RON', name: 'Romanian Leu', symbol: 'lei', decimalPlaces: 2, paypalSupported: false },
  { code: 'BGN', name: 'Bulgarian Lev', symbol: 'лв', decimalPlaces: 2, paypalSupported: false },
  { code: 'ISK', name: 'Icelandic Króna', symbol: 'kr', decimalPlaces: 0, paypalSupported: false },
  { code: 'RSD', name: 'Serbian Dinar', symbol: 'дин', decimalPlaces: 2, paypalSupported: false },
  { code: 'UAH', name: 'Ukrainian Hryvnia', symbol: '₴', decimalPlaces: 2, paypalSupported: false },
  { code: 'CRC', name: 'Costa Rican Colón', symbol: '₡', decimalPlaces: 2, paypalSupported: false },
  { code: 'UYU', name: 'Uruguayan Peso', symbol: '$U', decimalPlaces: 2, paypalSupported: false },
  { code: 'DOP', name: 'Dominican Peso', symbol: 'RD$', decimalPlaces: 2, paypalSupported: false },
  { code: 'LKR', name: 'Sri Lankan Rupee', symbol: 'Rs', decimalPlaces: 2, paypalSupported: false },
  { code: 'NPR', name: 'Nepalese Rupee', symbol: 'रू', decimalPlaces: 2, paypalSupported: false },
  { code: 'UGX', name: 'Ugandan Shilling', symbol: 'USh', decimalPlaces: 0, paypalSupported: false },
  { code: 'TZS', name: 'Tanzanian Shilling', symbol: 'TSh', decimalPlaces: 2, paypalSupported: false },
  { code: 'RUB', name: 'Russian Ruble', symbol: '₽', decimalPlaces: 2, paypalSupported: true },
];

// Comprehensive Countries Dataset mapped to ISO 3166 & Default ISO 4217 Currency
export const ALL_COUNTRIES: CountryInfo[] = [
  { code: 'US', name: 'United States', flag: '🇺🇸', defaultCurrency: 'USD' },
  { code: 'GB', name: 'United Kingdom', flag: '🇬🇧', defaultCurrency: 'GBP' },
  { code: 'DE', name: 'Germany', flag: '🇩🇪', defaultCurrency: 'EUR' },
  { code: 'FR', name: 'France', flag: '🇫🇷', defaultCurrency: 'EUR' },
  { code: 'JP', name: 'Japan', flag: '🇯🇵', defaultCurrency: 'JPY' },
  { code: 'IN', name: 'India', flag: '🇮🇳', defaultCurrency: 'INR' },
  { code: 'CA', name: 'Canada', flag: '🇨🇦', defaultCurrency: 'CAD' },
  { code: 'AU', name: 'Australia', flag: '🇦🇺', defaultCurrency: 'AUD' },
  { code: 'IT', name: 'Italy', flag: '🇮🇹', defaultCurrency: 'EUR' },
  { code: 'ES', name: 'Spain', flag: '🇪🇸', defaultCurrency: 'EUR' },
  { code: 'NL', name: 'Netherlands', flag: '🇳🇱', defaultCurrency: 'EUR' },
  { code: 'CH', name: 'Switzerland', flag: '🇨🇭', defaultCurrency: 'CHF' },
  { code: 'SE', name: 'Sweden', flag: '🇸🇪', defaultCurrency: 'SEK' },
  { code: 'NO', name: 'Norway', flag: '🇳🇴', defaultCurrency: 'NOK' },
  { code: 'DK', name: 'Denmark', flag: '🇩🇰', defaultCurrency: 'DKK' },
  { code: 'FI', name: 'Finland', flag: '🇫🇮', defaultCurrency: 'EUR' },
  { code: 'IE', name: 'Ireland', flag: '🇮🇪', defaultCurrency: 'EUR' },
  { code: 'BE', name: 'Belgium', flag: '🇧🇪', defaultCurrency: 'EUR' },
  { code: 'AT', name: 'Austria', flag: '🇦🇹', defaultCurrency: 'EUR' },
  { code: 'PT', name: 'Portugal', flag: '🇵🇹', defaultCurrency: 'EUR' },
  { code: 'GR', name: 'Greece', flag: '🇬🇷', defaultCurrency: 'EUR' },
  { code: 'PL', name: 'Poland', flag: '🇵🇱', defaultCurrency: 'PLN' },
  { code: 'CZ', name: 'Czech Republic', flag: '🇨🇿', defaultCurrency: 'CZK' },
  { code: 'HU', name: 'Hungary', flag: '🇭🇺', defaultCurrency: 'HUF' },
  { code: 'RO', name: 'Romania', flag: '🇷🇴', defaultCurrency: 'RON' },
  { code: 'BG', name: 'Bulgaria', flag: '🇧🇬', defaultCurrency: 'BGN' },
  { code: 'HR', name: 'Croatia', flag: '🇭🇷', defaultCurrency: 'EUR' },
  { code: 'SG', name: 'Singapore', flag: '🇸🇬', defaultCurrency: 'SGD' },
  { code: 'HK', name: 'Hong Kong', flag: '🇭🇰', defaultCurrency: 'HKD' },
  { code: 'NZ', name: 'New Zealand', flag: '🇳🇿', defaultCurrency: 'NZD' },
  { code: 'BR', name: 'Brazil', flag: '🇧🇷', defaultCurrency: 'BRL' },
  { code: 'MX', name: 'Mexico', flag: '🇲🇽', defaultCurrency: 'MXN' },
  { code: 'AR', name: 'Argentina', flag: '🇦🇷', defaultCurrency: 'ARS' },
  { code: 'CL', name: 'Chile', flag: '🇨🇱', defaultCurrency: 'CLP' },
  { code: 'CO', name: 'Colombia', flag: '🇨🇴', defaultCurrency: 'COP' },
  { code: 'PE', name: 'Peru', flag: '🇵🇪', defaultCurrency: 'PEN' },
  { code: 'ZA', name: 'South Africa', flag: '🇿🇦', defaultCurrency: 'ZAR' },
  { code: 'NG', name: 'Nigeria', flag: '🇳🇬', defaultCurrency: 'NGN' },
  { code: 'EG', name: 'Egypt', flag: '🇪🇬', defaultCurrency: 'EGP' },
  { code: 'KE', name: 'Kenya', flag: '🇰🇪', defaultCurrency: 'KES' },
  { code: 'GH', name: 'Ghana', flag: '🇬🇭', defaultCurrency: 'GHS' },
  { code: 'MA', name: 'Morocco', flag: '🇲🇦', defaultCurrency: 'MAD' },
  { code: 'AE', name: 'United Arab Emirates', flag: '🇦🇪', defaultCurrency: 'AED' },
  { code: 'SA', name: 'Saudi Arabia', flag: '🇸🇦', defaultCurrency: 'SAR' },
  { code: 'QA', name: 'Qatar', flag: '🇶🇦', defaultCurrency: 'QAR' },
  { code: 'KW', name: 'Kuwait', flag: '🇰🇼', defaultCurrency: 'KWD' },
  { code: 'BH', name: 'Bahrain', flag: '🇧🇭', defaultCurrency: 'BHD' },
  { code: 'OM', name: 'Oman', flag: '🇴🇲', defaultCurrency: 'OMR' },
  { code: 'IL', name: 'Israel', flag: '🇮🇱', defaultCurrency: 'ILS' },
  { code: 'TR', name: 'Turkey', flag: '🇹🇷', defaultCurrency: 'TRY' },
  { code: 'KR', name: 'South Korea', flag: '🇰🇷', defaultCurrency: 'KRW' },
  { code: 'CN', name: 'China', flag: '🇨🇳', defaultCurrency: 'CNY' },
  { code: 'TW', name: 'Taiwan', flag: '🇹🇼', defaultCurrency: 'TWD' },
  { code: 'ID', name: 'Indonesia', flag: '🇮🇩', defaultCurrency: 'IDR' },
  { code: 'MY', name: 'Malaysia', flag: '🇲🇾', defaultCurrency: 'MYR' },
  { code: 'PH', name: 'Philippines', flag: '🇵🇭', defaultCurrency: 'PHP' },
  { code: 'TH', name: 'Thailand', flag: '🇹🇭', defaultCurrency: 'THB' },
  { code: 'VN', name: 'Vietnam', flag: '🇻🇳', defaultCurrency: 'VND' },
  { code: 'PK', name: 'Pakistan', flag: '🇵🇰', defaultCurrency: 'PKR' },
  { code: 'BD', name: 'Bangladesh', flag: '🇧🇩', defaultCurrency: 'BDT' },
  { code: 'LK', name: 'Sri Lanka', flag: '🇱🇰', defaultCurrency: 'LKR' },
  { code: 'NP', name: 'Nepal', flag: '🇳🇵', defaultCurrency: 'NPR' },
  { code: 'IS', name: 'Iceland', flag: '🇮🇸', defaultCurrency: 'ISK' },
  { code: 'RS', name: 'Serbia', flag: '🇷🇸', defaultCurrency: 'RSD' },
  { code: 'UA', name: 'Ukraine', flag: '🇺🇦', defaultCurrency: 'UAH' },
  { code: 'CR', name: 'Costa Rica', flag: '🇨🇷', defaultCurrency: 'CRC' },
  { code: 'DO', name: 'Dominican Republic', flag: '🇩🇴', defaultCurrency: 'DOP' },
  { code: 'UY', name: 'Uruguay', flag: '🇺🇾', defaultCurrency: 'UYU' },
  { code: 'UG', name: 'Uganda', flag: '🇺🇬', defaultCurrency: 'UGX' },
  { code: 'TZ', name: 'Tanzania', flag: '🇹🇿', defaultCurrency: 'TZS' },
];

/**
 * Standard reference market exchange rates against 1 USD.
 * Used for deterministic cross-currency conversions when budget currency is not directly accepted by PayPal.
 */
export const USD_EXCHANGE_RATES: Record<string, number> = {
  USD: 1.0,
  EUR: 0.92,
  GBP: 0.79,
  JPY: 154.5,
  CAD: 1.38,
  AUD: 1.52,
  CHF: 0.88,
  CNY: 7.24,
  INR: 86.5,
  BRL: 5.75,
  SGD: 1.34,
  HKD: 7.78,
  NZD: 1.68,
  SEK: 10.7,
  NOK: 10.95,
  DKK: 6.87,
  MXN: 20.2,
  ZAR: 18.1,
  AED: 3.67,
  SAR: 3.75,
  KRW: 1390.0,
  PLN: 4.05,
  TRY: 34.5,
  IDR: 15800.0,
  MYR: 4.42,
  PHP: 58.5,
  THB: 34.2,
  CZK: 23.4,
  HUF: 375.0,
  ILS: 3.72,
  CLP: 975.0,
  COP: 4400.0,
  PEN: 3.78,
  ARS: 1010.0,
  EGP: 49.3,
  NGN: 1680.0,
  KES: 129.5,
  GHS: 15.6,
  PKR: 278.5,
  BDT: 119.8,
  VND: 25300.0,
  TWD: 32.4,
  QAR: 3.64,
  KWD: 0.308,
  BHD: 0.376,
  OMR: 0.385,
  JOD: 0.709,
  MAD: 9.95,
  RON: 4.58,
  BGN: 1.80,
  ISK: 138.0,
  RSD: 108.0,
  UAH: 41.5,
  CRC: 508.0,
  UYU: 42.5,
  DOP: 60.2,
  LKR: 292.0,
  NPR: 134.5,
  UGX: 3670.0,
  TZS: 2650.0,
  RUB: 97.5,
};

export interface ExchangeRateResult {
  sourceCurrency: string;
  targetCurrency: string;
  sourceAmount: number;
  targetAmount: number;
  rate: number;
  inverseRate: number;
  timestamp: string;
  isApproximate: boolean;
}

export type CurrencyConversionResult = ExchangeRateResult;

export function isPayPalSupportedCurrency(code: string): boolean {
  return PAYPAL_SUPPORTED_CURRENCY_CODES.has(code.toUpperCase());
}

/**
 * Deterministic, decimal-safe conversion between currencies.
 * Returns converted amount, rate, and timestamp.
 */
export function convertCurrency(
  sourceAmount: number,
  sourceCurrency: string,
  targetCurrency: string
): ExchangeRateResult {
  const src = sourceCurrency.toUpperCase();
  const tgt = targetCurrency.toUpperCase();

  if (sourceAmount < 0) {
    throw new Error('Conversion Error: Amount cannot be negative.');
  }

  const srcRateToUsd = USD_EXCHANGE_RATES[src];
  const tgtRateToUsd = USD_EXCHANGE_RATES[tgt];

  if (!srcRateToUsd || !tgtRateToUsd) {
    throw new Error(`Unsupported currency code for conversion: ${!srcRateToUsd ? src : tgt}`);
  }

  // Convert source to USD first, then USD to target
  // sourceAmount in src / srcRateToUsd = amount in USD
  // amount in USD * tgtRateToUsd = amount in tgt
  const rate = tgtRateToUsd / srcRateToUsd;
  const inverseRate = srcRateToUsd / tgtRateToUsd;

  const rawTargetAmount = sourceAmount * rate;
  const tgtDecimals = getDecimalPlacesForCurrency(tgt);
  const factor = Math.pow(10, tgtDecimals);
  const targetAmount = Math.round(rawTargetAmount * factor) / factor;

  return {
    sourceCurrency: src,
    targetCurrency: tgt,
    sourceAmount,
    targetAmount,
    rate: Math.round(rate * 10000) / 10000,
    inverseRate: Math.round(inverseRate * 10000) / 10000,
    timestamp: new Date().toISOString(),
    isApproximate: true,
  };
}

/**
 * Format currency using standard Intl.NumberFormat with zero-decimal awareness
 */
export function formatCurrencyWithIntl(
  amount: number,
  currencyCode: string = 'USD',
  locale?: string
): string {
  try {
    const decimals = getDecimalPlacesForCurrency(currencyCode);
    return new Intl.NumberFormat(locale || undefined, {
      style: 'currency',
      currency: currencyCode.toUpperCase(),
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(amount);
  } catch {
    const decimals = getDecimalPlacesForCurrency(currencyCode);
    const absVal = Math.abs(amount).toFixed(decimals);
    const sign = amount < 0 ? '-' : '';
    return `${sign}${currencyCode.toUpperCase()} ${absVal}`;
  }
}
