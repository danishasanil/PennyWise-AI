import React, { useState } from 'react';
import { useFinance } from '../context/FinanceContext';
import { CurrencyCode, UserProfile } from '../types/finance';
import { Sparkles, ArrowRight, ShieldCheck, HelpCircle } from 'lucide-react';
import { SearchableCountrySelect } from './SearchableCountrySelect';
import { SearchableCurrencySelect } from './SearchableCurrencySelect';
import { ALL_CURRENCIES } from '../data/internationalData';

export const OnboardingModal: React.FC = () => {
  const { profile, saveUserProfile, startDemoMode, isDemo } = useFinance();

  const [displayName, setDisplayName] = useState(profile?.displayName || '');
  const [country, setCountry] = useState(profile?.country || 'United States');
  const [preferredCurrency, setPreferredCurrency] = useState<CurrencyCode>(
    profile?.preferredCurrency || 'USD'
  );
  const [monthlyIncome, setMonthlyIncome] = useState(
    profile?.monthlyIncome ? String(profile.monthlyIncome) : '4500'
  );
  const [monthlyEssentialExpenses, setMonthlyEssentialExpenses] = useState(
    profile?.monthlyEssentialExpenses ? String(profile.monthlyEssentialExpenses) : '2200'
  );
  const [monthlySavingsGoal, setMonthlySavingsGoal] = useState(
    profile?.monthlySavingsGoal ? String(profile.monthlySavingsGoal) : '700'
  );
  const [emergencyAllocation, setEmergencyAllocation] = useState(
    profile?.emergencyAllocation ? String(profile.emergencyAllocation) : '300'
  );
  const [monthlyBudgetPeriod, setMonthlyBudgetPeriod] = useState(
    profile?.monthlyBudgetPeriod || '1st to End of Month'
  );

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Only show if user has no completed profile and is not in demo
  if (profile?.onboardingCompleted || isDemo) {
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    const inc = parseFloat(monthlyIncome);
    const ess = parseFloat(monthlyEssentialExpenses);
    const sav = parseFloat(monthlySavingsGoal);
    const emg = parseFloat(emergencyAllocation) || 0;

    if (!displayName.trim()) {
      setErrorMsg('Please enter your name or preferred display name.');
      return;
    }

    if (isNaN(inc) || inc < 0) {
      setErrorMsg('Please enter a valid monthly income.');
      return;
    }

    if (isNaN(ess) || ess < 0) {
      setErrorMsg('Please enter valid monthly essential expenses.');
      return;
    }

    if (isNaN(sav) || sav < 0) {
      setErrorMsg('Please enter a valid monthly savings goal.');
      return;
    }

    setSubmitting(true);
    try {
      await saveUserProfile({
        displayName: displayName.trim(),
        country: country.trim(),
        preferredCurrency,
        monthlyIncome: inc,
        monthlyEssentialExpenses: ess,
        monthlySavingsGoal: sav,
        emergencyAllocation: emg,
        monthlyBudgetPeriod,
        onboardingCompleted: true,
      });
    } catch (err: any) {
      setErrorMsg('Unable to save profile. Please check your inputs.');
    } finally {
      setSubmitting(false);
    }
  };

  const selectedSymbol = ALL_CURRENCIES.find((c) => c.code === preferredCurrency)?.symbol || '$';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="w-full max-w-xl bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden my-8">
        {/* Header */}
        <div className="p-6 sm:p-8 bg-gradient-to-b from-emerald-50/70 to-white border-b border-slate-100">
          <div className="flex items-center justify-between mb-3">
            <div className="inline-flex items-center gap-2 text-xs font-semibold text-emerald-800 bg-emerald-100/80 px-2.5 py-1 rounded-md">
              <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
              <span>Welcome to PennyWise AI</span>
            </div>
            <button
              type="button"
              onClick={startDemoMode}
              className="text-xs font-semibold text-slate-600 hover:text-slate-900 px-3 py-1 rounded-md border border-slate-200 hover:bg-slate-50 transition-colors"
            >
              Try Demo with Sample Data
            </button>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Personalize Your Financial Companion
          </h2>
          <p className="mt-1 text-sm text-slate-600 leading-relaxed">
            PennyWise AI uses your real monthly numbers to calculate your official flexible budget,
            daily spending allowance, and evaluate purchasing decisions.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-5">
          {errorMsg && (
            <div className="p-3 text-xs font-medium text-rose-700 bg-rose-50 border border-rose-200 rounded-lg">
              {errorMsg}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Your Display Name
              </label>
              <input
                type="text"
                required
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="e.g. Sarah or Alex"
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <SearchableCountrySelect
                value={country}
                onChange={(c) => {
                  setCountry(c.name);
                  // Auto-populate preferred currency from selected country's default ISO currency
                  setPreferredCurrency(c.defaultCurrency);
                }}
                label="Country of Residence"
              />
            </div>

            <div>
              <SearchableCurrencySelect
                value={preferredCurrency}
                onChange={(curr) => setPreferredCurrency(curr.code)}
                label="Preferred Currency (Auto or Manual)"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Monthly Budget Period
              </label>
              <select
                value={monthlyBudgetPeriod}
                onChange={(e) => setMonthlyBudgetPeriod(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
              >
                <option value="1st to End of Month">1st to End of Month</option>
                <option value="15th to 14th of Next Month">15th to 14th of Next Month</option>
                <option value="Bi-Weekly Payday Cycle">Bi-Weekly Payday Cycle</option>
              </select>
            </div>
          </div>

          <div className="border-t border-slate-100 pt-4">
            <h3 className="text-xs font-bold text-slate-900 tracking-wide uppercase mb-3">
              Monthly Financial Baseline
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Monthly Net Income ({selectedSymbol})
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-sm text-slate-400 font-mono">
                    {selectedSymbol}
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={monthlyIncome}
                    onChange={(e) => setMonthlyIncome(e.target.value)}
                    className="w-full pl-8 pr-3 py-2 text-sm font-mono tabular-nums rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                  />
                </div>
                <p className="mt-1 text-[11px] text-slate-500">Take-home pay after taxes</p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Essential Expenses ({selectedSymbol})
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-sm text-slate-400 font-mono">
                    {selectedSymbol}
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={monthlyEssentialExpenses}
                    onChange={(e) => setMonthlyEssentialExpenses(e.target.value)}
                    className="w-full pl-8 pr-3 py-2 text-sm font-mono tabular-nums rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                  />
                </div>
                <p className="mt-1 text-[11px] text-slate-500">Rent/mortgage, utilities, food baseline</p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Target Savings Goal ({selectedSymbol})
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-sm text-slate-400 font-mono">
                    {selectedSymbol}
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={monthlySavingsGoal}
                    onChange={(e) => setMonthlySavingsGoal(e.target.value)}
                    className="w-full pl-8 pr-3 py-2 text-sm font-mono tabular-nums rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                  />
                </div>
                <p className="mt-1 text-[11px] text-slate-500">Monthly goal to deposit or invest</p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Emergency Allocation ({selectedSymbol})
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-sm text-slate-400 font-mono">
                    {selectedSymbol}
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={emergencyAllocation}
                    onChange={(e) => setEmergencyAllocation(e.target.value)}
                    className="w-full pl-8 pr-3 py-2 text-sm font-mono tabular-nums rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                  />
                </div>
                <p className="mt-1 text-[11px] text-slate-500">Buffer set aside for unexpected costs</p>
              </div>
            </div>
          </div>

          <div className="pt-2 flex items-center justify-between gap-4">
            <button
              type="button"
              onClick={startDemoMode}
              className="text-xs text-slate-500 hover:text-slate-800 font-medium underline-offset-4 hover:underline"
            >
              Skip setup and explore Demo
            </button>

            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg shadow-sm transition-colors"
            >
              <span>{submitting ? 'Setting up...' : 'Create My Plan'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
