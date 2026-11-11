import React, { useState } from 'react';
import { useFinance } from '../context/FinanceContext';
import { api } from '../services/api';
import {
  ShoppingBag,
  Sparkles,
  ArrowRight,
  AlertTriangle,
  CheckCircle,
  HelpCircle,
  DollarSign,
  TrendingDown,
  Calendar,
  Plus,
  CreditCard,
  XCircle,
  ShieldCheck,
  RotateCcw,
} from 'lucide-react';
import { ExpenseCategory, EXPENSE_CATEGORIES } from '../types/finance';
import { SearchableCurrencySelect } from './SearchableCurrencySelect';
import { FormattedText } from './FormattedText';

export const PurchaseAnalyzerView: React.FC = () => {
  const {
    budget,
    profile,
    formatMoney,
    addExpense,
    proceedToCheckoutWithItem,
    setActiveTab,
    savePlannedPurchase,
    pendingAnalyzerItem,
    setPendingAnalyzerItem,
  } = useFinance();

  const [itemName, setItemName] = useState('');
  const [price, setPrice] = useState('');
  const [selectedCurrency, setSelectedCurrency] = useState(profile?.preferredCurrency || 'USD');
  const [category, setCategory] = useState<ExpenseCategory>('Shopping');
  const [priority, setPriority] = useState<'need' | 'want' | 'luxury'>('want');

  const [evaluating, setEvaluating] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<any | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [loggedAsExpenseSuccess, setLoggedAsExpenseSuccess] = useState(false);
  const [purchaseCancelled, setPurchaseCancelled] = useState(false);

  React.useEffect(() => {
    if (pendingAnalyzerItem) {
      if (pendingAnalyzerItem.itemName) setItemName(pendingAnalyzerItem.itemName);
      if (pendingAnalyzerItem.price !== undefined && pendingAnalyzerItem.price > 0) {
        setPrice(String(pendingAnalyzerItem.price));
      }
      setPendingAnalyzerItem(null);
    }
  }, [pendingAnalyzerItem, setPendingAnalyzerItem]);

  const handleAnalyze = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setAnalysisResult(null);
    setLoggedAsExpenseSuccess(false);
    setPurchaseCancelled(false);

    const numPrice = parseFloat(price);
    if (!itemName.trim() || isNaN(numPrice) || numPrice <= 0) {
      setErrorMsg('Please enter a valid product name and purchase amount.');
      return;
    }

    setEvaluating(true);
    try {
      const financialContext = {
        currency: selectedCurrency,
        displayName: profile?.displayName || 'User',
        monthlyIncome: budget.monthlyIncome,
        monthlyBudget: budget.flexibleBudget,
        essentialExpenses: budget.essentialExpenses,
        savingsTarget: budget.savingsTarget,
        emergencyAllocation: budget.emergencyAllocation,
        flexibleBudget: budget.flexibleBudget,
        remainingFlexibleBudget: budget.remainingFlexibleBudget,
        dailySpendingAllowance: budget.adaptiveDailyAllowance,
        daysRemaining: budget.daysRemaining,
      };

      const result = await api.analyzePurchase({
        itemName: itemName.trim(),
        price: numPrice,
        category,
        priority,
        financialContext,
      });

      setAnalysisResult(result);

      // Persist planned purchase evaluation to Firestore
      if (result && result.impact) {
        savePlannedPurchase({
          userId: profile?.id || 'local',
          itemName: itemName.trim(),
          price: numPrice,
          currency: selectedCurrency,
          category,
          priority,
          affordabilityVerdict: result.impact.verdict || 'Caution',
          impactRemainingBudget: result.impact.newRemainingFlexible,
          impactDailyAllowance: result.impact.newDailyAllowance,
          aiExplanation: result.aiExplanation || '',
          status: 'planned',
        }).catch((err) => console.warn('Could not auto-save planned purchase:', err));
      }
    } catch (err: any) {
      setErrorMsg('Unable to evaluate purchase right now. Please check your inputs.');
    } finally {
      setEvaluating(false);
    }
  };

  const handleCancelPurchase = () => {
    setPurchaseCancelled(true);
    setLoggedAsExpenseSuccess(false);
  };

  const handleProceedToCheckout = () => {
    if (!analysisResult) return;
    proceedToCheckoutWithItem({
      itemName: analysisResult.itemName,
      price: analysisResult.price,
      currency: selectedCurrency,
      category: (analysisResult.category as ExpenseCategory) || 'Shopping',
      priority: analysisResult.priority || 'want',
      source: 'purchase_analyzer',
      description: `Evaluated via Purchase Analyzer (${analysisResult.priority})`,
    });
  };

  const handleLogPurchasedExpense = async () => {
    if (!analysisResult) return;
    try {
      await addExpense({
        userId: profile?.id || 'local',
        title: analysisResult.itemName,
        description: analysisResult.itemName,
        amount: analysisResult.price,
        currency: selectedCurrency,
        category: (analysisResult.category as ExpenseCategory) || 'Shopping',
        date: new Date().toISOString().split('T')[0],
        paymentMethod: 'Credit Card',
        status: 'completed',
        source: 'manual',
        notes: `Evaluated via Purchase Analyzer (${analysisResult.priority})`,
        isEssential: analysisResult.priority === 'need',
      });
      setLoggedAsExpenseSuccess(true);
      setPurchaseCancelled(false);
    } catch (err: any) {
      console.error('Failed to log expense:', err);
      setErrorMsg(err.message || 'Failed to log expense.');
    }
  };

  const handleReset = () => {
    setItemName('');
    setPrice('');
    setAnalysisResult(null);
    setErrorMsg('');
    setLoggedAsExpenseSuccess(false);
    setPurchaseCancelled(false);
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Purchase Impact Analyzer
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Test prospective purchases against your remaining budget, daily allowance, and savings goals before you spend.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs font-medium text-slate-600 bg-white px-3 py-1.5 rounded-lg border border-slate-200 shadow-xs">
          <span>Current Flexible Budget:</span>
          <span className="font-bold font-mono tabular-nums text-slate-900">
            {formatMoney(budget.remainingFlexibleBudget)}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Form: Product Name, Purchase Amount, Currency, Category */}
        <div className="lg:col-span-5 bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <ShoppingBag className="w-4 h-4 text-emerald-600" />
            <span>Prospective Purchase Details</span>
          </h2>

          <form onSubmit={handleAnalyze} className="space-y-4">
            {errorMsg && (
              <div className="p-3 text-xs font-medium text-rose-700 bg-rose-50 border border-rose-200 rounded-lg">
                {errorMsg}
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Product Name *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Ergonomic Office Chair, Running Shoes, Flight"
                value={itemName}
                onChange={(e) => setItemName(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Purchase Amount *
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  placeholder="120.00"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  className="w-full px-3 py-2 text-sm font-mono tabular-nums rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                />
              </div>

              <div>
                <SearchableCurrencySelect
                  value={selectedCurrency}
                  onChange={(curr) => setSelectedCurrency(curr.code)}
                  label="Currency"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Purchase Category (11 Official) *
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as ExpenseCategory)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
              >
                {EXPENSE_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Priority Classification
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setPriority('need')}
                  className={`py-1.5 px-2 text-xs font-medium rounded-lg border transition-colors ${
                    priority === 'need'
                      ? 'bg-slate-900 text-white border-slate-900'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  Need
                </button>
                <button
                  type="button"
                  onClick={() => setPriority('want')}
                  className={`py-1.5 px-2 text-xs font-medium rounded-lg border transition-colors ${
                    priority === 'want'
                      ? 'bg-slate-900 text-white border-slate-900'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  Want
                </button>
                <button
                  type="button"
                  onClick={() => setPriority('luxury')}
                  className={`py-1.5 px-2 text-xs font-medium rounded-lg border transition-colors ${
                    priority === 'luxury'
                      ? 'bg-slate-900 text-white border-slate-900'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  Luxury
                </button>
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                {priority === 'need'
                  ? 'A necessary item for health, work, or shelter.'
                  : priority === 'want'
                  ? 'An enhancement that provides real value or joy.'
                  : 'An indulgence or non-essential upgrade.'}
              </p>
            </div>

            <button
              type="submit"
              disabled={evaluating}
              className="w-full inline-flex items-center justify-center gap-2 py-2.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 disabled:opacity-50 rounded-lg shadow-xs transition-colors"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>{evaluating ? 'Calculating backend impacts...' : 'Analyze Purchase Impact'}</span>
            </button>
          </form>
        </div>

        {/* Right Results Panel */}
        <div className="lg:col-span-7 space-y-4">
          {!analysisResult ? (
            <div className="h-full min-h-[350px] p-8 bg-white rounded-xl border border-slate-200 shadow-xs flex flex-col items-center justify-center text-center space-y-3 text-slate-500">
              <ShoppingBag className="w-10 h-10 text-slate-300" />
              <div className="text-sm font-semibold text-slate-700">No purchase evaluated yet</div>
              <p className="text-xs max-w-sm">
                Enter a product name, purchase amount, currency, and category on the left to see the deterministic backend impact on your remaining flexible budget, daily allowance, and savings pace.
              </p>
            </div>
          ) : (
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-5 animate-in fade-in duration-200">
              {/* Verdict Header */}
              <div className="flex items-start justify-between gap-4 pb-4 border-b border-slate-100">
                <div>
                  <span className="text-[11px] uppercase tracking-wider font-semibold text-slate-400">
                    Evaluation for "{analysisResult.itemName}"
                  </span>
                  <div className="text-xl font-bold font-mono tabular-nums text-slate-900 mt-0.5">
                    {formatMoney(analysisResult.price, selectedCurrency)}
                  </div>
                  <div className="text-[11px] text-slate-500">
                    Category: {analysisResult.category} · Priority: {analysisResult.priority}
                  </div>
                </div>

                {/* Verdict Badge */}
                <div
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 ${
                    analysisResult.impact.verdict === 'Comfortable'
                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                      : analysisResult.impact.verdict === 'Caution'
                      ? 'bg-amber-50 text-amber-800 border border-amber-200'
                      : 'bg-rose-50 text-rose-800 border border-rose-200'
                  }`}
                >
                  {analysisResult.impact.verdict === 'Comfortable' ? (
                    <CheckCircle className="w-4 h-4 text-emerald-600" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-amber-600" />
                  )}
                  <span>
                    {analysisResult.impact.verdict === 'Comfortable'
                      ? 'Fits Available Budget'
                      : analysisResult.impact.verdict === 'Caution'
                      ? 'Tight Budget Fit'
                      : 'Exceeds Flexible Budget'}
                  </span>
                </div>
              </div>

              {/* Impact Figures Grid (Calculated Exclusively by Backend) */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200/80">
                  <div className="text-slate-500 text-[11px]">Remaining Flexible Afterward</div>
                  <div
                    className={`text-sm font-bold font-mono tabular-nums mt-1 ${
                      analysisResult.impact.newRemainingFlexible >= 0
                        ? 'text-slate-900'
                        : 'text-rose-600'
                    }`}
                  >
                    {formatMoney(analysisResult.impact.newRemainingFlexible, selectedCurrency)}
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">
                    was {formatMoney(analysisResult.impact.currentRemainingFlexible, selectedCurrency)}
                  </div>
                </div>

                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200/80">
                  <div className="text-slate-500 text-[11px]">Daily Allowance Afterward</div>
                  <div className="text-sm font-bold font-mono tabular-nums mt-1 text-slate-900">
                    {formatMoney(analysisResult.impact.newDailyAllowance, selectedCurrency)}
                    <span className="text-[10px] font-normal text-slate-500">/day</span>
                  </div>
                  <div className="text-[10px] text-rose-600 mt-0.5">
                    -{formatMoney(analysisResult.impact.dailyAllowanceDrop, selectedCurrency)}/day drop
                  </div>
                </div>

                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200/80 col-span-2 sm:col-span-1">
                  <div className="text-slate-500 text-[11px]">Savings Target Effect</div>
                  <div className="text-sm font-bold font-mono tabular-nums mt-1 text-slate-900">
                    {analysisResult.impact.cutsIntoSavings ? (
                      <span className="text-rose-600 font-semibold">
                        -{formatMoney(analysisResult.impact.savingsDeficit, selectedCurrency)} deficit
                      </span>
                    ) : (
                      <span className="text-emerald-700 font-semibold">Protected</span>
                    )}
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">
                    Target: {formatMoney(budget.savingsTarget, selectedCurrency)}
                  </div>
                </div>
              </div>

              {/* Gemini Narrative Explanation */}
              <div className="p-4 bg-emerald-50/60 rounded-xl border border-emerald-200/80 text-xs sm:text-sm text-slate-800 space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-950">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-700" />
                  <span>PennyWise AI Explanation (Gemini 3.8 Flash)</span>
                </div>
                <FormattedText text={analysisResult.aiExplanation} className="text-slate-700" />
              </div>

              {/* Status Notice if user cancelled */}
              {purchaseCancelled && (
                <div className="p-3 bg-slate-100 border border-slate-300 rounded-lg text-xs text-slate-700 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <XCircle className="w-4 h-4 text-slate-500" />
                    <span>Purchase cancelled. Your budget and savings remain unchanged.</span>
                  </span>
                  <button
                    onClick={handleReset}
                    className="text-slate-900 underline font-semibold text-[11px]"
                  >
                    Evaluate another
                  </button>
                </div>
              )}

              {/* Status Notice if user logged as expense */}
              {loggedAsExpenseSuccess && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-800 flex items-center justify-between">
                  <span className="flex items-center gap-1.5 font-medium">
                    <CheckCircle className="w-4 h-4 text-emerald-600" />
                    <span>Purchase logged to Expenses and deducted from flexible budget!</span>
                  </span>
                  <button
                    onClick={() => setActiveTab('expenses')}
                    className="text-emerald-900 underline font-semibold text-[11px]"
                  >
                    View in Expenses
                  </button>
                </div>
              )}

              {/* Mandatory User Control Actions: Proceed to Checkout vs Cancel Purchase */}
              <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                <div className="text-[11px] text-slate-500 flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>Gemini cannot approve or trigger payments. You make the final decision.</span>
                </div>

                <div className="flex items-center gap-2 justify-end">
                  {/* Option 2: Cancel Purchase */}
                  <button
                    type="button"
                    onClick={handleCancelPurchase}
                    className="px-3.5 py-2 text-xs font-semibold text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg transition-colors flex items-center gap-1.5"
                  >
                    <XCircle className="w-3.5 h-3.5 text-slate-400" />
                    <span>Cancel Purchase</span>
                  </button>

                  {/* Option 1: Proceed to PayPal Checkout */}
                  <button
                    type="button"
                    onClick={handleProceedToCheckout}
                    className="px-4 py-2 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    <CreditCard className="w-3.5 h-3.5" />
                    <span>Proceed to PayPal ({formatMoney(analysisResult.price, selectedCurrency)})</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
