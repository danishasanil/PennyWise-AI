import React, { useState, useEffect } from 'react';
import {
  Compass,
  Lock,
  Mail,
  User as UserIcon,
  Eye,
  EyeOff,
  ArrowRight,
  ShieldCheck,
  TrendingUp,
  Sparkles,
  Calculator,
  CreditCard,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ChevronRight,
  X,
  Wallet,
  PiggyBank,
  Check,
  Zap,
  ArrowUpRight,
  Calendar,
  Layers,
  ShoppingBag,
} from 'lucide-react';
import { useFinance } from '../context/FinanceContext';
import { PennyWiseLogo } from './PennyWiseLogo';

export const LandingPageView: React.FC = () => {
  const {
    signInWithGoogle,
    signInWithEmail,
    signUpWithEmail,
    resetPassword,
    startDemoMode,
    error: globalError,
    clearError,
    successMessage,
    clearSuccess,
  } = useFinance();

  // Authentication Modal State
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'signin' | 'signup' | 'forgot'>('signin');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [localSuccess, setLocalSuccess] = useState<string | null>(null);

  const activeError = localError || globalError;

  // Close modal on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleCloseModal();
      }
    };
    if (authModalOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [authModalOpen]);

  const openAuth = (mode: 'signin' | 'signup' | 'forgot') => {
    setAuthMode(mode);
    setLocalError(null);
    setLocalSuccess(null);
    clearError();
    clearSuccess();
    setAuthModalOpen(true);
  };

  const handleCloseModal = () => {
    setAuthModalOpen(false);
    setLocalError(null);
    setLocalSuccess(null);
    clearError();
    clearSuccess();
  };

  const handleScrollToTop = () => {
    handleCloseModal();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    setLocalSuccess(null);
    clearError();
    clearSuccess();

    if (authMode === 'forgot') {
      if (!email || !email.includes('@')) {
        setLocalError('Please enter a valid email address.');
        return;
      }
      setLoading(true);
      try {
        await resetPassword(email);
        setLocalSuccess('A password reset link has been sent to your email.');
      } catch (err: any) {
        setLocalError(err?.message || 'Could not send reset email. Please try again.');
      } finally {
        setLoading(false);
      }
      return;
    }

    if (authMode === 'signup') {
      if (!fullName.trim()) {
        setLocalError('Please enter your full name.');
        return;
      }
      if (!email || !email.includes('@')) {
        setLocalError('Please enter a valid email address.');
        return;
      }
      if (password.length < 6) {
        setLocalError('Password must be at least 6 characters long.');
        return;
      }
      if (password !== confirmPassword) {
        setLocalError('Passwords do not match. Please re-enter.');
        return;
      }

      setLoading(true);
      try {
        await signUpWithEmail(fullName, email, password);
        // Successful signup will trigger Auth state listener and redirect to onboarding/dashboard
      } catch (err: any) {
        setLocalError(err?.message || 'Failed to create account.');
      } finally {
        setLoading(false);
      }
      return;
    }

    // authMode === 'signin'
    if (!email || !password) {
      setLocalError('Please provide both email and password.');
      return;
    }
    setLoading(true);
    try {
      await signInWithEmail(email, password);
      // Successful sign in redirects automatically
    } catch (err: any) {
      setLocalError(err?.message || 'Could not sign in with provided credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setLocalError(null);
    setLocalSuccess(null);
    clearError();
    setLoading(true);
    try {
      await signInWithGoogle();
      // Successful sign in redirects automatically
    } catch (err: any) {
      setLocalError(err?.message || 'Could not complete Google Sign-In.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FBFBFA] flex flex-col justify-between text-slate-900 font-sans selection:bg-emerald-100 selection:text-emerald-900 relative">
      {/* Top Navigation Bar */}
      <header className="w-full border-b border-slate-200/80 bg-white/90 backdrop-blur-md sticky top-0 z-30 transition-all">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          {/* Logo with click-to-home behavior */}
          <button
            onClick={handleScrollToTop}
            className="flex items-center gap-2.5 text-left hover:opacity-95 transition-opacity cursor-pointer focus:outline-none"
            title="Return to top"
          >
            <PennyWiseLogo variant="full" size={32} />
          </button>

          {/* Right Action Buttons: Explore Demo, Sign In, Get Started */}
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={startDemoMode}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100/90 border border-emerald-200/80 rounded-lg transition-colors cursor-pointer"
            >
              <Compass className="w-3.5 h-3.5 text-emerald-600" />
              <span>Explore Demo</span>
            </button>
            <button
              onClick={() => openAuth('signin')}
              className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
            >
              Sign In
            </button>
            <button
              onClick={() => openAuth('signup')}
              className="px-3.5 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg shadow-xs transition-colors cursor-pointer"
            >
              Get Started
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 w-full">
        {/* HERO SECTION */}
        <section className="relative overflow-hidden pt-8 pb-16 sm:pt-14 sm:pb-24 border-b border-slate-200/70 bg-gradient-to-b from-[#FBFBFA] via-white to-slate-50/50">
          {/* Background Ambient Glow Accents */}
          <div className="absolute top-0 right-1/4 w-96 h-96 bg-emerald-100/40 rounded-full blur-3xl pointer-events-none -z-10" />
          <div className="absolute top-1/3 left-10 w-80 h-80 bg-teal-100/30 rounded-full blur-3xl pointer-events-none -z-10" />

          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
              {/* LEFT COLUMN: Engaging Copy & Primary CTAs */}
              <div className="lg:col-span-6 space-y-6 text-left">
                {/* Badge */}
                <div className="inline-flex items-center gap-2 text-xs font-semibold text-emerald-800 bg-emerald-50/90 border border-emerald-200/80 px-3 py-1 rounded-full shadow-2xs">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Your AI-powered financial companion</span>
                </div>

                {/* Headline */}
                <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-slate-900 tracking-tight leading-[1.14]">
                  Make smarter money moves. <br />
                  <span className="bg-gradient-to-r from-emerald-800 via-teal-700 to-emerald-600 bg-clip-text text-transparent">
                    Every single day.
                  </span>
                </h1>

                {/* Short, Engaging Description */}
                <p className="text-base sm:text-lg text-slate-600 leading-relaxed max-w-xl">
                  PennyWise AI pairs an adaptive daily spending allowance with real-time Gemini conversational intelligence. Check purchase affordability before you buy, safeguard your savings targets, and take control of your financial future.
                </p>

                {/* Primary & Secondary Call to Actions */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-2">
                  <button
                    onClick={() => openAuth('signup')}
                    className="px-6 py-3.5 text-sm font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-xl shadow-sm hover:shadow transition-all flex items-center justify-center gap-2 cursor-pointer group"
                  >
                    <span>Get Started</span>
                    <ArrowRight className="w-4 h-4 text-emerald-400 group-hover:translate-x-0.5 transition-transform" />
                  </button>

                  <button
                    onClick={startDemoMode}
                    className="px-5 py-3.5 text-sm font-semibold text-emerald-950 bg-white hover:bg-emerald-50/80 border border-emerald-200/90 rounded-xl shadow-2xs transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Compass className="w-4 h-4 text-emerald-700" />
                    <span>Explore Demo</span>
                  </button>
                </div>

                {/* Small Sign In Link */}
                <div className="pt-1 text-xs text-slate-500">
                  Already have an account?{' '}
                  <button
                    onClick={() => openAuth('signin')}
                    className="font-semibold text-emerald-800 hover:text-emerald-950 underline underline-offset-2 cursor-pointer"
                  >
                    Sign in here
                  </button>
                </div>

                {/* Trust Invariant Indicators */}
                <div className="pt-4 border-t border-slate-100 flex flex-wrap items-center gap-4 text-xs text-slate-500">
                  <div className="flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    <span>Private User Firestore</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <CreditCard className="w-4 h-4 text-emerald-600" />
                    <span>PayPal Sandbox Verified</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-emerald-600" />
                    <span>Server-side Gemini AI</span>
                  </div>
                </div>
              </div>

              {/* RIGHT COLUMN: Interactive-Looking Live Dashboard Preview */}
              <div className="lg:col-span-6">
                <div className="relative mx-auto max-w-lg lg:max-w-none">
                  {/* Decorative Glow Ring */}
                  <div className="absolute -inset-1 bg-gradient-to-r from-emerald-500/20 via-teal-500/20 to-emerald-600/20 rounded-3xl blur-xl opacity-70" />

                  {/* Main Dashboard Preview Card Container */}
                  <div className="relative bg-white/95 backdrop-blur-md rounded-2xl border border-slate-200/90 shadow-xl p-5 sm:p-6 space-y-4">
                    {/* Header with Sample Badge */}
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                        <span className="text-xs font-bold text-slate-900 tracking-tight">
                          Live Financial Dashboard Preview
                        </span>
                      </div>
                      <span className="text-[10px] font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                        Illustrative Sample Data
                      </span>
                    </div>

                    {/* Featured Today's Allowance Card (Prominent & High Hierarchy) */}
                    <div className="p-4 rounded-xl bg-gradient-to-br from-emerald-900 via-emerald-800 to-teal-900 text-white shadow-sm space-y-2 relative overflow-hidden">
                      <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-400/10 rounded-full blur-xl pointer-events-none" />
                      <div className="flex items-center justify-between text-xs text-emerald-200 font-medium">
                        <span className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-emerald-300" />
                          <span>Today's Spending Allowance</span>
                        </span>
                        <span className="text-[10px] bg-emerald-700/60 px-2 py-0.5 rounded-full text-emerald-100">
                          Pacing On Track
                        </span>
                      </div>

                      <div className="flex items-baseline gap-2">
                        <span className="text-3xl sm:text-4xl font-extrabold font-mono tracking-tight text-white">
                          $48.50
                        </span>
                        <span className="text-xs text-emerald-200 font-medium">/ day</span>
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-emerald-200/90 pt-1 border-t border-emerald-700/50">
                        <span>Baseline: $45.00/day</span>
                        <span>24 days left in October cycle</span>
                      </div>
                    </div>

                    {/* Secondary Metric Grid */}
                    <div className="grid grid-cols-2 gap-3">
                      {/* Metric 1: Remaining Flexible */}
                      <div className="p-3 bg-slate-50/90 rounded-xl border border-slate-100 space-y-1">
                        <div className="flex items-center justify-between text-slate-500 text-[11px]">
                          <span>Remaining Flexible</span>
                          <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
                        </div>
                        <div className="text-lg font-bold font-mono text-slate-900">
                          $1,164.00
                        </div>
                        <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                          <div className="bg-emerald-600 h-full rounded-full" style={{ width: '68%' }} />
                        </div>
                        <div className="text-[10px] text-slate-400 flex justify-between">
                          <span>Pool: $1,700</span>
                          <span>68% left</span>
                        </div>
                      </div>

                      {/* Metric 2: Savings Goal Progress */}
                      <div className="p-3 bg-slate-50/90 rounded-xl border border-slate-100 space-y-1">
                        <div className="flex items-center justify-between text-slate-500 text-[11px]">
                          <span>Emergency Fund</span>
                          <PiggyBank className="w-3.5 h-3.5 text-teal-600" />
                        </div>
                        <div className="text-lg font-bold font-mono text-slate-900">
                          $2,450.00
                        </div>
                        <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                          <div className="bg-teal-600 h-full rounded-full" style={{ width: '82%' }} />
                        </div>
                        <div className="text-[10px] text-teal-800 font-medium flex justify-between">
                          <span>Target: $3,000</span>
                          <span>82% Achieved</span>
                        </div>
                      </div>
                    </div>

                    {/* Mini Spending Category Distribution Bar */}
                    <div className="p-3 bg-white rounded-xl border border-slate-100 space-y-2">
                      <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
                        <span>Spending Distribution</span>
                        <span className="text-[10px] text-slate-400 font-normal">Discretionary</span>
                      </div>
                      <div className="flex h-2.5 rounded-full overflow-hidden gap-0.5">
                        <div className="bg-emerald-600 h-full" style={{ width: '38%' }} title="Food & Dining (38%)" />
                        <div className="bg-teal-500 h-full" style={{ width: '28%' }} title="Groceries (28%)" />
                        <div className="bg-indigo-500 h-full" style={{ width: '20%' }} title="Transportation (20%)" />
                        <div className="bg-amber-500 h-full" style={{ width: '14%' }} title="Shopping (14%)" />
                      </div>
                      <div className="flex items-center justify-between text-[10px] text-slate-500">
                        <span className="flex items-center gap-1">
                          <span className="w-2 h-2 rounded-full bg-emerald-600" />
                          <span>Food 38%</span>
                        </span>
                        <span className="flex items-center gap-1">
                          <span className="w-2 h-2 rounded-full bg-teal-500" />
                          <span>Groceries 28%</span>
                        </span>
                        <span className="flex items-center gap-1">
                          <span className="w-2 h-2 rounded-full bg-indigo-500" />
                          <span>Transit 20%</span>
                        </span>
                        <span className="flex items-center gap-1">
                          <span className="w-2 h-2 rounded-full bg-amber-500" />
                          <span>Shop 14%</span>
                        </span>
                      </div>
                    </div>

                    {/* Floating Gemini AI Insight Card */}
                    <div className="p-3 bg-gradient-to-r from-emerald-50/90 via-teal-50/70 to-indigo-50/60 rounded-xl border border-emerald-200/80 flex items-start gap-2.5 text-xs text-slate-800">
                      <div className="w-6 h-6 rounded-md bg-emerald-700 text-white flex items-center justify-center shrink-0 mt-0.5">
                        <Sparkles className="w-3.5 h-3.5 text-emerald-200" />
                      </div>
                      <div className="space-y-0.5">
                        <span className="font-bold text-slate-900 block text-[11px]">
                          Gemini Financial Companion
                        </span>
                        <p className="text-[11px] text-slate-600 leading-relaxed">
                          "Pacing discretionary spending near <strong className="font-mono text-emerald-900">$48.50/day</strong> keeps your <strong className="font-mono text-emerald-900">$750</strong> monthly savings target 100% protected."
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* SECTION: HOW PENNYWISE WORKS */}
        <section className="py-16 sm:py-20 bg-white border-b border-slate-200/80">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-12">
            <div className="max-w-2xl mx-auto space-y-3">
              <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
                Simple 4-Step Methodology
              </span>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                How PennyWise AI Works
              </h2>
              <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
                A seamless flow that turns confusing monthly spreadsheets into daily, actionable confidence.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 text-left">
              {/* Step 1 */}
              <div className="p-6 rounded-2xl bg-[#FBFBFA] border border-slate-200/80 hover:border-emerald-300 transition-colors shadow-2xs space-y-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-sm">
                  1
                </div>
                <h3 className="font-bold text-slate-900 text-base">Understand Your Budget</h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Lock in essential fixed expenses and savings targets first. Your flexible discretionary spending pool is strictly calculated from real take-home pay.
                </p>
              </div>

              {/* Step 2 */}
              <div className="p-6 rounded-2xl bg-[#FBFBFA] border border-slate-200/80 hover:border-emerald-300 transition-colors shadow-2xs space-y-3">
                <div className="w-9 h-9 rounded-xl bg-teal-100 text-teal-800 flex items-center justify-center font-bold text-sm">
                  2
                </div>
                <h3 className="font-bold text-slate-900 text-base">Analyse Purchases</h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Before making a discretionary buy, ask Gemini or enter the price in the Purchase Analyzer to verify the exact impact on your daily allowance.
                </p>
              </div>

              {/* Step 3 */}
              <div className="p-6 rounded-2xl bg-[#FBFBFA] border border-slate-200/80 hover:border-emerald-300 transition-colors shadow-2xs space-y-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-800 text-white flex items-center justify-center font-bold text-sm">
                  3
                </div>
                <h3 className="font-bold text-slate-900 text-base">Make Smarter Decisions</h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Your adaptive allowance recalibrates automatically each day. Spend under your limit today, and tomorrow's allowance instantly grows.
                </p>
              </div>

              {/* Step 4 */}
              <div className="p-6 rounded-2xl bg-[#FBFBFA] border border-slate-200/80 hover:border-emerald-300 transition-colors shadow-2xs space-y-3">
                <div className="w-9 h-9 rounded-xl bg-slate-900 text-white flex items-center justify-center font-bold text-sm">
                  4
                </div>
                <h3 className="font-bold text-slate-900 text-base">Track Your Progress</h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Hit your milestone savings goals, log purchases with PayPal Sandbox verification, and view clear deterministic projections.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* SECTION: 5 CORE FEATURES */}
        <section className="py-16 sm:py-20 bg-[#FBFBFA]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
            <div className="text-center max-w-2xl mx-auto space-y-3">
              <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
                Engineered for Financial Confidence
              </span>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                Everything You Need to Master Your Money
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Feature 1 */}
              <div className="p-6 rounded-2xl bg-white border border-slate-200/90 shadow-2xs hover:shadow-sm transition-all space-y-3 text-left">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
                  <Calculator className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-slate-900">Adaptive Daily Allowance</h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Instead of guessing how much is safe to spend from a lump sum, get a single daily figure that adapts continuously to your actual transactions.
                </p>
              </div>

              {/* Feature 2 */}
              <div className="p-6 rounded-2xl bg-white border border-slate-200/90 shadow-2xs hover:shadow-sm transition-all space-y-3 text-left">
                <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center">
                  <Sparkles className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-slate-900">Conversational AI Companion</h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Powered by Gemini 3.8 Flash. Talk naturally about purchase dilemmas, explore budget-friendly alternatives, or plan a savings roadmap in plain English.
                </p>
              </div>

              {/* Feature 3 */}
              <div className="p-6 rounded-2xl bg-white border border-slate-200/90 shadow-2xs hover:shadow-sm transition-all space-y-3 text-left">
                <div className="w-10 h-10 rounded-xl bg-emerald-100/70 text-emerald-800 flex items-center justify-center">
                  <TrendingUp className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-slate-900">Purchase Impact Analyzer</h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Evaluate items before opening your wallet. View the exact dollar drop in your daily allowance and see whether your monthly savings goal remains safe.
                </p>
              </div>

              {/* Feature 4 */}
              <div className="p-6 rounded-2xl bg-white border border-slate-200/90 shadow-2xs hover:shadow-sm transition-all space-y-3 text-left">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center">
                  <PiggyBank className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-slate-900">Milestone Savings Goals</h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Create emergency funds, vacation goals, or gadget targets. Real-time timeline feasibility estimations keep you on track without depriving daily life.
                </p>
              </div>

              {/* Feature 5 */}
              <div className="p-6 rounded-2xl bg-white border border-slate-200/90 shadow-2xs hover:shadow-sm transition-all space-y-3 text-left">
                <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center">
                  <CreditCard className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-slate-900">PayPal Sandbox Checkout</h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Test simulated purchases with authentic PayPal Sandbox tokens and verified webhook ledgers, automatically generating verified expense records.
                </p>
              </div>

              {/* Feature 6: Privacy */}
              <div className="p-6 rounded-2xl bg-white border border-slate-200/90 shadow-2xs hover:shadow-sm transition-all space-y-3 text-left">
                <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-800 flex items-center justify-center">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-slate-900">Strict Data Privacy</h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Your data stays strictly under your Firestore user boundary. We never prompt for bank login credentials, card numbers, or passwords.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* SECTION: BOTTOM CALL TO ACTION BANNER */}
        <section className="py-14 sm:py-16 bg-gradient-to-br from-emerald-950 via-emerald-900 to-teal-950 text-white border-t border-emerald-900/40 relative overflow-hidden">
          <div className="max-w-4xl mx-auto px-4 text-center space-y-6 relative z-10">
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Ready to take the stress out of everyday spending?
            </h2>
            <p className="text-sm sm:text-base text-emerald-200/90 max-w-xl mx-auto leading-relaxed">
              Start in seconds with Google or email, or jump into the interactive demo to test the full dashboard with sample numbers.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <button
                onClick={() => openAuth('signup')}
                className="w-full sm:w-auto px-6 py-3.5 text-xs sm:text-sm font-semibold text-slate-900 bg-white hover:bg-slate-100 rounded-xl shadow-md transition-colors cursor-pointer"
              >
                Get Started Free
              </button>
              <button
                onClick={startDemoMode}
                className="w-full sm:w-auto px-6 py-3.5 text-xs sm:text-sm font-semibold text-emerald-100 bg-emerald-800/80 hover:bg-emerald-800 border border-emerald-600/50 rounded-xl shadow-sm transition-colors cursor-pointer flex items-center justify-center gap-2"
              >
                <Compass className="w-4 h-4 text-emerald-300" />
                <span>Launch Interactive Demo</span>
              </button>
            </div>
          </div>
        </section>
      </main>

      {/* FOOTER */}
      <footer className="border-t border-slate-200/80 bg-white py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
          <div className="flex items-center gap-2.5 font-medium text-slate-700">
            <PennyWiseLogo variant="symbol" size={20} />
            <span className="font-semibold text-slate-900 tracking-tight">PennyWise AI</span>
            <span aria-hidden="true" className="text-slate-300">·</span>
            <span className="text-emerald-800 font-medium">Your money. Your goals. Your smarter future.</span>
          </div>
          <div className="text-[11px] text-slate-400 text-center sm:text-right">
            Educational budgeting assistant · You always make the final financial decision.
          </div>
        </div>
      </footer>

      {/* ========================================================= */}
      {/* AUTHENTICATION MODAL DIALOG (SIGN IN / CREATE ACCOUNT / FORGOT) */}
      {/* ========================================================= */}
      {authModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-150"
          onClick={(e) => {
            if (e.target === e.currentTarget) handleCloseModal();
          }}
        >
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-md overflow-hidden relative animate-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="px-6 pt-6 pb-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <PennyWiseLogo variant="symbol" size={24} />
                <span className="font-bold text-slate-900 text-base">PennyWise AI</span>
              </div>
              <button
                type="button"
                onClick={handleCloseModal}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                aria-label="Close dialog"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* Tabs: Sign In vs Create Account (Hidden during forgot mode) */}
              {authMode !== 'forgot' && (
                <div className="flex items-center gap-1 bg-slate-100/90 p-1 rounded-xl">
                  <button
                    type="button"
                    onClick={() => {
                      setAuthMode('signin');
                      setLocalError(null);
                      setLocalSuccess(null);
                    }}
                    className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                      authMode === 'signin'
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-500 hover:text-slate-900'
                    }`}
                  >
                    Sign In
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setAuthMode('signup');
                      setLocalError(null);
                      setLocalSuccess(null);
                    }}
                    className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                      authMode === 'signup'
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-500 hover:text-slate-900'
                    }`}
                  >
                    Create Account
                  </button>
                </div>
              )}

              {/* Status and Error Banners */}
              {activeError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <span className="flex-1 leading-relaxed">{activeError}</span>
                </div>
              )}

              {(localSuccess || successMessage) && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span className="flex-1 leading-relaxed">{localSuccess || successMessage}</span>
                </div>
              )}

              {/* Action 1: Google Sign-In */}
              {authMode !== 'forgot' && (
                <>
                  <button
                    type="button"
                    onClick={handleGoogleSignIn}
                    disabled={loading}
                    className="w-full py-2.5 px-4 text-xs font-semibold text-slate-800 bg-white hover:bg-slate-50/90 border border-slate-300 rounded-xl shadow-2xs transition-all flex items-center justify-center gap-2.5 cursor-pointer disabled:opacity-50"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24">
                      <path
                        fill="#4285F4"
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      />
                      <path
                        fill="#34A853"
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                      />
                      <path
                        fill="#EA4335"
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                      />
                    </svg>
                    <span>Continue with Google</span>
                  </button>

                  <div className="relative my-2">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-slate-200" />
                    </div>
                    <div className="relative flex justify-center text-[11px] text-slate-400">
                      <span className="bg-white px-2 uppercase font-medium">Or continue with email</span>
                    </div>
                  </div>
                </>
              )}

              {/* Form Content */}
              <form onSubmit={handleSubmit} className="space-y-3.5">
                {authMode === 'forgot' ? (
                  <>
                    <div className="space-y-1">
                      <h3 className="text-sm font-bold text-slate-900">Reset your password</h3>
                      <p className="text-xs text-slate-500">
                        Enter your registered email and we'll send you instructions to reset your password.
                      </p>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Email Address
                      </label>
                      <div className="relative">
                        <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
                        <input
                          type="email"
                          required
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="name@example.com"
                          className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 bg-white"
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full py-2.5 px-4 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg shadow-xs transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
                    >
                      {loading ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Sending Reset Link...</span>
                        </>
                      ) : (
                        <span>Send Password Reset Link</span>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => setAuthMode('signin')}
                      className="w-full text-center text-xs text-slate-500 hover:text-slate-800 font-medium pt-1 cursor-pointer"
                    >
                      Back to Sign In
                    </button>
                  </>
                ) : (
                  <>
                    {authMode === 'signup' && (
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Full Name
                        </label>
                        <div className="relative">
                          <UserIcon className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
                          <input
                            type="text"
                            required
                            value={fullName}
                            onChange={(e) => setFullName(e.target.value)}
                            placeholder="Alex Morgan"
                            className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 bg-white"
                          />
                        </div>
                      </div>
                    )}

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Email Address
                      </label>
                      <div className="relative">
                        <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
                        <input
                          type="email"
                          required
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="name@example.com"
                          className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 bg-white"
                        />
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-xs font-semibold text-slate-700">Password</label>
                        {authMode === 'signin' && (
                          <button
                            type="button"
                            onClick={() => {
                              setAuthMode('forgot');
                              setLocalError(null);
                            }}
                            className="text-[11px] font-medium text-emerald-700 hover:text-emerald-800 cursor-pointer"
                          >
                            Forgot password?
                          </button>
                        )}
                      </div>
                      <div className="relative">
                        <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
                        <input
                          type={showPassword ? 'text' : 'password'}
                          required
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="••••••••"
                          className="w-full pl-9 pr-10 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 bg-white"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                          aria-label={showPassword ? 'Hide password' : 'Show password'}
                        >
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    {authMode === 'signup' && (
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Confirm Password
                        </label>
                        <div className="relative">
                          <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
                          <input
                            type={showPassword ? 'text' : 'password'}
                            required
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            placeholder="••••••••"
                            className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 bg-white"
                          />
                        </div>
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full py-2.5 px-4 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg shadow-xs transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 mt-2"
                    >
                      {loading ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>{authMode === 'signup' ? 'Creating Account...' : 'Signing In...'}</span>
                        </>
                      ) : (
                        <span>{authMode === 'signup' ? 'Create Account & Continue' : 'Sign In to Dashboard'}</span>
                      )}
                    </button>
                  </>
                )}
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
