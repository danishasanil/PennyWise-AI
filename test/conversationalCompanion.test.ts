import test from 'node:test';
import assert from 'node:assert/strict';
import { geminiService, FinancialContextPayload } from '../src/server/geminiService.js';

const mockFinancialContext: FinancialContextPayload = {
  currency: 'INR',
  displayName: 'Priya',
  monthlyIncome: 60000,
  monthlyBudget: 20000,
  essentialExpenses: 25000,
  savingsTarget: 10000,
  emergencyAllocation: 5000,
  flexibleBudget: 20000,
  remainingFlexibleBudget: 12000,
  dailySpendingAllowance: 600,
  initialDailyAllowance: 666.67,
  dailyBurnRate: 400,
  daysRemaining: 20,
  daysElapsed: 10,
  daysInPeriod: 30,
  totalExpenses: 33000,
  discretionaryExpensesSpent: 8000,
  categorySpending: [
    { category: 'Shopping', amount: 4500, percentage: 56.25, count: 4, isHigh: true },
    { category: 'Food', amount: 2500, percentage: 31.25, count: 5, isHigh: false },
    { category: 'Entertainment', amount: 1000, percentage: 12.5, count: 2, isHigh: false },
  ],
  savingsProgress: {
    currentTotalSaved: 15000,
    targetTotal: 50000,
    achievementRate: 30,
    activeGoals: [
      { title: 'Emergency Fund', current: 15000, target: 50000, percent: 30 },
    ],
  },
  alerts: {
    isOverbudget: false,
    spendingStatus: 'on_track',
    atRiskOfMissingSavingsGoal: false,
  },
};

test('Conversation 1: Can I afford a ₹3,000 purchase?', async () => {
  const result = await geminiService.chatWithCompanion(
    'Can I afford a ₹3,000 purchase?',
    [],
    mockFinancialContext
  );

  assert.ok(result.reply.includes('can afford this') || result.reply.includes('affordable'));
  assert.ok(result.reply.includes('3,000'));
  assert.ok(result.reply.includes('9,000')); // Remaining flexible budget after ₹3,000 from ₹12,000
  assert.ok(result.suggestedFollowUps.length > 0);
  assert.ok(result.quickActions.some((a) => a.action === 'open_analyzer'));
});

test('Conversation 2: Suggest an alternative to buying a ₹5,000 phone', async () => {
  const result = await geminiService.chatWithCompanion(
    'Suggest an alternative to buying a ₹5,000 phone',
    [],
    mockFinancialContext
  );

  assert.ok(result.reply.toLowerCase().includes('alternative') || result.reply.toLowerCase().includes('phone'));
  assert.ok(result.reply.includes('refurbished') || result.reply.includes('mid-range') || result.reply.includes('previous-generation'));
  assert.ok(result.suggestedFollowUps.length > 0);
});

test('Conversation 3: I want to save ₹10,000. Help me plan.', async () => {
  const result = await geminiService.chatWithCompanion(
    'I want to save ₹10,000. Help me plan.',
    [],
    mockFinancialContext
  );

  assert.ok(result.reply.toLowerCase().includes('plan') || result.reply.toLowerCase().includes('save'));
  assert.ok(result.reply.includes('10,000'));
  assert.ok(result.suggestedFollowUps.length > 0);
  assert.ok(result.quickActions.some((a) => a.action === 'open_savings'));
});

test('Conversation 4: Where am I spending the most?', async () => {
  const result = await geminiService.chatWithCompanion(
    'Where am I spending the most?',
    [],
    mockFinancialContext
  );

  assert.ok(result.reply.includes('Shopping')); // Top category from context
  assert.ok(result.reply.includes('4,500') || result.reply.includes('56%'));
  assert.ok(result.quickActions.some((a) => a.action === 'open_expenses'));
});

test('Conversation 5: Should I buy this now or wait?', async () => {
  const result = await geminiService.chatWithCompanion(
    'Should I buy this now or wait?',
    [],
    mockFinancialContext
  );

  assert.ok(result.reply.toLowerCase().includes('wait') || result.reply.toLowerCase().includes('budget'));
  assert.ok(result.suggestedFollowUps.length > 0);
});

test('Conversation 6: Suggest a purchase within my remaining budget', async () => {
  const result = await geminiService.chatWithCompanion(
    'Suggest a purchase within my remaining budget',
    [],
    mockFinancialContext
  );

  assert.ok(result.reply.includes('12,000') || result.reply.includes('600'));
  assert.ok(result.suggestedFollowUps.length > 0);
});

test('Conversation 7: What happens to my daily allowance if I spend ₹2,000?', async () => {
  const result = await geminiService.chatWithCompanion(
    'What happens to my daily allowance if I spend ₹2,000?',
    [],
    mockFinancialContext
  );

  assert.ok(result.reply.includes('2,000'));
  assert.ok(result.reply.includes('10,000')); // Remaining drops from 12,000 to 10,000
  assert.ok(result.reply.includes('500')); // 10,000 / 20 days = 500/day
  assert.ok(result.suggestedFollowUps.length > 0);
});

test('Conversation 8: I changed my mind. Suggest something cheaper.', async () => {
  const history = [
    { sender: 'user' as const, text: 'Can I afford a ₹5,000 watch?' },
    { sender: 'ai' as const, text: 'You can afford this, but it will leave you with a tighter cushion.' },
  ];

  const result = await geminiService.chatWithCompanion(
    'I changed my mind. Suggest something cheaper.',
    history,
    mockFinancialContext
  );

  assert.ok(result.reply.toLowerCase().includes('cheaper') || result.reply.toLowerCase().includes('alternative') || result.reply.toLowerCase().includes('watch'));
  assert.ok(result.suggestedFollowUps.length > 0);
});

test('Conversation 9: Can you compare two purchase options?', async () => {
  const result = await geminiService.chatWithCompanion(
    'Can you compare two purchase options: ₹2,000 vs ₹5,000?',
    [],
    mockFinancialContext
  );

  assert.ok(result.reply.includes('Option A') && result.reply.includes('Option B'));
  assert.ok(result.reply.includes('2,000') && result.reply.includes('5,000'));
  assert.ok(result.suggestedFollowUps.length > 0);
});

test('Conversation 10: I want to reduce my monthly expenses. What should I do?', async () => {
  const result = await geminiService.chatWithCompanion(
    'I want to reduce my monthly expenses. What should I do?',
    [],
    mockFinancialContext
  );

  assert.ok(result.reply.toLowerCase().includes('reduce') || result.reply.toLowerCase().includes('shopping'));
  assert.ok(result.quickActions.some((a) => a.action === 'open_expenses'));
  assert.ok(result.suggestedFollowUps.length > 0);
});

test('Multi-Turn Context Retention: Follow-up question referencing previously discussed item', async () => {
  const history = [
    { sender: 'user' as const, text: 'Can I buy a pair of noise cancelling headphones for ₹4,000?' },
    { sender: 'ai' as const, text: 'Yes, but that will reduce your daily allowance to ₹400/day.' },
  ];

  const result = await geminiService.chatWithCompanion(
    'What if I wait until next month for them?',
    history,
    mockFinancialContext
  );

  assert.ok(result.reply.toLowerCase().includes('wait') || result.reply.toLowerCase().includes('next month'));
  assert.ok(result.suggestedFollowUps.length > 0);
});
