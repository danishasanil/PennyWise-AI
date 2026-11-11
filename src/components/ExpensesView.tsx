import React, { useState, useMemo } from 'react';
import { useFinance } from '../context/FinanceContext';
import { Expense, ExpenseCategory, EXPENSE_CATEGORIES } from '../types/finance';
import {
  Search,
  Plus,
  Filter,
  Trash2,
  Edit2,
  Receipt,
  ArrowUpDown,
  Tag,
  Calendar,
  DollarSign,
  PieChart,
  SlidersHorizontal,
  RotateCcw,
  ShieldCheck,
  CheckCircle,
  Clock,
} from 'lucide-react';
import { ExpenseModal } from './ExpenseModal';
import { formatCurrencyWithIntl } from '../data/internationalData';

export const ExpensesView: React.FC = () => {
  const { expenses, deleteExpense, formatMoney, profile } = useFinance();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedType, setSelectedType] = useState<'all' | 'flexible' | 'essential'>('all');
  const [selectedSource, setSelectedSource] = useState<'all' | 'manual' | 'PayPal'>('all');
  const [selectedStatus, setSelectedStatus] = useState<'all' | 'completed' | 'pending' | 'cleared'>('all');

  // Date filters
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Amount filters
  const [minAmount, setMinAmount] = useState('');
  const [maxAmount, setMaxAmount] = useState('');

  // Sorting
  const [sortBy, setSortBy] = useState<'date' | 'amount' | 'title'>('date');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);

  // Filtered & sorted expenses
  const filteredExpenses = useMemo(() => {
    return expenses
      .filter((exp) => {
        // Search filter (description, title, notes, category, id)
        const query = searchQuery.trim().toLowerCase();
        const matchesSearch =
          !query ||
          exp.title.toLowerCase().includes(query) ||
          (exp.description && exp.description.toLowerCase().includes(query)) ||
          (exp.notes && exp.notes.toLowerCase().includes(query)) ||
          exp.category.toLowerCase().includes(query) ||
          exp.id.toLowerCase().includes(query);

        // Category filter
        const matchesCategory =
          selectedCategory === 'all' || exp.category === selectedCategory;

        // Essential vs Flexible type filter
        const matchesType =
          selectedType === 'all' ||
          (selectedType === 'essential' && exp.isEssential) ||
          (selectedType === 'flexible' && !exp.isEssential);

        // Source filter (manual vs PayPal)
        const matchesSource =
          selectedSource === 'all' || exp.source === selectedSource;

        // Status filter
        const matchesStatus =
          selectedStatus === 'all' || exp.status === selectedStatus;

        // Date range filter
        let matchesDate = true;
        if (startDate && exp.date < startDate) matchesDate = false;
        if (endDate && exp.date > endDate) matchesDate = false;

        // Amount range filter
        let matchesAmount = true;
        const numAmt = Number(exp.amount);
        const minAmt = parseFloat(minAmount);
        const maxAmt = parseFloat(maxAmount);
        if (!isNaN(minAmt) && numAmt < minAmt) matchesAmount = false;
        if (!isNaN(maxAmt) && numAmt > maxAmt) matchesAmount = false;

        return (
          matchesSearch &&
          matchesCategory &&
          matchesType &&
          matchesSource &&
          matchesStatus &&
          matchesDate &&
          matchesAmount
        );
      })
      .sort((a, b) => {
        if (sortBy === 'date') {
          const diff = new Date(b.date).getTime() - new Date(a.date).getTime();
          return sortOrder === 'desc' ? diff : -diff;
        } else if (sortBy === 'amount') {
          const diff = Number(b.amount) - Number(a.amount);
          return sortOrder === 'desc' ? diff : -diff;
        } else {
          const diff = a.title.localeCompare(b.title);
          return sortOrder === 'desc' ? -diff : diff;
        }
      });
  }, [
    expenses,
    searchQuery,
    selectedCategory,
    selectedType,
    selectedSource,
    selectedStatus,
    startDate,
    endDate,
    minAmount,
    maxAmount,
    sortBy,
    sortOrder,
  ]);

  // Total spending calculations
  const totalSpending = useMemo(() => {
    return expenses.reduce((sum, e) => sum + Number(e.amount), 0);
  }, [expenses]);

  const filteredTotalSpending = useMemo(() => {
    return filteredExpenses.reduce((sum, e) => sum + Number(e.amount), 0);
  }, [filteredExpenses]);

  // Category-wise spending breakdown
  const categorySpending = useMemo(() => {
    const map: Record<string, { total: number; count: number }> = {};
    EXPENSE_CATEGORIES.forEach((cat) => {
      map[cat] = { total: 0, count: 0 };
    });

    expenses.forEach((e) => {
      if (!map[e.category]) {
        map[e.category] = { total: 0, count: 0 };
      }
      map[e.category].total += Number(e.amount);
      map[e.category].count += 1;
    });

    return Object.entries(map)
      .map(([cat, val]) => ({
        category: cat as ExpenseCategory,
        total: val.total,
        count: val.count,
        percent: totalSpending > 0 ? (val.total / totalSpending) * 100 : 0,
      }))
      .sort((a, b) => b.total - a.total);
  }, [expenses, totalSpending]);

  const activeFiltersCount = [
    selectedCategory !== 'all',
    selectedType !== 'all',
    selectedSource !== 'all',
    selectedStatus !== 'all',
    Boolean(startDate),
    Boolean(endDate),
    Boolean(minAmount),
    Boolean(maxAmount),
    Boolean(searchQuery),
  ].filter(Boolean).length;

  const handleResetFilters = () => {
    setSearchQuery('');
    setSelectedCategory('all');
    setSelectedType('all');
    setSelectedSource('all');
    setSelectedStatus('all');
    setStartDate('');
    setEndDate('');
    setMinAmount('');
    setMaxAmount('');
    setSortBy('date');
    setSortOrder('desc');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Expense Tracking & History
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Log, categorize, search, and analyze your real purchases with backend deterministic validation.
          </p>
        </div>

        <button
          onClick={() => {
            setEditingExpense(null);
            setIsModalOpen(true);
          }}
          className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg shadow-xs transition-colors shrink-0"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Record Expense</span>
        </button>
      </div>

      {/* KPI & Summary Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-xs">
          <div className="text-slate-500 text-xs font-medium">Total Lifetime Spending</div>
          <div className="text-xl font-bold font-mono tabular-nums text-slate-900 mt-1">
            {formatMoney(totalSpending)}
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">
            {expenses.length} total logged record{expenses.length === 1 ? '' : 's'}
          </div>
        </div>

        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-xs">
          <div className="text-slate-500 text-xs font-medium">Filtered Spending Subtotal</div>
          <div className="text-xl font-bold font-mono tabular-nums text-emerald-800 mt-1">
            {formatMoney(filteredTotalSpending)}
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">
            {filteredExpenses.length} matching transaction{filteredExpenses.length === 1 ? '' : 's'}
          </div>
        </div>

        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-xs">
          <div className="text-slate-500 text-xs font-medium">Top Spending Category</div>
          <div className="text-base font-bold text-slate-800 truncate mt-1">
            {categorySpending[0]?.total > 0 ? categorySpending[0].category : 'No data'}
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">
            {categorySpending[0]?.total > 0
              ? `${formatMoney(categorySpending[0].total)} (${categorySpending[0].percent.toFixed(0)}%)`
              : 'Log expenses to see breakdown'}
          </div>
        </div>

        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-xs">
          <div className="text-slate-500 text-xs font-medium">PayPal Sandbox vs Manual</div>
          <div className="text-sm font-semibold text-slate-800 mt-1 flex items-center gap-2">
            <span className="text-sky-700">
              PayPal: {expenses.filter((e) => e.source === 'PayPal').length}
            </span>
            <span className="text-slate-300">|</span>
            <span className="text-slate-600">
              Manual: {expenses.filter((e) => e.source === 'manual').length}
            </span>
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">Verified backend origin</div>
        </div>
      </div>

      {/* Category-Wise Spending Grid */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <PieChart className="w-4 h-4 text-emerald-600" />
            <span>Category-Wise Spending Breakdown</span>
          </h2>
          <span className="text-xs text-slate-400">11 Official Spending Categories</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 pt-1">
          {categorySpending.map((cat) => {
            const hasSpending = cat.total > 0;
            return (
              <div
                key={cat.category}
                onClick={() => {
                  setSelectedCategory(
                    selectedCategory === cat.category ? 'all' : cat.category
                  );
                }}
                className={`p-2.5 rounded-lg border cursor-pointer transition-all ${
                  selectedCategory === cat.category
                    ? 'border-emerald-600 bg-emerald-50/70 shadow-xs'
                    : hasSpending
                    ? 'border-slate-200 bg-slate-50/50 hover:bg-slate-100/60'
                    : 'border-slate-100 bg-white opacity-70 hover:opacity-100'
                }`}
              >
                <div className="flex items-center justify-between text-xs font-semibold text-slate-800">
                  <span className="truncate">{cat.category}</span>
                  {selectedCategory === cat.category && (
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
                  )}
                </div>
                <div className="text-xs font-mono font-bold text-slate-900 mt-1">
                  {formatMoney(cat.total)}
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5 flex justify-between items-center">
                  <span>{cat.count} tx</span>
                  <span>{cat.percent.toFixed(0)}%</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Comprehensive Filtering & Search Toolbar */}
      <div className="p-5 bg-white rounded-xl border border-slate-200 shadow-xs space-y-4">
        {/* Row 1: Search & Reset */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search description, vendor title, notes, category, or transaction ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
            />
          </div>

          <div className="flex items-center gap-2">
            {activeFiltersCount > 0 && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="inline-flex items-center gap-1 px-3 py-2 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset Filters ({activeFiltersCount})</span>
              </button>
            )}

            {/* Sort Toggle */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg text-xs">
              <span className="text-[11px] text-slate-500 px-1 font-medium">Sort:</span>
              <button
                onClick={() => setSortBy('date')}
                className={`px-2 py-1 rounded font-medium ${
                  sortBy === 'date' ? 'bg-white shadow-xs text-slate-900 font-semibold' : 'text-slate-600'
                }`}
              >
                Date
              </button>
              <button
                onClick={() => setSortBy('amount')}
                className={`px-2 py-1 rounded font-medium ${
                  sortBy === 'amount' ? 'bg-white shadow-xs text-slate-900 font-semibold' : 'text-slate-600'
                }`}
              >
                Amount
              </button>
              <button
                onClick={() => setSortBy('title')}
                className={`px-2 py-1 rounded font-medium ${
                  sortBy === 'title' ? 'bg-white shadow-xs text-slate-900 font-semibold' : 'text-slate-600'
                }`}
              >
                Title
              </button>
              <button
                onClick={() => setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')}
                className="p-1 text-slate-600 hover:text-slate-900 ml-1"
                title={`Order: ${sortOrder.toUpperCase()}`}
              >
                <ArrowUpDown className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Row 2: Category, Date, Amount, Source & Status Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 pt-2 border-t border-slate-100 text-xs">
          {/* Category Filter */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">
              Category
            </label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-700 focus:outline-none"
            >
              <option value="all">All Categories</option>
              {EXPENSE_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          {/* Type Filter */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">
              Budget Type
            </label>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value as any)}
              className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-700 focus:outline-none"
            >
              <option value="all">All Types</option>
              <option value="flexible">Flexible (Daily Allowance)</option>
              <option value="essential">Essential (Fixed Base)</option>
            </select>
          </div>

          {/* Start Date */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">
              From Date
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-700 focus:outline-none"
            />
          </div>

          {/* End Date */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">
              To Date
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-700 focus:outline-none"
            />
          </div>

          {/* Amount Range */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">
              Min Amount
            </label>
            <input
              type="number"
              min="0"
              placeholder="0.00"
              value={minAmount}
              onChange={(e) => setMinAmount(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-700 focus:outline-none font-mono"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">
              Max Amount
            </label>
            <input
              type="number"
              min="0"
              placeholder="No max"
              value={maxAmount}
              onChange={(e) => setMaxAmount(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-700 focus:outline-none font-mono"
            />
          </div>
        </div>
      </div>

      {/* Transaction History Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        {filteredExpenses.length === 0 ? (
          <div className="py-16 text-center text-slate-500 space-y-3">
            <Receipt className="w-10 h-10 text-slate-300 mx-auto" />
            <div className="text-sm font-semibold text-slate-700">No transactions found</div>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              {expenses.length === 0
                ? 'You have not logged any expenses yet. Click "Record Expense" to get started!'
                : 'No transactions matched your current search and filter settings.'}
            </p>
            {expenses.length === 0 && (
              <button
                onClick={() => {
                  setEditingExpense(null);
                  setIsModalOpen(true);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Log First Expense</span>
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/70 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="px-4 py-3">Transaction ID / Description</th>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Method & Source</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Amount</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredExpenses.map((exp) => (
                  <tr key={exp.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-4 py-3 font-medium text-slate-900">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-900">{exp.title}</span>
                        {exp.source === 'PayPal' && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded font-mono font-bold bg-sky-50 text-sky-700 border border-sky-200">
                            PayPal
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-0.5">
                        <span className="font-mono">ID: {exp.id}</span>
                        {exp.notes && (
                          <>
                            <span>•</span>
                            <span className="truncate max-w-xs">{exp.notes}</span>
                          </>
                        )}
                      </div>
                    </td>

                    <td className="px-4 py-3">
                      <span className="font-semibold text-slate-800">{exp.category}</span>
                      <span className="ml-1.5 text-[10px] text-slate-400">
                        {exp.isEssential ? '(Essential)' : '(Flexible)'}
                      </span>
                    </td>

                    <td className="px-4 py-3 text-slate-600 font-mono tabular-nums whitespace-nowrap">
                      {exp.date}
                    </td>

                    <td className="px-4 py-3 text-slate-600">
                      <div>{exp.paymentMethod || 'Credit Card'}</div>
                      <div className="text-[10px] text-slate-400 capitalize">
                        Source: {exp.source || 'manual'}
                      </div>
                    </td>

                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full capitalize ${
                          exp.status === 'completed' || exp.status === 'cleared'
                            ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                            : 'bg-amber-50 text-amber-800 border border-amber-200'
                        }`}
                      >
                        <CheckCircle className="w-2.5 h-2.5" />
                        <span>{exp.status || 'completed'}</span>
                      </span>
                    </td>

                    <td className="px-4 py-3 text-right font-mono tabular-nums font-bold text-slate-900 whitespace-nowrap">
                      -{formatCurrencyWithIntl(exp.amount, exp.currency || profile?.preferredCurrency || 'USD')}
                    </td>

                    <td className="px-4 py-3 text-right space-x-1 whitespace-nowrap">
                      <button
                        onClick={() => {
                          setEditingExpense(exp);
                          setIsModalOpen(true);
                        }}
                        className="p-1.5 text-slate-400 hover:text-slate-700 rounded hover:bg-slate-100 transition-colors"
                        title="Edit Expense"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={async () => {
                          if (confirm(`Delete transaction "${exp.title}"?`)) {
                            await deleteExpense(exp.id);
                          }
                        }}
                        className="p-1.5 text-slate-400 hover:text-rose-600 rounded hover:bg-rose-50 transition-colors"
                        title="Delete Expense"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Expense Modal (Add / Edit) */}
      <ExpenseModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingExpense(null);
        }}
        initialExpense={editingExpense}
      />
    </div>
  );
};
