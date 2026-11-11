import React, { useState } from 'react';
import { useFinance } from '../context/FinanceContext';
import { CurrencyCode } from '../types/finance';
import {
  Settings,
  User,
  Globe,
  DollarSign,
  Calendar,
  Check,
  Shield,
  Trash2,
  Sparkles,
  Compass,
} from 'lucide-react';
import { SearchableCountrySelect } from './SearchableCountrySelect';
import { SearchableCurrencySelect } from './SearchableCurrencySelect';
import { ALL_CURRENCIES } from '../data/internationalData';

export const SettingsView: React.FC = () => {
  const {
    profile,
    saveUserProfile,
    isDemo,
    startDemoMode,
    exitDemoMode,
    user,
    signOutUser,
  } = useFinance();

  const [displayName, setDisplayName] = useState(profile?.displayName || '');
  const [country, setCountry] = useState(profile?.country || 'United States');
  const [preferredCurrency, setPreferredCurrency] = useState<CurrencyCode>(
    profile?.preferredCurrency || 'USD'
  );
  const [monthlyBudgetPeriod, setMonthlyBudgetPeriod] = useState(
    profile?.monthlyBudgetPeriod || '1st to End of Month'
  );
  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    await saveUserProfile({
      displayName: displayName.trim(),
      country: country.trim(),
      preferredCurrency,
      monthlyBudgetPeriod,
    });
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  const handleResetData = () => {
    if (
      confirm(
        'Are you sure you want to clear your local session data? This will reset your preferences.'
      )
    ) {
      localStorage.clear();
      window.location.reload();
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Settings & Preferences
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Configure currency format, profile details, budget periods, and session modes.
          </p>
        </div>
      </div>

      {savedSuccess && (
        <div className="p-3 bg-emerald-50 text-emerald-800 text-xs font-medium rounded-lg flex items-center gap-2 border border-emerald-200">
          <Check className="w-4 h-4 text-emerald-600" />
          <span>Preferences updated successfully!</span>
        </div>
      )}

      {/* Main Settings Form */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-6">
        <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
          <User className="w-4 h-4 text-emerald-600" />
          <span>Personal Preferences</span>
        </h2>

        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Display Name
              </label>
              <input
                type="text"
                required
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
              />
            </div>

            <div>
              <SearchableCountrySelect
                value={country}
                onChange={(c) => {
                  setCountry(c.name);
                  // Option to auto-align or let user keep their preferred currency
                }}
                label="Country of Residence"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <SearchableCurrencySelect
                value={preferredCurrency}
                onChange={(curr) => setPreferredCurrency(curr.code)}
                label="Preferred Budget Currency"
              />
              <p className="mt-1 text-[11px] text-slate-500">
                Active: {preferredCurrency} (
                {ALL_CURRENCIES.find((c) => c.code === preferredCurrency)?.name || preferredCurrency}
                )
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Budget Period
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

          <div className="pt-2 flex justify-end">
            <button
              type="submit"
              className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg shadow-xs transition-colors"
            >
              Save Preferences
            </button>
          </div>
        </form>
      </div>

      {/* Mode & Session Management */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-4">
        <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
          <Compass className="w-4 h-4 text-emerald-600" />
          <span>Application Mode & Session</span>
        </h2>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 bg-slate-50 rounded-lg border border-slate-200">
          <div>
            <div className="text-xs font-bold text-slate-800">
              {isDemo ? 'Currently in Demo Mode' : 'Personal Budget Mode'}
            </div>
            <div className="text-[11px] text-slate-500">
              {isDemo
                ? 'Sample data is currently loaded to explore all features.'
                : 'Using your real custom inputs and saved records.'}
            </div>
          </div>

          <div>
            {isDemo ? (
              <button
                onClick={exitDemoMode}
                className="px-3 py-1.5 text-xs font-semibold text-slate-800 bg-white hover:bg-slate-100 border border-slate-300 rounded-md transition-colors"
              >
                Exit Demo Mode
              </button>
            ) : (
              <button
                onClick={startDemoMode}
                className="px-3 py-1.5 text-xs font-semibold text-slate-800 bg-white hover:bg-slate-100 border border-slate-300 rounded-md transition-colors"
              >
                Switch to Demo Mode
              </button>
            )}
          </div>
        </div>

        {user && (
          <div className="flex items-center justify-between pt-2">
            <div>
              <div className="text-xs font-semibold text-slate-800">Firebase Account</div>
              <div className="text-[11px] text-slate-500">{user.email}</div>
            </div>
            <button
              onClick={signOutUser}
              className="px-3 py-1.5 text-xs font-semibold text-rose-700 hover:text-rose-900 border border-rose-200 rounded-md hover:bg-rose-50 transition-colors"
            >
              Sign Out
            </button>
          </div>
        )}
      </div>

      {/* System Status Architecture */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-3">
        <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
          <Shield className="w-4 h-4 text-emerald-600" />
          <span>Connected Services Architecture</span>
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
            <div className="font-semibold text-slate-800">Gemini 3.8 AI</div>
            <div className="text-[11px] text-slate-500 mt-0.5">
              Backend `@google/genai` assistant & purchase analyzer
            </div>
          </div>
          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
            <div className="font-semibold text-slate-800">Firebase Firestore</div>
            <div className="text-[11px] text-slate-500 mt-0.5">
              Secure Attribute-Based Access Control database
            </div>
          </div>
          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
            <div className="font-semibold text-slate-800">PayPal REST API</div>
            <div className="text-[11px] text-slate-500 mt-0.5">
              Server-authoritative Sandbox order & capture verification
            </div>
          </div>
        </div>

        <div className="pt-2 flex justify-end">
          <button
            onClick={handleResetData}
            className="text-xs text-rose-600 hover:text-rose-800 inline-flex items-center gap-1 font-medium"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Reset Local Session</span>
          </button>
        </div>
      </div>
    </div>
  );
};
