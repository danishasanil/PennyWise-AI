/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { FinanceProvider, useFinance } from './context/FinanceContext';
import { Navigation } from './components/Navigation';
import { OnboardingModal } from './components/OnboardingModal';
import { DashboardView } from './components/DashboardView';
import { BudgetView } from './components/BudgetView';
import { ExpensesView } from './components/ExpensesView';
import { SavingsGoalsView } from './components/SavingsGoalsView';
import { AIAssistantView } from './components/AIAssistantView';
import { PurchaseAnalyzerView } from './components/PurchaseAnalyzerView';
import { PayPalCheckoutView } from './components/PayPalCheckoutView';
import { SettingsView } from './components/SettingsView';
import { ExpenseModal } from './components/ExpenseModal';
import { LandingPageView } from './components/LandingPageView';
import { PennyWiseLogo } from './components/PennyWiseLogo';
import { CheckCircle2, AlertTriangle, Loader2, X, Compass } from 'lucide-react';

const AppContent: React.FC = () => {
  const {
    user,
    isDemo,
    activeTab,
    isLoading,
    syncStatus,
    successMessage,
    error,
    clearError,
    clearSuccess,
    exitDemoMode,
    signOutUser,
  } = useFinance();
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#FBFBFA] flex items-center justify-center">
        <div className="text-center space-y-3">
          <PennyWiseLogo variant="app-icon" size={48} className="mx-auto animate-pulse" />
          <div className="text-sm font-semibold text-slate-800">Loading PennyWise AI...</div>
          <div className="text-xs text-slate-400">Connecting to secure financial database</div>
        </div>
      </div>
    );
  }

  // Display Landing Page if user is not authenticated and not in demo mode
  if (!user && !isDemo) {
    return <LandingPageView />;
  }

  return (
    <div className="min-h-screen bg-[#FBFBFA] flex flex-col text-slate-900 font-sans">
      {/* Demo Mode Top Bar */}
      {isDemo && (
        <div className="bg-amber-50 border-b border-amber-200/80 px-4 py-2 text-xs text-amber-950 flex flex-col sm:flex-row items-center justify-between gap-2 shadow-xs">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
            <span className="font-bold">DEMO MODE ACTIVE</span>
            <span className="text-amber-800 text-[11px] sm:text-xs">
              · Exploring with sample financial data. Real user data is untouched.
            </span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={signOutUser}
              className="px-2.5 py-1 text-[11px] font-semibold text-emerald-900 bg-white hover:bg-emerald-50 rounded-lg border border-emerald-300 shadow-xs transition-colors cursor-pointer"
            >
              Sign In / Register
            </button>
            <button
              onClick={exitDemoMode}
              className="px-2.5 py-1 text-[11px] font-semibold text-slate-700 bg-white hover:bg-slate-50 rounded-lg border border-slate-300 shadow-xs transition-colors cursor-pointer"
            >
              Exit Demo
            </button>
          </div>
        </div>
      )}

      <Navigation />
      <OnboardingModal />

      {/* Real-time Firestore Sync Status & Notifications Banner */}
      <div className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-3 space-y-2">
        {syncStatus === 'saving' && (
          <div className="p-2.5 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-800 flex items-center justify-between shadow-xs transition-all">
            <span className="flex items-center gap-2">
              <Loader2 className="w-3.5 h-3.5 text-blue-600 animate-spin" />
              <span className="font-medium">Saving updates securely to Firestore...</span>
            </span>
          </div>
        )}

        {successMessage && (
          <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center justify-between shadow-xs transition-all">
            <span className="flex items-center gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span className="font-medium">{successMessage}</span>
            </span>
            <button
              onClick={clearSuccess}
              className="p-1 hover:bg-emerald-100 rounded-md text-emerald-700 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {error && (
          <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-center justify-between shadow-xs transition-all">
            <span className="flex items-center gap-2">
              <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
              <span className="font-medium">{error}</span>
            </span>
            <button
              onClick={clearError}
              className="p-1 hover:bg-rose-100 rounded-md text-rose-700 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* Main Content Viewport */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {activeTab === 'dashboard' && (
          <DashboardView onOpenExpenseModal={() => setIsExpenseModalOpen(true)} />
        )}
        {activeTab === 'budget' && <BudgetView />}
        {activeTab === 'expenses' && <ExpensesView />}
        {activeTab === 'savings' && <SavingsGoalsView />}
        {activeTab === 'ai-assistant' && <AIAssistantView />}
        {activeTab === 'analyzer' && <PurchaseAnalyzerView />}
        {activeTab === 'paypal' && <PayPalCheckoutView />}
        {activeTab === 'settings' && <SettingsView />}
      </main>

      {/* Quick Action Expense Modal */}
      <ExpenseModal
        isOpen={isExpenseModalOpen}
        onClose={() => setIsExpenseModalOpen(false)}
      />

      {/* Quiet Footer */}
      <footer className="border-t border-slate-200/80 bg-white py-6 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <PennyWiseLogo variant="full" size={24} showTagline={false} />
            <span aria-hidden="true" className="text-slate-300">·</span>
            <span className="text-slate-500">Your money. Your goals. Your smarter future.</span>
          </div>
          <div className="text-[11px] text-slate-400 text-center sm:text-right">
            Educational budgeting assistance. Not professional investment, tax or legal advice.
          </div>
        </div>
      </footer>
    </div>
  );
};

export default function App() {
  return (
    <FinanceProvider>
      <AppContent />
    </FinanceProvider>
  );
}
