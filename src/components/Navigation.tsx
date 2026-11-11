import React, { useState } from 'react';
import {
  LayoutDashboard,
  Wallet,
  Receipt,
  Target,
  Sparkles,
  ShoppingBag,
  CreditCard,
  Settings,
  LogIn,
  LogOut,
  Menu,
  X,
  Compass,
} from 'lucide-react';
import { useFinance } from '../context/FinanceContext';
import { NavTab } from '../types/finance';
import { PennyWiseLogo } from './PennyWiseLogo';

export const Navigation: React.FC = () => {
  const {
    activeTab,
    setActiveTab,
    profile,
    user,
    isDemo,
    startDemoMode,
    exitDemoMode,
    signInWithGoogle,
    signOutUser,
  } = useFinance();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems: Array<{ id: NavTab; label: string; icon: React.ElementType }> = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'budget', label: 'My Budget', icon: Wallet },
    { id: 'expenses', label: 'Expenses', icon: Receipt },
    { id: 'savings', label: 'Savings Goals', icon: Target },
    { id: 'ai-assistant', label: 'AI Assistant', icon: Sparkles },
    { id: 'analyzer', label: 'Purchase Analyzer', icon: ShoppingBag },
    { id: 'paypal', label: 'PayPal Checkout', icon: CreditCard },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  const handleSelectTab = (tab: NavTab) => {
    setActiveTab(tab);
    setMobileMenuOpen(false);
  };

  return (
    <>
      {/* Top Header - Adheres to Top Bar Contract */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-8">
          {/* Zone 1: Brand wordmark (single line, no clutter) */}
          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 text-slate-600 hover:text-slate-900 rounded-lg focus:outline-none"
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
            <div
              onClick={() => handleSelectTab('dashboard')}
              className="cursor-pointer flex items-center gap-2 hover:opacity-95 transition-opacity"
            >
              <PennyWiseLogo variant="full" size={32} />
            </div>
            {isDemo && (
              <span className="hidden sm:inline-block text-xs font-semibold px-2 py-0.5 rounded text-amber-800 bg-amber-50 border border-amber-200">
                Demo Mode
              </span>
            )}
          </div>

          {/* Zone 2: Navigation Links for Desktop */}
          <nav className="hidden lg:flex items-center gap-1 overflow-x-auto py-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleSelectTab(item.id)}
                  className={`flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    isActive
                      ? 'bg-emerald-800 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5 shrink-0" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Zone 3: Account & Session Action */}
          <div className="flex items-center gap-3 shrink-0">
            {user ? (
              <div className="flex items-center gap-3">
                <div className="hidden sm:flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-xs ring-1 ring-emerald-200">
                    {(profile?.displayName || user.displayName || 'U')[0].toUpperCase()}
                  </div>
                  <div className="text-right">
                    <div className="text-xs font-semibold text-slate-900 truncate max-w-[140px]">
                      {profile?.displayName || user.displayName || 'Personal Account'}
                    </div>
                    <div className="text-[10px] text-slate-500 font-mono">
                      {profile?.preferredCurrency || 'USD'}
                    </div>
                  </div>
                </div>
                <button
                  onClick={signOutUser}
                  title="Sign Out"
                  className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Sign Out</span>
                </button>
              </div>
            ) : isDemo ? (
              <div className="flex items-center gap-2">
                <button
                  onClick={exitDemoMode}
                  className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors whitespace-nowrap cursor-pointer"
                >
                  Exit Demo
                </button>
                <button
                  onClick={signOutUser}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg shadow-xs transition-colors whitespace-nowrap cursor-pointer"
                >
                  <LogIn className="w-3.5 h-3.5" />
                  <span>Sign In</span>
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  onClick={startDemoMode}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100/80 rounded-lg transition-colors whitespace-nowrap cursor-pointer"
                >
                  <Compass className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Try Demo</span>
                </button>
                <button
                  onClick={signOutUser}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg transition-colors whitespace-nowrap cursor-pointer shadow-xs"
                >
                  <LogIn className="w-3.5 h-3.5" />
                  <span>Sign In</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="lg:hidden border-t border-slate-200 bg-white px-4 pt-3 pb-4 space-y-1 shadow-lg animate-in fade-in duration-150">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleSelectTab(item.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg transition-colors cursor-pointer ${
                    isActive
                      ? 'bg-emerald-800 text-white font-semibold'
                      : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>
        )}
      </header>
    </>
  );
};
