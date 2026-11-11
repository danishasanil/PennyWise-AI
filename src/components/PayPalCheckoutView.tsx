import React, { useState, useEffect, useMemo } from 'react';
import { useFinance } from '../context/FinanceContext';
import { api } from '../services/api';
import {
  CreditCard,
  ShieldCheck,
  CheckCircle,
  AlertCircle,
  Info,
  ShoppingBag,
  ArrowRight,
  ArrowRightLeft,
  Clock,
  Sparkles,
  X,
  XCircle,
  Package,
  ExternalLink,
  RotateCcw,
  Tag,
  AlertTriangle,
  Activity,
  RefreshCw,
  Terminal,
  CheckCheck,
  FileText,
  ShieldAlert,
} from 'lucide-react';
import { PayPalScriptProvider, PayPalButtons } from '@paypal/react-paypal-js';
import {
  isPayPalSupportedCurrency,
  convertCurrency,
  formatCurrencyWithIntl,
  CurrencyConversionResult,
  PAYPAL_SUPPORTED_CURRENCY_CODES,
} from '../data/internationalData';
import { ExpenseCategory } from '../types/finance';

interface DemoProduct {
  id: string;
  title: string;
  description: string;
  price: number;
  category: ExpenseCategory;
  badge?: string;
  iconName: string;
}

export const PayPalCheckoutView: React.FC = () => {
  const {
    profile,
    budget,
    addExpense,
    pendingCheckoutItem,
    setPendingCheckoutItem,
    setActiveTab,
    formatMoney,
    recordPayPalOrder,
    recordVerifiedPayment,
  } = useFinance();

  // PayPal config state from backend
  const [paypalConfig, setPaypalConfig] = useState<{
    clientId: string;
    isConfigured: boolean;
    mode: string;
    supportedCurrencies?: string[];
    demoProducts?: DemoProduct[];
  } | null>(null);

  const [loadingConfig, setLoadingConfig] = useState(true);
  const [demoProducts, setDemoProducts] = useState<DemoProduct[]>([]);

  // Selected item for checkout
  const [selectedProductId, setSelectedProductId] = useState<string>('prod_chair_ergo');
  const [isCustomPurchase, setIsCustomPurchase] = useState<boolean>(false);
  const [customItemDetails, setCustomItemDetails] = useState<{
    itemName: string;
    price: number;
    currency: string;
    category: ExpenseCategory;
    priority?: string;
  }>({
    itemName: 'Ergonomic Desk Chair',
    price: 189.0,
    currency: profile?.preferredCurrency || 'USD',
    category: 'Housing',
  });

  const [quantity, setQuantity] = useState(1);

  // Target PayPal checkout currency when user's budget currency is not directly supported
  const [checkoutCurrency, setCheckoutCurrency] = useState<string>('USD');
  const [conversionData, setConversionData] = useState<CurrencyConversionResult | null>(null);
  const [isConvertedConfirmed, setIsConvertedConfirmed] = useState(false);

  // Payment status workflow
  const [paymentStatus, setPaymentStatus] = useState<
    'idle' | 'processing' | 'verified_success' | 'failed' | 'cancelled'
  >('idle');
  const [verifiedDetails, setVerifiedDetails] = useState<any>(null);
  const [errorMessage, setErrorMessage] = useState('');

  const budgetCurrency = profile?.preferredCurrency || 'USD';
  const isDirectlySupported = isPayPalSupportedCurrency(budgetCurrency);

  // Webhook events ledger state
  const [webhookEvents, setWebhookEvents] = useState<any[]>([]);
  const [loadingWebhooks, setLoadingWebhooks] = useState(false);
  const [showWebhookPanel, setShowWebhookPanel] = useState(false);

  const fetchWebhookEvents = async () => {
    setLoadingWebhooks(true);
    try {
      const data = await api.getPayPalWebhookEvents();
      if (data?.events) {
        setWebhookEvents(data.events);
      }
    } catch {
      // ignore
    } finally {
      setLoadingWebhooks(false);
    }
  };

  // Load PayPal config and products from backend
  useEffect(() => {
    async function loadConfig() {
      try {
        const config = await api.getPayPalConfig();
        setPaypalConfig(config);
        if (config.demoProducts && config.demoProducts.length > 0) {
          setDemoProducts(config.demoProducts);
        } else {
          const prodData = await api.getPayPalProducts();
          if (prodData?.products) {
            setDemoProducts(prodData.products);
          }
        }
      } catch (err) {
        console.warn('Failed to load PayPal config:', err);
      } finally {
        setLoadingConfig(false);
      }
    }
    loadConfig();
    fetchWebhookEvents();
  }, []);

  // Pre-populate if user arrived with an item from Purchase Analyzer
  useEffect(() => {
    if (pendingCheckoutItem) {
      if (pendingCheckoutItem.productId) {
        setSelectedProductId(pendingCheckoutItem.productId);
        setIsCustomPurchase(false);
      } else {
        setIsCustomPurchase(true);
        setCustomItemDetails({
          itemName: pendingCheckoutItem.itemName,
          price: pendingCheckoutItem.price,
          currency: pendingCheckoutItem.currency || budgetCurrency,
          category: pendingCheckoutItem.category,
          priority: pendingCheckoutItem.priority,
        });
      }
    }
  }, [pendingCheckoutItem, budgetCurrency]);

  // Active product details
  const activeProduct = useMemo(() => {
    if (isCustomPurchase) {
      return {
        id: 'custom_item',
        title: customItemDetails.itemName,
        description: `Evaluated item from Purchase Analyzer (${customItemDetails.priority || 'standard'})`,
        price: customItemDetails.price,
        currency: customItemDetails.currency || budgetCurrency,
        category: customItemDetails.category,
        badge: 'Analyzed Product',
      };
    }
    return (
      demoProducts.find((p) => p.id === selectedProductId) ||
      demoProducts[0] || {
        id: 'prod_chair_ergo',
        title: 'Ergonomic High-Back Desk Chair',
        description: 'Lumbar support mesh office chair for healthy productivity posture.',
        price: 189.0,
        currency: 'USD',
        category: 'Housing' as ExpenseCategory,
        badge: 'Popular for Home Office',
      }
    );
  }, [isCustomPurchase, customItemDetails, selectedProductId, demoProducts, budgetCurrency]);

  // Compute total price in base currency (USD) for catalog or item currency for custom item
  const totalBasePrice = useMemo(() => {
    return activeProduct.price * quantity;
  }, [activeProduct.price, quantity]);

  // Compute price in user's preferred budget currency
  const totalInBudgetCurrency = useMemo(() => {
    if (isCustomPurchase) {
      const itemCurrency = customItemDetails.currency || budgetCurrency;
      const rawTotal = customItemDetails.price * quantity;
      if (itemCurrency === budgetCurrency) {
        return rawTotal;
      }
      try {
        const converted = convertCurrency(rawTotal, itemCurrency, budgetCurrency);
        return converted.targetAmount;
      } catch {
        return rawTotal;
      }
    } else {
      // Catalog products are priced in USD
      if (budgetCurrency === 'USD') return totalBasePrice;
      try {
        const converted = convertCurrency(totalBasePrice, 'USD', budgetCurrency);
        return converted.targetAmount;
      } catch {
        return totalBasePrice;
      }
    }
  }, [isCustomPurchase, customItemDetails, totalBasePrice, quantity, budgetCurrency]);

  // Compute PayPal checkout conversion when user budget currency is not supported by PayPal
  useEffect(() => {
    if (!isDirectlySupported) {
      try {
        const result = convertCurrency(totalInBudgetCurrency, budgetCurrency, checkoutCurrency);
        setConversionData(result);
        setIsConvertedConfirmed(false);
      } catch {
        setConversionData(null);
      }
    } else {
      setConversionData(null);
      setIsConvertedConfirmed(true);
    }
  }, [totalInBudgetCurrency, budgetCurrency, checkoutCurrency, isDirectlySupported]);

  // Calculate live budget impact
  const budgetImpact = useMemo(() => {
    const currentRemainingFlex = budget.remainingFlexibleBudget;
    const currentDaily = budget.adaptiveDailyAllowance;
    const days = Math.max(1, budget.daysRemaining);

    const priceInBudget = totalInBudgetCurrency;
    const newRemainingFlex = currentRemainingFlex - priceInBudget;
    const newDaily = newRemainingFlex > 0 ? Number((newRemainingFlex / days).toFixed(2)) : 0;
    const dailyDrop = Math.max(0, currentDaily - newDaily);
    const cutsIntoSavings = newRemainingFlex < 0;
    const savingsDeficit = cutsIntoSavings ? Math.abs(newRemainingFlex) : 0;

    let verdict: 'Comfortable' | 'Caution' | 'High Impact' = 'Comfortable';
    if (newRemainingFlex < 0) {
      verdict = 'High Impact';
    } else if (newRemainingFlex < currentRemainingFlex * 0.4 || priceInBudget > currentDaily * 2) {
      verdict = 'Caution';
    }

    return {
      priceInBudget,
      currentRemainingFlex,
      newRemainingFlex,
      currentDaily,
      newDaily,
      dailyDrop,
      days,
      cutsIntoSavings,
      savingsDeficit,
      verdict,
    };
  }, [budget, totalInBudgetCurrency]);

  // Handle server-side order creation (Server verifies price and ignores client tampering)
  const handleCreateOrder = async () => {
    setPaymentStatus('idle');
    setErrorMessage('');

    if (!isDirectlySupported && !isConvertedConfirmed) {
      throw new Error('Please review and confirm the currency conversion details before checkout.');
    }

    const targetChargeCurrency = isDirectlySupported ? budgetCurrency : checkoutCurrency;

    const orderData = await api.createPayPalOrder({
      productId: isCustomPurchase ? undefined : activeProduct.id,
      customItem: isCustomPurchase
        ? {
            itemName: activeProduct.title,
            price: customItemDetails.price,
            currency: customItemDetails.currency || budgetCurrency,
            category: activeProduct.category,
          }
        : undefined,
      currency: targetChargeCurrency,
      quantity,
      userId: profile?.id || 'local',
      clientAmount: totalInBudgetCurrency, // Sent for reference; backend strictly enforces server price
    });

    // Record tracked PayPal order in Firestore
    if (orderData?.orderId) {
      recordPayPalOrder({
        userId: profile?.id || 'local',
        orderId: orderData.orderId,
        productId: isCustomPurchase ? undefined : activeProduct.id,
        itemName: activeProduct.title,
        amount: Number(orderData.amount || totalInBudgetCurrency),
        currency: targetChargeCurrency,
        category: activeProduct.category,
        status: 'CREATED',
        updatedAt: new Date().toISOString(),
      }).catch((err) => console.warn('Could not record PayPal order in Firestore:', err));
    }

    return orderData.orderId;
  };

  // Handle server-side order capture and strict verification
  const handleApprove = async (data: { orderID: string }) => {
    setPaymentStatus('processing');
    setErrorMessage('');

    try {
      const captureResult = await api.capturePayPalOrder(data.orderID, profile?.id || 'local');

      // Strict backend verification enforcement
      if (captureResult.verified && (captureResult.status === 'COMPLETED' || captureResult.status === 'ALREADY_CAPTURED')) {
        setPaymentStatus('verified_success');
        setVerifiedDetails(captureResult);

        // Record verified payment record in Firestore
        recordVerifiedPayment({
          userId: profile?.id || 'local',
          orderId: captureResult.orderId,
          captureId: captureResult.captureId,
          amount: captureResult.amount,
          currency: captureResult.currency,
          description: `PayPal Sandbox: ${activeProduct.title}`,
          status: captureResult.status,
          source: 'PayPal',
          verified: true,
        }).catch((err) => console.warn('Could not record payment in Firestore:', err));

        // Record verified expense in application state so budget and expenses reflect capture
        if (captureResult.expenseRecord) {
          try {
            await addExpense({
              userId: profile?.id || 'local',
              title: captureResult.expenseRecord.title,
              description: `PayPal Sandbox Order: ${captureResult.orderId}`,
              amount: isCustomPurchase
                ? customItemDetails.price * quantity
                : totalInBudgetCurrency,
              currency: budgetCurrency,
              category: captureResult.expenseRecord.category,
              date: captureResult.expenseRecord.date,
              paymentMethod: 'PayPal Sandbox',
              status: 'completed',
              source: 'PayPal',
              notes: `Verified PayPal Sandbox capture (Order: ${captureResult.orderId}). Charged ${captureResult.currency} ${captureResult.amount}.`,
              isEssential: captureResult.expenseRecord.isEssential,
            });
          } catch (expErr) {
            console.warn('Could not save expense locally:', expErr);
          }
        }

        // Clear pending checkout item
        setPendingCheckoutItem(null);
      } else {
        setPaymentStatus('failed');
        setErrorMessage(
          captureResult.errorMessage ||
            'Payment capture could not be verified by the server. No expense was recorded.'
        );
      }
    } catch (err: any) {
      setPaymentStatus('failed');
      setErrorMessage(err.message || 'Payment capture failed. Transaction was not completed.');
    }
  };

  // Cancel checkout
  const handleCancel = () => {
    setPaymentStatus('cancelled');
    setPendingCheckoutItem(null);
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <span>PayPal Sandbox Demo Store Checkout</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Test purchasing demo products through PayPal Sandbox with real-time pre-checkout budget impact analysis.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs font-semibold px-2.5 py-1.5 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200/80">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <span>Server-Validated Pricing & Capture</span>
        </div>
      </div>

      {/* Rules & Sandbox Notice */}
      <div className="p-3.5 bg-sky-50/70 border border-sky-200 rounded-xl flex items-start gap-3 text-xs text-sky-950">
        <Info className="w-4 h-4 text-sky-700 shrink-0 mt-0.5" />
        <div className="space-y-0.5">
          <div className="font-bold">PennyWise Payment & Budget Safeguard:</div>
          <p className="text-sky-900 leading-relaxed text-[11px]">
            1. All purchase amounts are strictly validated by the backend to prevent client-side tampering.
            <br />
            2. An expense record is <strong>only recorded after the backend verifies completed capture</strong>. Closing or cancelling the PayPal window never records an expense.
            <br />
            3. Uses official <strong>PayPal Sandbox</strong> endpoints only — no real monetary funds are charged.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Product Selection & Catalog */}
        <div className="lg:col-span-7 space-y-5">
          {/* Product Picker Tabs */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <ShoppingBag className="w-4 h-4 text-emerald-600" />
                <span>Select Demo Product to Purchase</span>
              </h2>
              {isCustomPurchase && (
                <button
                  onClick={() => setIsCustomPurchase(false)}
                  className="text-xs text-emerald-700 hover:text-emerald-800 font-semibold"
                >
                  Browse Store Catalog
                </button>
              )}
            </div>

            {isCustomPurchase ? (
              <div className="p-4 bg-purple-50/70 border border-purple-200 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-purple-950 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                    <span>Analyzed Item from Purchase Analyzer</span>
                  </span>
                  <span className="text-[10px] font-bold text-purple-700 bg-purple-100 px-2 py-0.5 rounded-full uppercase">
                    {customItemDetails.category}
                  </span>
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">{customItemDetails.itemName}</h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Priority: <strong className="capitalize">{customItemDetails.priority || 'want'}</strong>
                  </p>
                </div>
                <div className="text-lg font-bold font-mono text-slate-900">
                  {formatMoney(customItemDetails.price, budgetCurrency)}
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[360px] overflow-y-auto pr-1">
                {demoProducts.map((p) => {
                  const isSelected = selectedProductId === p.id && !isCustomPurchase;
                  return (
                    <div
                      key={p.id}
                      onClick={() => {
                        setSelectedProductId(p.id);
                        setIsCustomPurchase(false);
                      }}
                      className={`p-3.5 rounded-xl border cursor-pointer transition-all flex flex-col justify-between space-y-2 text-xs ${
                        isSelected
                          ? 'border-emerald-600 bg-emerald-50/40 ring-2 ring-emerald-500/20'
                          : 'border-slate-200 hover:border-slate-300 bg-white'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between gap-1">
                          <span className="text-[10px] font-bold text-slate-500 uppercase px-1.5 py-0.5 bg-slate-100 rounded">
                            {p.category}
                          </span>
                          {p.badge && (
                            <span className="text-[10px] text-emerald-800 font-medium">
                              {p.badge}
                            </span>
                          )}
                        </div>
                        <h4 className="font-bold text-slate-900 mt-1.5 line-clamp-1">{p.title}</h4>
                        <p className="text-[11px] text-slate-500 line-clamp-2 mt-0.5">
                          {p.description}
                        </p>
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                        <span className="font-mono font-bold text-slate-900 text-sm">
                          {formatMoney(p.price, 'USD')}
                        </span>
                        <span
                          className={`text-[11px] font-semibold ${
                            isSelected ? 'text-emerald-700' : 'text-slate-400'
                          }`}
                        >
                          {isSelected ? 'Selected' : 'Select'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Quantity Selector */}
            <div className="pt-2 flex items-center justify-between text-xs border-t border-slate-100">
              <span className="font-semibold text-slate-700">Quantity</span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={quantity <= 1}
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  className="w-7 h-7 rounded border border-slate-300 flex items-center justify-center font-bold hover:bg-slate-50 disabled:opacity-40"
                >
                  -
                </button>
                <span className="font-mono font-bold text-slate-900 w-6 text-center">{quantity}</span>
                <button
                  type="button"
                  disabled={quantity >= 5}
                  onClick={() => setQuantity((q) => Math.min(5, q + 1))}
                  className="w-7 h-7 rounded border border-slate-300 flex items-center justify-center font-bold hover:bg-slate-50 disabled:opacity-40"
                >
                  +
                </button>
              </div>
            </div>
          </div>

          {/* Pre-Checkout Live Budget Impact Assessment */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Tag className="w-4 h-4 text-emerald-600" />
                <span>Pre-Checkout Budget Impact</span>
              </h2>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  budgetImpact.verdict === 'Comfortable'
                    ? 'bg-emerald-100 text-emerald-800'
                    : budgetImpact.verdict === 'Caution'
                    ? 'bg-amber-100 text-amber-800'
                    : 'bg-rose-100 text-rose-800'
                }`}
              >
                Verdict: {budgetImpact.verdict}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 bg-slate-50 rounded-lg space-y-1">
                <div className="text-[11px] text-slate-500">Remaining Flexible Funds</div>
                <div className="flex items-baseline gap-1 font-mono">
                  <span className="font-bold text-slate-800">
                    {formatMoney(budgetImpact.currentRemainingFlex)}
                  </span>
                  <ArrowRight className="w-3 h-3 text-slate-400" />
                  <span
                    className={`font-bold ${
                      budgetImpact.newRemainingFlex >= 0 ? 'text-emerald-700' : 'text-rose-600'
                    }`}
                  >
                    {formatMoney(budgetImpact.newRemainingFlex)}
                  </span>
                </div>
              </div>

              <div className="p-3 bg-slate-50 rounded-lg space-y-1">
                <div className="text-[11px] text-slate-500">Daily Spending Allowance</div>
                <div className="flex items-baseline gap-1 font-mono">
                  <span className="font-bold text-slate-800">
                    {formatMoney(budgetImpact.currentDaily)}/d
                  </span>
                  <ArrowRight className="w-3 h-3 text-slate-400" />
                  <span className="font-bold text-slate-900">
                    {formatMoney(budgetImpact.newDaily)}/d
                  </span>
                </div>
              </div>
            </div>

            {/* Savings Goal Protection Status */}
            <div
              className={`p-2.5 rounded-lg flex items-center gap-2 text-xs ${
                budgetImpact.cutsIntoSavings
                  ? 'bg-amber-50 text-amber-900 border border-amber-200'
                  : 'bg-emerald-50 text-emerald-900 border border-emerald-200'
              }`}
            >
              {budgetImpact.cutsIntoSavings ? (
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              ) : (
                <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
              )}
              <span className="text-[11px]">
                {budgetImpact.cutsIntoSavings
                  ? `Warning: This purchase exceeds flexible buffer and cuts into monthly savings by ${formatMoney(budgetImpact.savingsDeficit)}.`
                  : `Your monthly savings target of ${formatMoney(budget.savingsTarget)} remains protected.`}
              </span>
            </div>
          </div>
        </div>

        {/* Right Column: Checkout Summary & PayPal Buttons */}
        <div className="lg:col-span-5 space-y-5">
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
            <h2 className="text-sm font-bold text-slate-900">Purchase Summary</h2>

            <div className="space-y-2 text-xs border-b border-slate-100 pb-3">
              <div className="flex justify-between text-slate-700">
                <span>Product Name:</span>
                <span className="font-bold text-slate-900 text-right max-w-[180px] line-clamp-1">
                  {activeProduct.title}
                </span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Category:</span>
                <span>{activeProduct.category}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Quantity:</span>
                <span className="font-mono">{quantity}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Original Price:</span>
                <span className="font-mono">
                  {formatCurrencyWithIntl(
                    activeProduct.price,
                    isCustomPurchase ? (customItemDetails.currency || budgetCurrency) : 'USD'
                  )}
                </span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Original Currency:</span>
                <span className="font-mono font-semibold text-slate-800">
                  {isCustomPurchase ? (customItemDetails.currency || budgetCurrency) : 'USD'}
                </span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Environment:</span>
                <span className="font-semibold text-amber-700 bg-amber-50 px-1.5 py-0.2 rounded">
                  PayPal Sandbox
                </span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Payment Status:</span>
                <span className={`font-semibold capitalize ${
                  paymentStatus === 'verified_success'
                    ? 'text-emerald-700'
                    : paymentStatus === 'failed'
                    ? 'text-rose-600'
                    : paymentStatus === 'processing'
                    ? 'text-blue-600 animate-pulse'
                    : 'text-slate-600'
                }`}>
                  {paymentStatus === 'verified_success'
                    ? 'Verified Success'
                    : paymentStatus === 'processing'
                    ? 'Verifying Capture...'
                    : paymentStatus === 'failed'
                    ? 'Failed'
                    : paymentStatus === 'cancelled'
                    ? 'Cancelled'
                    : 'Ready for Checkout'}
                </span>
              </div>
              <div className="flex justify-between text-slate-900 pt-2 border-t border-slate-100 text-sm font-bold">
                <span>Final PayPal Checkout:</span>
                <span className="font-mono text-emerald-800">
                  {conversionData
                    ? formatCurrencyWithIntl(conversionData.targetAmount, conversionData.targetCurrency)
                    : formatCurrencyWithIntl(totalInBudgetCurrency, budgetCurrency)}
                </span>
              </div>
            </div>

            {/* Currency Conversion Panel when budget currency differs from PayPal supported currency */}
            {!isDirectlySupported && conversionData && (
              <div className="p-3.5 bg-amber-50/80 border border-amber-200 rounded-xl space-y-2.5 text-xs text-amber-950">
                <div className="flex items-center gap-1.5 font-bold text-amber-900">
                  <ArrowRightLeft className="w-3.5 h-3.5 text-amber-700" />
                  <span>Currency Conversion Review</span>
                </div>
                <p className="text-[11px] text-amber-900 leading-relaxed">
                  PayPal does not directly settle in <strong>{budgetCurrency}</strong>. Converted to supported currency:
                </p>
                <div className="p-2 bg-white rounded border border-amber-200 text-xs space-y-1">
                  <div className="flex justify-between text-slate-600">
                    <span>Target Currency:</span>
                    <select
                      value={checkoutCurrency}
                      onChange={(e) => setCheckoutCurrency(e.target.value)}
                      className="text-xs px-2 py-0.5 rounded border border-slate-300 font-mono"
                    >
                      {Array.from(PAYPAL_SUPPORTED_CURRENCY_CODES).map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="flex justify-between font-bold text-emerald-800 text-sm pt-1">
                    <span>Charge in {conversionData.targetCurrency}:</span>
                    <span className="font-mono">
                      {formatCurrencyWithIntl(conversionData.targetAmount, conversionData.targetCurrency)}
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-400 pt-0.5">
                    1 {conversionData.sourceCurrency} = {conversionData.rate.toFixed(4)} {conversionData.targetCurrency} (Verified {new Date(conversionData.timestamp).toLocaleTimeString()})
                  </div>
                </div>

                {!isConvertedConfirmed ? (
                  <button
                    type="button"
                    onClick={() => setIsConvertedConfirmed(true)}
                    className="w-full py-1.5 text-xs font-semibold text-white bg-amber-800 hover:bg-amber-900 rounded-lg shadow-xs"
                  >
                    Confirm Converted Charge
                  </button>
                ) : (
                  <div className="flex items-center justify-between text-xs text-emerald-800 bg-emerald-50 p-1.5 rounded border border-emerald-200">
                    <span className="flex items-center gap-1">
                      <CheckCircle className="w-3 h-3 text-emerald-600" />
                      <span>Conversion Confirmed</span>
                    </span>
                    <button
                      onClick={() => setIsConvertedConfirmed(false)}
                      className="text-[10px] font-semibold underline"
                    >
                      Modify
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Payment Status State Handlers */}
            {paymentStatus === 'verified_success' ? (
              <div className="p-5 bg-emerald-50 border border-emerald-200 rounded-xl text-center space-y-2.5 animate-in fade-in">
                <CheckCircle className="w-9 h-9 text-emerald-600 mx-auto" />
                <h3 className="text-sm font-bold text-emerald-950">Payment Verified Successfully!</h3>
                <p className="text-xs text-emerald-800 leading-relaxed">
                  The backend confirmed capture of{' '}
                  <strong>
                    {formatCurrencyWithIntl(
                      verifiedDetails?.amount,
                      verifiedDetails?.currency || checkoutCurrency
                    )}
                  </strong>{' '}
                  via PayPal Sandbox.
                </p>
                <div className="p-2.5 bg-white/90 rounded text-left text-[11px] font-mono text-slate-700 space-y-0.5 border border-emerald-200/60">
                  <div>Order ID: {verifiedDetails?.orderId}</div>
                  <div>Status: {verifiedDetails?.status}</div>
                  {verifiedDetails?.captureId && <div>Capture ID: {verifiedDetails?.captureId}</div>}
                  <div className="text-emerald-700 font-semibold pt-0.5">
                    ✓ Recorded into Expense History
                  </div>
                </div>
                <div className="pt-2 flex items-center justify-center gap-2">
                  <button
                    onClick={() => {
                      setPaymentStatus('idle');
                      setVerifiedDetails(null);
                      setIsConvertedConfirmed(false);
                    }}
                    className="px-3 py-1.5 text-xs font-semibold text-emerald-900 bg-white border border-emerald-300 hover:bg-emerald-100 rounded-lg"
                  >
                    Purchase Another Item
                  </button>
                  <button
                    onClick={() => setActiveTab('expenses')}
                    className="px-3 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg"
                  >
                    View Expenses
                  </button>
                </div>
              </div>
            ) : paymentStatus === 'failed' ? (
              <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl space-y-2">
                <div className="flex items-center gap-2 text-rose-800 font-bold text-xs">
                  <AlertCircle className="w-4 h-4 text-rose-600" />
                  <span>Payment Capture Failed</span>
                </div>
                <p className="text-xs text-rose-700">{errorMessage}</p>
                <div className="text-[11px] text-slate-500">
                  Zero expenses were added to your budget.
                </div>
                <button
                  onClick={() => setPaymentStatus('idle')}
                  className="text-xs font-semibold text-rose-800 underline block pt-1"
                >
                  Try Again
                </button>
              </div>
            ) : paymentStatus === 'cancelled' ? (
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2 text-xs text-slate-700">
                <div className="flex items-center gap-1.5 font-bold text-slate-900">
                  <XCircle className="w-4 h-4 text-slate-500" />
                  <span>Purchase Cancelled</span>
                </div>
                <p className="text-[11px] text-slate-500">
                  Checkout was cancelled. No payment was initiated and no expense was added to your budget.
                </p>
                <button
                  onClick={() => setPaymentStatus('idle')}
                  className="text-xs font-semibold text-emerald-700 underline"
                >
                  Resume Shopping
                </button>
              </div>
            ) : paymentStatus === 'processing' ? (
              <div className="p-6 bg-slate-50 border border-slate-200 rounded-xl text-center space-y-2 text-xs">
                <div className="w-7 h-7 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto" />
                <div className="font-bold text-slate-800">Verifying Sandbox Capture...</div>
                <p className="text-[11px] text-slate-500">
                  Contacting PayPal REST API to verify payment completion and record transaction.
                </p>
              </div>
            ) : (!isDirectlySupported && !isConvertedConfirmed) ? (
              <div className="p-5 bg-slate-50 border border-slate-200 rounded-xl text-center space-y-2 text-xs text-slate-600">
                <Info className="w-5 h-5 text-amber-600 mx-auto" />
                <p className="font-semibold text-slate-800">Conversion Confirmation Required</p>
                <p className="text-[11px] text-slate-500">
                  Please click "Confirm Converted Charge" above to enable the PayPal Sandbox checkout buttons.
                </p>
              </div>
            ) : paypalConfig?.isConfigured && paypalConfig.clientId !== 'sandbox_client_id_placeholder' ? (
              /* Live PayPal Sandbox Buttons */
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-600">Ready to complete purchase:</span>
                  <button
                    onClick={handleCancel}
                    className="text-slate-400 hover:text-slate-700 font-semibold"
                  >
                    Cancel Purchase
                  </button>
                </div>

                <PayPalScriptProvider
                  options={{
                    clientId: paypalConfig.clientId,
                    currency: isDirectlySupported ? budgetCurrency : checkoutCurrency,
                    intent: 'capture',
                  }}
                >
                  <div className="min-h-[140px]">
                    <PayPalButtons
                      style={{ layout: 'vertical', color: 'gold', shape: 'rect', label: 'pay' }}
                      createOrder={handleCreateOrder}
                      onApprove={handleApprove}
                      onCancel={() => {
                        setPaymentStatus('cancelled');
                      }}
                      onError={(err) => {
                        console.warn('PayPal button error:', err);
                        setPaymentStatus('failed');
                        setErrorMessage('PayPal Sandbox payment was cancelled or declined.');
                      }}
                    />
                  </div>
                </PayPalScriptProvider>
              </div>
            ) : (
              /* Informative setup notice when credentials are not yet configured */
              <div className="space-y-3">
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-800">Sandbox API Status</span>
                    <span className="text-[10px] font-semibold text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded">
                      Credentials Ready for Injection
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-600 leading-relaxed">
                    PayPal Sandbox REST API endpoints are active on the backend. To load interactive buttons in your browser, add your PayPal Sandbox credentials in the AI Studio environment or Secrets panel:
                  </p>
                  <div className="p-2 bg-slate-900 text-slate-100 rounded font-mono text-[10px] space-y-0.5">
                    <div>PAYPAL_CLIENT_ID="your_sandbox_client_id"</div>
                    <div>PAYPAL_CLIENT_SECRET="your_sandbox_secret"</div>
                    <div>PAYPAL_MODE="sandbox"</div>
                  </div>
                  <div className="text-[10px] text-slate-500 pt-1 flex items-center justify-between">
                    <a
                      href="https://developer.paypal.com/dashboard/applications/sandbox"
                      target="_blank"
                      rel="noreferrer"
                      className="text-emerald-700 font-semibold inline-flex items-center gap-1 hover:underline"
                    >
                      <span>Get Sandbox Credentials</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                    <span>Sandbox mode only</span>
                  </div>
                </div>

                <div className="flex justify-between items-center pt-1">
                  <button
                    onClick={handleCancel}
                    className="w-full py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                  >
                    Cancel Checkout
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* PayPal Webhooks & Payment Events Audit Ledger */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-700 shrink-0">
              <Activity className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-slate-800">PayPal Webhook &amp; Event Ledger</h3>
                <span className="text-[10px] font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3 text-emerald-600" />
                  <span>Verified Only</span>
                </span>
              </div>
              <p className="text-[11px] text-slate-500">
                Secure webhook endpoint <code className="bg-slate-100 px-1 py-0.5 rounded text-slate-700 font-mono">POST /api/paypal/webhook</code> with official PayPal signature verification &amp; idempotency
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            <button
              onClick={fetchWebhookEvents}
              disabled={loadingWebhooks}
              className="px-3 py-1.5 text-xs font-semibold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg flex items-center gap-1.5 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingWebhooks ? 'animate-spin' : ''}`} />
              <span>Refresh Events</span>
            </button>
            <button
              onClick={() => setShowWebhookPanel(!showWebhookPanel)}
              className="px-3 py-1.5 text-xs font-semibold text-indigo-700 hover:text-indigo-900 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-lg transition-colors"
            >
              {showWebhookPanel ? 'Hide Details' : 'View Ledger Details'}
            </button>
          </div>
        </div>

        {/* Overview Stats Badges */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
          <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100">
            <div className="text-[10px] font-medium text-slate-500">Webhook Verification</div>
            <div className="text-xs font-bold text-slate-800 flex items-center gap-1 mt-0.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>PayPal REST API</span>
            </div>
          </div>
          <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100">
            <div className="text-[10px] font-medium text-slate-500">Duplicate Protection</div>
            <div className="text-xs font-bold text-emerald-700 flex items-center gap-1 mt-0.5">
              <CheckCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>Idempotent Store</span>
            </div>
          </div>
          <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100">
            <div className="text-[10px] font-medium text-slate-500">Recorded Event IDs</div>
            <div className="text-xs font-bold text-slate-800 mt-0.5">
              {webhookEvents.length} events logged
            </div>
          </div>
          <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100">
            <div className="text-[10px] font-medium text-slate-500">Supported Event Types</div>
            <div className="text-xs font-bold text-slate-800 mt-0.5">
              Capture, Denial, Refund, Reversal
            </div>
          </div>
        </div>

        {/* Detailed Events Ledger Table */}
        {showWebhookPanel && (
          <div className="pt-2 border-t border-slate-100 space-y-3">
            <div className="flex items-center justify-between text-xs text-slate-600">
              <span className="font-semibold">Recorded Webhook Events</span>
              <span className="text-[11px] text-slate-400">Events match purchase orders by related_ids.order_id or resource.id</span>
            </div>

            {webhookEvents.length === 0 ? (
              <div className="p-6 text-center bg-slate-50 border border-dashed border-slate-200 rounded-xl space-y-1">
                <FileText className="w-8 h-8 text-slate-300 mx-auto" />
                <div className="text-xs font-semibold text-slate-700">No Webhook Events Recorded Yet</div>
                <p className="text-[11px] text-slate-500 max-w-md mx-auto">
                  When PayPal sends webhook notifications to <code className="bg-slate-200/60 px-1 py-0.5 rounded text-slate-800 font-mono">/api/paypal/webhook</code>, their cryptographic signatures are verified and recorded here.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-3">Event ID</th>
                      <th className="py-2.5 px-3">Event Type</th>
                      <th className="py-2.5 px-3">Matched Order</th>
                      <th className="py-2.5 px-3">Signature</th>
                      <th className="py-2.5 px-3">Status Result</th>
                      <th className="py-2.5 px-3 text-right">Processed At</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-[11px]">
                    {webhookEvents.map((evt: any) => (
                      <tr key={evt.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-2 px-3 font-mono text-[10px] text-slate-700 font-semibold">
                          {evt.id}
                        </td>
                        <td className="py-2 px-3">
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                              evt.eventType.includes('COMPLETED')
                                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                : evt.eventType.includes('DENIED')
                                ? 'bg-rose-50 text-rose-800 border border-rose-200'
                                : evt.eventType.includes('REFUND')
                                ? 'bg-purple-50 text-purple-800 border border-purple-200'
                                : evt.eventType.includes('REVERS')
                                ? 'bg-amber-50 text-amber-800 border border-amber-200'
                                : 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            {evt.eventType}
                          </span>
                        </td>
                        <td className="py-2 px-3 font-mono text-[10px] text-slate-600">
                          {evt.matchedOrderId || evt.resourceId || 'N/A'}
                        </td>
                        <td className="py-2 px-3">
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                              evt.verificationStatus === 'SUCCESS'
                                ? 'text-emerald-700 bg-emerald-50'
                                : 'text-rose-700 bg-rose-50'
                            }`}
                          >
                            {evt.verificationStatus}
                          </span>
                        </td>
                        <td className="py-2 px-3 font-semibold text-slate-800">
                          {evt.newTransactionStatus || evt.processingStatus}
                        </td>
                        <td className="py-2 px-3 text-right text-slate-500 font-mono text-[10px]">
                          {evt.processedAt ? new Date(evt.processedAt).toLocaleTimeString() : 'Recently'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
