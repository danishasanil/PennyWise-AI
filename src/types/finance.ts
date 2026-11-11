export type CurrencyCode = string;

export interface UserProfile {
  id?: string;
  displayName: string;
  country: string;
  preferredCurrency: CurrencyCode;
  monthlyIncome: number;
  monthlyEssentialExpenses: number;
  monthlySavingsGoal: number;
  emergencyAllocation: number;
  monthlyBudgetPeriod: string; // e.g., '1st to End of Month'
  onboardingCompleted: boolean;
  isDemo?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export type ExpenseCategory =
  | 'Food'
  | 'Groceries'
  | 'Transportation'
  | 'Shopping'
  | 'Entertainment'
  | 'Education'
  | 'Healthcare'
  | 'Housing'
  | 'Bills'
  | 'Travel'
  | 'Other';

export const EXPENSE_CATEGORIES: ExpenseCategory[] = [
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

export type TransactionStatus = 'completed' | 'pending' | 'cleared' | 'refunded' | 'reversed' | 'denied';
export type TransactionSource = 'manual' | 'PayPal';

export interface Expense {
  id: string; // Unique transaction ID
  userId: string;
  title: string; // Description or vendor title
  description?: string; // Detailed description or vendor
  amount: number;
  currency: string;
  category: ExpenseCategory;
  date: string; // YYYY-MM-DD
  paymentMethod?: string;
  status: TransactionStatus; // Transaction status
  source: TransactionSource; // Source (manual or PayPal)
  notes?: string;
  isEssential: boolean;
  createdAt: string;
}

export interface SavingsGoal {
  id: string;
  userId: string;
  title: string;
  targetAmount: number;
  currentAmount: number;
  currency?: string;
  targetDate?: string;
  category: string;
  notes?: string;
  progressPercentage?: number;
  remainingAmount?: number;
  createdAt: string;
  updatedAt?: string;
}

export interface PurchaseAnalysis {
  id: string;
  userId: string;
  itemName: string;
  price: number;
  currency?: string;
  category: string;
  priority: 'need' | 'want' | 'luxury';
  affordabilityVerdict: 'Comfortable' | 'Caution' | 'High Impact';
  impactRemainingBudget: number;
  impactDailyAllowance: number;
  aiExplanation: string;
  status?: string;
  createdAt: string;
}

export interface PaymentRecord {
  id: string;
  userId: string;
  orderId: string;
  captureId?: string;
  status: string;
  amount: number;
  currency: string;
  description: string;
  purpose?: string;
  source?: string;
  verified: boolean;
  createdAt: string;
}

export interface PayPalOrder {
  id: string;
  userId: string;
  orderId: string;
  productId?: string;
  itemName: string;
  amount: number;
  currency: string;
  category: ExpenseCategory;
  status: string;
  createdAt: string;
  updatedAt?: string;
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

export interface BudgetSummary {
  monthlyIncome: number;
  essentialExpenses: number;
  savingsTarget: number;
  emergencyAllocation: number;
  flexibleBudget: number;

  discretionaryExpensesSpent: number;
  essentialLoggedExpenses: number;
  totalLoggedExpenses: number;
  totalExpenses: number;

  remainingFlexibleBudget: number;
  initialDailyAllowance: number;
  adaptiveDailyAllowance: number;
  dailyBurnRate: number;

  daysInPeriod: number;
  daysRemaining: number;
  daysElapsed: number;
  currentDateISO: string;

  savingsTargetRate: number;
  percentIncomeSpent: number;
  percentFlexibleBudgetSpent: number;
  percentPeriodElapsed: number;
  projectedDiscretionaryTotal: number;
  projectedTotalSpending: number;
  projectedNetSurplus: number;

  alerts: SpendingAlerts;

  currency: string;
  isZeroDecimal: boolean;
  decimalPlaces: number;
}

export type NavTab =
  | 'dashboard'
  | 'budget'
  | 'expenses'
  | 'savings'
  | 'ai-assistant'
  | 'analyzer'
  | 'paypal'
  | 'settings';
