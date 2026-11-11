/**
 * PennyWise AI - Deterministic Budgeting Engine
 * 
 * Strict deterministic, decimal-safe financial calculations.
 * All financial balancing, allowances, projections, and overspending
 * checks are computed here using pure algorithmic logic without LLM reliance.
 */

export interface BudgetInputExpense {
  id?: string;
  amount: number;
  isEssential?: boolean;
  category?: string;
  date?: string;
}

export interface BudgetEngineInput {
  monthlyIncome: number;
  essentialExpenses: number;
  savingsTarget: number;
  emergencyAllocation?: number;
  loggedExpenses?: BudgetInputExpense[];
  currentDate?: string | Date;
  daysInPeriod?: number;
  daysRemaining?: number;
  currency?: string;
}

export interface SpendingAlerts {
  isOverbudget: boolean;
  overbudgetAmount: number;
  spendingStatus: 'on_track' | 'caution' | 'overbudget';
  isPacingAhead: boolean;
  pacingDifferentialPerDay: number;
  atRiskOfMissingSavingsGoal: boolean;
  projectedSavingsShortfall: number;
  projectedSavingsSaved: number;
  projectedSavingsAchievementRate: number;
}

export interface DeterministicBudgetResult {
  // Monetary core outputs
  monthlyIncome: number;
  essentialExpenses: number;
  savingsTarget: number;
  emergencyAllocation: number;
  flexibleBudget: number;

  // Expenses Breakdown
  discretionaryExpensesSpent: number;
  essentialLoggedExpenses: number;
  totalLoggedExpenses: number;
  totalExpenses: number;

  // Allowances & Balances
  remainingFlexibleBudget: number;
  initialDailyAllowance: number;
  adaptiveDailyAllowance: number;
  dailyBurnRate: number;

  // Time & Period metadata
  daysInPeriod: number;
  daysRemaining: number;
  daysElapsed: number;
  currentDateISO: string;

  // Projections & Metrics
  savingsTargetRate: number;
  percentIncomeSpent: number;
  percentFlexibleBudgetSpent: number;
  percentPeriodElapsed: number;
  projectedDiscretionaryTotal: number;
  projectedTotalSpending: number;
  projectedNetSurplus: number;

  // Risk & Alert Flags
  alerts: SpendingAlerts;

  // Currency Info
  currency: string;
  isZeroDecimal: boolean;
  decimalPlaces: number;
}

// Set of zero-decimal ISO currency codes
const ZERO_DECIMAL_CURRENCIES = new Set([
  'JPY', 'KRW', 'VND', 'CLP', 'PYG', 'RWF', 'UGX', 'BIF', 'DJF', 'GNF', 'KMF', 'XAF', 'XOF', 'XPF'
]);

/**
 * Determine decimal factor for a currency (1 for zero-decimal, 100 for 2 decimals)
 */
export function getCurrencyDecimalFactor(currencyCode: string = 'USD'): {
  factor: number;
  decimalPlaces: number;
  isZeroDecimal: boolean;
} {
  const normalized = currencyCode.toUpperCase().trim();
  const isZeroDecimal = ZERO_DECIMAL_CURRENCIES.has(normalized);
  return {
    isZeroDecimal,
    decimalPlaces: isZeroDecimal ? 0 : 2,
    factor: isZeroDecimal ? 1 : 100,
  };
}

/**
 * Decimal-safe round using currency integer subunits (e.g. cents).
 * Prevents IEEE-754 binary floating point precision drift.
 */
export function roundCurrency(amount: number, factor: number): number {
  return Math.round(amount * factor) / factor;
}

/**
 * Helper to compute the total days in a month for any given year and month (0-indexed).
 * Correctly accounts for leap years.
 */
export function getDaysInMonth(year: number, monthIndex: number): number {
  return new Date(year, monthIndex + 1, 0).getDate();
}

/**
 * Validates financial number input. Rejects negative numbers, NaN, Infinity, and non-numeric types.
 */
function validateNonNegativeNumber(val: any, fieldName: string): number {
  if (typeof val !== 'number' || isNaN(val) || !isFinite(val)) {
    throw new Error(`Validation Error: ${fieldName} must be a valid finite number.`);
  }
  if (val < 0) {
    throw new Error(`Validation Error: ${fieldName} cannot be negative. Received ${val}.`);
  }
  return val;
}

/**
 * Main deterministic budgeting calculation engine.
 */
export function calculateDeterministicBudget(input: BudgetEngineInput): DeterministicBudgetResult {
  if (!input || typeof input !== 'object') {
    throw new Error('Validation Error: Input parameters object is required.');
  }

  // 1. Validate Core Financial Inputs
  const monthlyIncome = validateNonNegativeNumber(input.monthlyIncome, 'Monthly income');
  const essentialExpenses = validateNonNegativeNumber(input.essentialExpenses, 'Essential expenses');
  const savingsTarget = validateNonNegativeNumber(input.savingsTarget, 'Savings target');
  const emergencyAllocation = validateNonNegativeNumber(
    input.emergencyAllocation ?? 0,
    'Emergency allocation'
  );

  // 2. Currency Subunit Factor
  const currency = (input.currency || 'USD').toUpperCase().trim();
  const { factor, decimalPlaces, isZeroDecimal } = getCurrencyDecimalFactor(currency);

  // 3. Date & Time Calculations
  const dateObj = input.currentDate ? new Date(input.currentDate) : new Date();
  if (isNaN(dateObj.getTime())) {
    throw new Error('Validation Error: Invalid currentDate provided.');
  }

  const year = dateObj.getFullYear();
  const month = dateObj.getMonth();
  const dayOfMonth = dateObj.getDate();

  const autoDaysInMonth = getDaysInMonth(year, month);
  const daysInPeriod =
    typeof input.daysInPeriod === 'number' && input.daysInPeriod > 0
      ? Math.floor(input.daysInPeriod)
      : autoDaysInMonth;

  // Days remaining includes today
  const autoDaysRemaining = Math.max(1, daysInPeriod - dayOfMonth + 1);
  const daysRemaining =
    typeof input.daysRemaining === 'number' && input.daysRemaining >= 0
      ? Math.floor(input.daysRemaining)
      : autoDaysRemaining;

  const daysElapsed = Math.max(1, daysInPeriod - daysRemaining);

  // 4. Calculate Flexible Spending Budget
  // Formula 1: Flexible Budget = Income - Essential Expenses - Savings Target - Emergency Allocation
  const incomeSubunits = Math.round(monthlyIncome * factor);
  const essentialsSubunits = Math.round(essentialExpenses * factor);
  const savingsSubunits = Math.round(savingsTarget * factor);
  const emergencySubunits = Math.round(emergencyAllocation * factor);

  const flexibleBudgetSubunits = Math.max(
    0,
    incomeSubunits - (essentialsSubunits + savingsSubunits + emergencySubunits)
  );
  const flexibleBudget = roundCurrency(flexibleBudgetSubunits / factor, factor);

  // 5. Aggregate Logged Expenses without double-counting
  const loggedExpenses = Array.isArray(input.loggedExpenses) ? input.loggedExpenses : [];
  let discretionarySubunits = 0;
  let essentialLoggedSubunits = 0;

  for (let i = 0; i < loggedExpenses.length; i++) {
    const exp = loggedExpenses[i];
    const amt = validateNonNegativeNumber(exp.amount, `Expense #${i + 1} amount`);
    const expSubunits = Math.round(amt * factor);

    if (exp.isEssential) {
      essentialLoggedSubunits += expSubunits;
    } else {
      discretionarySubunits += expSubunits;
    }
  }

  const discretionaryExpensesSpent = roundCurrency(discretionarySubunits / factor, factor);
  const essentialLoggedExpenses = roundCurrency(essentialLoggedSubunits / factor, factor);
  const totalLoggedExpenses = roundCurrency(
    (discretionarySubunits + essentialLoggedSubunits) / factor,
    factor
  );

  // Formula 2: Total Expenses = Baseline Essential Commitments + Discretionary Spent
  // Never double-count essential expenses!
  const totalExpensesSubunits = essentialsSubunits + discretionarySubunits;
  const totalExpenses = roundCurrency(totalExpensesSubunits / factor, factor);

  // Formula 3: Remaining Flexible Budget = Flexible Budget - Discretionary Expenses Spent
  const remainingFlexibleSubunits = flexibleBudgetSubunits - discretionarySubunits;
  const remainingFlexibleBudget = roundCurrency(remainingFlexibleSubunits / factor, factor);

  // Formula 4: Initial Daily Allowance = Flexible Budget / Total Days in Period
  const initialDailyAllowance =
    daysInPeriod > 0 ? roundCurrency(flexibleBudget / daysInPeriod, factor) : 0;

  // Formula 5: Adaptive Daily Allowance = Remaining Flexible / Remaining Days
  const adaptiveDailyAllowance =
    daysRemaining > 0 && remainingFlexibleBudget > 0
      ? roundCurrency(remainingFlexibleBudget / daysRemaining, factor)
      : 0;

  // Daily Burn Rate over elapsed period
  const dailyBurnRate = roundCurrency(discretionaryExpensesSpent / daysElapsed, factor);

  // Formula 6: Savings Progress & Target Rate
  const savingsTargetRate =
    monthlyIncome > 0
      ? roundCurrency((savingsTarget / monthlyIncome) * 100, 10)
      : 0;

  // Formula 7: Percentage of Monthly Budget Spent
  const percentIncomeSpent =
    monthlyIncome > 0
      ? roundCurrency((totalExpenses / monthlyIncome) * 100, 10)
      : 0;

  const percentFlexibleBudgetSpent =
    flexibleBudget > 0
      ? roundCurrency((discretionaryExpensesSpent / flexibleBudget) * 100, 10)
      : discretionaryExpensesSpent > 0
      ? 100
      : 0;

  const percentPeriodElapsed =
    daysInPeriod > 0
      ? roundCurrency((daysElapsed / daysInPeriod) * 100, 10)
      : 0;

  // Formula 8: Projected End-of-Month Spending
  const projectedDiscretionaryTotal = roundCurrency(dailyBurnRate * daysInPeriod, factor);
  const projectedTotalSpending = roundCurrency(essentialExpenses + projectedDiscretionaryTotal, factor);
  const projectedNetSurplus = roundCurrency(monthlyIncome - projectedTotalSpending, factor);

  // Formula 9: Detect Overspending
  const isOverbudget = remainingFlexibleBudget < 0;
  const overbudgetAmount = isOverbudget ? roundCurrency(Math.abs(remainingFlexibleBudget), factor) : 0;

  const isPacingAhead = dailyBurnRate > initialDailyAllowance * 1.15;
  const pacingDifferentialPerDay = roundCurrency(dailyBurnRate - initialDailyAllowance, factor);

  let spendingStatus: 'on_track' | 'caution' | 'overbudget' = 'on_track';
  if (isOverbudget) {
    spendingStatus = 'overbudget';
  } else if (isPacingAhead || remainingFlexibleBudget < adaptiveDailyAllowance * daysRemaining * 0.8) {
    spendingStatus = 'caution';
  }

  // Formula 10: Detect When User is Likely to Miss Savings Target
  // If projected discretionary spending exceeds flexible budget + emergency allocation,
  // the overflow cuts directly into target savings.
  const discretionaryBufferSubunits = flexibleBudgetSubunits + emergencySubunits;
  const projectedDiscretionarySubunits = Math.round(projectedDiscretionaryTotal * factor);

  let projectedSavingsShortfall = 0;
  if (projectedDiscretionarySubunits > discretionaryBufferSubunits) {
    const rawShortfall = projectedDiscretionarySubunits - discretionaryBufferSubunits;
    projectedSavingsShortfall = roundCurrency(
      Math.min(savingsTarget, rawShortfall / factor),
      factor
    );
  }

  const atRiskOfMissingSavingsGoal = projectedSavingsShortfall > 0;
  const projectedSavingsSaved = roundCurrency(
    Math.max(0, savingsTarget - projectedSavingsShortfall),
    factor
  );

  const projectedSavingsAchievementRate =
    savingsTarget > 0
      ? roundCurrency((projectedSavingsSaved / savingsTarget) * 100, 10)
      : 100;

  return {
    monthlyIncome,
    essentialExpenses,
    savingsTarget,
    emergencyAllocation,
    flexibleBudget,

    discretionaryExpensesSpent,
    essentialLoggedExpenses,
    totalLoggedExpenses,
    totalExpenses,

    remainingFlexibleBudget,
    initialDailyAllowance,
    adaptiveDailyAllowance,
    dailyBurnRate,

    daysInPeriod,
    daysRemaining,
    daysElapsed,
    currentDateISO: dateObj.toISOString(),

    savingsTargetRate,
    percentIncomeSpent,
    percentFlexibleBudgetSpent,
    percentPeriodElapsed,
    projectedDiscretionaryTotal,
    projectedTotalSpending,
    projectedNetSurplus,

    alerts: {
      isOverbudget,
      overbudgetAmount,
      spendingStatus,
      isPacingAhead,
      pacingDifferentialPerDay,
      atRiskOfMissingSavingsGoal,
      projectedSavingsShortfall,
      projectedSavingsSaved,
      projectedSavingsAchievementRate,
    },

    currency,
    isZeroDecimal,
    decimalPlaces,
  };
}
