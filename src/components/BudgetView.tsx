import React, { useState } from 'react';
import { useFinance } from '../context/FinanceContext';
import { Wallet, Shield, PiggyBank, Sparkles, Check, Edit3, HelpCircle } from 'lucide-react';

export const BudgetView: React.FC = () => {
  const { budget, profile, formatMoney, saveUserProfile } = useFinance();

  const [isEditing, setIsEditing] = useState(false);
  const [income, setIncome] = useState(String(profile?.monthlyIncome || 0));
  const [essentials, setEssentials] = useState(String(profile?.monthlyEssentialExpenses || 0));
  const [savingsGoal, setSavingsGoal] = useState(String(profile?.monthlySavingsGoal || 0));
  const [emergency, setEmergency] = useState(String(profile?.emergencyAllocation || 0));
  const [period, setPeriod] = useState(profile?.monthlyBudgetPeriod || '1st to End of Month');
  const [savingSuccess, setSavingSuccess] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const inc = parseFloat(income) || 0;
    const ess = parseFloat(essentials) || 0;
    const sav = parseFloat(savingsGoal) || 0;
    const emg = parseFloat(emergency) || 0;

    await saveUserProfile({
      monthlyIncome: inc,
      monthlyEssentialExpenses: ess,
      monthlySavingsGoal: sav,
      emergencyAllocation: emg,
      monthlyBudgetPeriod: period,
    });

    setIsEditing(false);
    setSavingSuccess(true);
    setTimeout(() => setSavingSuccess(false), 3000);
  };

  const essentialsPercent =
    budget.monthlyIncome > 0
      ? Math.round((budget.essentialExpenses / budget.monthlyIncome) * 100)
      : 0;
  const savingsPercent =
    budget.monthlyIncome > 0
      ? Math.round((budget.savingsTarget / budget.monthlyIncome) * 100)
      : 0;
  const emergencyPercent =
    budget.monthlyIncome > 0
      ? Math.round((budget.emergencyAllocation / budget.monthlyIncome) * 100)
      : 0;
  const flexiblePercent =
    budget.monthlyIncome > 0
      ? Math.max(0, 100 - (essentialsPercent + savingsPercent + emergencyPercent))
      : 0;

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Monthly Budget Architecture
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Verified backend calculations for your current period: {profile?.monthlyBudgetPeriod || '1st to End of Month'}
          </p>
        </div>

        <div>
          {!isEditing ? (
            <button
              onClick={() => {
                setIncome(String(profile?.monthlyIncome || 0));
                setEssentials(String(profile?.monthlyEssentialExpenses || 0));
                setSavingsGoal(String(profile?.monthlySavingsGoal || 0));
                setEmergency(String(profile?.emergencyAllocation || 0));
                setPeriod(profile?.monthlyBudgetPeriod || '1st to End of Month');
                setIsEditing(true);
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg shadow-xs transition-colors"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>Adjust Budget Numbers</span>
            </button>
          ) : (
            <button
              onClick={() => setIsEditing(false)}
              className="text-xs font-medium text-slate-600 hover:text-slate-900 px-3 py-2"
            >
              Cancel
            </button>
          )}
        </div>
      </div>

      {savingSuccess && (
        <div className="p-3 bg-emerald-50 text-emerald-800 text-xs font-medium rounded-lg flex items-center gap-2 border border-emerald-200">
          <Check className="w-4 h-4 text-emerald-600" />
          <span>Budget parameters successfully updated and recalculated by backend.</span>
        </div>
      )}

      {/* Edit Form or Display */}
      {isEditing ? (
        <form
          onSubmit={handleSave}
          className="p-6 bg-white rounded-xl border border-slate-200 shadow-xs space-y-5"
        >
          <h2 className="text-sm font-bold text-slate-900">Edit Monthly Financial Baseline</h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Monthly Net Take-Home Income
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                required
                value={income}
                onChange={(e) => setIncome(e.target.value)}
                className="w-full px-3 py-2 text-sm font-mono tabular-nums rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Monthly Essential Expenses (Rent, Utilities, Food)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                required
                value={essentials}
                onChange={(e) => setEssentials(e.target.value)}
                className="w-full px-3 py-2 text-sm font-mono tabular-nums rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Monthly Savings Target
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                required
                value={savingsGoal}
                onChange={(e) => setSavingsGoal(e.target.value)}
                className="w-full px-3 py-2 text-sm font-mono tabular-nums rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Emergency Buffer Allocation
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={emergency}
                onChange={(e) => setEmergency(e.target.value)}
                className="w-full px-3 py-2 text-sm font-mono tabular-nums rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Budget Period Schedule
              </label>
              <select
                value={period}
                onChange={(e) => setPeriod(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
              >
                <option value="1st to End of Month">1st to End of Month</option>
                <option value="15th to 14th of Next Month">15th to 14th of Next Month</option>
                <option value="Bi-Weekly Payday Cycle">Bi-Weekly Payday Cycle</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setIsEditing(false)}
              className="px-4 py-2 text-xs font-semibold text-slate-700 hover:text-slate-900"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg shadow-xs"
            >
              Save & Recalculate
            </button>
          </div>
        </form>
      ) : (
        /* Visual Overview */
        <div className="space-y-6">
          {/* Visual Bar Breakdown */}
          <div className="p-5 bg-white rounded-xl border border-slate-200 shadow-xs">
            <h2 className="text-sm font-bold text-slate-900 mb-2">Income Proportion Breakdown</h2>
            <div className="w-full h-4 rounded-lg overflow-hidden flex bg-slate-100">
              <div
                title={`Essentials: ${essentialsPercent}%`}
                className="bg-slate-700 h-full transition-all"
                style={{ width: `${essentialsPercent}%` }}
              />
              <div
                title={`Savings: ${savingsPercent}%`}
                className="bg-emerald-600 h-full transition-all"
                style={{ width: `${savingsPercent}%` }}
              />
              <div
                title={`Emergency: ${emergencyPercent}%`}
                className="bg-amber-500 h-full transition-all"
                style={{ width: `${emergencyPercent}%` }}
              />
              <div
                title={`Flexible: ${flexiblePercent}%`}
                className="bg-sky-500 h-full transition-all"
                style={{ width: `${flexiblePercent}%` }}
              />
            </div>

            <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-xs bg-slate-700 shrink-0" />
                <span className="text-slate-600">Essentials ({essentialsPercent}%)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-xs bg-emerald-600 shrink-0" />
                <span className="text-slate-600">Savings Target ({savingsPercent}%)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-xs bg-amber-500 shrink-0" />
                <span className="text-slate-600">Emergency ({emergencyPercent}%)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-xs bg-sky-500 shrink-0" />
                <span className="text-slate-600">Flexible Pool ({flexiblePercent}%)</span>
              </div>
            </div>
          </div>

          {/* Allocation Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 bg-white rounded-xl border border-slate-200">
              <div className="text-slate-500 text-xs font-medium">Monthly Take-Home</div>
              <div className="text-lg font-bold font-mono tabular-nums text-slate-900 mt-1">
                {formatMoney(budget.monthlyIncome)}
              </div>
              <div className="text-[11px] text-slate-500 mt-1">100% Total incoming</div>
            </div>

            <div className="p-4 bg-white rounded-xl border border-slate-200">
              <div className="text-slate-500 text-xs font-medium">Essential Fixed Baseline</div>
              <div className="text-lg font-bold font-mono tabular-nums text-slate-900 mt-1">
                {formatMoney(budget.essentialExpenses)}
              </div>
              <div className="text-[11px] text-slate-500 mt-1">
                {essentialsPercent}% of total income
              </div>
            </div>

            <div className="p-4 bg-white rounded-xl border border-slate-200">
              <div className="text-slate-500 text-xs font-medium">Monthly Flexible Pool</div>
              <div className="text-lg font-bold font-mono tabular-nums text-slate-900 mt-1">
                {formatMoney(budget.flexibleBudget)}
              </div>
              <div className="text-[11px] text-slate-500 mt-1">
                Initial: {formatMoney(budget.initialDailyAllowance)}/day
              </div>
            </div>

            <div className="p-4 bg-emerald-50/70 rounded-xl border border-emerald-200">
              <div className="text-emerald-800 text-xs font-semibold">Remaining Flexible</div>
              <div className="text-lg font-extrabold font-mono tabular-nums text-emerald-950 mt-1">
                {formatMoney(budget.remainingFlexibleBudget)}
              </div>
              <div className="text-[11px] text-emerald-800 mt-1">
                {formatMoney(budget.adaptiveDailyAllowance)} / day ({budget.daysRemaining} days left)
              </div>
            </div>
          </div>

          {/* How PennyWise Computes Your Daily Allowance */}
          <div className="p-5 bg-white rounded-xl border border-slate-200 shadow-xs">
            <div className="flex items-center gap-2 mb-3">
              <HelpCircle className="w-4 h-4 text-emerald-600" />
              <h2 className="text-sm font-bold text-slate-900">
                How PennyWise Calculates Your Allowance
              </h2>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              PennyWise AI enforces responsible personal budgeting without confusing accounting jargon:
            </p>
            <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200/80">
                <div className="font-semibold text-slate-900 mb-1">1. Flexible Discretionary Pool</div>
                <p className="text-slate-600">
                  Income minus (Essentials + Savings Goal + Emergency Buffer) = Your monthly flexible pool.
                </p>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200/80">
                <div className="font-semibold text-slate-900 mb-1">2. Remaining Allowance</div>
                <p className="text-slate-600">
                  Each logged flexible purchase subtracts from your pool in real time without touching essentials.
                </p>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200/80">
                <div className="font-semibold text-slate-900 mb-1">3. Daily Pacing</div>
                <p className="text-slate-600">
                  Remaining flexible pool divided by remaining days in cycle gives your safe daily spending benchmark.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
