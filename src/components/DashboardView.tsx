import React, { useState, useEffect } from 'react';
import {
  Wallet,
  Receipt,
  PiggyBank,
  Calendar,
  Sparkles,
  ArrowUpRight,
  TrendingUp,
  Plus,
  ShoppingBag,
  RefreshCw,
  Info,
  AlertCircle,
  AlertTriangle,
} from 'lucide-react';
import { useFinance } from '../context/FinanceContext';
import { api } from '../services/api';

interface DashboardViewProps {
  onOpenExpenseModal: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({ onOpenExpenseModal }) => {
  const { budget, expenses, profile, savingsGoals, formatMoney, isDemo, setActiveTab } =
    useFinance();

  const [aiInsight, setAiInsight] = useState<{ summary: string; tips: string[] }>({
    summary: 'Stay mindful of your daily allowance to reach your savings targets steadily.',
    tips: [
      'Pace your discretionary purchases evenly throughout the week.',
      'Check in on your savings goals after logging daily receipts.',
    ],
  });
  const [loadingInsight, setLoadingInsight] = useState(false);

  // Fetch AI spending insight using real backend Gemini endpoint
  const fetchInsight = async () => {
    if (!budget) return;
    setLoadingInsight(true);
    try {
      const result = await api.generateInsights({
        budget,
        expenses,
        currency: profile?.preferredCurrency || 'USD',
      });
      setAiInsight(result);
    } catch (err) {
      console.warn('Failed to generate insights:', err);
    } finally {
      setLoadingInsight(false);
    }
  };

  useEffect(() => {
    if (budget.monthlyIncome > 0) {
      fetchInsight();
    }
  }, [budget.monthlyIncome, expenses.length]);

  // Aggregate expenses by category
  const categoryTotals = React.useMemo(() => {
    const totals: Record<string, number> = {};
    for (const exp of expenses) {
      totals[exp.category] = (totals[exp.category] || 0) + Number(exp.amount);
    }
    return Object.entries(totals)
      .map(([category, amount]) => ({
        category,
        amount,
        percentage:
          budget.totalLoggedExpenses > 0
            ? Math.round((amount / budget.totalLoggedExpenses) * 100)
            : 0,
      }))
      .sort((a, b) => b.amount - a.amount);
  }, [expenses, budget.totalLoggedExpenses]);

  // Recent 5 transactions
  const recentExpenses = expenses.slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Demo Mode Notice */}
      {isDemo && (
        <div className="p-3.5 bg-amber-50/80 border border-amber-200/80 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-amber-900">
          <div className="flex items-center gap-2">
            <Info className="w-4 h-4 text-amber-700 shrink-0" />
            <span>
              <strong>Demo Mode Active:</strong> You are exploring with sample data. No real
              financial accounts are connected.
            </span>
          </div>
          <button
            onClick={() => setActiveTab('settings')}
            className="text-amber-800 hover:text-amber-950 font-semibold underline underline-offset-2 shrink-0 self-start sm:self-auto"
          >
            Switch to Personal Budget
          </button>
        </div>
      )}

      {/* Hero Welcome & Quick Actions Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Financial Dashboard
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            {profile?.displayName ? `Hello, ${profile.displayName}. ` : ''}
            Here is your financial picture for this month's budget cycle ({profile?.monthlyBudgetPeriod || '1st to End of Month'}).
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            onClick={onOpenExpenseModal}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-xs transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Log Expense</span>
          </button>
          <button
            onClick={() => setActiveTab('analyzer')}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg transition-colors shadow-xs"
          >
            <ShoppingBag className="w-3.5 h-3.5 text-slate-500" />
            <span>Evaluate Purchase</span>
          </button>
        </div>
      </div>

      {/* Overspending & Savings Target Proactive Alerts */}
      {budget.alerts.isOverbudget && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-900 flex items-start gap-3 shadow-xs">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <div className="font-bold text-rose-950">
              Overspending Detected: Flexible Budget Exceeded
            </div>
            <p className="leading-relaxed">
              Discretionary spending has exceeded your flexible allocation by{' '}
              <strong className="font-mono tabular-nums">{formatMoney(budget.alerts.overbudgetAmount)}</strong>.
              Your daily flexible allowance is currently paused at {formatMoney(0)}/day. Additional spending will draw down your emergency buffer or savings target.
            </p>
          </div>
        </div>
      )}

      {!budget.alerts.isOverbudget && budget.alerts.atRiskOfMissingSavingsGoal && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-start gap-3 shadow-xs">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <div className="font-bold text-amber-950">
              Savings Target at Risk Based on Current Run-Rate
            </div>
            <p className="leading-relaxed">
              At your current daily burn rate of{' '}
              <strong className="font-mono tabular-nums">{formatMoney(budget.dailyBurnRate)}/day</strong>,
              projected end-of-month discretionary spending is{' '}
              <strong className="font-mono tabular-nums">{formatMoney(budget.projectedDiscretionaryTotal)}</strong>.
              This run-rate is projected to shortfall your savings target by{' '}
              <strong className="font-mono tabular-nums">{formatMoney(budget.alerts.projectedSavingsShortfall)}</strong>{' '}
              ({budget.alerts.projectedSavingsAchievementRate}% projected achievement).
            </p>
          </div>
        </div>
      )}

      {/* KPI Stat Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Card 1: Monthly Income */}
        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium mb-1">
            <span>Monthly Income</span>
            <Wallet className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-xl font-bold font-mono tabular-nums text-slate-900">
            {formatMoney(budget.monthlyIncome)}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Verified take-home baseline</div>
        </div>

        {/* Card 2: Total Expenses */}
        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium mb-1">
            <span>Total Expenses</span>
            <Receipt className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-xl font-bold font-mono tabular-nums text-slate-900">
            {formatMoney(budget.totalExpenses)}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            {budget.percentIncomeSpent}% of income spent
          </div>
        </div>

        {/* Card 3: Remaining Flexible Budget */}
        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium mb-1">
            <span>Remaining Flexible</span>
            <TrendingUp className="w-4 h-4 text-emerald-600" />
          </div>
          <div
            className={`text-xl font-bold font-mono tabular-nums ${
              budget.remainingFlexibleBudget >= 0 ? 'text-emerald-700' : 'text-rose-600'
            }`}
          >
            {formatMoney(budget.remainingFlexibleBudget)}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            Pool of {formatMoney(budget.flexibleBudget)} ({budget.percentFlexibleBudgetSpent}% spent)
          </div>
        </div>

        {/* Card 4: Daily Spending Allowance */}
        <div className="p-4 bg-emerald-50/60 rounded-xl border border-emerald-200/80 shadow-xs">
          <div className="flex items-center justify-between text-emerald-800 text-xs font-semibold mb-1">
            <span>Adaptive Allowance</span>
            <Calendar className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-xl font-extrabold font-mono tabular-nums text-emerald-950">
            {formatMoney(budget.adaptiveDailyAllowance)}
            <span className="text-xs font-medium text-emerald-700 ml-1">/ day</span>
          </div>
          <div className="text-[11px] text-emerald-800 mt-1 flex justify-between">
            <span>{budget.daysRemaining} days left</span>
            <span>Initial: {formatMoney(budget.initialDailyAllowance)}/d</span>
          </div>
        </div>

        {/* Card 5: Savings Goal Progress */}
        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium mb-1">
            <span>Savings Target</span>
            <PiggyBank className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-xl font-bold font-mono tabular-nums text-slate-900">
            {formatMoney(budget.savingsTarget)}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            {budget.savingsTargetRate}% targeted ({budget.alerts.projectedSavingsAchievementRate}% projected)
          </div>
        </div>
      </div>

      {/* Deterministic End-of-Month Projections Banner */}
      <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-xs grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
        <div>
          <div className="text-slate-400 text-[11px]">Daily Burn Rate</div>
          <div className="text-sm font-bold font-mono tabular-nums text-slate-900 mt-0.5">
            {formatMoney(budget.dailyBurnRate)} / day
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">
            Based on {budget.daysElapsed} days elapsed
          </div>
        </div>

        <div>
          <div className="text-slate-400 text-[11px]">Projected Discretionary</div>
          <div className="text-sm font-bold font-mono tabular-nums text-slate-900 mt-0.5">
            {formatMoney(budget.projectedDiscretionaryTotal)}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">
            vs {formatMoney(budget.flexibleBudget)} pool
          </div>
        </div>

        <div>
          <div className="text-slate-400 text-[11px]">Projected Total Spend</div>
          <div className="text-sm font-bold font-mono tabular-nums text-slate-900 mt-0.5">
            {formatMoney(budget.projectedTotalSpending)}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">
            Essential + Discretionary
          </div>
        </div>

        <div>
          <div className="text-slate-400 text-[11px]">Projected Period Surplus</div>
          <div
            className={`text-sm font-bold font-mono tabular-nums mt-0.5 ${
              budget.projectedNetSurplus >= 0 ? 'text-emerald-700' : 'text-rose-600'
            }`}
          >
            {formatMoney(budget.projectedNetSurplus)}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">
            After all spending & targets
          </div>
        </div>
      </div>

      {/* AI Spending Insight Card */}
      <div className="p-5 bg-gradient-to-r from-emerald-50/80 via-white to-sky-50/60 rounded-xl border border-emerald-200/70 shadow-xs">
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-emerald-600 text-white flex items-center justify-center">
              <Sparkles className="w-3.5 h-3.5" />
            </div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-900">
              PennyWise AI Spending Insight
            </h3>
          </div>
          <button
            onClick={fetchInsight}
            disabled={loadingInsight}
            className="flex items-center gap-1 text-[11px] font-medium text-slate-600 hover:text-slate-900 px-2 py-1 rounded hover:bg-white/80 transition-colors"
          >
            <RefreshCw className={`w-3 h-3 ${loadingInsight ? 'animate-spin' : ''}`} />
            <span>{loadingInsight ? 'Updating...' : 'Refresh Insight'}</span>
          </button>
        </div>
        <p className="text-sm text-slate-800 leading-relaxed font-medium">
          {aiInsight.summary}
        </p>
        {aiInsight.tips && aiInsight.tips.length > 0 && (
          <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-2 text-xs text-slate-600">
            {aiInsight.tips.map((tip, idx) => (
              <div key={idx} className="flex items-start gap-2 bg-white/70 p-2.5 rounded-lg border border-slate-200/60">
                <span className="text-emerald-600 font-bold">·</span>
                <span>{tip}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Two Column Layout: Categories & Transactions */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Spending Breakdown & Monthly Allocation */}
        <div className="lg:col-span-7 space-y-6">
          {/* Category Breakdown */}
          <div className="p-5 bg-white rounded-xl border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-sm font-bold text-slate-900 tracking-tight">
                  Spending by Category
                </h2>
                <p className="text-xs text-slate-500">
                  {expenses.length} logged expense{expenses.length === 1 ? '' : 's'} this period
                </p>
              </div>
              <button
                onClick={() => setActiveTab('expenses')}
                className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 flex items-center gap-1"
              >
                <span>View all</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {categoryTotals.length === 0 ? (
              <div className="py-8 text-center text-slate-500 text-xs">
                No discretionary expenses recorded yet. Click "Log Expense" to begin tracking.
              </div>
            ) : (
              <div className="space-y-3.5">
                {categoryTotals.map((cat) => (
                  <div key={cat.category} className="space-y-1">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-medium text-slate-700">{cat.category}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-slate-400">{cat.percentage}%</span>
                        <span className="font-semibold font-mono tabular-nums text-slate-900">
                          {formatMoney(cat.amount)}
                        </span>
                      </div>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                      <div
                        className="bg-slate-800 h-1.5 rounded-full transition-all duration-300"
                        style={{ width: `${Math.min(100, Math.max(5, cat.percentage))}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Monthly Budget Distribution Flow */}
          <div className="p-5 bg-white rounded-xl border border-slate-200 shadow-xs">
            <h2 className="text-sm font-bold text-slate-900 tracking-tight mb-1">
              Monthly Income Allocation
            </h2>
            <p className="text-xs text-slate-500 mb-4">
              How your total {formatMoney(budget.monthlyIncome)} is distributed
            </p>

            <div className="space-y-3 text-xs">
              <div className="flex justify-between items-center py-1.5 border-b border-slate-100">
                <span className="text-slate-600">Essential Fixed Commitments</span>
                <span className="font-semibold font-mono tabular-nums text-slate-900">
                  {formatMoney(budget.essentialExpenses)}
                </span>
              </div>
              <div className="flex justify-between items-center py-1.5 border-b border-slate-100">
                <span className="text-slate-600">Monthly Savings Goal</span>
                <span className="font-semibold font-mono tabular-nums text-slate-900">
                  {formatMoney(budget.savingsTarget)}
                </span>
              </div>
              <div className="flex justify-between items-center py-1.5 border-b border-slate-100">
                <span className="text-slate-600">Emergency Buffer Allocation</span>
                <span className="font-semibold font-mono tabular-nums text-slate-900">
                  {formatMoney(budget.emergencyAllocation)}
                </span>
              </div>
              <div className="flex justify-between items-center py-1.5 border-b border-slate-100">
                <span className="text-slate-600">Discretionary Expenses Spent</span>
                <span className="font-semibold font-mono tabular-nums text-slate-900">
                  {formatMoney(budget.discretionaryExpensesSpent)}
                </span>
              </div>
              <div className="flex justify-between items-center pt-2 font-bold text-slate-900">
                <span>Remaining Flexible for Month</span>
                <span className="font-mono tabular-nums text-emerald-700">
                  {formatMoney(budget.remainingFlexibleBudget)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Recent Transactions & Savings Goals */}
        <div className="lg:col-span-5 space-y-6">
          {/* Recent Transactions */}
          <div className="p-5 bg-white rounded-xl border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-sm font-bold text-slate-900 tracking-tight">
                  Recent Transactions
                </h2>
                <p className="text-xs text-slate-500">Latest logged transactions</p>
              </div>
              <button
                onClick={() => setActiveTab('expenses')}
                className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 flex items-center gap-1"
              >
                <span>View all</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {recentExpenses.length === 0 ? (
              <div className="py-8 text-center text-slate-500 text-xs">
                No recent transactions logged.
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {recentExpenses.map((exp) => (
                  <div key={exp.id} className="py-2.5 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-slate-800 truncate">
                        {exp.title}
                      </div>
                      <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
                        <span>{exp.category}</span>
                        <span aria-hidden="true">·</span>
                        <span>{exp.date}</span>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-xs font-bold font-mono tabular-nums text-slate-900">
                        -{formatMoney(exp.amount)}
                      </div>
                      <span className="text-[10px] text-slate-400">
                        {exp.isEssential ? 'Essential' : 'Flexible'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Savings Goals Snapshot */}
          <div className="p-5 bg-white rounded-xl border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-sm font-bold text-slate-900 tracking-tight">
                  Active Savings Goals
                </h2>
                <p className="text-xs text-slate-500">Track progress toward targets</p>
              </div>
              <button
                onClick={() => setActiveTab('savings')}
                className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 flex items-center gap-1"
              >
                <span>Manage</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {savingsGoals.length === 0 ? (
              <div className="py-6 text-center text-slate-500 text-xs">
                No savings goals created yet.
              </div>
            ) : (
              <div className="space-y-4">
                {savingsGoals.slice(0, 3).map((goal) => {
                  const pct = Math.min(
                    100,
                    Math.round((goal.currentAmount / goal.targetAmount) * 100)
                  );
                  return (
                    <div key={goal.id} className="space-y-1">
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-semibold text-slate-800">{goal.title}</span>
                        <span className="text-slate-500 font-mono tabular-nums">
                          {formatMoney(goal.currentAmount)} / {formatMoney(goal.targetAmount)}
                        </span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                        <div
                          className="bg-emerald-600 h-1.5 rounded-full"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <div className="flex justify-between items-center text-[10px] text-slate-400">
                        <span>{pct}% funded</span>
                        {goal.targetDate && <span>Target: {goal.targetDate}</span>}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
