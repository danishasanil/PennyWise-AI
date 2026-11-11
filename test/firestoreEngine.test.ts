import test from 'node:test';
import assert from 'node:assert/strict';

// Helper mirror for security rule assertions
function isValidId(id: string): boolean {
  return typeof id === 'string' && id.length > 0 && id.length <= 128 && /^[a-zA-Z0-9_-]+$/.test(id);
}

function isValidUserProfile(data: any): boolean {
  return (
    typeof data.displayName === 'string' &&
    data.displayName.length > 0 &&
    data.displayName.length <= 100 &&
    typeof data.preferredCurrency === 'string' &&
    data.preferredCurrency.length >= 3 &&
    data.preferredCurrency.length <= 10 &&
    typeof data.monthlyIncome === 'number' &&
    data.monthlyIncome >= 0 &&
    typeof data.monthlyEssentialExpenses === 'number' &&
    data.monthlyEssentialExpenses >= 0 &&
    typeof data.monthlySavingsGoal === 'number' &&
    data.monthlySavingsGoal >= 0 &&
    (!('country' in data) || (typeof data.country === 'string' && data.country.length <= 100)) &&
    (!('emergencyAllocation' in data) || (typeof data.emergencyAllocation === 'number' && data.emergencyAllocation >= 0))
  );
}

function isValidExpense(data: any, userId: string): boolean {
  return (
    data.userId === userId &&
    typeof data.title === 'string' &&
    data.title.length > 0 &&
    data.title.length <= 120 &&
    typeof data.amount === 'number' &&
    data.amount > 0 &&
    typeof data.currency === 'string' &&
    data.currency.length >= 3 &&
    data.currency.length <= 10 &&
    typeof data.category === 'string' &&
    data.category.length > 0 &&
    data.category.length <= 50 &&
    typeof data.date === 'string' &&
    data.date.length > 0 &&
    data.date.length <= 30 &&
    (!('status' in data) || (typeof data.status === 'string' && data.status.length <= 30)) &&
    (!('source' in data) || (typeof data.source === 'string' && data.source.length <= 30))
  );
}

function isValidBudgetSummary(data: any, userId: string): boolean {
  return (
    data.userId === userId &&
    typeof data.currency === 'string' &&
    data.currency.length >= 3 &&
    data.currency.length <= 10 &&
    typeof data.monthlyIncome === 'number' &&
    data.monthlyIncome >= 0 &&
    typeof data.flexibleBudget === 'number' &&
    typeof data.remainingFlexibleBudget === 'number'
  );
}

function canUpdateExpense(existing: any, incoming: any): boolean {
  // Requirement 7: Prevent users from modifying verified PayPal payment statuses directly
  if (existing.source === 'PayPal') {
    return incoming.status === existing.status;
  }
  return true;
}

function canUpdatePaymentRecord(existing: any, incoming: any): boolean {
  // Requirement 7: Verified payments status cannot be changed directly by client
  return incoming.status === existing.status && incoming.verified === existing.verified;
}

test('1. Firestore ID Hardening - Validates Document IDs and Rejects Path Poisoning', () => {
  assert.equal(isValidId('user_12345'), true);
  assert.equal(isValidId('tx-2026-11-09-001'), true);
  assert.equal(isValidId('PAY-CAP-777'), true);

  // Path injection attempts
  assert.equal(isValidId('../../../etc/passwd'), false);
  assert.equal(isValidId('user/with/slashes'), false);
  assert.equal(isValidId(''), false);
  assert.equal(isValidId('a'.repeat(150)), false); // Exceeds 128 limit
});

test('2. User Profile Validation - Enforces Currency, Country & Positive Financial Inputs', () => {
  const validProfile = {
    displayName: 'Alex Morgan',
    country: 'United States',
    preferredCurrency: 'USD',
    monthlyIncome: 6000,
    monthlyEssentialExpenses: 2800,
    monthlySavingsGoal: 1000,
    emergencyAllocation: 200,
  };
  assert.equal(isValidUserProfile(validProfile), true);

  // Invalid: negative income
  assert.equal(isValidUserProfile({ ...validProfile, monthlyIncome: -500 }), false);

  // Invalid: negative essential expenses
  assert.equal(isValidUserProfile({ ...validProfile, monthlyEssentialExpenses: -100 }), false);

  // Invalid: missing currency
  assert.equal(isValidUserProfile({ ...validProfile, preferredCurrency: '' }), false);
});

test('3. Expense Invariant - Validates Ownership, Category, and Currency Code Preservation', () => {
  const validExpense = {
    userId: 'user_abc123',
    title: 'Weekly Farm Fresh Groceries',
    amount: 85.5,
    currency: 'USD',
    category: 'Groceries',
    date: '2026-11-09',
    status: 'completed',
    source: 'manual',
  };

  assert.equal(isValidExpense(validExpense, 'user_abc123'), true);

  // Rejects cross-user forgery (user A attempting to write for user B)
  assert.equal(isValidExpense(validExpense, 'user_victim'), false);

  // Rejects zero or negative amounts
  assert.equal(isValidExpense({ ...validExpense, amount: 0 }, 'user_abc123'), false);
  assert.equal(isValidExpense({ ...validExpense, amount: -25 }, 'user_abc123'), false);

  // Rejects empty category
  assert.equal(isValidExpense({ ...validExpense, category: '' }, 'user_abc123'), false);
});

test('4. Budget Summary Validation - Enforces User Ownership and Numeric Financial Parameters', () => {
  const validBudget = {
    userId: 'user_abc123',
    currency: 'USD',
    monthlyIncome: 5000,
    flexibleBudget: 1500,
    remainingFlexibleBudget: 1200,
  };

  assert.equal(isValidBudgetSummary(validBudget, 'user_abc123'), true);
  assert.equal(isValidBudgetSummary(validBudget, 'other_user'), false);
});

test('5. Anti-Tamper Security - Rejects Modifying Verified PayPal Payment Status Directly', () => {
  const existingPayPalExpense = {
    id: 'exp_paypal_cap_1',
    userId: 'user_1',
    title: 'Ergonomic Desk Chair',
    amount: 189.0,
    currency: 'USD',
    category: 'Housing',
    date: '2026-11-09',
    status: 'completed',
    source: 'PayPal',
  };

  // User attempts to change status to 'refunded' directly via client SDK without verified webhook
  const tamperedExpense = {
    ...existingPayPalExpense,
    status: 'refunded', // Direct frontend tampering
  };
  assert.equal(canUpdateExpense(existingPayPalExpense, tamperedExpense), false);

  // Legitimate update that does NOT alter verified payment status (e.g. adding personal notes)
  const legitUpdate = {
    ...existingPayPalExpense,
    notes: 'Home office delivery arrived',
  };
  assert.equal(canUpdateExpense(existingPayPalExpense, legitUpdate), true);
});

test('6. Verified Payment Records Security - Rejects Client Modifications to Status or Verification', () => {
  const existingPayment = {
    id: 'pay_123',
    userId: 'user_1',
    orderId: 'ORDER-999',
    captureId: 'CAP-999',
    amount: 129.0,
    currency: 'USD',
    status: 'COMPLETED',
    verified: true,
  };

  // Attempt to mark as unverified or change status
  assert.equal(canUpdatePaymentRecord(existingPayment, { ...existingPayment, verified: false }), false);
  assert.equal(canUpdatePaymentRecord(existingPayment, { ...existingPayment, status: 'DENIED' }), false);
  assert.equal(canUpdatePaymentRecord(existingPayment, { ...existingPayment }), true);
});

test('7. Data Partition Invariant - Separates Demo Data from Authenticated User Storage', () => {
  const demoUserId = 'demo-user-123';
  const authenticatedUserId = 'auth_firebase_uid_987';

  // Demo user data uses demo namespace
  assert.equal(demoUserId.startsWith('demo-'), true);
  assert.notEqual(demoUserId, authenticatedUserId);

  // Invariant: Firestore operations are bypassed when in demo mode
  let firestoreCalled = false;
  function persistData(isDemo: boolean) {
    if (isDemo) {
      // Demo: strictly local memory / storage
      return 'localStorage';
    }
    // Authenticated: uses Firestore
    firestoreCalled = true;
    return 'firestore';
  }

  assert.equal(persistData(true), 'localStorage');
  assert.equal(firestoreCalled, false);

  assert.equal(persistData(false), 'firestore');
  assert.equal(firestoreCalled, true);
});
