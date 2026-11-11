import React, { useState } from 'react';
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

  const [mode, setMode] = useState<'signin' | 'signup' | 'forgot'>('signin');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [localSuccess, setLocalSuccess] = useState<string | null>(null);

  const activeError = localError || globalError;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    setLocalSuccess(null);
    clearError();
    clearSuccess();

    if (mode === 'forgot') {
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

    if (mode === 'signup') {
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
      } catch (err: any) {
        setLocalError(err?.message || 'Failed to create account.');
      } finally {
        setLoading(false);
      }
      return;
    }

    // mode === 'signin'
    if (!email || !password) {
      setLocalError('Please provide both email and password.');
      return;
    }
    setLoading(true);
    try {
      await signInWithEmail(email, password);
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
    } catch (err: any) {
      setLocalError(err?.message || 'Could not complete Google Sign-In.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FBFBFA] flex flex-col justify-between text-slate-900 font-sans selection:bg-emerald-100 selection:text-emerald-900">
      {/* Top Subtle Navigation */}
      <header className="w-full border-b border-slate-200/80 bg-white/80 backdrop-blur-md sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <PennyWiseLogo variant="full" size={34} />

          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={startDemoMode}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100/80 border border-emerald-200/80 rounded-lg transition-colors cursor-pointer"
            >
              <Compass className="w-3.5 h-3.5 text-emerald-600" />
              <span>Explore Demo</span>
            </button>
            <button
              onClick={() => {
                setMode('signin');
                setLocalError(null);
              }}
              className="hidden sm:inline-flex items-center px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
            >
              Sign In
            </button>
            <button
              onClick={() => {
                setMode('signup');
                setLocalError(null);
              }}
              className="px-3 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg shadow-xs transition-colors cursor-pointer"
            >
              Get Started
            </button>
          </div>
        </div>
      </header>

      {/* Main Split-Screen Section */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 lg:py-14 flex items-center">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center w-full">
          {/* Left Column: Brand, Vision, Live Preview & Benefit Highlights */}
          <div className="lg:col-span-7 space-y-6">
            <div className="space-y-3">
              <div className="inline-flex items-center gap-2 text-xs font-semibold text-emerald-800 bg-emerald-50/90 border border-emerald-200/70 px-3 py-1 rounded-full">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
                <span>Next-Generation Personal Finance Companion</span>
              </div>
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-slate-900 tracking-tight leading-[1.15]">
                Your money. Your goals. <br />
                <span className="text-emerald-700">Your smarter future.</span>
              </h1>
              <p className="text-base sm:text-lg text-slate-600 max-w-xl leading-relaxed">
                PennyWise AI helps you understand your spending in real time. Manage adaptive daily allowances, verify purchase affordability with Gemini AI, and reach your savings goals with total confidence.
              </p>
            </div>

            {/* Interactive Preview Card: Mini Dashboard Showcase */}
            <div className="p-5 bg-white rounded-2xl border border-slate-200/90 shadow-sm space-y-4 max-w-xl">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                  <span className="text-xs font-bold text-slate-800">Live Financial Snapshot</span>
                  <span className="text-xs text-slate-400">·</span>
                  <span className="text-xs text-slate-500 font-medium">October Cycle</span>
                </div>
                <span className="text-xs font-mono font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                  USD ($)
                </span>
              </div>

              {/* 3 Metric Cards */}
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 bg-slate-50/80 rounded-xl border border-slate-100">
                  <span className="text-[11px] text-slate-500 block">Today's Allowance</span>
                  <span className="text-base sm:text-lg font-bold font-mono text-emerald-800 mt-0.5 block">
                    $48.50<span className="text-xs font-normal text-slate-500">/day</span>
                  </span>
                  <span className="text-[10px] text-emerald-700 font-medium">Adapts daily</span>
                </div>

                <div className="p-3 bg-slate-50/80 rounded-xl border border-slate-100">
                  <span className="text-[11px] text-slate-500 block">Flexible Budget</span>
                  <span className="text-base sm:text-lg font-bold font-mono text-slate-900 mt-0.5 block">
                    $1,164.00
                  </span>
                  <span className="text-[10px] text-slate-500 font-medium">24 days left</span>
                </div>

                <div className="p-3 bg-slate-50/80 rounded-xl border border-slate-100">
                  <span className="text-[11px] text-slate-500 block">Savings Target</span>
                  <span className="text-base sm:text-lg font-bold font-mono text-teal-800 mt-0.5 block">
                    $750.00
                  </span>
                  <span className="text-[10px] text-emerald-700 font-medium">100% Protected</span>
                </div>
              </div>

              {/* AI Insight Teaser */}
              <div className="p-3 bg-emerald-50/60 rounded-xl border border-emerald-100 flex items-start gap-2.5 text-xs text-slate-700">
                <Sparkles className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <span className="font-semibold text-emerald-950 block">Gemini Companion Insight</span>
                  <p className="text-slate-600 text-[11px] leading-relaxed">
                    "You are pacing comfortably under your daily allowance. Keeping your dining discretionary spend under $50 this weekend keeps your Vacation Goal right on target."
                  </p>
                </div>
              </div>
            </div>

            {/* Feature Highlights List */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-xl pt-1">
              <div className="flex items-start gap-2.5 text-xs text-slate-700">
                <Calculator className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
                <div>
                  <strong className="font-semibold text-slate-900 block">Smart Budgeting</strong>
                  <span className="text-slate-500">Self-adjusting daily allowances that recalculate automatically.</span>
                </div>
              </div>

              <div className="flex items-start gap-2.5 text-xs text-slate-700">
                <Sparkles className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
                <div>
                  <strong className="font-semibold text-slate-900 block">AI Financial Companion</strong>
                  <span className="text-slate-500">Conversational guidance backed strictly by backend figures.</span>
                </div>
              </div>

              <div className="flex items-start gap-2.5 text-xs text-slate-700">
                <TrendingUp className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
                <div>
                  <strong className="font-semibold text-slate-900 block">Purchase Impact Analyzer</strong>
                  <span className="text-slate-500">Preview affordability verdicts before you spend a single dollar.</span>
                </div>
              </div>

              <div className="flex items-start gap-2.5 text-xs text-slate-700">
                <CreditCard className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
                <div>
                  <strong className="font-semibold text-slate-900 block">PayPal Sandbox Checkout</strong>
                  <span className="text-slate-500">Real order capture simulation with server price enforcement.</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Clean Authentication & Try Demo Card */}
          <div className="lg:col-span-5">
            <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200/90 shadow-md space-y-5">
              {/* Top Navigation Tabs: Sign In vs Create Account */}
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-1 bg-slate-100/80 p-1 rounded-xl w-full">
                  <button
                    type="button"
                    onClick={() => {
                      setMode('signin');
                      setLocalError(null);
                      setLocalSuccess(null);
                    }}
                    className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                      mode === 'signin'
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-500 hover:text-slate-900'
                    }`}
                  >
                    1. Sign In
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setMode('signup');
                      setLocalError(null);
                      setLocalSuccess(null);
                    }}
                    className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                      mode === 'signup'
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-500 hover:text-slate-900'
                    }`}
                  >
                    2. Create Account
                  </button>
                </div>
              </div>

              {/* Status & Error Alerts */}
              {activeError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <span className="flex-1">{activeError}</span>
                </div>
              )}

              {(localSuccess || successMessage) && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span className="flex-1">{localSuccess || successMessage}</span>
                </div>
              )}

              {/* Form Content */}
              <form onSubmit={handleSubmit} className="space-y-3.5">
                {mode === 'forgot' ? (
                  <>
                    <div className="space-y-1">
                      <h2 className="text-base font-bold text-slate-900">Reset your password</h2>
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
                      onClick={() => setMode('signin')}
                      className="w-full text-center text-xs text-slate-500 hover:text-slate-800 font-medium pt-1 cursor-pointer"
                    >
                      Back to Sign In
                    </button>
                  </>
                ) : (
                  <>
                    {mode === 'signup' && (
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
                        {mode === 'signin' && (
                          <button
                            type="button"
                            onClick={() => {
                              setMode('forgot');
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

                    {mode === 'signup' && (
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
                      className="w-full py-2.5 px-4 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg shadow-xs transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
                    >
                      {loading ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Processing...</span>
                        </>
                      ) : (
                        <>
                          <span>{mode === 'signin' ? 'Sign In to PennyWise' : 'Create Account'}</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </>
                      )}
                    </button>
                  </>
                )}
              </form>

              {/* Social Login Separator */}
              {mode !== 'forgot' && (
                <div className="space-y-3.5">
                  <div className="relative flex items-center justify-center">
                    <div className="border-t border-slate-200 w-full" />
                    <span className="bg-white px-3 text-[11px] uppercase tracking-wider text-slate-400 font-semibold absolute">
                      or
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={handleGoogleSignIn}
                    disabled={loading}
                    className="w-full py-2.5 px-4 text-xs font-semibold text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg transition-colors flex items-center justify-center gap-2.5 cursor-pointer shadow-xs disabled:opacity-60"
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
                </div>
              )}

              {/* Action 3: Try Demo Button (Prominently styled and discoverable) */}
              <div className="pt-3 border-t border-slate-100">
                <div className="p-3.5 bg-gradient-to-br from-emerald-50/90 to-teal-50/70 border border-emerald-200/80 rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-emerald-950 flex items-center gap-1.5">
                      <Compass className="w-3.5 h-3.5 text-emerald-700" />
                      <span>3. Try Demo Mode</span>
                    </span>
                    <span className="text-[10px] font-semibold text-emerald-800 bg-emerald-100/80 px-2 py-0.5 rounded-full">
                      Instant Access
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-600 leading-relaxed">
                    Test the complete dashboard, adaptive daily allowances, AI assistant, and purchase analyzer with realistic sample financial data — no account required.
                  </p>
                  <button
                    type="button"
                    onClick={startDemoMode}
                    className="w-full py-2 px-3 text-xs font-semibold text-emerald-900 bg-white hover:bg-emerald-50/80 border border-emerald-300 rounded-lg shadow-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <span>Launch Interactive Demo</span>
                    <ChevronRight className="w-3.5 h-3.5 text-emerald-700" />
                  </button>
                </div>
              </div>

              {/* Security & Privacy Reassurance */}
              <div className="flex items-center gap-2 pt-1 text-[11px] text-slate-400 justify-center">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>Private Firestore Storage · Educational Budgeting Assistance</span>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Quiet, Minimalist Footer */}
      <footer className="border-t border-slate-200/80 bg-white/70 py-4">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
          <div className="flex items-center gap-2.5 font-medium text-slate-700">
            <PennyWiseLogo variant="symbol" size={20} />
            <span className="font-semibold text-slate-900 tracking-tight">PennyWise AI</span>
            <span aria-hidden="true" className="text-slate-300">·</span>
            <span className="text-emerald-800 font-medium">Your money. Your goals. Your smarter future.</span>
          </div>
          <div className="text-[11px] text-slate-400">
            Educational budgeting assistant. Never prompts for bank credentials or sensitive payment details.
          </div>
        </div>
      </footer>
    </div>
  );
};
