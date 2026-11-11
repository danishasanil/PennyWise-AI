import React, { useState, useEffect, useMemo } from 'react';
import { useFinance } from '../context/FinanceContext';
import { SavingsGoal } from '../types/finance';
import { api } from '../services/api';
import {
  Target,
  Plus,
  PiggyBank,
  ArrowUpRight,
  Trash2,
  Calendar,
  X,
  CreditCard,
  CheckCircle,
  Edit2,
  TrendingUp,
  AlertCircle,
  HelpCircle,
  ShieldCheck,
  Sparkles,
  Clock,
  DollarSign,
  BarChart3,
  Flame,
} from 'lucide-react';
import { SearchableCurrencySelect } from './SearchableCurrencySelect';
import { formatCurrencyWithIntl } from '../data/internationalData';
import { FormattedText } from './FormattedText';

export const SavingsGoalsView: React.FC = () => {
  const {
    savingsGoals,
    addSavingsGoal,
    updateSavingsGoal,
    depositToSavingsGoal,
    deleteSavingsGoal,
    formatMoney,
    setActiveTab,
    profile,
    budget,
  } = useFinance();

  // Modals state
  const [isGoalModalOpen, setIsGoalModalOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<SavingsGoal | null>(null);

  const [depositModalGoal, setDepositModalGoal] = useState<SavingsGoal | null>(null);
  const [depositAmount, setDepositAmount] = useState('');
  const [depositSuccessMsg, setDepositSuccessMsg] = useState('');
  const [depositErrorMsg, setDepositErrorMsg] = useState('');

  // Form states
  const [title, setTitle] = useState('');
  const [targetAmount, setTargetAmount] = useState('');
  const [currentAmount, setCurrentAmount] = useState('0');
  const [targetDate, setTargetDate] = useState('');
  const [category, setCategory] = useState('Security & Emergency');
  const [currency, setCurrency] = useState(profile?.preferredCurrency || 'USD');
  const [notes, setNotes] = useState('');
  const [formError, setFormError] = useState('');

  // Backend calculated analytics
  const [backendAnalytics, setBackendAnalytics] = useState<any | null>(null);
  const [loadingAnalytics, setLoadingAnalytics] = useState(false);

  // Gemini savings advice
  const [aiAdvice, setAiAdvice] = useState<string | null>(null);
  const [loadingAiAdvice, setLoadingAiAdvice] = useState(false);

  // Sync and fetch backend analytics
  const fetchSavingsAnalytics = async () => {
    setLoadingAnalytics(true);
    try {
      const analytics = await api.calculateSavingsAnalytics({
        goals: savingsGoals,
        monthlySavingsCapacity: budget.savingsTarget,
        currency: profile?.preferredCurrency || 'USD',
      });
      setBackendAnalytics(analytics);
    } catch (err) {
      console.warn('Savings analytics error:', err);
    } finally {
      setLoadingAnalytics(false);
    }
  };

  useEffect(() => {
    fetchSavingsAnalytics();
  }, [savingsGoals, budget.savingsTarget, profile?.preferredCurrency]);

  // Request Gemini savings guidance
  const handleAskGeminiAdvice = async () => {
    setLoadingAiAdvice(true);
    try {
      const query = "Analyze my savings goals progress, timeline feasibility, and suggest practical pacing improvements.";
      const financialContext = {
        currency: profile?.preferredCurrency || 'USD',
        displayName: profile?.displayName || 'Friend',
        monthlyIncome: budget.monthlyIncome,
        monthlyBudget: budget.flexibleBudget,
        savingsTarget: budget.savingsTarget,
        savingsProgress: {
          currentTotalSaved: backendAnalytics?.totalSaved || totalSaved,
          targetTotal: backendAnalytics?.totalTarget || totalTarget,
          achievementRate: backendAnalytics?.overallPercentage || overallPercentage,
          activeGoals: savingsGoals.map((g) => ({
            title: g.title,
            current: Number(g.currentAmount),
            target: Number(g.targetAmount),
            percent: g.targetAmount > 0 ? (Number(g.currentAmount) / Number(g.targetAmount)) * 100 : 0,
          })),
        },
      };

      const response = await api.sendChatMessage(query, [], financialContext);
      setAiAdvice(response.reply);
    } catch (err) {
      setAiAdvice("Focus on maintaining a steady automated monthly deposit to fund your highest priority reserve first.");
    } finally {
      setLoadingAiAdvice(false);
    }
  };

  // Open modal for new goal
  const handleOpenAddModal = () => {
    setEditingGoal(null);
    setTitle('');
    setTargetAmount('');
    setCurrentAmount('0');
    setTargetDate('');
    setCategory('Security & Emergency');
    setCurrency(profile?.preferredCurrency || 'USD');
    setNotes('');
    setFormError('');
    setIsGoalModalOpen(true);
  };

  // Open modal for editing existing goal
  const handleOpenEditModal = (goal: SavingsGoal) => {
    setEditingGoal(goal);
    setTitle(goal.title);
    setTargetAmount(String(goal.targetAmount));
    setCurrentAmount(String(goal.currentAmount));
    setTargetDate(goal.targetDate || '');
    setCategory(goal.category || 'Security & Emergency');
    setCurrency(goal.currency || profile?.preferredCurrency || 'USD');
    setNotes(goal.notes || '');
    setFormError('');
    setIsGoalModalOpen(true);
  };

  const handleSaveGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    const target = parseFloat(targetAmount);
    const current = parseFloat(currentAmount) || 0;

    if (!title.trim()) {
      setFormError('Please enter a goal name.');
      return;
    }
    if (isNaN(target) || target <= 0) {
      setFormError('Please enter a valid target amount greater than zero.');
      return;
    }
    if (isNaN(current) || current < 0) {
      setFormError('Current saved amount cannot be negative.');
      return;
    }

    try {
      if (editingGoal) {
        await updateSavingsGoal({
          ...editingGoal,
          title: title.trim(),
          targetAmount: target,
          currentAmount: current,
          currency,
          targetDate: targetDate || undefined,
          category,
          notes: notes.trim() || undefined,
        });
      } else {
        await addSavingsGoal({
          userId: profile?.id || 'local',
          title: title.trim(),
          targetAmount: target,
          currentAmount: current,
          currency,
          targetDate: targetDate || undefined,
          category,
          notes: notes.trim() || undefined,
        });
      }
      setIsGoalModalOpen(false);
    } catch (err: any) {
      setFormError(err.message || 'Failed to save goal.');
    }
  };

  const handleDeposit = async (e: React.FormEvent) => {
    e.preventDefault();
    setDepositErrorMsg('');
    if (!depositModalGoal) return;
    const amount = parseFloat(depositAmount);
    if (isNaN(amount) || amount <= 0) {
      setDepositErrorMsg('Please enter a valid deposit amount greater than zero.');
      return;
    }

    try {
      await depositToSavingsGoal(depositModalGoal.id, amount);
      setDepositSuccessMsg(`Tracked deposit of ${formatMoney(amount, depositModalGoal.currency)} into "${depositModalGoal.title}"!`);
      setTimeout(() => {
        setDepositSuccessMsg('');
        setDepositModalGoal(null);
        setDepositAmount('');
      }, 1500);
    } catch (err: any) {
      setDepositErrorMsg(err.message || 'Deposit failed.');
    }
  };

  const totalSaved = backendAnalytics?.totalSaved ?? savingsGoals.reduce((sum, g) => sum + Number(g.currentAmount), 0);
  const totalTarget = backendAnalytics?.totalTarget ?? savingsGoals.reduce((sum, g) => sum + Number(g.targetAmount), 0);
  const overallPercentage = backendAnalytics?.overallPercentage ?? (totalTarget > 0 ? Math.min(100, Math.round((totalSaved / totalTarget) * 100)) : 0);
  const totalRemaining = backendAnalytics?.totalRemaining ?? Math.max(0, totalTarget - totalSaved);

  // Goal calculation map from backend
  const calculatedMap = useMemo(() => {
    const map = new Map<string, any>();
    if (backendAnalytics?.goals) {
      backendAnalytics.goals.forEach((g: any) => map.set(g.id, g));
    }
    return map;
  }, [backendAnalytics]);

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <span>Savings Goals & Milestones</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Create, track, and plan multiple goals with backend feasibility estimation and progress charts.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleAskGeminiAdvice}
            disabled={loadingAiAdvice}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-purple-800 bg-purple-50 hover:bg-purple-100 border border-purple-200 rounded-lg transition-colors shrink-0"
          >
            <Sparkles className="w-3.5 h-3.5 text-purple-600" />
            <span>{loadingAiAdvice ? 'Consulting Gemini...' : 'AI Savings Insights'}</span>
          </button>

          <button
            onClick={handleOpenAddModal}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg shadow-xs transition-colors shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Savings Goal</span>
          </button>
        </div>
      </div>

      {/* Critical Educational Distinction Banner */}
      <div className="p-3.5 bg-amber-50/80 border border-amber-200 rounded-xl flex items-start gap-3 text-xs text-amber-950">
        <ShieldCheck className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
        <div className="space-y-0.5">
          <div className="font-bold">Tracked Savings vs. Bank Balances Notice:</div>
          <p className="text-amber-900 leading-relaxed text-[11px]">
            PennyWise AI tracks target milestones and manual/sandbox contributions. <strong>These figures reflect your internal budgeting goals, not live bank account balances or verified depository transfers.</strong> To make real deposits, visit your banking institution or use verified PayPal Sandbox checkout.
          </p>
        </div>
      </div>

      {/* Gemini AI Advice Panel */}
      {aiAdvice && (
        <div className="p-4 bg-purple-50/70 border border-purple-200 rounded-xl space-y-2 text-xs text-purple-950 animate-in fade-in">
          <div className="flex items-center justify-between">
            <span className="font-bold flex items-center gap-1.5 text-purple-900">
              <Sparkles className="w-4 h-4 text-purple-600" />
              <span>PennyWise AI Savings Recommendation</span>
            </span>
            <button
              onClick={() => setAiAdvice(null)}
              className="text-[11px] text-purple-600 hover:text-purple-900"
            >
              Dismiss
            </button>
          </div>
          <FormattedText text={aiAdvice} className="text-purple-900" />
        </div>
      )}

      {/* KPI Overview Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-xs">
          <div className="text-slate-500 text-xs font-medium">Total Tracked Savings</div>
          <div className="text-xl font-bold font-mono tabular-nums text-emerald-700 mt-1">
            {formatMoney(totalSaved)}
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">
            Across {savingsGoals.length} tracked target{savingsGoals.length === 1 ? '' : 's'}
          </div>
        </div>

        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-xs">
          <div className="text-slate-500 text-xs font-medium">Combined Target Sum</div>
          <div className="text-xl font-bold font-mono tabular-nums text-slate-900 mt-1">
            {formatMoney(totalTarget)}
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">Cumulative goal amount</div>
        </div>

        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-xs">
          <div className="text-slate-500 text-xs font-medium">Remaining to Save</div>
          <div className="text-xl font-bold font-mono tabular-nums text-slate-700 mt-1">
            {formatMoney(totalRemaining)}
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">Needed for 100% completion</div>
        </div>

        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-xs">
          <div className="flex justify-between items-center text-slate-500 text-xs font-medium">
            <span>Overall Progress</span>
            <span className="font-bold text-slate-900">{overallPercentage}%</span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-2 mt-2.5 overflow-hidden">
            <div
              className="bg-emerald-600 h-2 rounded-full transition-all duration-500"
              style={{ width: `${overallPercentage}%` }}
            />
          </div>
          <div className="text-[11px] text-slate-500 mt-2">
            Monthly budget capacity: {formatMoney(budget.savingsTarget)}/mo
          </div>
        </div>
      </div>

      {/* Goal-Wise Progress Visual Chart Strip */}
      {savingsGoals.length > 0 && (
        <div className="p-5 bg-white rounded-xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-emerald-600" />
              <span>Goal-Wise Progress Comparison Chart</span>
            </h2>
            <span className="text-[11px] text-slate-400">Backend Computed Percentages</span>
          </div>

          <div className="space-y-3 pt-1">
            {savingsGoals.map((g) => {
              const calc = calculatedMap.get(g.id);
              const pct = calc?.progressPercentage ?? (g.targetAmount > 0 ? Math.min(100, Math.round((g.currentAmount / g.targetAmount) * 100)) : 0);
              const curr = g.currency || profile?.preferredCurrency || 'USD';

              return (
                <div key={g.id} className="space-y-1">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-semibold text-slate-800">{g.title}</span>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-slate-500">
                        {formatCurrencyWithIntl(g.currentAmount, curr)} / {formatCurrencyWithIntl(g.targetAmount, curr)}
                      </span>
                      <span className="font-bold text-slate-900 font-mono w-10 text-right">{pct}%</span>
                    </div>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden flex">
                    <div
                      className={`h-2.5 transition-all duration-500 ${
                        pct >= 100 ? 'bg-emerald-600' : pct >= 50 ? 'bg-emerald-500' : 'bg-sky-500'
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Goals Cards Grid */}
      {savingsGoals.length === 0 ? (
        <div className="py-16 text-center bg-white rounded-xl border border-slate-200 shadow-xs space-y-3">
          <PiggyBank className="w-10 h-10 text-slate-300 mx-auto" />
          <div className="text-sm font-semibold text-slate-700">No savings goals created yet</div>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Create an emergency reserve or specific target (like a holiday, education, laptop, or house fund).
          </p>
          <button
            onClick={handleOpenAddModal}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Create First Goal</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {savingsGoals.map((goal) => {
            const calc = calculatedMap.get(goal.id);
            const curr = goal.currency || profile?.preferredCurrency || 'USD';
            const pct = calc?.progressPercentage ?? (goal.targetAmount > 0 ? Math.min(100, Math.round((goal.currentAmount / goal.targetAmount) * 100)) : 0);
            const remaining = calc?.remainingAmount ?? Math.max(0, goal.targetAmount - goal.currentAmount);

            return (
              <div
                key={goal.id}
                className="p-5 bg-white rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between space-y-4 hover:border-slate-300 transition-colors"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider bg-slate-50 px-2 py-0.5 rounded border border-slate-100">
                        {goal.category || 'General'}
                      </span>
                      <h2 className="text-sm font-bold text-slate-900 mt-1">{goal.title}</h2>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleOpenEditModal(goal)}
                        className="p-1 text-slate-400 hover:text-slate-700 rounded transition-colors"
                        title="Edit Goal"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => {
                          if (confirm(`Delete savings goal "${goal.title}"?`)) {
                            deleteSavingsGoal(goal.id);
                          }
                        }}
                        className="p-1 text-slate-400 hover:text-rose-600 rounded transition-colors"
                        title="Delete Goal"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {goal.notes && (
                    <p className="text-xs text-slate-500 mt-2 line-clamp-2">{goal.notes}</p>
                  )}

                  {/* Amount Progress */}
                  <div className="mt-4 space-y-2">
                    <div className="flex justify-between items-baseline text-xs">
                      <span className="text-sm font-bold font-mono tabular-nums text-slate-900">
                        {formatCurrencyWithIntl(goal.currentAmount, curr)}
                      </span>
                      <span className="text-slate-400 font-mono tabular-nums">
                        target {formatCurrencyWithIntl(goal.targetAmount, curr)}
                      </span>
                    </div>

                    <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                      <div
                        className={`h-2 rounded-full transition-all duration-300 ${
                          pct >= 100 ? 'bg-emerald-600' : 'bg-emerald-500'
                        }`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>

                    <div className="flex justify-between text-[11px] text-slate-500 pt-0.5">
                      <span className="font-semibold text-slate-700">{pct}% saved</span>
                      <span>{formatCurrencyWithIntl(remaining, curr)} remaining</span>
                    </div>
                  </div>

                  {/* Backend Estimation: Achievable by Target Date */}
                  <div className="mt-3 p-2.5 rounded-lg bg-slate-50/80 border border-slate-200/70 text-[11px] space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 flex items-center gap-1">
                        <Clock className="w-3 h-3 text-slate-400" />
                        <span>Timeline Feasibility:</span>
                      </span>
                      <span
                        className={`font-semibold capitalize px-1.5 py-0.2 rounded text-[10px] ${
                          calc?.feasibilityVerdict === 'achieved'
                            ? 'bg-emerald-100 text-emerald-800'
                            : calc?.feasibilityVerdict === 'on_track'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : calc?.feasibilityVerdict === 'moderate_pace_needed'
                            ? 'bg-sky-50 text-sky-700 border border-sky-200'
                            : calc?.feasibilityVerdict === 'high_pace_needed'
                            ? 'bg-amber-50 text-amber-800 border border-amber-200'
                            : calc?.feasibilityVerdict === 'overdue'
                            ? 'bg-rose-50 text-rose-700'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {calc?.feasibilityVerdict ? calc.feasibilityVerdict.replace(/_/g, ' ') : 'Ongoing'}
                      </span>
                    </div>
                    <p className="text-slate-600 text-[10px] leading-relaxed">
                      {calc?.feasibilityExplanation || (goal.targetDate ? `Target date: ${goal.targetDate}` : 'No target date set.')}
                    </p>
                  </div>
                </div>

                {/* Footer Controls: Add Money & PayPal */}
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                  {goal.targetDate ? (
                    <div className="flex items-center gap-1 text-[11px] text-slate-500">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      <span>{goal.targetDate}</span>
                    </div>
                  ) : (
                    <span className="text-[11px] text-slate-400">Flexible target</span>
                  )}

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        setDepositModalGoal(goal);
                        setDepositAmount('');
                        setDepositErrorMsg('');
                      }}
                      className="px-2.5 py-1 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-md transition-colors"
                    >
                      + Add Money
                    </button>
                    <button
                      onClick={() => setActiveTab('paypal')}
                      title="Fund via PayPal Sandbox Checkout"
                      className="p-1 text-slate-500 hover:text-slate-900 rounded hover:bg-slate-100"
                    >
                      <CreditCard className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create / Edit Goal Modal */}
      {isGoalModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs overflow-y-auto">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden my-6">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-900">
                {editingGoal ? 'Edit Savings Goal' : 'Create New Savings Target'}
              </h2>
              <button
                onClick={() => setIsGoalModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveGoal} className="p-6 space-y-4">
              {formError && (
                <div className="p-3 text-xs font-medium text-rose-700 bg-rose-50 border border-rose-200 rounded-lg">
                  {formError}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Goal Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Emergency 3-Month Fund, New Laptop, Japan Vacation"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Target Amount *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="1"
                    required
                    placeholder="2500"
                    value={targetAmount}
                    onChange={(e) => setTargetAmount(e.target.value)}
                    className="w-full px-3 py-2 text-sm font-mono tabular-nums rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Current Saved Amount
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0"
                    value={currentAmount}
                    onChange={(e) => setCurrentAmount(e.target.value)}
                    className="w-full px-3 py-2 text-sm font-mono tabular-nums rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <SearchableCurrencySelect
                    value={currency}
                    onChange={(curr) => setCurrency(curr.code)}
                    label="Currency"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Category
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                  >
                    <option value="Security & Emergency">Security & Emergency</option>
                    <option value="Travel & Vacation">Travel & Vacation</option>
                    <option value="Tech & Hardware">Tech & Hardware</option>
                    <option value="Home & Real Estate">Home & Real Estate</option>
                    <option value="Education & Skills">Education & Skills</option>
                    <option value="Vehicle & Transport">Vehicle & Transport</option>
                    <option value="Personal Milestone">Personal Milestone</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Target Date (For Feasibility Estimation)
                </label>
                <input
                  type="date"
                  value={targetDate}
                  onChange={(e) => setTargetDate(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Notes / Motivation
                </label>
                <textarea
                  rows={2}
                  placeholder="Why this goal matters to your financial plan..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                />
              </div>

              <div className="pt-2 flex justify-end gap-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsGoalModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-700 hover:text-slate-900"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg shadow-xs"
                >
                  {editingGoal ? 'Update Goal' : 'Create Goal'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Money (Deposit) Modal */}
      {depositModalGoal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="w-full max-w-sm bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <div className="text-xs text-slate-400">Add Tracked Money</div>
                <h2 className="text-sm font-bold text-slate-900">{depositModalGoal.title}</h2>
              </div>
              <button
                onClick={() => setDepositModalGoal(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {depositSuccessMsg ? (
              <div className="p-6 text-center space-y-2">
                <CheckCircle className="w-8 h-8 text-emerald-600 mx-auto" />
                <p className="text-xs font-semibold text-emerald-900">{depositSuccessMsg}</p>
              </div>
            ) : (
              <form onSubmit={handleDeposit} className="p-6 space-y-4">
                {depositErrorMsg && (
                  <div className="p-2.5 text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-lg">
                    {depositErrorMsg}
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Amount to Add ({depositModalGoal.currency || profile?.preferredCurrency || 'USD'})
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="1"
                    required
                    autoFocus
                    placeholder="100.00"
                    value={depositAmount}
                    onChange={(e) => setDepositAmount(e.target.value)}
                    className="w-full px-3 py-2 text-sm font-mono tabular-nums rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                  />
                  <p className="text-[11px] text-slate-500 mt-1">
                    Current balance: {formatMoney(depositModalGoal.currentAmount, depositModalGoal.currency)}
                  </p>
                </div>

                <div className="pt-2 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setDepositModalGoal(null)}
                    className="px-3 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-xs"
                  >
                    Confirm Tracked Deposit
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
