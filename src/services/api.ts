import { BudgetSummary } from '../types/finance';

export interface ChatAction {
  label: string;
  action: 'open_analyzer' | 'open_expenses' | 'open_savings' | 'open_budget' | 'send_prompt';
  params?: Record<string, any>;
}

export interface ChatResponse {
  reply: string;
  suggestedFollowUps?: string[];
  quickActions?: ChatAction[];
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  timestamp: string;
  quickActions?: ChatAction[];
  suggestedFollowUps?: string[];
}

export const api = {
  async calculateBudget(params: {
    monthlyIncome: number;
    monthlyEssentialExpenses: number;
    monthlySavingsGoal: number;
    emergencyAllocation?: number;
    loggedExpenses: Array<{ amount: number; isEssential?: boolean; category?: string; date?: string }>;
    daysInPeriod?: number;
    daysRemaining?: number;
    currentDate?: string;
    currency?: string;
  }): Promise<BudgetSummary> {
    const res = await fetch('/api/budget/calculate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    if (!res.ok) {
      throw new Error('Failed to calculate budget from backend');
    }
    const data = await res.json();
    return data.budget;
  },

  async sendChatMessage(
    message: string,
    history: ChatMessage[],
    financialContext: Record<string, any>
  ): Promise<ChatResponse> {
    const res = await fetch('/api/ai/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, history, financialContext }),
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || 'Failed to send message to PennyWise AI');
    }
    const data = await res.json();
    if (typeof data === 'string') {
      return { reply: data, suggestedFollowUps: [], quickActions: [] };
    }
    return {
      reply: data.reply || '',
      suggestedFollowUps: data.suggestedFollowUps || [],
      quickActions: data.quickActions || [],
    };
  },

  async analyzePurchase(payload: {
    itemName: string;
    price: number;
    category: string;
    priority: 'need' | 'want' | 'luxury';
    financialContext: Record<string, any>;
  }) {
    const res = await fetch('/api/ai/analyze-purchase', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to analyze purchase');
    }
    return res.json();
  },

  async generateInsights(payload: {
    budget: BudgetSummary;
    expenses: any[];
    currency: string;
  }): Promise<{ summary: string; tips: string[] }> {
    const res = await fetch('/api/ai/generate-insights', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      return {
        summary: 'Track your daily allowance to reach your savings goals steadily.',
        tips: ['Review discretionary expenses weekly', 'Check subscription renewals periodically'],
      };
    }
    return res.json();
  },

  async getCurrencyRates() {
    const res = await fetch('/api/currency/rates');
    if (!res.ok) throw new Error('Failed to fetch currency rates');
    return res.json();
  },

  async convertCurrency(
    amount: number,
    sourceCurrency: string,
    targetCurrency: string
  ): Promise<{
    sourceCurrency: string;
    targetCurrency: string;
    sourceAmount: number;
    targetAmount: number;
    rate: number;
    inverseRate: number;
    timestamp: string;
    isApproximate: boolean;
  }> {
    const res = await fetch('/api/currency/convert', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount, sourceCurrency, targetCurrency }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Currency conversion failed');
    }
    return data.conversion;
  },

  async getPayPalConfig(): Promise<{
    clientId: string;
    isConfigured: boolean;
    mode: string;
    supportedCurrencies?: string[];
    demoProducts?: any[];
  }> {
    const res = await fetch('/api/paypal/config');
    if (!res.ok) {
      throw new Error('Failed to fetch PayPal configuration');
    }
    return res.json();
  },

  async getPayPalProducts() {
    const res = await fetch('/api/paypal/products');
    if (!res.ok) {
      return { products: [] };
    }
    return res.json();
  },

  async createPayPalOrder(params: {
    productId?: string;
    customItem?: { itemName?: string; price?: number; currency?: string; category?: string };
    currency?: string;
    quantity?: number;
    userId?: string;
    clientAmount?: number;
    amount?: number;
    description?: string;
  }) {
    const payload = {
      productId: params.productId,
      customItem: params.customItem,
      currency: params.currency || 'USD',
      quantity: params.quantity || 1,
      userId: params.userId,
      clientAmount: params.clientAmount ?? params.amount,
    };

    const res = await fetch('/api/paypal/create-order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Failed to create PayPal order');
    }
    return data;
  },

  async capturePayPalOrder(orderId: string, userId = 'local') {
    const res = await fetch('/api/paypal/capture-order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderId, userId }),
    });
    const data = await res.json();
    if (!res.ok || !data.verified) {
      throw new Error(data.error || 'Failed to capture PayPal order');
    }
    return data;
  },

  async getPayPalWebhookEvents() {
    const res = await fetch('/api/paypal/webhook-events');
    if (!res.ok) {
      throw new Error('Failed to retrieve PayPal webhook events');
    }
    return res.json();
  },

  async getPayPalOrders() {
    const res = await fetch('/api/paypal/orders');
    if (!res.ok) {
      throw new Error('Failed to retrieve PayPal orders');
    }
    return res.json();
  },

  async suggestCategory(title: string, description?: string): Promise<{ category: string; reasoning: string }> {
    const res = await fetch('/api/ai/suggest-category', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, description }),
    });
    if (!res.ok) {
      return { category: 'Other', reasoning: 'Fallback' };
    }
    return res.json();
  },

  async validateExpense(expense: Record<string, any>): Promise<{ valid: boolean; errors?: string[] }> {
    const res = await fetch('/api/expenses/validate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(expense),
    });
    const data = await res.json();
    if (!res.ok || !data.valid) {
      return { valid: false, errors: data.errors || ['Validation failed'] };
    }
    return { valid: true };
  },

  async calculateSavingsAnalytics(payload: {
    goals: any[];
    monthlySavingsCapacity?: number;
    currency?: string;
  }) {
    const res = await fetch('/api/savings/calculate-analytics', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      throw new Error('Failed to compute savings analytics from backend');
    }
    const data = await res.json();
    return data.analytics;
  },
};
