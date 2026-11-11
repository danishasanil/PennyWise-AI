/**
 * PennyWise AI - PayPal Sandbox Payment Engine
 * 
 * Secure backend service for PayPal Sandbox REST API:
 * - Server-validated authoritative demo product pricing (rejects/ignores client manipulation)
 * - OAuth 2.0 token acquisition and caching
 * - Orders API creation and verification
 * - Capture verification and duplicate capture prevention (idempotency)
 * - Automatic verified Expense record generation
 */

import {
  convertCurrency,
  getDecimalPlacesForCurrency,
  isPayPalSupportedCurrency,
  PAYPAL_SUPPORTED_CURRENCY_CODES,
} from '../data/internationalData.js';
import { ExpenseCategory, EXPENSE_CATEGORIES } from '../types/finance.js';

export interface DemoProduct {
  id: string;
  title: string;
  description: string;
  price: number; // Base price in USD
  category: ExpenseCategory;
  badge?: string;
  iconName: string;
}

export const DEMO_PRODUCTS: DemoProduct[] = [
  {
    id: 'prod_chair_ergo',
    title: 'Ergonomic High-Back Desk Chair',
    description: 'Lumbar support mesh office chair for healthy productivity posture.',
    price: 189.0,
    category: 'Housing',
    badge: 'Popular for Home Office',
    iconName: 'Armchair',
  },
  {
    id: 'prod_headphones_anc',
    title: 'Active Noise-Cancelling Headphones',
    description: 'Over-ear wireless headphones with transparency mode and 30hr battery.',
    price: 129.0,
    category: 'Shopping',
    badge: 'Best Seller',
    iconName: 'Headphones',
  },
  {
    id: 'prod_smartwatch_fitness',
    title: 'Health & Fitness Smartwatch',
    description: 'Heart rate tracker, sleep monitor, and waterproof GPS sport watch.',
    price: 79.0,
    category: 'Shopping',
    badge: 'Wellness',
    iconName: 'Watch',
  },
  {
    id: 'prod_espresso_compact',
    title: 'Compact Espresso Coffee Machine',
    description: '15-bar Italian pump espresso maker with milk frother steam wand.',
    price: 65.0,
    category: 'Food',
    badge: 'Kitchen Essential',
    iconName: 'Coffee',
  },
  {
    id: 'prod_running_shoes',
    title: 'Lightweight Trail Running Shoes',
    description: 'Cushioned breathable athletic running shoes for jogging and training.',
    price: 75.0,
    category: 'Shopping',
    badge: 'Athletics',
    iconName: 'Footprints',
  },
  {
    id: 'prod_organic_superfood',
    title: 'Weekly Organic Grocery Basket',
    description: 'Fresh farm vegetables, seasonal fruits, organic oats, and dairy.',
    price: 45.0,
    category: 'Groceries',
    badge: 'Healthy Nutrition',
    iconName: 'Apple',
  },
  {
    id: 'prod_finance_course',
    title: 'Personal Wealth & Budgeting Mastery',
    description: 'Comprehensive digital guide and video course on personal capital growth.',
    price: 39.0,
    category: 'Education',
    badge: 'Financial Literacy',
    iconName: 'GraduationCap',
  },
  {
    id: 'prod_transit_pass',
    title: 'Monthly Eco City Transit Card',
    description: 'Unlimited subway, tram, and bus transit pass for 30 days.',
    price: 55.0,
    category: 'Transportation',
    badge: 'Commuter Choice',
    iconName: 'Bus',
  },
];

export type OrderStatus =
  | 'CREATED'
  | 'APPROVED'
  | 'CAPTURED'
  | 'DENIED'
  | 'FAILED'
  | 'CANCELLED'
  | 'REFUNDED'
  | 'REVERSED';

export type CaptureStatus =
  | 'COMPLETED'
  | 'PENDING'
  | 'FAILED'
  | 'DENIED'
  | 'ALREADY_CAPTURED'
  | 'REFUNDED'
  | 'REVERSED';

export interface OrderStatusHistoryItem {
  status: OrderStatus;
  timestamp: number;
  source: 'api' | 'webhook' | 'system';
  reason?: string;
  eventId?: string;
}

export interface VerifiedOrderDetails {
  orderId: string;
  productId?: string;
  itemName: string;
  category: ExpenseCategory;
  serverVerifiedAmount: number;
  currency: string;
  formattedAmountString: string;
  originalAmount?: number;
  originalCurrency?: string;
  exchangeRate?: number;
  userId?: string;
  createdAt: number;
  updatedAt?: number;
  status: OrderStatus;
  captureId?: string;
  refundId?: string;
  refundAmount?: number;
  history?: OrderStatusHistoryItem[];
}

export interface VerifiedCaptureResult {
  verified: boolean;
  status: CaptureStatus;
  orderId: string;
  captureId?: string;
  amount: number;
  currency: string;
  originalAmount?: number;
  originalCurrency?: string;
  exchangeRate?: number;
  payer?: {
    email_address?: string;
    payer_id?: string;
    name?: { given_name?: string; surname?: string };
  };
  expenseRecord?: {
    id: string;
    userId: string;
    title: string;
    amount: number;
    currency: string;
    originalAmount?: number;
    originalCurrency?: string;
    exchangeRate?: number;
    category: ExpenseCategory;
    date: string;
    paymentMethod: string;
    status: 'completed' | 'pending' | 'cleared' | 'refunded' | 'reversed' | 'denied';
    source: 'PayPal';
    notes: string;
    isEssential: boolean;
    createdAt: string;
  };
  errorMessage?: string;
}

export interface WebhookEventRecord {
  id: string; // PayPal Event ID e.g. WH-XXXXXXXX
  eventType: string; // e.g. PAYMENT.CAPTURE.COMPLETED, PAYMENT.CAPTURE.DENIED, PAYMENT.CAPTURE.REFUNDED
  summary?: string;
  createTime: string;
  resourceId?: string;
  resourceType?: string;
  matchedOrderId?: string;
  matchedCaptureId?: string;
  verificationStatus: 'SUCCESS' | 'FAILURE' | 'UNVERIFIED';
  processingStatus: 'PROCESSED' | 'DUPLICATE' | 'IGNORED' | 'ERROR';
  previousTransactionStatus?: string;
  newTransactionStatus?: string;
  processedAt: number;
  message?: string;
}

export interface WebhookProcessResult {
  success: boolean;
  verified: boolean;
  eventId: string;
  eventType: string;
  matchedOrderId?: string;
  matchedCaptureId?: string;
  previousStatus?: string;
  newStatus?: string;
  isDuplicate?: boolean;
  message: string;
  eventRecord?: WebhookEventRecord;
}

// In-memory server authoritative stores
const createdOrdersStore = new Map<string, VerifiedOrderDetails>();
const capturedOrdersStore = new Map<string, VerifiedCaptureResult>();
const recordedWebhookEvents = new Map<string, WebhookEventRecord>();

// In-memory OAuth token cache
let cachedToken: { token: string; expiresAt: number } | null = null;

export const PAYPAL_BASE_URL = 'https://api-m.sandbox.paypal.com';

/**
 * Retrieves valid PayPal Sandbox OAuth 2.0 access token
 */
export async function getPayPalAccessToken(): Promise<string | null> {
  const clientId = process.env.PAYPAL_CLIENT_ID || '';
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET || '';

  if (!clientId || !clientSecret) {
    return null;
  }

  // Return cached token if valid for more than 60 seconds
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60 * 1000) {
    return cachedToken.token;
  }

  try {
    const auth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
    const response = await fetch(`${PAYPAL_BASE_URL}/v1/oauth2/token`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'grant_type=client_credentials',
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    if (data.access_token) {
      cachedToken = {
        token: data.access_token,
        expiresAt: Date.now() + (Number(data.expires_in) || 3600) * 1000,
      };
      return data.access_token;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Format currency amount safe for PayPal REST API (handling zero-decimal currencies)
 */
export function formatPayPalAmount(amount: number, currency: string): string {
  const decimals = getDecimalPlacesForCurrency(currency);
  if (decimals === 0) {
    return Math.round(amount).toString();
  }
  return amount.toFixed(decimals);
}

/**
 * Validates and computes the authoritative charge amount entirely on the server.
 * NEVER trusts client-submitted amounts for catalog items.
 */
export function verifyAndCalculateChargeAmount(params: {
  productId?: string;
  customItem?: {
    itemName?: string;
    price?: number;
    currency?: string;
    category?: string;
  };
  targetCurrency?: string;
  quantity?: number;
  clientProvidedAmount?: number;
}): {
  itemName: string;
  category: ExpenseCategory;
  verifiedAmount: number;
  currency: string;
  formattedValue: string;
  originalAmount: number;
  originalCurrency: string;
  exchangeRate: number;
  isCatalogProduct: boolean;
} {
  const targetCurrency = (params.targetCurrency || 'USD').toUpperCase().trim();

  // Validate currency support
  if (!isPayPalSupportedCurrency(targetCurrency)) {
    throw new Error(
      `Currency "${targetCurrency}" is not supported by PayPal Sandbox checkout. Please select a supported PayPal currency.`
    );
  }

  const qty = Math.max(1, Math.min(10, Math.floor(Number(params.quantity) || 1)));

  // Case A: Catalog product (100% server authoritative price)
  if (params.productId) {
    const product = DEMO_PRODUCTS.find((p) => p.id === params.productId);
    if (!product) {
      throw new Error(`Demo product with ID "${params.productId}" was not found in authoritative catalog.`);
    }

    // Base price in USD * quantity
    const baseUsdPrice = product.price * qty;

    // If target currency is USD, use base price; otherwise convert deterministically on the server
    let finalAmount = baseUsdPrice;
    let exchangeRate = 1.0;
    if (targetCurrency !== 'USD') {
      const conversion = convertCurrency(baseUsdPrice, 'USD', targetCurrency);
      finalAmount = conversion.targetAmount;
      exchangeRate = conversion.rate;
    }

    const formattedValue = formatPayPalAmount(finalAmount, targetCurrency);
    const parsedVerifiedAmount = parseFloat(formattedValue);

    return {
      itemName: product.title,
      category: product.category,
      verifiedAmount: parsedVerifiedAmount,
      currency: targetCurrency,
      formattedValue,
      originalAmount: baseUsdPrice,
      originalCurrency: 'USD',
      exchangeRate,
      isCatalogProduct: true,
    };
  }

  // Case B: Custom evaluated item from Purchase Analyzer
  if (params.customItem && params.customItem.itemName) {
    const rawName = String(params.customItem.itemName).trim();
    if (!rawName || rawName.length > 100) {
      throw new Error('Custom item name must be between 1 and 100 characters.');
    }

    const rawPrice = Number(params.customItem.price);
    if (isNaN(rawPrice) || rawPrice <= 0) {
      throw new Error('Purchase price must be a valid positive number greater than zero.');
    }

    const itemCurrency = (params.customItem.currency || targetCurrency).toUpperCase().trim();

    const rawCategory = params.customItem.category as ExpenseCategory;
    const verifiedCategory: ExpenseCategory = EXPENSE_CATEGORIES.includes(rawCategory)
      ? rawCategory
      : 'Shopping';

    const originalTotal = rawPrice * qty;
    let finalAmount = originalTotal;
    let exchangeRate = 1.0;

    // Convert from item's native currency (e.g. INR) to PayPal's settlement currency (e.g. USD)
    if (itemCurrency !== targetCurrency) {
      const conversion = convertCurrency(originalTotal, itemCurrency, targetCurrency);
      finalAmount = conversion.targetAmount;
      exchangeRate = conversion.rate;
    }

    // Safety limit: ensure converted amount in USD does not exceed $10,000 USD
    const usdEquivalent =
      targetCurrency === 'USD'
        ? finalAmount
        : convertCurrency(finalAmount, targetCurrency, 'USD').targetAmount;

    if (usdEquivalent > 10000) {
      throw new Error('Purchase amount exceeds demo store checkout limit ($10,000 USD equivalent).');
    }

    const formattedValue = formatPayPalAmount(finalAmount, targetCurrency);
    const parsedVerifiedAmount = parseFloat(formattedValue);

    return {
      itemName: rawName,
      category: verifiedCategory,
      verifiedAmount: parsedVerifiedAmount,
      currency: targetCurrency,
      formattedValue,
      originalAmount: originalTotal,
      originalCurrency: itemCurrency,
      exchangeRate,
      isCatalogProduct: false,
    };
  }

  throw new Error('Either a valid productId or customItem specification is required for checkout.');
}

/**
 * Creates PayPal Sandbox Order using PayPal REST Orders API
 */
export async function createPayPalSandboxOrder(params: {
  productId?: string;
  customItem?: { itemName?: string; price?: number; currency?: string; category?: string };
  targetCurrency?: string;
  quantity?: number;
  userId?: string;
  clientProvidedAmount?: number;
}): Promise<{
  orderId: string;
  status: string;
  currency: string;
  amount: number;
  formattedValue: string;
  originalAmount?: number;
  originalCurrency?: string;
  exchangeRate?: number;
  itemName: string;
  category: ExpenseCategory;
}> {
  // 1. Calculate authoritative charge on server
  const charge = verifyAndCalculateChargeAmount({
    productId: params.productId,
    customItem: params.customItem,
    targetCurrency: params.targetCurrency,
    quantity: params.quantity,
    clientProvidedAmount: params.clientProvidedAmount,
  });

  // 2. Obtain OAuth token
  const accessToken = await getPayPalAccessToken();
  if (!accessToken) {
    throw new Error(
      'PayPal Sandbox credentials are not configured in environment (PAYPAL_CLIENT_ID / PAYPAL_CLIENT_SECRET).'
    );
  }

  // 3. Construct PayPal Orders API payload
  const orderPayload = {
    intent: 'CAPTURE',
    purchase_units: [
      {
        description: `PennyWise Demo Store: ${charge.itemName}`.slice(0, 127),
        amount: {
          currency_code: charge.currency,
          value: charge.formattedValue,
        },
      },
    ],
    application_context: {
      brand_name: 'PennyWise AI Demo Store',
      landing_page: 'NO_PREFERENCE',
      user_action: 'PAY_NOW',
    },
  };

  const response = await fetch(`${PAYPAL_BASE_URL}/v2/checkout/orders`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(orderPayload),
  });

  const orderData = await response.json();

  if (!response.ok || !orderData.id) {
    throw new Error(
      orderData.message || orderData.details?.[0]?.description || 'Failed to create PayPal order.'
    );
  }

  // 4. Save verified order details into authoritative server store
  createdOrdersStore.set(orderData.id, {
    orderId: orderData.id,
    productId: params.productId,
    itemName: charge.itemName,
    category: charge.category,
    serverVerifiedAmount: charge.verifiedAmount,
    currency: charge.currency,
    formattedAmountString: charge.formattedValue,
    originalAmount: charge.originalAmount,
    originalCurrency: charge.originalCurrency,
    exchangeRate: charge.exchangeRate,
    userId: params.userId || 'guest',
    createdAt: Date.now(),
    status: 'CREATED',
  });

  return {
    orderId: orderData.id,
    status: orderData.status,
    currency: charge.currency,
    amount: charge.verifiedAmount,
    formattedValue: charge.formattedValue,
    originalAmount: charge.originalAmount,
    originalCurrency: charge.originalCurrency,
    exchangeRate: charge.exchangeRate,
    itemName: charge.itemName,
    category: charge.category,
  };
}

/**
 * Captures PayPal Sandbox Order and strictly verifies COMPLETED status
 * Enforces duplicate capture prevention (Idempotency)
 */
export async function capturePayPalSandboxOrder(params: {
  orderId: string;
  userId?: string;
}): Promise<VerifiedCaptureResult> {
  const { orderId, userId = 'local' } = params;

  if (!orderId || typeof orderId !== 'string') {
    return {
      verified: false,
      status: 'FAILED',
      orderId: orderId || '',
      amount: 0,
      currency: 'USD',
      errorMessage: 'Order ID is required.',
    };
  }

  // IDEMPOTENCY CHECK: Prevent duplicate capture
  if (capturedOrdersStore.has(orderId)) {
    const existing = capturedOrdersStore.get(orderId)!;
    return {
      ...existing,
      status: 'ALREADY_CAPTURED',
      verified: true,
    };
  }

  const accessToken = await getPayPalAccessToken();
  if (!accessToken) {
    return {
      verified: false,
      status: 'FAILED',
      orderId,
      amount: 0,
      currency: 'USD',
      errorMessage: 'PayPal Sandbox credentials not available to verify capture.',
    };
  }

  const response = await fetch(`${PAYPAL_BASE_URL}/v2/checkout/orders/${orderId}/capture`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  });

  const captureData = await response.json();

  if (!response.ok) {
    return {
      verified: false,
      status: 'FAILED',
      orderId,
      amount: 0,
      currency: 'USD',
      errorMessage:
        captureData.message || captureData.details?.[0]?.description || 'PayPal capture request failed.',
    };
  }

  const paypalStatus = captureData.status;
  const isCompleted = paypalStatus === 'COMPLETED';

  // Strict verification check
  if (!isCompleted) {
    return {
      verified: false,
      status: (paypalStatus as any) || 'FAILED',
      orderId,
      amount: 0,
      currency: 'USD',
      errorMessage: `PayPal reported unverified capture status: "${paypalStatus}". Transaction not approved.`,
    };
  }

  const captureUnit = captureData.purchase_units?.[0]?.payments?.captures?.[0];
  const captureId = captureUnit?.id || `cap_${Date.now()}`;
  const capturedAmount = parseFloat(captureUnit?.amount?.value || '0');
  const capturedCurrency = captureUnit?.amount?.currency_code || 'USD';

  // Retrieve original order context
  const orderContext = createdOrdersStore.get(orderId);
  const title = orderContext?.itemName || 'Demo Store Purchase';
  const category = orderContext?.category || 'Shopping';

  const hasConversion =
    orderContext?.originalCurrency &&
    orderContext.originalCurrency !== capturedCurrency &&
    orderContext.originalAmount;

  const notes = hasConversion
    ? `Verified PayPal Sandbox capture (Order: ${orderId}, Capture: ${captureId}). Converted from original ${orderContext!.originalCurrency} ${orderContext!.originalAmount} to ${capturedCurrency} ${capturedAmount} at exchange rate ${orderContext!.exchangeRate}.`
    : `Verified PayPal Sandbox capture (Order: ${orderId}, Capture: ${captureId})`;

  // Construct verified expense record
  const expenseRecord: VerifiedCaptureResult['expenseRecord'] = {
    id: `exp_paypal_${captureId}`,
    userId,
    title,
    amount: capturedAmount,
    currency: capturedCurrency,
    originalAmount: orderContext?.originalAmount,
    originalCurrency: orderContext?.originalCurrency,
    exchangeRate: orderContext?.exchangeRate,
    category,
    date: new Date().toISOString().split('T')[0],
    paymentMethod: 'PayPal Sandbox',
    status: 'completed',
    source: 'PayPal',
    notes,
    isEssential: category === 'Groceries' || category === 'Housing' || category === 'Bills',
    createdAt: new Date().toISOString(),
  };

  const result: VerifiedCaptureResult = {
    verified: true,
    status: 'COMPLETED',
    orderId,
    captureId,
    amount: capturedAmount,
    currency: capturedCurrency,
    originalAmount: orderContext?.originalAmount,
    originalCurrency: orderContext?.originalCurrency,
    exchangeRate: orderContext?.exchangeRate,
    payer: captureData.payer,
    expenseRecord,
  };

  // Mark as captured to block duplicate executions
  capturedOrdersStore.set(orderId, result);
  if (orderContext) {
    orderContext.status = 'CAPTURED';
  }

  return result;
}

/**
 * Checks if an order was already captured
 */
export function isOrderCaptured(orderId: string): boolean {
  return capturedOrdersStore.has(orderId);
}

/**
 * Case-insensitive header extractor helper
 */
function getHeader(headers: Record<string, string | string[] | undefined>, name: string): string | undefined {
  const target = name.toLowerCase();
  for (const [key, value] of Object.entries(headers)) {
    if (key.toLowerCase() === target) {
      if (Array.isArray(value)) return value[0];
      return value;
    }
  }
  return undefined;
}

/**
 * Official PayPal Webhook Signature Verification
 * POST /v1/notifications/verify-webhook-signature
 */
export async function verifyPayPalWebhookSignature(params: {
  headers: Record<string, string | string[] | undefined>;
  body: any;
  webhookId?: string;
  testBypassVerification?: boolean;
}): Promise<{ verified: boolean; error?: string }> {
  // Test flag to allow deterministic verification in automated offline unit tests
  if (params.testBypassVerification) {
    return { verified: true };
  }

  const authAlgo = getHeader(params.headers, 'paypal-auth-algo');
  const certUrl = getHeader(params.headers, 'paypal-cert-url');
  const transmissionId = getHeader(params.headers, 'paypal-transmission-id');
  const transmissionSig = getHeader(params.headers, 'paypal-transmission-sig');
  const transmissionTime = getHeader(params.headers, 'paypal-transmission-time');

  // Rule: Check that all 5 required PayPal signature headers are present
  if (!authAlgo || !certUrl || !transmissionId || !transmissionSig || !transmissionTime) {
    return {
      verified: false,
      error:
        'Missing mandatory PayPal signature headers (paypal-auth-algo, paypal-cert-url, paypal-transmission-id, paypal-transmission-sig, paypal-transmission-time).',
    };
  }

  // Security guard: Validate cert_url protocol and hostname to prevent SSRF
  try {
    const parsedCertUrl = new URL(certUrl);
    const hostname = parsedCertUrl.hostname.toLowerCase();
    const isPayPalHost = hostname === 'api.paypal.com' || hostname.endsWith('.paypal.com');
    if (parsedCertUrl.protocol !== 'https:' || !isPayPalHost) {
      return {
        verified: false,
        error: `Untrusted certificate URL domain: "${hostname}". Certificate must be hosted on an official paypal.com domain.`,
      };
    }
  } catch {
    return {
      verified: false,
      error: 'Malformed certificate URL.',
    };
  }

  // Obtain OAuth 2.0 access token
  const accessToken = await getPayPalAccessToken();
  if (!accessToken) {
    return {
      verified: false,
      error: 'PayPal credentials not configured in environment to verify webhook signature.',
    };
  }

  const webhookId =
    params.webhookId ||
    process.env.PAYPAL_WEBHOOK_ID ||
    '39e6ee90-7b27-40fe-9e72-38b57b320c6a';

  try {
    const response = await fetch(`${PAYPAL_BASE_URL}/v1/notifications/verify-webhook-signature`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        auth_algo: authAlgo,
        cert_url: certUrl,
        transmission_id: transmissionId,
        transmission_sig: transmissionSig,
        transmission_time: transmissionTime,
        webhook_id: webhookId,
        webhook_event: params.body,
      }),
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      return {
        verified: false,
        error:
          errData.message ||
          errData.details?.[0]?.description ||
          `PayPal signature verification returned HTTP ${response.status}`,
      };
    }

    const data = await response.json();
    if (data.verification_status === 'SUCCESS') {
      return { verified: true };
    }

    return {
      verified: false,
      error: `PayPal verification status: "${data.verification_status || 'FAILURE'}". Payload untrusted.`,
    };
  } catch (err: any) {
    return {
      verified: false,
      error: `Network error verifying webhook signature: ${err.message || 'unknown'}`,
    };
  }
}

/**
 * Matches a PayPal webhook event resource to an internal order
 */
export function findMatchingOrder(resource: any): VerifiedOrderDetails | undefined {
  if (!resource || typeof resource !== 'object') return undefined;

  // 1. Direct order ID in supplementary_data (standard in PayPal REST captures)
  const relatedOrderId = resource.supplementary_data?.related_ids?.order_id;
  if (relatedOrderId && createdOrdersStore.has(relatedOrderId)) {
    return createdOrdersStore.get(relatedOrderId);
  }

  // 2. Custom ID field often set to order ID or user ID
  if (resource.custom_id && createdOrdersStore.has(resource.custom_id)) {
    return createdOrdersStore.get(resource.custom_id);
  }

  // 3. Direct match if resource.id is the order ID (e.g. CHECKOUT.ORDER.* events)
  if (resource.id && createdOrdersStore.has(resource.id)) {
    return createdOrdersStore.get(resource.id);
  }

  // 4. Match by captureId stored on order
  if (resource.id) {
    for (const order of createdOrdersStore.values()) {
      if (order.captureId === resource.id) {
        return order;
      }
    }
  }

  // 5. Match by parent capture link (standard for refunds where rel === 'up')
  if (Array.isArray(resource.links)) {
    const upLink = resource.links.find((l: any) => l.rel === 'up');
    if (upLink && typeof upLink.href === 'string') {
      const match = upLink.href.match(/captures\/([A-Za-z0-9_-]+)/);
      if (match && match[1]) {
        const parentCaptureId = match[1];
        for (const order of createdOrdersStore.values()) {
          if (order.captureId === parentCaptureId) {
            return order;
          }
        }
      }
    }
  }

  return undefined;
}

/**
 * Process a verified PayPal Webhook event with idempotency and safe state transitions
 */
export async function processPayPalWebhookEvent(params: {
  headers: Record<string, string | string[] | undefined>;
  body: any;
  webhookId?: string;
  testBypassVerification?: boolean;
}): Promise<WebhookProcessResult> {
  const { headers, body, testBypassVerification, webhookId } = params;

  if (!body || typeof body !== 'object' || !body.id || !body.event_type) {
    return {
      success: false,
      verified: false,
      eventId: body?.id || 'invalid',
      eventType: body?.event_type || 'UNKNOWN',
      message: 'Invalid webhook payload structure: missing id or event_type.',
    };
  }

  const eventId = String(body.id);
  const eventType = String(body.event_type);
  const resource = body.resource || {};

  // 1. VERIFY SIGNATURE FIRST (Requirement: Never trust unverified payload)
  const verification = await verifyPayPalWebhookSignature({
    headers,
    body,
    webhookId,
    testBypassVerification,
  });

  if (!verification.verified) {
    const errorRecord: WebhookEventRecord = {
      id: eventId,
      eventType,
      summary: body.summary || 'Unverified Webhook Event',
      createTime: body.create_time || new Date().toISOString(),
      resourceId: resource.id,
      resourceType: body.resource_type,
      verificationStatus: 'FAILURE',
      processingStatus: 'IGNORED',
      processedAt: Date.now(),
      message: verification.error || 'Signature verification failed',
    };
    recordedWebhookEvents.set(eventId, errorRecord);
    console.warn(`[PayPal Webhook Security] Rejected unverified event ${eventId} (${eventType}): ${verification.error}`);

    return {
      success: false,
      verified: false,
      eventId,
      eventType,
      message: verification.error || 'Webhook signature verification failed.',
      eventRecord: errorRecord,
    };
  }

  // 2. IDEMPOTENCY CHECK (Requirement: Prevent duplicate processing)
  if (recordedWebhookEvents.has(eventId)) {
    const existing = recordedWebhookEvents.get(eventId)!;
    console.log(`[PayPal Webhook] Duplicate event ${eventId} (${eventType}) detected and safely ignored.`);

    return {
      success: true,
      verified: true,
      eventId,
      eventType,
      matchedOrderId: existing.matchedOrderId,
      matchedCaptureId: existing.matchedCaptureId,
      previousStatus: existing.previousTransactionStatus,
      newStatus: existing.newTransactionStatus,
      isDuplicate: true,
      message: `Webhook event ID ${eventId} was already processed previously (idempotency preserved).`,
      eventRecord: existing,
    };
  }

  // 3. MATCH WITH INTERNAL PURCHASE (Requirement: Match with correct internal purchase)
  const matchedOrder = findMatchingOrder(resource);
  const matchedOrderId = matchedOrder?.orderId || resource.supplementary_data?.related_ids?.order_id || resource.id;
  const previousStatus = matchedOrder?.status || 'UNKNOWN';
  let newStatus: OrderStatus | undefined = undefined;
  let captureId: string | undefined = undefined;

  // 4. SAFE TRANSACTION STATE MACHINE
  switch (eventType) {
    case 'PAYMENT.CAPTURE.COMPLETED': {
      captureId = resource.id;
      // Do not allow completed event to revert a refunded or reversed transaction
      if (matchedOrder && (matchedOrder.status === 'REFUNDED' || matchedOrder.status === 'REVERSED')) {
        console.warn(`[PayPal Webhook] Order ${matchedOrderId} is already ${matchedOrder.status}. Cannot revert to CAPTURED.`);
        newStatus = matchedOrder.status;
      } else {
        newStatus = 'CAPTURED';
        if (matchedOrder) {
          matchedOrder.status = 'CAPTURED';
          matchedOrder.captureId = captureId;
          matchedOrder.updatedAt = Date.now();
          matchedOrder.history = matchedOrder.history || [];
          matchedOrder.history.push({
            status: 'CAPTURED',
            timestamp: Date.now(),
            source: 'webhook',
            eventId,
            reason: 'PAYMENT.CAPTURE.COMPLETED webhook verified',
          });
        }

        // Sync or register in capturedOrdersStore
        const existingCapture = capturedOrdersStore.get(matchedOrderId);
        if (existingCapture) {
          existingCapture.status = 'COMPLETED';
          if (existingCapture.expenseRecord) {
            existingCapture.expenseRecord.status = 'completed';
          }
        } else if (matchedOrder) {
          const capturedAmount = parseFloat(resource.amount?.value || String(matchedOrder.serverVerifiedAmount));
          const capturedCurrency = resource.amount?.currency_code || matchedOrder.currency;
          capturedOrdersStore.set(matchedOrderId, {
            verified: true,
            status: 'COMPLETED',
            orderId: matchedOrderId,
            captureId,
            amount: capturedAmount,
            currency: capturedCurrency,
            payer: resource.payer,
            expenseRecord: {
              id: `exp_paypal_${captureId || Date.now()}`,
              userId: matchedOrder.userId || 'guest',
              title: matchedOrder.itemName,
              amount: capturedAmount,
              currency: capturedCurrency,
              category: matchedOrder.category,
              date: new Date().toISOString().split('T')[0],
              paymentMethod: 'PayPal Sandbox',
              status: 'completed',
              source: 'PayPal',
              notes: `Verified PayPal Sandbox webhook capture (Order: ${matchedOrderId}, Event: ${eventId})`,
              isEssential: matchedOrder.category === 'Groceries' || matchedOrder.category === 'Housing' || matchedOrder.category === 'Bills',
              createdAt: new Date().toISOString(),
            },
          });
        }
      }
      break;
    }

    case 'PAYMENT.CAPTURE.DENIED': {
      captureId = resource.id;
      newStatus = 'DENIED';
      if (matchedOrder) {
        matchedOrder.status = 'DENIED';
        matchedOrder.updatedAt = Date.now();
        matchedOrder.history = matchedOrder.history || [];
        matchedOrder.history.push({
          status: 'DENIED',
          timestamp: Date.now(),
          source: 'webhook',
          eventId,
          reason: 'PAYMENT.CAPTURE.DENIED webhook verified',
        });
      }

      const existingCapture = capturedOrdersStore.get(matchedOrderId);
      if (existingCapture) {
        existingCapture.status = 'DENIED';
        if (existingCapture.expenseRecord) {
          existingCapture.expenseRecord.status = 'denied';
        }
      }
      break;
    }

    case 'PAYMENT.CAPTURE.REFUNDED': {
      const refundId = resource.id;
      const refundAmount = parseFloat(resource.amount?.value || '0');
      newStatus = 'REFUNDED';

      if (matchedOrder) {
        matchedOrder.status = 'REFUNDED';
        matchedOrder.refundId = refundId;
        matchedOrder.refundAmount = refundAmount;
        matchedOrder.updatedAt = Date.now();
        matchedOrder.history = matchedOrder.history || [];
        matchedOrder.history.push({
          status: 'REFUNDED',
          timestamp: Date.now(),
          source: 'webhook',
          eventId,
          reason: `PAYMENT.CAPTURE.REFUNDED: ${refundAmount} ${resource.amount?.currency_code || ''}`,
        });
      }

      const existingCapture = capturedOrdersStore.get(matchedOrderId);
      if (existingCapture) {
        existingCapture.status = 'REFUNDED';
        if (existingCapture.expenseRecord) {
          existingCapture.expenseRecord.status = 'refunded';
          existingCapture.expenseRecord.notes += ` [REFUNDED via Webhook: ${refundId}]`;
        }
      }
      break;
    }

    case 'PAYMENT.CAPTURE.REVERSED': {
      newStatus = 'REVERSED';
      if (matchedOrder) {
        matchedOrder.status = 'REVERSED';
        matchedOrder.updatedAt = Date.now();
        matchedOrder.history = matchedOrder.history || [];
        matchedOrder.history.push({
          status: 'REVERSED',
          timestamp: Date.now(),
          source: 'webhook',
          eventId,
          reason: 'PAYMENT.CAPTURE.REVERSED webhook verified',
        });
      }

      const existingCapture = capturedOrdersStore.get(matchedOrderId);
      if (existingCapture) {
        existingCapture.status = 'REVERSED';
        if (existingCapture.expenseRecord) {
          existingCapture.expenseRecord.status = 'reversed';
          existingCapture.expenseRecord.notes += ' [REVERSED via Webhook]';
        }
      }
      break;
    }

    case 'CHECKOUT.ORDER.APPROVED': {
      if (matchedOrder && matchedOrder.status === 'CREATED') {
        newStatus = 'APPROVED';
        matchedOrder.status = 'APPROVED';
        matchedOrder.updatedAt = Date.now();
      } else {
        newStatus = matchedOrder?.status || 'APPROVED';
      }
      break;
    }

    default: {
      newStatus = matchedOrder?.status || 'CREATED';
      break;
    }
  }

  // 5. KEEP AUDIT RECORD OF WEBHOOK EVENT ID (Requirement: Keep record of webhook event IDs)
  const eventRecord: WebhookEventRecord = {
    id: eventId,
    eventType,
    summary: body.summary || `${eventType} on ${resource.id || 'resource'}`,
    createTime: body.create_time || new Date().toISOString(),
    resourceId: resource.id,
    resourceType: body.resource_type,
    matchedOrderId: matchedOrder?.orderId,
    matchedCaptureId: captureId || matchedOrder?.captureId,
    verificationStatus: 'SUCCESS',
    processingStatus: 'PROCESSED',
    previousTransactionStatus: previousStatus,
    newTransactionStatus: newStatus,
    processedAt: Date.now(),
    message: `Successfully processed ${eventType} event. Order ${matchedOrderId || 'N/A'} is now ${newStatus}.`,
  };

  recordedWebhookEvents.set(eventId, eventRecord);

  console.log(
    `[PayPal Webhook] Successfully processed event ${eventId} (${eventType}) for order ${matchedOrderId}: status changed from ${previousStatus} to ${newStatus}.`
  );

  return {
    success: true,
    verified: true,
    eventId,
    eventType,
    matchedOrderId: matchedOrder?.orderId,
    matchedCaptureId: captureId,
    previousStatus,
    newStatus,
    isDuplicate: false,
    message: eventRecord.message || 'Webhook event processed successfully',
    eventRecord,
  };
}

/**
 * Returns all recorded webhook events for auditing
 */
export function getRecordedWebhookEvents(): WebhookEventRecord[] {
  return Array.from(recordedWebhookEvents.values()).sort((a, b) => b.processedAt - a.processedAt);
}

/**
 * Returns a specific recorded webhook event
 */
export function getRecordedWebhookEvent(id: string): WebhookEventRecord | undefined {
  return recordedWebhookEvents.get(id);
}

/**
 * Returns all internal tracked orders
 */
export function getAllOrders(): VerifiedOrderDetails[] {
  return Array.from(createdOrdersStore.values()).sort((a, b) => b.createdAt - a.createdAt);
}

/**
 * Returns an internal tracked order by orderId
 */
export function getOrderById(orderId: string): VerifiedOrderDetails | undefined {
  return createdOrdersStore.get(orderId);
}

/**
 * Registers an order into createdOrdersStore (useful for test seeding)
 */
export function registerOrderForTesting(order: VerifiedOrderDetails) {
  createdOrdersStore.set(order.orderId, order);
}

/**
 * Resets stores for unit testing purposes
 */
export function __resetPayPalStoresForTesting() {
  createdOrdersStore.clear();
  capturedOrdersStore.clear();
  recordedWebhookEvents.clear();
  cachedToken = null;
}

