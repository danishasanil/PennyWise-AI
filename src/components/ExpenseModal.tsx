import React, { useState, useEffect } from 'react';
import { useFinance } from '../context/FinanceContext';
import { Expense, ExpenseCategory, EXPENSE_CATEGORIES, TransactionStatus, TransactionSource } from '../types/finance';
import { api } from '../services/api';
import { X, Sparkles, Check, Loader2, AlertCircle } from 'lucide-react';

interface ExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialExpense?: Expense | null;
}

export const ExpenseModal: React.FC<ExpenseModalProps> = ({
  isOpen,
  onClose,
  initialExpense,
}) => {
  const { addExpense, updateExpense, profile, formatMoney } = useFinance();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState<ExpenseCategory>('Food');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [paymentMethod, setPaymentMethod] = useState('Credit Card');
  const [status, setStatus] = useState<TransactionStatus>('completed');
  const [source, setSource] = useState<TransactionSource>('manual');
  const [notes, setNotes] = useState('');
  const [isEssential, setIsEssential] = useState(false);

  // Gemini category suggestion state
  const [suggestingCategory, setSuggestingCategory] = useState(false);
  const [aiSuggestionNotice, setAiSuggestionNotice] = useState<string | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Populate or reset form whenever modal opens or initialExpense changes
  useEffect(() => {
    if (initialExpense) {
      setTitle(initialExpense.title || '');
      setDescription(initialExpense.description || initialExpense.title || '');
      setAmount(initialExpense.amount ? String(initialExpense.amount) : '');
      setCategory(initialExpense.category || 'Food');
      setDate(initialExpense.date || new Date().toISOString().split('T')[0]);
      setPaymentMethod(initialExpense.paymentMethod || 'Credit Card');
      setStatus(initialExpense.status || 'completed');
      setSource(initialExpense.source || 'manual');
      setNotes(initialExpense.notes || '');
      setIsEssential(Boolean(initialExpense.isEssential));
    } else {
      setTitle('');
      setDescription('');
      setAmount('');
      setCategory('Food');
      setDate(new Date().toISOString().split('T')[0]);
      setPaymentMethod('Credit Card');
      setStatus('completed');
      setSource('manual');
      setNotes('');
      setIsEssential(false);
    }
    setErrorMsg('');
    setAiSuggestionNotice(null);
  }, [initialExpense, isOpen]);

  if (!isOpen) return null;

  // Trigger Gemini AI suggestion for ambiguous descriptions
  const handleAiSuggestCategory = async () => {
    const text = (title.trim() || description.trim());
    if (!text) {
      setErrorMsg('Please enter a description or vendor title first to suggest a category.');
      return;
    }

    setSuggestingCategory(true);
    setAiSuggestionNotice(null);
    try {
      const res = await api.suggestCategory(title.trim(), description.trim());
      if (res && res.category) {
        setCategory(res.category as ExpenseCategory);
        setAiSuggestionNotice(`Gemini suggested: ${res.category} (${res.reasoning})`);
      }
    } catch (err: any) {
      console.warn('AI suggestion failed:', err);
    } finally {
      setSuggestingCategory(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    const numAmount = parseFloat(amount);
    if (!title.trim()) {
      setErrorMsg('Please enter a description or vendor title.');
      return;
    }
    if (isNaN(numAmount) || numAmount <= 0) {
      setErrorMsg('Please enter a valid amount greater than zero.');
      return;
    }

    setSubmitting(true);
    try {
      const activeCurrency = profile?.preferredCurrency || 'USD';
      if (initialExpense) {
        await updateExpense({
          ...initialExpense,
          title: title.trim(),
          description: (description.trim() || title.trim()),
          amount: numAmount,
          currency: initialExpense.currency || activeCurrency,
          category,
          date,
          paymentMethod,
          status,
          source,
          notes: notes.trim(),
          isEssential,
        });
      } else {
        await addExpense({
          userId: profile?.id || 'local',
          title: title.trim(),
          description: (description.trim() || title.trim()),
          amount: numAmount,
          currency: activeCurrency,
          category,
          date,
          paymentMethod,
          status,
          source,
          notes: notes.trim(),
          isEssential,
        });
      }
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to save expense. Please verify inputs.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs overflow-y-auto">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden my-6">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              {initialExpense ? 'Edit Transaction' : 'Record New Expense'}
            </h2>
            <p className="text-[11px] text-slate-500">
              {initialExpense ? `Transaction ID: ${initialExpense.id}` : 'Backend verified and logged with unique ID'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {errorMsg && (
            <div className="p-3 text-xs font-medium text-rose-700 bg-rose-50 border border-rose-200 rounded-lg flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Title / Description with Gemini Assistant Action */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-semibold text-slate-700">
                Description / Vendor Title *
              </label>
              <button
                type="button"
                onClick={handleAiSuggestCategory}
                disabled={suggestingCategory || !title.trim()}
                className="inline-flex items-center gap-1 text-[11px] font-semibold text-purple-700 hover:text-purple-900 bg-purple-50 hover:bg-purple-100 border border-purple-200 px-2 py-0.5 rounded transition-colors disabled:opacity-50"
                title="Ask Gemini to predict best spending category"
              >
                {suggestingCategory ? (
                  <Loader2 className="w-3 h-3 animate-spin text-purple-600" />
                ) : (
                  <Sparkles className="w-3 h-3 text-purple-600" />
                )}
                <span>Suggest Category with Gemini</span>
              </button>
            </div>
            <input
              type="text"
              required
              placeholder="e.g. Trader Joe's Groceries, Uber to Airport, Netflix"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
            />
          </div>

          {aiSuggestionNotice && (
            <div className="p-2.5 text-xs bg-purple-50 border border-purple-200 text-purple-950 rounded-lg flex items-center justify-between">
              <span className="flex items-center gap-1.5 font-medium">
                <Sparkles className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                <span>{aiSuggestionNotice}</span>
              </span>
              <button
                type="button"
                onClick={() => setAiSuggestionNotice(null)}
                className="text-[10px] text-purple-600 hover:underline"
              >
                Dismiss
              </button>
            </div>
          )}

          {/* Amount & Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Amount ({profile?.preferredCurrency || 'USD'}) *
              </label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                required
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full px-3 py-2 text-sm font-mono tabular-nums rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Date *</label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
              />
            </div>
          </div>

          {/* Category & Payment Method */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Category (11 Required) *
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
                Payment Method
              </label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
              >
                <option value="Credit Card">Credit Card</option>
                <option value="Debit Card">Debit Card</option>
                <option value="Cash">Cash</option>
                <option value="Apple Pay / Google Pay">Apple Pay / Google Pay</option>
                <option value="PayPal">PayPal</option>
                <option value="Bank Transfer">Bank Transfer</option>
              </select>
            </div>
          </div>

          {/* Status & Source Metadata */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Transaction Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as TransactionStatus)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
              >
                <option value="completed">Completed</option>
                <option value="pending">Pending</option>
                <option value="cleared">Cleared</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Source
              </label>
              <select
                value={source}
                onChange={(e) => setSource(e.target.value as TransactionSource)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
              >
                <option value="manual">Manual Entry</option>
                <option value="PayPal">PayPal</option>
              </select>
            </div>
          </div>

          {/* Essential vs Flexible Toggle */}
          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 flex items-center justify-between">
            <div>
              <div className="text-xs font-semibold text-slate-800">Essential Fixed Cost</div>
              <div className="text-[11px] text-slate-500">
                Essential items do not deplete your remaining flexible daily spending allowance.
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsEssential(!isEssential)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                isEssential ? 'bg-emerald-600' : 'bg-slate-300'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  isEssential ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Optional Notes or Tags
            </label>
            <textarea
              rows={2}
              placeholder="e.g. Dinner with team, bought on discount, receipt #123"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
            />
          </div>

          <div className="pt-2 flex justify-end gap-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-700 hover:text-slate-900"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg shadow-xs transition-colors flex items-center gap-1.5"
            >
              {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>{submitting ? 'Validating & Saving...' : initialExpense ? 'Update Transaction' : 'Record Transaction'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
