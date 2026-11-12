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
  ChevronRight,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  SlidersHorizontal,
  CreditCard,
  Layers,
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

  // Today's formatted date
  const todayFormatted = new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  }).format(new Date());

  // Category color mapping
  const getCategoryColor = (cat: string) => {
    switch (cat.toLowerCase()) {
      case 'food':
        return 'bg-emerald-600 text-emerald-600';
      case 'groceries':
        return 'bg-teal-500 text-teal-500';
      case 'shopping':
        return 'bg-indigo-500 text-indigo-500';
      case 'transportation':
        return 'bg-amber-500 text-amber-500';
      case 'entertainment':
        return 'bg-purple-500 text-purple-500';
      case 'housing':
      case 'bills':
        return 'bg-rose-500 text-rose-500';
      default:
        return 'bg-slate-500 text-slate-500';
    }
  };

  return (
    <div className="space-y-6">
      {/* Demo Mode Notice */}
      {isDemo && (
        <div className="p-3.5 bg-amber-50/90 border border-amber-200/90 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-amber-950 shadow-2xs">
          <div className="flex items-center gap-2.5">
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
            <span>
              <strong>Demo Mode Active:</strong> You are exploring with sample financial numbers. No live bank credentials or personal data are stored.
            </span>
          </div>
          <button
            onClick={() => setActiveTab('settings')}
            className="text-amber-900 hover:text-amber-950 font-semibold underline underline-offset-2 shrink-0 self-start sm:self-auto cursor-pointer"
          >
            Configure Personal Budget
          </button>
        </div>
      )}

      {/* Welcome Area with Date, Budget Cycle & Quick Action Buttons */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-2 border-b border-slate-200/80">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
              {profile?.displayName ? `Welcome back, ${profile.displayName}` : 'Financial Dashboard'}
            </h1>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
              {profile?.preferredCurrency || 'USD'}
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 flex flex-wrap items-center gap-1.5 sm:gap-2">
            <span>{todayFormatted}</span>
            <span>·</span>
            <span className="text-slate-600 font-medium">
              Budget Period: {profile?.monthlyBudgetPeriod || '1st to End of Month'} ({budget.daysRemaining} days left)
            </span>
          </p>
        </div>

        {/* Quick Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            onClick={onOpenExpenseModal}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-xl shadow-xs transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Log Expense</span>
          </button>
          <button
            onClick={() => setActiveTab('analyzer')}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-800 hover:text-slate-900 bg-white hover:bg-slate-50 border border-slate-200/90 rounded-xl transition-all shadow-2xs cursor-pointer"
          >
            <ShoppingBag className="w-4 h-4 text-slate-500" />
            <span>Evaluate Purchase</span>
          </button>
          <button
            onClick={() => setActiveTab('ai-assistant')}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-emerald-950 bg-emerald-50 hover:bg-emerald-100/90 border border-emerald-200/80 rounded-xl transition-all shadow-2xs cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5 text-emerald-700" />
            <span>AI Companion</span>
          </button>
        </div>
      </div>

      {/* Proactive Overspending / Savings Shortfall Alerts */}
      {budget.alerts.isOverbudget && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-900 flex items-start gap-3 shadow-xs">
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
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl text-xs text-amber-900 flex items-start gap-3 shadow-xs">
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

      {/* MAIN FINANCIAL OVERVIEW: ASYMMETRICAL FEATURED HERO CARD + SUPPORTING CARDS */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        {/* HERO FEATURED CARD: TODAY'S SPENDING ALLOWANCE (High Visual Dominance) */}
        <div className="lg:col-span-6 xl:col-span-7 bg-gradient-to-br from-emerald-950 via-emerald-900 to-teal-950 rounded-2xl text-white p-6 sm:p-7 shadow-lg relative overflow-hidden flex flex-col justify-between space-y-6">
          {/* Subtle Ambient Glow */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-400/10 rounded-full blur-2xl pointer-events-none" />

          {/* Top Row: Title, Icon & Status */}
          <div className="flex items-center justify-between relative z-10">
            <div className="flex items-center gap-2 text-xs font-semibold text-emerald-200 uppercase tracking-wider">
              <Calendar className="w-4 h-4 text-emerald-400" />
              <span>Adaptive Daily Spending Allowance</span>
            </div>
            <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-emerald-800/80 text-emerald-100 border border-emerald-700/60 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>{budget.alerts.isOverbudget ? 'Allowance Paused' : 'Pacing Active'}</span>
            </span>
          </div>

          {/* Core Daily Figure with High-Impact Typography */}
          <div className="space-y-1 relative z-10">
            <div className="flex items-baseline gap-2">
              <span className="text-4xl sm:text-5xl lg:text-6xl font-extrabold font-mono tracking-tight text-white tabular-nums">
                {formatMoney(budget.adaptiveDailyAllowance)}
              </span>
              <span className="text-base sm:text-lg text-emerald-200/90 font-medium">/ day</span>
            </div>
            <p className="text-xs text-emerald-200/80 leading-relaxed">
              Recalculates every morning based on actual receipts. Spend under this limit today and tomorrow's allowance automatically grows.
            </p>
          </div>

          {/* Bottom Bar: Pacing Comparison & Pacing Progress */}
          <div className="pt-4 border-t border-emerald-800/60 grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs relative z-10">
            <div>
              <span className="text-[11px] text-emerald-300/80 block">Initial Baseline</span>
              <span className="font-bold font-mono text-emerald-100 text-sm">
                {formatMoney(budget.initialDailyAllowance)}/day
              </span>
            </div>
            <div>
              <span className="text-[11px] text-emerald-300/80 block">Cycle Countdown</span>
              <span className="font-bold font-mono text-emerald-100 text-sm">
                {budget.daysRemaining} days left
              </span>
            </div>
            <div className="col-span-2 sm:col-span-1">
              <span className="text-[11px] text-emerald-300/80 block">Pacing Status</span>
              <span className="font-bold text-emerald-300 text-sm">
                {budget.alerts.spendingStatus === 'on_track' ? 'On Track' : 'Caution'}
              </span>
            </div>
          </div>
        </div>

        {/* 3 SUPPORTING CARDS: REMAINING BUDGET, TOTAL EXPENSES, SAVINGS TARGET */}
        <div className="lg:col-span-6 xl:col-span-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-3.5">
          {/* Supporting Card 1: Remaining Flexible Monthly Budget */}
          <div className="p-4 sm:p-5 bg-white rounded-2xl border border-slate-200/90 shadow-2xs hover:shadow-xs transition-shadow flex flex-col justify-between space-y-2">
            <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
              <span className="flex items-center gap-1.5">
                <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
                <span>Remaining Flexible Budget</span>
              </span>
              <span className="text-[11px] text-slate-400 font-mono">
                Pool: {formatMoney(budget.flexibleBudget)}
              </span>
            </div>

            <div className="flex items-baseline justify-between">
              <div
                className={`text-2xl font-bold font-mono tabular-nums ${
                  budget.remainingFlexibleBudget >= 0 ? 'text-slate-900' : 'text-rose-600'
                }`}
              >
                {formatMoney(budget.remainingFlexibleBudget)}
              </div>
              <span className="text-xs font-semibold text-slate-500">
                {budget.percentFlexibleBudgetSpent}% spent
              </span>
            </div>

            {/* Visual Progress Bar */}
            <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  budget.remainingFlexibleBudget < 0
                    ? 'bg-rose-500'
                    : budget.percentFlexibleBudgetSpent > 80
                    ? 'bg-amber-500'
                    : 'bg-emerald-600'
                }`}
                style={{ width: `${Math.min(100, budget.percentFlexibleBudgetSpent)}%` }}
              />
            </div>
          </div>

          {/* Supporting Card 2: Total Expenses */}
          <div className="p-4 sm:p-5 bg-white rounded-2xl border border-slate-200/90 shadow-2xs hover:shadow-xs transition-shadow flex flex-col justify-between space-y-2">
            <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
              <span className="flex items-center gap-1.5">
                <Receipt className="w-3.5 h-3.5 text-slate-600" />
                <span>Total Monthly Expenses</span>
              </span>
              <span className="text-[11px] text-slate-400 font-mono">
                Income: {formatMoney(budget.monthlyIncome)}
              </span>
            </div>

            <div className="flex items-baseline justify-between">
              <div className="text-2xl font-bold font-mono tabular-nums text-slate-900">
                {formatMoney(budget.totalExpenses)}
              </div>
              <span className="text-xs font-semibold text-slate-500">
                {budget.percentIncomeSpent}% of income
              </span>
            </div>

            <div className="flex items-center justify-between text-[11px] text-slate-500 pt-0.5">
              <span>Essential: {formatMoney(budget.essentialExpenses)}</span>
              <span>Discretionary: {formatMoney(budget.discretionaryExpensesSpent)}</span>
            </div>
          </div>

          {/* Supporting Card 3: Savings Target Progress */}
          <div className="p-4 sm:p-5 bg-white rounded-2xl border border-slate-200/90 shadow-2xs hover:shadow-xs transition-shadow flex flex-col justify-between space-y-2 sm:col-span-2 lg:col-span-1">
            <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
              <span className="flex items-center gap-1.5">
                <PiggyBank className="w-3.5 h-3.5 text-teal-600" />
                <span>Monthly Savings Target</span>
              </span>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                {budget.alerts.atRiskOfMissingSavingsGoal ? 'At Risk' : '100% Protected'}
              </span>
            </div>

            <div className="flex items-baseline justify-between">
              <div className="text-2xl font-bold font-mono tabular-nums text-teal-900">
                {formatMoney(budget.savingsTarget)}
              </div>
              <span className="text-xs font-semibold text-teal-800">
                {budget.savingsTargetRate}% targeted
              </span>
            </div>

            <div className="flex items-center justify-between text-[11px] text-slate-500 pt-0.5">
              <span>Active Goals: {savingsGoals.length}</span>
              <span>Projected: {budget.alerts.projectedSavingsAchievementRate}%</span>
            </div>
          </div>
        </div>
      </div>

      {/* DETERMINISTIC PROJECTIONS BANNER */}
      <div className="p-4 bg-white rounded-2xl border border-slate-200/90 shadow-2xs grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
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

      {/* GEMINI AI SPENDING INSIGHT CARD (Refined with Lavender/Mint Subtle Glow) */}
      <div className="p-5 sm:p-6 bg-gradient-to-r from-emerald-50/90 via-teal-50/60 to-purple-50/40 rounded-2xl border border-emerald-200/80 shadow-2xs space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-700 to-teal-800 text-white flex items-center justify-center shadow-xs">
              <Sparkles className="w-4 h-4 text-emerald-200" />
            </div>
            <div>
              <h2 className="text-xs font-bold uppercase tracking-wider text-emerald-950">
                PennyWise AI Spending Insight
              </h2>
              <span className="text-[11px] text-slate-500">
                Grounded in your verified transaction records
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('ai-assistant')}
              className="hidden sm:inline-flex items-center gap-1 text-xs font-semibold text-emerald-900 bg-white hover:bg-emerald-50/90 border border-emerald-300 px-3 py-1.5 rounded-lg shadow-2xs transition-colors cursor-pointer"
            >
              <span>Chat with AI</span>
              <ArrowRight className="w-3.5 h-3.5 text-emerald-700" />
            </button>
            <button
              onClick={fetchInsight}
              disabled={loadingInsight}
              className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-white/80 rounded-lg transition-colors cursor-pointer"
              title="Refresh AI Insight"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingInsight ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        <p className="text-xs sm:text-sm text-slate-800 leading-relaxed font-medium">
          {aiInsight.summary}
        </p>

        {aiInsight.tips && aiInsight.tips.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 pt-1">
            {aiInsight.tips.map((tip, idx) => (
              <div
                key={idx}
                className="flex items-start gap-2.5 bg-white/80 p-3 rounded-xl border border-slate-200/70 text-xs text-slate-700 leading-relaxed shadow-2xs"
              >
                <span className="text-emerald-700 font-bold shrink-0">✓</span>
                <span>{tip}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* TWO COLUMN SECTION: CATEGORY DISTRIBUTION CHART & RECENT TRANSACTIONS */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Spending by Category Chart */}
        <div className="lg:col-span-6 space-y-4">
          <div className="p-5 bg-white rounded-2xl border border-slate-200/90 shadow-2xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
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
                className="text-xs font-semibold text-emerald-800 hover:text-emerald-950 flex items-center gap-1 cursor-pointer"
              >
                <span>View all</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {categoryTotals.length === 0 ? (
              <div className="text-center py-8 text-xs text-slate-400 space-y-2">
                <Receipt className="w-8 h-8 text-slate-300 mx-auto" />
                <p>No expenses logged in this cycle yet.</p>
                <button
                  onClick={onOpenExpenseModal}
                  className="px-3 py-1.5 text-xs font-semibold text-emerald-800 bg-emerald-50 rounded-lg hover:bg-emerald-100/90 transition-colors cursor-pointer"
                >
                  Log First Expense
                </button>
              </div>
            ) : (
              <>
                {/* Visual Category Distribution Segment Bar */}
                <div className="space-y-1.5">
                  <div className="flex h-3 rounded-full overflow-hidden gap-0.5 bg-slate-100">
                    {categoryTotals.slice(0, 5).map((cat, idx) => (
                      <div
                        key={idx}
                        className={getCategoryColor(cat.category).split(' ')[0]}
                        style={{ width: `${Math.max(5, cat.percentage)}%` }}
                        title={`${cat.category}: ${cat.percentage}%`}
                      />
                    ))}
                  </div>
                  <div className="text-[10px] text-slate-400 text-right">
                    Top categories represent discretionary spend
                  </div>
                </div>

                {/* Ranked Category Rows */}
                <div className="space-y-2 pt-1">
                  {categoryTotals.slice(0, 5).map((cat, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-50/80 transition-colors text-xs border border-transparent hover:border-slate-100"
                    >
                      <div className="flex items-center gap-2.5">
                        <span
                          className={`w-2.5 h-2.5 rounded-full ${
                            getCategoryColor(cat.category).split(' ')[0]
                          }`}
                        />
                        <span className="font-semibold text-slate-800">{cat.category}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-bold font-mono text-slate-900">
                          {formatMoney(cat.amount)}
                        </span>
                        <span className="text-[11px] font-medium text-slate-400 w-10 text-right">
                          {cat.percentage}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Right Column: Recent Transactions List */}
        <div className="lg:col-span-6 space-y-4">
          <div className="p-5 bg-white rounded-2xl border border-slate-200/90 shadow-2xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h2 className="text-sm font-bold text-slate-900 tracking-tight">
                  Recent Transactions
                </h2>
                <p className="text-xs text-slate-500">Latest recorded purchases & receipts</p>
              </div>
              <button
                onClick={onOpenExpenseModal}
                className="text-xs font-semibold text-emerald-800 hover:text-emerald-950 flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add new</span>
              </button>
            </div>

            {recentExpenses.length === 0 ? (
              <div className="text-center py-8 text-xs text-slate-400 space-y-2">
                <Receipt className="w-8 h-8 text-slate-300 mx-auto" />
                <p>No recent transactions recorded yet.</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {recentExpenses.map((exp) => (
                  <div
                    key={exp.id}
                    className="py-3 flex items-center justify-between gap-3 text-xs first:pt-0 last:pb-0"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center font-bold text-xs shrink-0">
                        {exp.category.slice(0, 1)}
                      </div>
                      <div className="min-w-0">
                        <span className="font-bold text-slate-900 block truncate">
                          {exp.title}
                        </span>
                        <div className="flex items-center gap-2 text-[11px] text-slate-400">
                          <span>{exp.date}</span>
                          <span>·</span>
                          <span className="text-slate-500">{exp.category}</span>
                          {exp.source === 'PayPal' && (
                            <span className="text-[10px] font-semibold text-blue-700 bg-blue-50 px-1.5 py-0.2 rounded">
                              PayPal
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <div className="font-bold font-mono text-slate-900">
                        -{formatMoney(exp.amount, exp.currency)}
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
        </div>
      </div>
    </div>
  );
};
