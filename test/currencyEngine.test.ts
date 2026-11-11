import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ALL_CURRENCIES,
  ALL_COUNTRIES,
  PAYPAL_SUPPORTED_CURRENCY_CODES,
  ZERO_DECIMAL_CURRENCY_CODES,
  convertCurrency,
  formatCurrencyWithIntl,
  getDecimalPlacesForCurrency,
} from '../src/data/internationalData.js';

test('1. Countries Dataset Integrity and Default ISO 4217 Currency Mapping', () => {
  assert.ok(ALL_COUNTRIES.length >= 60, 'Expected extensive international country dataset');

  // Verify key country-to-currency mappings
  const us = ALL_COUNTRIES.find((c) => c.code === 'US');
  assert.equal(us?.defaultCurrency, 'USD');

  const uk = ALL_COUNTRIES.find((c) => c.code === 'GB');
  assert.equal(uk?.defaultCurrency, 'GBP');

  const jp = ALL_COUNTRIES.find((c) => c.code === 'JP');
  assert.equal(jp?.defaultCurrency, 'JPY');

  const de = ALL_COUNTRIES.find((c) => c.code === 'DE');
  assert.equal(de?.defaultCurrency, 'EUR');

  const inCountry = ALL_COUNTRIES.find((c) => c.code === 'IN');
  assert.equal(inCountry?.defaultCurrency, 'INR');

  const br = ALL_COUNTRIES.find((c) => c.code === 'BR');
  assert.equal(br?.defaultCurrency, 'BRL');
});

test('2. ISO 4217 Currencies Dataset and PayPal Support Separation', () => {
  assert.ok(ALL_CURRENCIES.length >= 50, 'Expected extensive currency list');

  // Verify PayPal supported currencies
  assert.equal(PAYPAL_SUPPORTED_CURRENCY_CODES.has('USD'), true);
  assert.equal(PAYPAL_SUPPORTED_CURRENCY_CODES.has('EUR'), true);
  assert.equal(PAYPAL_SUPPORTED_CURRENCY_CODES.has('GBP'), true);
  assert.equal(PAYPAL_SUPPORTED_CURRENCY_CODES.has('JPY'), true);
  assert.equal(PAYPAL_SUPPORTED_CURRENCY_CODES.has('CAD'), true);
  assert.equal(PAYPAL_SUPPORTED_CURRENCY_CODES.has('SGD'), true);

  // Verify currencies that are NOT supported directly by PayPal
  assert.equal(PAYPAL_SUPPORTED_CURRENCY_CODES.has('INR'), false);
  assert.equal(PAYPAL_SUPPORTED_CURRENCY_CODES.has('ZAR'), false);
  assert.equal(PAYPAL_SUPPORTED_CURRENCY_CODES.has('NGN'), false);
  assert.equal(PAYPAL_SUPPORTED_CURRENCY_CODES.has('AED'), false);
  assert.equal(PAYPAL_SUPPORTED_CURRENCY_CODES.has('KES'), false);
});

test('3. Zero-Decimal Currency Handling (JPY, KRW, VND, CLP)', () => {
  assert.equal(getDecimalPlacesForCurrency('JPY'), 0);
  assert.equal(getDecimalPlacesForCurrency('KRW'), 0);
  assert.equal(getDecimalPlacesForCurrency('VND'), 0);
  assert.equal(getDecimalPlacesForCurrency('CLP'), 0);

  // Standard 2-decimal currencies
  assert.equal(getDecimalPlacesForCurrency('USD'), 2);
  assert.equal(getDecimalPlacesForCurrency('EUR'), 2);
  assert.equal(getDecimalPlacesForCurrency('GBP'), 2);
  assert.equal(getDecimalPlacesForCurrency('INR'), 2);

  // 3-decimal currencies
  assert.equal(getDecimalPlacesForCurrency('KWD'), 3);
  assert.equal(getDecimalPlacesForCurrency('BHD'), 3);
});

test('4. Intl.NumberFormat Currency Formatting', () => {
  const usdFormat = formatCurrencyWithIntl(1234.56, 'USD', 'en-US');
  assert.ok(usdFormat.includes('1,234.56') || usdFormat.includes('$'), 'Expected formatted USD');

  // JPY zero-decimal formatting should not have cents
  const jpyFormat = formatCurrencyWithIntl(50000, 'JPY', 'ja-JP');
  assert.ok(jpyFormat.includes('50,000') || jpyFormat.includes('50000'), 'Expected formatted JPY without decimals');
  assert.ok(!jpyFormat.includes('.00'), 'JPY must not include decimals');
});

test('5. Exchange Rate Conversion (INR to USD for PayPal Checkout)', () => {
  const conversion = convertCurrency(1000, 'INR', 'USD');

  assert.equal(conversion.sourceCurrency, 'INR');
  assert.equal(conversion.targetCurrency, 'USD');
  assert.equal(conversion.sourceAmount, 1000);
  assert.ok(conversion.targetAmount > 0, 'Target amount should be positive');
  assert.ok(conversion.rate > 0, 'Rate should be positive');
  assert.ok(conversion.timestamp, 'Timestamp must be present');
  assert.equal(conversion.isApproximate, true);

  // At rate of ~86.5 INR per USD: 1000 INR ~= 11.56 USD
  assert.ok(conversion.targetAmount >= 11 && conversion.targetAmount <= 12);
});

test('6. Zero-Decimal Currency Conversion (JPY to USD and USD to JPY)', () => {
  const toJpy = convertCurrency(100, 'USD', 'JPY');
  assert.equal(toJpy.targetCurrency, 'JPY');
  // JPY target amount must be integer
  assert.equal(Math.round(toJpy.targetAmount), toJpy.targetAmount);

  const fromJpy = convertCurrency(15450, 'JPY', 'USD');
  assert.equal(fromJpy.targetCurrency, 'USD');
  assert.ok(fromJpy.targetAmount > 90 && fromJpy.targetAmount < 110);
});

test('7. Validation Error on Negative Conversion Amount', () => {
  assert.throws(() => convertCurrency(-50, 'USD', 'EUR'), /cannot be negative/);
});
