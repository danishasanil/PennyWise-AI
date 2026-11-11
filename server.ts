import express, { Request, Response } from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = parseInt(process.env.PORT || '3000', 10);

app.use(express.json());



import {
  calculateDeterministicBudget,
  BudgetEngineInput,
  DeterministicBudgetResult,
} from './src/server/budgetEngine.js';

// ---------------------------------------------------------
// API Routes: Deterministic Budget Calculation Backend
// ---------------------------------------------------------
app.post('/api/budget/calculate', (req: Request, res: Response) => {
  try {
    const input: BudgetEngineInput = {
      monthlyIncome: Number(req.body.monthlyIncome),
      essentialExpenses: Number(req.body.monthlyEssentialExpenses ?? req.body.essentialExpenses),
      savingsTarget: Number(req.body.monthlySavingsGoal ?? req.body.savingsTarget),
      emergencyAllocation: Number(req.body.emergencyAllocation ?? 0),
      loggedExpenses: req.body.loggedExpenses || [],
      currentDate: req.body.currentDate,
      daysInPeriod: req.body.daysInPeriod ? Number(req.body.daysInPeriod) : undefined,
      daysRemaining: req.body.daysRemaining ? Number(req.body.daysRemaining) : undefined,
      currency: req.body.currency || 'USD',
    };

    const budgetResult = calculateDeterministicBudget(input);
    res.json({ success: true, budget: budgetResult });
  } catch (error: any) {
    console.error('Budget calculation error:', error.message);
    res.status(400).json({ success: false, error: error.message || 'Invalid calculation parameters' });
  }
});

// ---------------------------------------------------------
// API Routes: Backend Savings Goals Calculations & Projections
// ---------------------------------------------------------
import {
  calculateSavingsAnalytics,
  SavingsGoalAnalyticsItem,
  SavingsAnalyticsResult,
} from './src/server/savingsEngine.js';

export type { SavingsGoalAnalyticsItem, SavingsAnalyticsResult };

app.post('/api/savings/calculate-analytics', (req: Request, res: Response) => {
  try {
    const { goals = [], monthlySavingsCapacity = 0, currency = 'USD' } = req.body;
    const analytics = calculateSavingsAnalytics({
      goals,
      monthlySavingsCapacity: Number(monthlySavingsCapacity) || 0,
      currency: typeof currency === 'string' ? currency : 'USD',
    });

    res.json({
      success: true,
      analytics,
    });
  } catch (err: any) {
    console.error('Savings calculation error:', err);
    res.status(400).json({ success: false, error: err.message || 'Savings analytics failed' });
  }
});



// ---------------------------------------------------------
// API Routes: Gemini AI PennyWise Assistant
// ---------------------------------------------------------
// API Routes: Gemini AI PennyWise Assistant
// ---------------------------------------------------------
import { geminiService } from './src/server/geminiService.js';

app.post('/api/ai/chat', async (req: Request, res: Response) => {
  try {
    const { message, history = [], financialContext = {} } = req.body;

    if (!message || typeof message !== 'string') {
      res.status(400).json({ error: 'Message is required' });
      return;
    }

    const result = await geminiService.chatWithCompanion(message, history, financialContext);
    if (typeof result === 'string') {
      res.json({ reply: result, suggestedFollowUps: [], quickActions: [] });
    } else {
      res.json(result);
    }
  } catch (_err) {
    res.json({
      reply: 'I am here with your verified financial records! All your budgeting calculations, daily spending allowances, and savings goals are active on your dashboard.',
      suggestedFollowUps: ['What is my daily spending allowance?', 'Can I afford a purchase?'],
      quickActions: [],
    });
  }
});

// ---------------------------------------------------------
// API Routes: AI Purchase Analyzer
// ---------------------------------------------------------
app.post('/api/ai/analyze-purchase', async (req: Request, res: Response) => {
  try {
    const {
      itemName,
      price,
      category = 'General',
      priority = 'want', // need | want | luxury
      financialContext = {},
    } = req.body;

    const numPrice = Number(price);
    if (!itemName || isNaN(numPrice) || numPrice <= 0) {
      res.status(400).json({ error: 'Valid itemName and price are required' });
      return;
    }

    const currency = financialContext.currency || 'USD';
    const remainingFlexible = Number(financialContext.remainingFlexibleBudget ?? 0);
    const dailyAllowance = Number(financialContext.dailySpendingAllowance ?? 0);
    const daysRemaining = Math.max(1, Number(financialContext.daysRemaining ?? 1));
    const monthlySavingsGoal = Number(
      financialContext.monthlySavingsGoal ?? financialContext.savingsTarget ?? 0
    );

    // Calculate exact financial impacts
    const newRemainingFlexible = remainingFlexible - numPrice;
    const newDailyAllowance =
      newRemainingFlexible > 0 ? Number((newRemainingFlexible / daysRemaining).toFixed(2)) : 0;
    const dailyAllowanceDrop = Math.max(0, dailyAllowance - newDailyAllowance);

    // Determine affordability verdict
    let affordabilityVerdict: 'Comfortable' | 'Caution' | 'High Impact';
    if (newRemainingFlexible >= remainingFlexible * 0.4 && numPrice <= dailyAllowance * 2) {
      affordabilityVerdict = 'Comfortable';
    } else if (newRemainingFlexible >= 0) {
      affordabilityVerdict = 'Caution';
    } else {
      affordabilityVerdict = 'High Impact';
    }

    const impact = {
      price: numPrice,
      currency,
      currentRemainingFlexible: remainingFlexible,
      newRemainingFlexible,
      currentDailyAllowance: dailyAllowance,
      newDailyAllowance,
      dailyAllowanceDrop: Number(dailyAllowanceDrop.toFixed(2)),
      daysRemaining,
      cutsIntoSavings: newRemainingFlexible < 0,
      savingsDeficit: newRemainingFlexible < 0 ? Math.abs(newRemainingFlexible) : 0,
      monthlySavingsGoal,
      verdict: affordabilityVerdict,
    };

    const aiExplanation = await geminiService.explainPurchaseImpact({
      itemName,
      numPrice,
      currency,
      category,
      priority,
      currentRemainingFlexible: remainingFlexible,
      newRemainingFlexible,
      currentDailyAllowance: dailyAllowance,
      newDailyAllowance,
      dailyAllowanceDrop: Number(dailyAllowanceDrop.toFixed(2)),
      daysRemaining,
      cutsIntoSavings: newRemainingFlexible < 0,
      savingsDeficit: newRemainingFlexible < 0 ? Math.abs(newRemainingFlexible) : 0,
      monthlySavingsGoal,
      affordabilityVerdict,
    });

    res.json({
      success: true,
      itemName,
      price: numPrice,
      category,
      priority,
      impact,
      aiExplanation,
    });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to analyze purchase', details: error?.message || 'Calculation error' });
  }
});

// ---------------------------------------------------------
// API Routes: Spending Insights Generator
// ---------------------------------------------------------
app.post('/api/ai/generate-insights', async (req: Request, res: Response) => {
  try {
    const { budget, expenses = [], currency = 'USD' } = req.body;
    const insights = await geminiService.generateSpendingInsights(budget, expenses, currency);
    res.json(insights);
  } catch (_err) {
    res.json({
      summary: 'Stay mindful of your daily allowance to reach your savings targets.',
      tips: [
        'Review discretionary purchases regularly to spot saving opportunities.',
        'Keep daily spending aligned with your adaptive allowance.',
        'Track milestones toward your savings targets regularly.',
      ],
    });
  }
});

// ---------------------------------------------------------
// API Routes: Gemini Expense Category Suggestion
// ---------------------------------------------------------
const VALID_EXPENSE_CATEGORIES = [
  'Food',
  'Groceries',
  'Transportation',
  'Shopping',
  'Entertainment',
  'Education',
  'Healthcare',
  'Housing',
  'Bills',
  'Travel',
  'Other',
];

app.post('/api/ai/suggest-category', async (req: Request, res: Response) => {
  try {
    const { title, description } = req.body;
    const textToClassify = [title, description].filter(Boolean).join(' - ').trim();

    if (!textToClassify) {
      res.status(400).json({ error: 'Description or title is required' });
      return;
    }

    const result = await geminiService.suggestCategory(textToClassify, VALID_EXPENSE_CATEGORIES);
    res.json(result);
  } catch (_err) {
    res.json({ category: 'Other', reasoning: 'Default fallback category' });
  }
});

// ---------------------------------------------------------
// API Routes: Backend Transaction Validation
// ---------------------------------------------------------
app.post('/api/expenses/validate', (req: Request, res: Response) => {
  try {
    const { title, description, amount, currency, category, date, status, source } = req.body;

    const errors: string[] = [];
    const numAmount = Number(amount);

    if (!title || typeof title !== 'string' || !title.trim()) {
      errors.push('Transaction title/description is required.');
    } else if (title.trim().length > 120) {
      errors.push('Title cannot exceed 120 characters.');
    }

    if (isNaN(numAmount) || numAmount <= 0) {
      errors.push('Amount must be a positive number greater than zero.');
    }

    if (!currency || typeof currency !== 'string') {
      errors.push('A valid ISO currency code is required.');
    }

    if (!category || !VALID_EXPENSE_CATEGORIES.includes(category)) {
      errors.push(`Category must be one of: ${VALID_EXPENSE_CATEGORIES.join(', ')}`);
    }

    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      errors.push('Date must be in YYYY-MM-DD format.');
    } else {
      const parsedDate = new Date(date);
      if (isNaN(parsedDate.getTime())) {
        errors.push('Date is invalid.');
      }
    }

    const validStatuses = ['completed', 'pending', 'cleared'];
    if (status && !validStatuses.includes(status)) {
      errors.push(`Status must be one of: ${validStatuses.join(', ')}`);
    }

    const validSources = ['manual', 'PayPal'];
    if (source && !validSources.includes(source)) {
      errors.push(`Source must be one of: ${validSources.join(', ')}`);
    }

    if (errors.length > 0) {
      res.status(400).json({ valid: false, errors });
      return;
    }

    res.json({ valid: true });
  } catch (err: any) {
    res.status(500).json({ valid: false, errors: [err.message || 'Validation error'] });
  }
});

// ---------------------------------------------------------
// API Routes: PayPal Sandbox REST API Integration
// ---------------------------------------------------------
import {
  convertCurrency,
  ALL_CURRENCIES,
  PAYPAL_SUPPORTED_CURRENCY_CODES,
  getDecimalPlacesForCurrency,
} from './src/data/internationalData.js';

// ---------------------------------------------------------
// API Routes: Currency Conversion & Rates
// ---------------------------------------------------------
app.get('/api/currency/rates', (_req: Request, res: Response) => {
  res.json({
    currencies: ALL_CURRENCIES,
    paypalSupportedCurrencies: Array.from(PAYPAL_SUPPORTED_CURRENCY_CODES),
  });
});

app.post('/api/currency/convert', (req: Request, res: Response) => {
  try {
    const { amount, sourceCurrency, targetCurrency } = req.body;
    const numAmount = Number(amount);
    if (isNaN(numAmount) || numAmount < 0) {
      res.status(400).json({ error: 'Valid non-negative amount is required for conversion' });
      return;
    }
    if (!sourceCurrency || !targetCurrency) {
      res.status(400).json({ error: 'sourceCurrency and targetCurrency are required' });
      return;
    }

    const conversion = convertCurrency(numAmount, sourceCurrency, targetCurrency);
    res.json({ success: true, conversion });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message || 'Currency conversion failed' });
  }
});

// ---------------------------------------------------------
// API Routes: PayPal Sandbox REST API Integration
// ---------------------------------------------------------
import {
  DEMO_PRODUCTS,
  createPayPalSandboxOrder,
  capturePayPalSandboxOrder,
  getPayPalAccessToken,
  processPayPalWebhookEvent,
  getRecordedWebhookEvents,
  getAllOrders,
} from './src/server/paypalService.js';

app.get('/api/paypal/config', (_req: Request, res: Response) => {
  const clientId = process.env.PAYPAL_CLIENT_ID || '';
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET || '';
  res.json({
    clientId: clientId || 'sandbox_client_id_placeholder',
    isConfigured: Boolean(clientId && clientSecret),
    mode: 'sandbox',
    supportedCurrencies: Array.from(PAYPAL_SUPPORTED_CURRENCY_CODES),
    demoProducts: DEMO_PRODUCTS,
  });
});

app.get('/api/paypal/products', (_req: Request, res: Response) => {
  res.json({ products: DEMO_PRODUCTS });
});

app.post('/api/paypal/create-order', async (req: Request, res: Response) => {
  try {
    const { productId, customItem, currency = 'USD', quantity = 1, userId = 'local', clientAmount } = req.body;

    const result = await createPayPalSandboxOrder({
      productId,
      customItem,
      targetCurrency: currency,
      quantity: Number(quantity) || 1,
      userId,
      clientProvidedAmount: clientAmount ? Number(clientAmount) : undefined,
    });

    res.json({
      success: true,
      orderId: result.orderId,
      status: result.status,
      currency: result.currency,
      value: result.formattedValue,
      amount: result.amount,
      itemName: result.itemName,
      category: result.category,
    });
  } catch (err: any) {
    res.status(400).json({
      success: false,
      error: err.message || 'Failed to create PayPal Sandbox order.',
    });
  }
});

app.post('/api/paypal/capture-order', async (req: Request, res: Response) => {
  try {
    const { orderId, userId = 'local' } = req.body;

    if (!orderId || typeof orderId !== 'string') {
      res.status(400).json({ verified: false, error: 'Valid orderId is required' });
      return;
    }

    const captureResult = await capturePayPalSandboxOrder({ orderId, userId });

    if (!captureResult.verified) {
      res.status(400).json({
        verified: false,
        error: captureResult.errorMessage || 'PayPal capture could not be verified by backend.',
        details: captureResult,
      });
      return;
    }

    res.json({
      success: true,
      verified: true,
      status: captureResult.status,
      orderId: captureResult.orderId,
      captureId: captureResult.captureId,
      amount: captureResult.amount,
      currency: captureResult.currency,
      payer: captureDataOrPayer(captureResult.payer),
      expenseRecord: captureResult.expenseRecord,
    });
  } catch (err: any) {
    res.status(500).json({
      verified: false,
      error: err.message || 'Internal error while capturing PayPal payment.',
    });
  }
});

function captureDataOrPayer(payer?: any) {
  if (!payer) return undefined;
  return {
    email_address: payer.email_address,
    name: payer.name,
    payer_id: payer.payer_id,
  };
}

// ---------------------------------------------------------
// API Routes: PayPal Sandbox Webhooks (Verified & Idempotent)
// ---------------------------------------------------------

/**
 * POST /api/paypal/webhook
 * Receives PayPal webhook events, verifies signatures against PayPal REST API,
 * matches with internal purchase records, updates status safely, and prevents duplicate processing.
 */
app.post('/api/paypal/webhook', async (req: Request, res: Response) => {
  try {
    const headers = req.headers as Record<string, string | string[] | undefined>;
    const body = req.body;

    // Check payload structure
    if (!body || typeof body !== 'object' || !body.id) {
      res.status(400).json({
        verified: false,
        error: 'Invalid webhook payload structure: event ID is required.',
      });
      return;
    }

    // Process event through secure webhook service
    const result = await processPayPalWebhookEvent({
      headers,
      body,
    });

    if (!result.verified) {
      // Requirement 10: Never trust an unverified webhook payload
      res.status(400).json({
        verified: false,
        error: result.message || 'Webhook signature verification failed.',
        eventId: result.eventId,
      });
      return;
    }

    if (result.isDuplicate) {
      // Requirement 7: Prevent duplicate processing (acknowledge idempotently)
      res.status(200).json({
        success: true,
        verified: true,
        isDuplicate: true,
        eventId: result.eventId,
        message: result.message,
      });
      return;
    }

    res.status(200).json({
      success: true,
      verified: true,
      eventId: result.eventId,
      eventType: result.eventType,
      matchedOrderId: result.matchedOrderId,
      matchedCaptureId: result.matchedCaptureId,
      newStatus: result.newStatus,
      message: result.message,
    });
  } catch (err: any) {
    console.error('[PayPal Webhook] Internal processing error:', err.message);
    res.status(500).json({
      verified: false,
      error: 'Internal server error while processing webhook event.',
      details: err.message,
    });
  }
});

/**
 * GET /api/paypal/webhook-events
 * Audit endpoint returning recorded webhook events
 */
app.get('/api/paypal/webhook-events', (_req: Request, res: Response) => {
  const events = getRecordedWebhookEvents();
  res.json({ success: true, count: events.length, events });
});

/**
 * GET /api/paypal/orders
 * Returns all tracked internal purchases and orders with verified statuses
 */
app.get('/api/paypal/orders', (_req: Request, res: Response) => {
  const orders = getAllOrders();
  res.json({ success: true, count: orders.length, orders });
});

// ---------------------------------------------------------
// Vite Middleware / Static Serving Setup
// ---------------------------------------------------------
async function startServer() {
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  } else {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(port, '0.0.0.0', () => {
    console.log(`PennyWise AI server listening on port ${port}`);
  });
}

startServer();
