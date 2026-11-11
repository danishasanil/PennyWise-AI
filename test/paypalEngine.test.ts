import test from 'node:test';
import assert from 'node:assert/strict';
import {
  formatPayPalAmount,
  verifyAndCalculateChargeAmount,
  DEMO_PRODUCTS,
  isOrderCaptured,
  __resetPayPalStoresForTesting,
  verifyPayPalWebhookSignature,
  processPayPalWebhookEvent,
  registerOrderForTesting,
  getOrderById,
  getRecordedWebhookEvents,
} from '../src/server/paypalService.js';
import { isPayPalSupportedCurrency } from '../src/data/internationalData.js';

test('1. Authoritative Catalog Pricing - Rejects/Overrides Client Amount Tampering', () => {
  // Attempt to tamper with price: client submits $0.01 for Ergonomic Chair ($189.00)
  const charge = verifyAndCalculateChargeAmount({
    productId: 'prod_chair_ergo',
    quantity: 1,
    targetCurrency: 'USD',
    clientProvidedAmount: 0.01, // Malicious client attempt
  });

  assert.equal(charge.itemName, 'Ergonomic High-Back Desk Chair');
  assert.equal(charge.verifiedAmount, 189.0);
  assert.equal(charge.formattedValue, '189.00');
  assert.equal(charge.isCatalogProduct, true);
  assert.equal(charge.category, 'Housing');
});

test('2. Quantity Multiplier Calculations on Server', () => {
  const charge = verifyAndCalculateChargeAmount({
    productId: 'prod_headphones_anc', // $129.00 each
    quantity: 3,
    targetCurrency: 'USD',
  });

  assert.equal(charge.verifiedAmount, 387.0);
  assert.equal(charge.formattedValue, '387.00');
});

test('3. Currency Validation for PayPal Checkout', () => {
  // USD, EUR, GBP, JPY are valid PayPal currencies
  assert.equal(isPayPalSupportedCurrency('USD'), true);
  assert.equal(isPayPalSupportedCurrency('EUR'), true);
  assert.equal(isPayPalSupportedCurrency('GBP'), true);
  assert.equal(isPayPalSupportedCurrency('JPY'), true);

  // INR, NGN, ZAR are NOT supported by PayPal REST orders API
  assert.equal(isPayPalSupportedCurrency('INR'), false);
  assert.equal(isPayPalSupportedCurrency('NGN'), false);

  // Attempting to checkout in an unsupported PayPal currency throws an explicit error
  assert.throws(
    () =>
      verifyAndCalculateChargeAmount({
        productId: 'prod_headphones_anc',
        targetCurrency: 'INR',
      }),
    /is not supported by PayPal Sandbox checkout/
  );
});

test('4. Zero-Decimal Currency Formatting (e.g., JPY, HUF, TWD)', () => {
  // JPY zero-decimal formatting
  const jpyFormatted = formatPayPalAmount(1500, 'JPY');
  assert.equal(jpyFormatted, '1500');

  // USD 2-decimal formatting
  const usdFormatted = formatPayPalAmount(1500, 'USD');
  assert.equal(usdFormatted, '1500.00');

  // Decimal rounding for EUR
  const eurFormatted = formatPayPalAmount(45.5, 'EUR');
  assert.equal(eurFormatted, '45.50');
});

test('5. Custom Evaluated Item Validation and Sanitization', () => {
  // Valid custom item
  const validCustom = verifyAndCalculateChargeAmount({
    customItem: {
      itemName: 'Office Ergonomic Footrest',
      price: 34.5,
      category: 'Shopping',
    },
    quantity: 2,
    targetCurrency: 'USD',
  });

  assert.equal(validCustom.itemName, 'Office Ergonomic Footrest');
  assert.equal(validCustom.verifiedAmount, 69.0);
  assert.equal(validCustom.formattedValue, '69.00');

  // Invalid: negative price
  assert.throws(
    () =>
      verifyAndCalculateChargeAmount({
        customItem: {
          itemName: 'Invalid Item',
          price: -20,
        },
      }),
    /Purchase price must be a valid positive number/
  );

  // Invalid: excessive price
  assert.throws(
    () =>
      verifyAndCalculateChargeAmount({
        customItem: {
          itemName: 'Super Yacht',
          price: 500000,
        },
      }),
    /Purchase amount exceeds demo store checkout limit/
  );

  // Invalid: empty item name
  assert.throws(
    () =>
      verifyAndCalculateChargeAmount({
        customItem: {
          itemName: '   ',
          price: 25,
        },
      }),
    /Custom item name must be between 1 and 100 characters/
  );
});

test('5B. Multi-Currency Custom Purchase: INR 1,000 to USD Conversion and Invariant Protection', () => {
  // CRITICAL REQUIREMENT: INR 1,000 evaluated item must convert deterministically to ~$11.56 USD,
  // NEVER treating it as $1,000 USD or double converting to ~INR 86,500
  const inrPurchase = verifyAndCalculateChargeAmount({
    customItem: {
      itemName: 'Running Shoes',
      price: 1000,
      currency: 'INR',
      category: 'Shopping',
    },
    quantity: 1,
    targetCurrency: 'USD',
  });

  assert.equal(inrPurchase.itemName, 'Running Shoes');
  assert.equal(inrPurchase.originalAmount, 1000);
  assert.equal(inrPurchase.originalCurrency, 'INR');
  assert.equal(inrPurchase.currency, 'USD');
  // At ~86.5 INR per USD, 1000 INR ~= 11.56 USD
  assert.equal(inrPurchase.verifiedAmount, 11.56);
  assert.equal(inrPurchase.formattedValue, '11.56');
  assert.ok(inrPurchase.exchangeRate > 0 && inrPurchase.exchangeRate < 0.02);

  // Invariant check: Verified amount MUST NOT equal original amount when currencies differ
  assert.notEqual(inrPurchase.verifiedAmount, 1000, 'INR 1,000 must NOT be charged as $1,000.00 USD');
});

test('5C. Multi-Currency Custom Purchases: GBP, AED, and Zero-Decimal JPY', () => {
  // 1. GBP item to USD checkout
  const gbpPurchase = verifyAndCalculateChargeAmount({
    customItem: {
      itemName: 'Ergonomic Keyboard UK',
      price: 79,
      currency: 'GBP',
      category: 'Shopping',
    },
    quantity: 1,
    targetCurrency: 'USD',
  });
  assert.equal(gbpPurchase.originalCurrency, 'GBP');
  assert.equal(gbpPurchase.currency, 'USD');
  assert.equal(gbpPurchase.verifiedAmount, 100.0);
  assert.equal(gbpPurchase.formattedValue, '100.00');

  // 2. AED item to USD checkout (AED is not a direct PayPal currency, converts to USD)
  const aedPurchase = verifyAndCalculateChargeAmount({
    customItem: {
      itemName: 'Electronics Accessories Dubai',
      price: 367,
      currency: 'AED',
      category: 'Shopping',
    },
    quantity: 1,
    targetCurrency: 'USD',
  });
  assert.equal(aedPurchase.originalCurrency, 'AED');
  assert.equal(aedPurchase.currency, 'USD');
  assert.equal(aedPurchase.verifiedAmount, 100.0);

  // 3. JPY Zero-Decimal item to USD checkout
  const jpyPurchase = verifyAndCalculateChargeAmount({
    customItem: {
      itemName: 'Japanese Tea Set',
      price: 15450,
      currency: 'JPY',
      category: 'Shopping',
    },
    quantity: 1,
    targetCurrency: 'USD',
  });
  assert.equal(jpyPurchase.originalCurrency, 'JPY');
  assert.equal(jpyPurchase.currency, 'USD');
  assert.equal(jpyPurchase.verifiedAmount, 100.0);

  // 4. USD catalog item to JPY checkout (Testing zero-decimal output format)
  const toJpyCheckout = verifyAndCalculateChargeAmount({
    productId: 'prod_chair_ergo', // $189.00 USD
    quantity: 1,
    targetCurrency: 'JPY',
  });
  assert.equal(toJpyCheckout.currency, 'JPY');
  // JPY zero-decimal must have no decimal point
  assert.ok(!toJpyCheckout.formattedValue.includes('.'), 'JPY must be zero decimal without cents');
  assert.equal(toJpyCheckout.verifiedAmount, Math.round(189 * 154.5));
});

test('6. Authoritative Catalog Integrity', () => {
  assert.ok(DEMO_PRODUCTS.length >= 8);
  for (const product of DEMO_PRODUCTS) {
    assert.ok(product.id.startsWith('prod_'));
    assert.ok(product.title.length > 0);
    assert.ok(product.price > 0);
    assert.ok(product.category.length > 0);
  }
});

test('7. Webhook Signature Verification - Rejects Missing Mandatory Headers', async () => {
  // Test with completely missing headers
  const res1 = await verifyPayPalWebhookSignature({
    headers: {},
    body: { id: 'WH-TEST-1', event_type: 'PAYMENT.CAPTURE.COMPLETED' },
  });
  assert.equal(res1.verified, false);
  assert.match(res1.error || '', /Missing mandatory PayPal signature headers/);

  // Test with partial headers (missing transmission-sig)
  const res2 = await verifyPayPalWebhookSignature({
    headers: {
      'paypal-auth-algo': 'SHA256withRSA',
      'paypal-cert-url': 'https://api.sandbox.paypal.com/v1/notifications/certs/CERT-123',
      'paypal-transmission-id': 'trans-uuid-1',
      'paypal-transmission-time': '2026-11-09T00:00:00Z',
    },
    body: { id: 'WH-TEST-2', event_type: 'PAYMENT.CAPTURE.COMPLETED' },
  });
  assert.equal(res2.verified, false);
  assert.match(res2.error || '', /Missing mandatory PayPal signature headers/);
});

test('8. Webhook Signature Verification - Rejects Untrusted Non-PayPal Cert URLs (Anti-SSRF)', async () => {
  const res = await verifyPayPalWebhookSignature({
    headers: {
      'paypal-auth-algo': 'SHA256withRSA',
      'paypal-cert-url': 'https://attacker.example.com/fake-cert.pem', // Untrusted domain
      'paypal-transmission-id': 'trans-uuid-2',
      'paypal-transmission-sig': 'fake_base64_sig',
      'paypal-transmission-time': '2026-11-09T00:00:00Z',
    },
    body: { id: 'WH-TEST-3', event_type: 'PAYMENT.CAPTURE.COMPLETED' },
  });
  assert.equal(res.verified, false);
  assert.match(res.error || '', /Untrusted certificate URL domain/);
});

test('9. Webhook Processing - PAYMENT.CAPTURE.COMPLETED Safely Updates Order & Creates Expense', async () => {
  __resetPayPalStoresForTesting();

  // Seed an existing order in CREATED state
  registerOrderForTesting({
    orderId: 'ORDER-1001',
    itemName: 'Ergonomic High-Back Desk Chair',
    category: 'Housing',
    serverVerifiedAmount: 189.0,
    currency: 'USD',
    formattedAmountString: '189.00',
    userId: 'user_test_1',
    createdAt: Date.now(),
    status: 'CREATED',
  });

  const webhookBody = {
    id: 'WH-EVENT-001',
    event_type: 'PAYMENT.CAPTURE.COMPLETED',
    create_time: '2026-11-09T01:00:00Z',
    summary: 'Payment capture completed for $189.00 USD',
    resource: {
      id: 'CAPTURE-777',
      status: 'COMPLETED',
      amount: { value: '189.00', currency_code: 'USD' },
      supplementary_data: {
        related_ids: {
          order_id: 'ORDER-1001',
        },
      },
    },
  };

  const result = await processPayPalWebhookEvent({
    headers: {
      'paypal-auth-algo': 'SHA256withRSA',
      'paypal-cert-url': 'https://api.sandbox.paypal.com/v1/notifications/certs/CERT-1',
      'paypal-transmission-id': 'trans-uuid-001',
      'paypal-transmission-sig': 'sig-001',
      'paypal-transmission-time': '2026-11-09T01:00:00Z',
    },
    body: webhookBody,
    testBypassVerification: true,
  });

  assert.equal(result.success, true);
  assert.equal(result.verified, true);
  assert.equal(result.matchedOrderId, 'ORDER-1001');
  assert.equal(result.newStatus, 'CAPTURED');

  // Verify internal order store was updated
  const updatedOrder = getOrderById('ORDER-1001');
  assert.ok(updatedOrder);
  assert.equal(updatedOrder.status, 'CAPTURED');
  assert.equal(updatedOrder.captureId, 'CAPTURE-777');
});

test('10. Webhook Processing - PAYMENT.CAPTURE.DENIED Updates Status to DENIED', async () => {
  __resetPayPalStoresForTesting();

  registerOrderForTesting({
    orderId: 'ORDER-1002',
    itemName: 'Active Noise-Cancelling Headphones',
    category: 'Shopping',
    serverVerifiedAmount: 129.0,
    currency: 'USD',
    formattedAmountString: '129.00',
    userId: 'user_test_2',
    createdAt: Date.now(),
    status: 'CREATED',
  });

  const webhookBody = {
    id: 'WH-EVENT-002',
    event_type: 'PAYMENT.CAPTURE.DENIED',
    create_time: '2026-11-09T01:05:00Z',
    summary: 'Payment capture denied',
    resource: {
      id: 'CAPTURE-DENIED-1',
      status: 'DENIED',
      amount: { value: '129.00', currency_code: 'USD' },
      supplementary_data: {
        related_ids: {
          order_id: 'ORDER-1002',
        },
      },
    },
  };

  const result = await processPayPalWebhookEvent({
    headers: {
      'paypal-auth-algo': 'SHA256withRSA',
      'paypal-cert-url': 'https://api.sandbox.paypal.com/v1/notifications/certs/CERT-1',
      'paypal-transmission-id': 'trans-uuid-002',
      'paypal-transmission-sig': 'sig-002',
      'paypal-transmission-time': '2026-11-09T01:05:00Z',
    },
    body: webhookBody,
    testBypassVerification: true,
  });

  assert.equal(result.success, true);
  assert.equal(result.verified, true);
  assert.equal(result.newStatus, 'DENIED');

  const updatedOrder = getOrderById('ORDER-1002');
  assert.ok(updatedOrder);
  assert.equal(updatedOrder.status, 'DENIED');
});

test('11. Webhook Processing - PAYMENT.CAPTURE.REFUNDED Updates Status to REFUNDED', async () => {
  __resetPayPalStoresForTesting();

  registerOrderForTesting({
    orderId: 'ORDER-1003',
    itemName: 'Compact Espresso Coffee Machine',
    category: 'Food',
    serverVerifiedAmount: 65.0,
    currency: 'USD',
    formattedAmountString: '65.00',
    userId: 'user_test_3',
    createdAt: Date.now(),
    status: 'CAPTURED',
    captureId: 'CAP-ESPRESSO-1',
  });

  const webhookBody = {
    id: 'WH-EVENT-003',
    event_type: 'PAYMENT.CAPTURE.REFUNDED',
    create_time: '2026-11-09T01:10:00Z',
    summary: 'Payment capture refunded $65.00',
    resource: {
      id: 'REFUND-999',
      status: 'COMPLETED',
      amount: { value: '65.00', currency_code: 'USD' },
      links: [
        {
          href: 'https://api.sandbox.paypal.com/v2/payments/captures/CAP-ESPRESSO-1',
          rel: 'up',
          method: 'GET',
        },
      ],
    },
  };

  const result = await processPayPalWebhookEvent({
    headers: {
      'paypal-auth-algo': 'SHA256withRSA',
      'paypal-cert-url': 'https://api.sandbox.paypal.com/v1/notifications/certs/CERT-1',
      'paypal-transmission-id': 'trans-uuid-003',
      'paypal-transmission-sig': 'sig-003',
      'paypal-transmission-time': '2026-11-09T01:10:00Z',
    },
    body: webhookBody,
    testBypassVerification: true,
  });

  assert.equal(result.success, true);
  assert.equal(result.verified, true);
  assert.equal(result.newStatus, 'REFUNDED');

  const updatedOrder = getOrderById('ORDER-1003');
  assert.ok(updatedOrder);
  assert.equal(updatedOrder.status, 'REFUNDED');
  assert.equal(updatedOrder.refundId, 'REFUND-999');
  assert.equal(updatedOrder.refundAmount, 65.0);
});

test('12. Webhook Processing - PAYMENT.CAPTURE.REVERSED Updates Status to REVERSED', async () => {
  __resetPayPalStoresForTesting();

  registerOrderForTesting({
    orderId: 'ORDER-1004',
    itemName: 'Monthly Eco City Transit Card',
    category: 'Transportation',
    serverVerifiedAmount: 55.0,
    currency: 'USD',
    formattedAmountString: '55.00',
    userId: 'user_test_4',
    createdAt: Date.now(),
    status: 'CAPTURED',
    captureId: 'CAP-TRANSIT-1',
  });

  const webhookBody = {
    id: 'WH-EVENT-004',
    event_type: 'PAYMENT.CAPTURE.REVERSED',
    create_time: '2026-11-09T01:15:00Z',
    summary: 'Payment capture reversed',
    resource: {
      id: 'CAP-TRANSIT-1',
      status: 'REVERSED',
      amount: { value: '55.00', currency_code: 'USD' },
    },
  };

  const result = await processPayPalWebhookEvent({
    headers: {
      'paypal-auth-algo': 'SHA256withRSA',
      'paypal-cert-url': 'https://api.sandbox.paypal.com/v1/notifications/certs/CERT-1',
      'paypal-transmission-id': 'trans-uuid-004',
      'paypal-transmission-sig': 'sig-004',
      'paypal-transmission-time': '2026-11-09T01:15:00Z',
    },
    body: webhookBody,
    testBypassVerification: true,
  });

  assert.equal(result.success, true);
  assert.equal(result.newStatus, 'REVERSED');

  const updatedOrder = getOrderById('ORDER-1004');
  assert.ok(updatedOrder);
  assert.equal(updatedOrder.status, 'REVERSED');
});

test('13. Webhook Idempotency - Duplicate Event IDs Are Acknowledged Without Duplication', async () => {
  __resetPayPalStoresForTesting();

  registerOrderForTesting({
    orderId: 'ORDER-1005',
    itemName: 'Personal Wealth & Budgeting Mastery',
    category: 'Education',
    serverVerifiedAmount: 39.0,
    currency: 'USD',
    formattedAmountString: '39.00',
    userId: 'user_test_5',
    createdAt: Date.now(),
    status: 'CREATED',
  });

  const webhookBody = {
    id: 'WH-EVENT-IDEMPOTENT-1',
    event_type: 'PAYMENT.CAPTURE.COMPLETED',
    create_time: '2026-11-09T01:20:00Z',
    resource: {
      id: 'CAP-EDU-1',
      status: 'COMPLETED',
      supplementary_data: { related_ids: { order_id: 'ORDER-1005' } },
    },
  };

  // First delivery
  const res1 = await processPayPalWebhookEvent({
    headers: {
      'paypal-auth-algo': 'SHA256withRSA',
      'paypal-cert-url': 'https://api.sandbox.paypal.com/v1/notifications/certs/CERT-1',
      'paypal-transmission-id': 'trans-uuid-005',
      'paypal-transmission-sig': 'sig-005',
      'paypal-transmission-time': '2026-11-09T01:20:00Z',
    },
    body: webhookBody,
    testBypassVerification: true,
  });

  assert.equal(res1.success, true);
  assert.equal(res1.isDuplicate, false);
  assert.equal(res1.newStatus, 'CAPTURED');

  // Second delivery with identical event ID
  const res2 = await processPayPalWebhookEvent({
    headers: {
      'paypal-auth-algo': 'SHA256withRSA',
      'paypal-cert-url': 'https://api.sandbox.paypal.com/v1/notifications/certs/CERT-1',
      'paypal-transmission-id': 'trans-uuid-005-retry',
      'paypal-transmission-sig': 'sig-005',
      'paypal-transmission-time': '2026-11-09T01:20:05Z',
    },
    body: webhookBody,
    testBypassVerification: true,
  });

  // Idempotency: duplicate is detected, acknowledged safely, and not double-processed
  assert.equal(res2.success, true);
  assert.equal(res2.isDuplicate, true);
  assert.match(res2.message, /already processed/);
});

test('14. Webhook Security - Never Trust Unverified Webhook Payload', async () => {
  __resetPayPalStoresForTesting();

  registerOrderForTesting({
    orderId: 'ORDER-1006',
    itemName: 'Health & Fitness Smartwatch',
    category: 'Shopping',
    serverVerifiedAmount: 79.0,
    currency: 'USD',
    formattedAmountString: '79.00',
    userId: 'user_test_6',
    createdAt: Date.now(),
    status: 'CREATED',
  });

  // Incoming webhook with bogus or missing headers
  const unverifiedResult = await processPayPalWebhookEvent({
    headers: {
      'paypal-auth-algo': 'SHA256withRSA',
      // Missing other mandatory headers
    },
    body: {
      id: 'WH-MALICIOUS-1',
      event_type: 'PAYMENT.CAPTURE.COMPLETED',
      resource: {
        id: 'FAKE-CAP-1',
        supplementary_data: { related_ids: { order_id: 'ORDER-1006' } },
      },
    },
  });

  // Must be rejected
  assert.equal(unverifiedResult.verified, false);
  assert.equal(unverifiedResult.success, false);

  // Status of the order MUST NOT change!
  const order = getOrderById('ORDER-1006');
  assert.ok(order);
  assert.equal(order.status, 'CREATED'); // Unchanged!
});

test('15. Webhook Event Ledger - Preserves Full Audit Records', () => {
  const events = getRecordedWebhookEvents();
  assert.ok(Array.isArray(events));
  assert.ok(events.length > 0);

  // Verify fields on stored events
  for (const evt of events) {
    assert.ok(evt.id);
    assert.ok(evt.eventType);
    assert.ok(evt.verificationStatus);
    assert.ok(evt.processingStatus);
    assert.ok(evt.processedAt > 0);
  }
});
