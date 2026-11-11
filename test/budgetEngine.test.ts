import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateDeterministicBudget,
  getCurrencyDecimalFactor,
  getDaysInMonth,
  roundCurrency,
} from '../src/server/budgetEngine.js';

test('1. Normal Budget Calculation - Verifies All 10 Formulas', () => {
  const result = calculateDeterministicBudget({
    monthlyIncome: 5000,
    essentialExpenses: 2500,
    savingsTarget: 800,
    emergencyAllocation: 200,
    loggedExpenses: [
      { amount: 150, isEssential: false, category: 'Dining' },
      { amount: 100, isEssential: false, category: 'Shopping' },
      { amount: 200, isEssential: true, category: 'Groceries' }, // Essential logged
    ],
    daysInPeriod: 30,
    daysRemaining: 20,
    currency: 'USD',
  });

  // Formula 1: Flexible budget = 5000 - 2500 - 800 - 200 = 1500
  assert.equal(result.flexibleBudget, 1500);

  // Formula 2: Total expenses = 2500 (essential baseline) + 250 (discretionary) = 2750
  assert.equal(result.discretionaryExpensesSpent, 250);
  assert.equal(result.essentialLoggedExpenses, 200);
  assert.equal(result.totalExpenses, 2750);

  // Formula 3: Remaining flexible = 1500 - 250 = 1250
  assert.equal(result.remainingFlexibleBudget, 1250);

  // Formula 4: Initial daily allowance = 1500 / 30 = 50.00
  assert.equal(result.initialDailyAllowance, 50);

  // Formula 5: Adaptive daily allowance = 1250 / 20 = 62.50
  assert.equal(result.adaptiveDailyAllowance, 62.5);

  // Formula 6: Savings progress rate = (800 / 5000) * 100 = 16%
  assert.equal(result.savingsTargetRate, 16);

  // Formula 7: Percentage of monthly budget spent = (2750 / 5000) * 100 = 55%
  assert.equal(result.percentIncomeSpent, 55);
  // Percent flexible budget spent = (250 / 1500) * 100 = 16.7%
  assert.equal(result.percentFlexibleBudgetSpent, 16.7);

  // Formula 8: Projected end-of-month spending
  // Days elapsed = 30 - 20 = 10. Burn rate = 250 / 10 = 25/day.
  // Projected discretionary = 25 * 30 = 750.
  // Projected total = 2500 + 750 = 3250.
  assert.equal(result.dailyBurnRate, 25);
  assert.equal(result.projectedDiscretionaryTotal, 750);
  assert.equal(result.projectedTotalSpending, 3250);
  assert.equal(result.projectedNetSurplus, 1750);

  // Formula 9: Overspending detection
  assert.equal(result.alerts.isOverbudget, false);
  assert.equal(result.alerts.overbudgetAmount, 0);
  assert.equal(result.alerts.spendingStatus, 'on_track');

  // Formula 10: Savings target risk detection
  assert.equal(result.alerts.atRiskOfMissingSavingsGoal, false);
  assert.equal(result.alerts.projectedSavingsShortfall, 0);
  assert.equal(result.alerts.projectedSavingsSaved, 800);
});

test('2. Essential Expenses Double-Counting Protection', () => {
  // Verifies that marking an expense as isEssential does not double-reduce the flexible budget
  const result = calculateDeterministicBudget({
    monthlyIncome: 4000,
    essentialExpenses: 2000,
    savingsTarget: 500,
    emergencyAllocation: 0,
    loggedExpenses: [
      { amount: 500, isEssential: true, category: 'Rent Portion' },
      { amount: 100, isEssential: false, category: 'Dinner' },
    ],
    daysInPeriod: 30,
    daysRemaining: 15,
  });

  // Flexible budget = 4000 - 2000 - 500 = 1500
  assert.equal(result.flexibleBudget, 1500);
  // Only the $100 discretionary expense reduces the flexible budget!
  assert.equal(result.remainingFlexibleBudget, 1400);
  assert.equal(result.discretionaryExpensesSpent, 100);
  assert.equal(result.essentialLoggedExpenses, 500);
});

test('3. Overspending Detection when Discretionary Budget is Exceeded', () => {
  const result = calculateDeterministicBudget({
    monthlyIncome: 3000,
    essentialExpenses: 1800,
    savingsTarget: 400,
    emergencyAllocation: 100,
    // Flexible budget = 3000 - 1800 - 400 - 100 = 700
    loggedExpenses: [
      { amount: 500, isEssential: false },
      { amount: 350, isEssential: false }, // Total discretionary = 850 (over by 150)
    ],
    daysInPeriod: 30,
    daysRemaining: 10,
  });

  assert.equal(result.flexibleBudget, 700);
  assert.equal(result.remainingFlexibleBudget, -150);
  assert.equal(result.alerts.isOverbudget, true);
  assert.equal(result.alerts.overbudgetAmount, 150);
  assert.equal(result.alerts.spendingStatus, 'overbudget');
  // Adaptive allowance falls to zero when in deficit
  assert.equal(result.adaptiveDailyAllowance, 0);
});

test('4. At-Risk of Missing Savings Target Detection', () => {
  // Days elapsed = 10, days remaining = 20. Total days = 30.
  // In 10 days, user spent 800 in discretionary (80/day).
  // Projected discretionary = 80 * 30 = 2400.
  // Flexible budget = 1000. Emergency = 200.
  // Buffer = 1200. Projected discretionary exceeds buffer by 1200!
  // Cuts into savings goal of 500 completely.
  const result = calculateDeterministicBudget({
    monthlyIncome: 4500,
    essentialExpenses: 2800,
    savingsTarget: 500,
    emergencyAllocation: 200,
    loggedExpenses: [
      { amount: 800, isEssential: false },
    ],
    daysInPeriod: 30,
    daysRemaining: 20,
  });

  assert.equal(result.flexibleBudget, 1000);
  assert.equal(result.dailyBurnRate, 80);
  assert.equal(result.projectedDiscretionaryTotal, 2400);
  assert.equal(result.alerts.atRiskOfMissingSavingsGoal, true);
  assert.equal(result.alerts.projectedSavingsShortfall, 500);
  assert.equal(result.alerts.projectedSavingsSaved, 0);
});

test('5. Zero-Decimal Currency Support (e.g. JPY)', () => {
  const result = calculateDeterministicBudget({
    monthlyIncome: 400000,
    essentialExpenses: 220000,
    savingsTarget: 60000,
    emergencyAllocation: 20000,
    loggedExpenses: [
      { amount: 15300, isEssential: false },
      { amount: 4700, isEssential: false },
    ],
    daysInPeriod: 30,
    daysRemaining: 15,
    currency: 'JPY',
  });

  assert.equal(result.isZeroDecimal, true);
  assert.equal(result.decimalPlaces, 0);
  // Flexible = 400000 - 220000 - 60000 - 20000 = 100000
  assert.equal(result.flexibleBudget, 100000);
  // Spent = 20000. Remaining = 80000
  assert.equal(result.remainingFlexibleBudget, 80000);
  // Adaptive = 80000 / 15 = 5333 (rounded to nearest integer)
  assert.equal(result.adaptiveDailyAllowance, 5333);
});

test('6. Month Length Handling (Leap Years & Variable Month Lengths)', () => {
  // February 2026 (non-leap year) -> 28 days
  assert.equal(getDaysInMonth(2026, 1), 28);
  // February 2028 (leap year) -> 29 days
  assert.equal(getDaysInMonth(2028, 1), 29);
  // April -> 30 days
  assert.equal(getDaysInMonth(2026, 3), 30);
  // December -> 31 days
  assert.equal(getDaysInMonth(2026, 11), 31);

  // Pass February 2026 date:
  const febResult = calculateDeterministicBudget({
    monthlyIncome: 3000,
    essentialExpenses: 1500,
    savingsTarget: 300,
    emergencyAllocation: 0,
    currentDate: '2026-02-10T12:00:00Z', // Day 10 of 28
  });

  assert.equal(febResult.daysInPeriod, 28);
  assert.equal(febResult.daysRemaining, 19); // 28 - 10 + 1
});

test('7. Decimal Safety & Floating Point Precision', () => {
  // Tests numbers known to cause IEEE-754 precision issues (e.g., 0.10, 0.20, 0.07)
  const result = calculateDeterministicBudget({
    monthlyIncome: 1000.1,
    essentialExpenses: 500.2,
    savingsTarget: 100.05,
    emergencyAllocation: 50.05,
    loggedExpenses: [
      { amount: 19.99, isEssential: false },
      { amount: 14.99, isEssential: false },
      { amount: 0.12, isEssential: false },
    ],
    daysInPeriod: 30,
    daysRemaining: 15,
    currency: 'USD',
  });

  // 1000.10 - 500.20 - 100.05 - 50.05 = 349.80
  assert.equal(result.flexibleBudget, 349.8);
  // 19.99 + 14.99 + 0.12 = 35.10
  assert.equal(result.discretionaryExpensesSpent, 35.1);
  // 349.80 - 35.10 = 314.70
  assert.equal(result.remainingFlexibleBudget, 314.7);
});

test('8. Strict Validation Rejection of Negative and Invalid Inputs', () => {
  // Negative income
  assert.throws(
    () =>
      calculateDeterministicBudget({
        monthlyIncome: -100,
        essentialExpenses: 50,
        savingsTarget: 10,
      }),
    /cannot be negative/
  );

  // NaN input
  assert.throws(
    () =>
      calculateDeterministicBudget({
        monthlyIncome: NaN,
        essentialExpenses: 50,
        savingsTarget: 10,
      }),
    /must be a valid finite number/
  );

  // Negative expense
  assert.throws(
    () =>
      calculateDeterministicBudget({
        monthlyIncome: 2000,
        essentialExpenses: 1000,
        savingsTarget: 200,
        loggedExpenses: [{ amount: -25, isEssential: false }],
      }),
    /cannot be negative/
  );
});
