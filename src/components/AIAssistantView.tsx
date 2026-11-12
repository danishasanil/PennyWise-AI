import React, { useState, useRef, useEffect } from 'react';
import { useFinance } from '../context/FinanceContext';
import { api, ChatMessage, ChatAction } from '../services/api';
import { FormattedText } from './FormattedText';
import { PennyWiseLogo } from './PennyWiseLogo';
import {
  Send,
  User as UserIcon,
  HelpCircle,
  Calendar,
  RotateCcw,
  Sparkles,
  ShoppingBag,
  Receipt,
  PiggyBank,
  Check,
  AlertCircle,
  Info,
  SlidersHorizontal,
} from 'lucide-react';

export const AIAssistantView: React.FC = () => {
  const {
    budget,
    profile,
    expenses,
    savingsGoals,
    formatMoney,
    isDemo,
    setActiveTab,
    navigateToAnalyzer,
  } = useFinance();

  const storageKey = `pennywise_chat_${isDemo ? 'demo' : (profile?.id || 'default')}`;

  const defaultWelcomeMessage = (): ChatMessage => ({
    id: 'welcome',
    sender: 'ai',
    text: `Hello ${
      profile?.displayName || 'there'
    }! I am **PennyWise AI**, your personal finance companion.\n\nI have your verified financial numbers right here:\n• **Remaining Flexible Budget**: ${formatMoney(
      budget.remainingFlexibleBudget
    )}\n• **Adaptive Daily Allowance**: ${formatMoney(
      budget.adaptiveDailyAllowance
    )}/day (${budget.daysRemaining} days remaining in this cycle)\n• **Monthly Savings Target**: ${formatMoney(
      budget.savingsTarget
    )} (${budget.alerts?.atRiskOfMissingSavingsGoal ? 'Action recommended to protect target' : 'Protected and on track'})\n\nHow can I help you today? You can ask me if you can afford a purchase, explore cheaper alternatives, plan a savings goal, or evaluate where your money is going!`,
    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    suggestedFollowUps: [
      'Can I afford something today?',
      'Suggest a cheaper alternative.',
      'Help me save more this month.',
      'Where is most of my money going?',
    ],
  });

  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (_e) {
      // Fallback to default
    }
    return [defaultWelcomeMessage()];
  });

  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [pendingActionConfirmation, setPendingActionConfirmation] = useState<{
    action: ChatAction;
    msgId: string;
  } | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync messages to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(messages));
    } catch (_e) {
      // Ignore quota errors in storage
    }
  }, [messages, storageKey]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  // Compute category breakdown and context
  const getFinancialContextPayload = () => {
    const categoryMap: Record<string, { total: number; count: number }> = {};
    let totalSpent = 0;
    expenses.forEach((e) => {
      const amt = Number(e.amount);
      totalSpent += amt;
      if (!categoryMap[e.category]) categoryMap[e.category] = { total: 0, count: 0 };
      categoryMap[e.category].total += amt;
      categoryMap[e.category].count += 1;
    });

    const categorySpending = Object.entries(categoryMap)
      .map(([cat, val]) => {
        const percentage = totalSpent > 0 ? (val.total / totalSpent) * 100 : 0;
        return {
          category: cat,
          amount: val.total,
          percentage,
          count: val.count,
          isHigh: percentage > 30,
        };
      })
      .sort((a, b) => b.amount - a.amount);

    const totalSaved = savingsGoals.reduce((sum, g) => sum + Number(g.currentAmount), 0);
    const totalTarget = savingsGoals.reduce((sum, g) => sum + Number(g.targetAmount), 0);
    const savingsProgress = {
      currentTotalSaved: totalSaved,
      targetTotal: totalTarget,
      achievementRate: totalTarget > 0 ? (totalSaved / totalTarget) * 100 : 0,
      activeGoals: savingsGoals.map((g) => ({
        title: g.title,
        current: Number(g.currentAmount),
        target: Number(g.targetAmount),
        percent: g.targetAmount > 0 ? (Number(g.currentAmount) / Number(g.targetAmount)) * 100 : 0,
      })),
    };

    const recentTransactions = expenses.slice(0, 10).map((e) => ({
      id: e.id,
      title: e.title,
      amount: e.amount,
      category: e.category,
      date: e.date,
      isEssential: e.isEssential,
      source: e.source,
    }));

    return {
      currency: profile?.preferredCurrency || 'USD',
      displayName: profile?.displayName || 'Valued User',
      monthlyIncome: budget.monthlyIncome,
      monthlyBudget: budget.flexibleBudget,
      essentialExpenses: budget.essentialExpenses,
      savingsTarget: budget.savingsTarget,
      savingsProgress,
      emergencyAllocation: budget.emergencyAllocation,
      flexibleBudget: budget.flexibleBudget,
      remainingFlexibleBudget: budget.remainingFlexibleBudget,
      dailySpendingAllowance: budget.adaptiveDailyAllowance,
      initialDailyAllowance: budget.initialDailyAllowance,
      dailyBurnRate: budget.dailyBurnRate,
      daysRemaining: budget.daysRemaining,
      daysElapsed: budget.daysElapsed,
      daysInPeriod: budget.daysInPeriod,
      totalExpenses: budget.totalExpenses,
      discretionaryExpensesSpent: budget.discretionaryExpensesSpent,
      categorySpending,
      recentTransactions,
      alerts: budget.alerts,
    };
  };

  const handleSendMessage = async (textToSend?: string) => {
    const query = (textToSend || input).trim();
    if (!query || loading) return;

    const userMessage: ChatMessage = {
      id: `msg-${Date.now()}`,
      sender: 'user',
      text: query,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMessage]);
    if (!textToSend) setInput('');
    setLoading(true);

    try {
      const financialContext = getFinancialContextPayload();
      const response = await api.sendChatMessage(query, messages, financialContext);

      const aiMessage: ChatMessage = {
        id: `ai-${Date.now()}`,
        sender: 'ai',
        text: response.reply,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        suggestedFollowUps: response.suggestedFollowUps,
        quickActions: response.quickActions,
      };

      setMessages((prev) => [...prev, aiMessage]);
    } catch (_err: any) {
      const errMessage: ChatMessage = {
        id: `err-${Date.now()}`,
        sender: 'ai',
        text: "I am having trouble connecting right now, but your financial calculations, daily spending allowances, and savings goals remain completely safe and active on your dashboard.",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        suggestedFollowUps: [
          'What is my daily spending allowance?',
          'What is my remaining flexible budget?',
        ],
      };
      setMessages((prev) => [...prev, errMessage]);
    } finally {
      setLoading(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  };

  const handleClearConversation = () => {
    const fresh = [defaultWelcomeMessage()];
    setMessages(fresh);
    try {
      localStorage.removeItem(storageKey);
    } catch (_e) {}
    setShowClearConfirm(false);
    setPendingActionConfirmation(null);
  };

  const handleExecuteQuickAction = (action: ChatAction) => {
    setPendingActionConfirmation(null);
    if (action.action === 'open_analyzer') {
      navigateToAnalyzer({
        itemName: action.params?.itemName || 'Planned Purchase',
        price: action.params?.price,
      });
    } else if (action.action === 'open_expenses') {
      setActiveTab('expenses');
    } else if (action.action === 'open_savings') {
      setActiveTab('savings');
    } else if (action.action === 'open_budget') {
      setActiveTab('budget');
    } else if (action.action === 'send_prompt' && action.params?.prompt) {
      handleSendMessage(action.params.prompt);
    }
  };

  // Find latest AI message for suggested follow-up chips
  const latestAiMessage = [...messages].reverse().find((m) => m.sender === 'ai');
  const currentSuggestions = latestAiMessage?.suggestedFollowUps && latestAiMessage.suggestedFollowUps.length > 0
    ? latestAiMessage.suggestedFollowUps
    : [
        'Can I afford something today?',
        'Suggest a cheaper alternative.',
        'Help me save more this month.',
        'Where is most of my money going?',
      ];

  return (
    <div className="space-y-4 max-w-4xl mx-auto">
      {/* Header with Branding, Live Allowance Badge & Clear Conversation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-800 to-teal-900 text-white flex items-center justify-center shadow-xs ring-1 ring-emerald-950/20">
            <PennyWiseLogo variant="symbol" size={24} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                PennyWise AI Companion
              </h1>
              {isDemo && (
                <span className="text-[10px] font-semibold text-amber-800 bg-amber-100/90 border border-amber-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                  <Info className="w-3 h-3 text-amber-600" />
                  <span>Demo Session</span>
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500">
              Your conversational personal finance guide · Grounded in your verified budget numbers.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Live Context Badge */}
          <div className="flex items-center gap-2 px-3 py-1.5 bg-white rounded-lg border border-slate-200 shadow-2xs text-xs">
            <Calendar className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span className="text-slate-500">Allowance:</span>
            <span className="font-bold font-mono tabular-nums text-emerald-900">
              {formatMoney(budget.adaptiveDailyAllowance)}/day
            </span>
            <span className="text-slate-400">({budget.daysRemaining}d left)</span>
          </div>

          {/* Clear Conversation Button */}
          <button
            onClick={() => setShowClearConfirm(true)}
            className="p-2 text-slate-500 hover:text-rose-600 hover:bg-rose-50 border border-slate-200 hover:border-rose-200 rounded-lg transition-colors cursor-pointer"
            title="Clear Conversation"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Clear Confirmation Dialog */}
      {showClearConfirm && (
        <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex items-center justify-between gap-3 text-xs text-rose-900">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>Are you sure you want to clear your conversation history and start fresh?</span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleClearConversation}
              className="px-2.5 py-1 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-md transition-colors cursor-pointer"
            >
              Yes, Clear
            </button>
            <button
              onClick={() => setShowClearConfirm(false)}
              className="px-2.5 py-1 text-xs font-medium text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-md transition-colors cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Chat Area Container */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs flex flex-col h-[580px] overflow-hidden">
        {/* Messages Scroll Area */}
        <div className="flex-1 p-4 sm:p-6 overflow-y-auto space-y-4">
          {messages.map((msg) => {
            const isUser = msg.sender === 'user';
            return (
              <div
                key={msg.id}
                className={`flex items-start gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
              >
                {/* Profile Icon */}
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 shadow-2xs ${
                    isUser
                      ? 'bg-slate-900 text-white'
                      : 'bg-gradient-to-br from-emerald-700 to-teal-800 text-white ring-1 ring-emerald-900/10'
                  }`}
                >
                  {isUser ? (
                    <UserIcon className="w-4 h-4" />
                  ) : (
                    <PennyWiseLogo variant="symbol" size={18} />
                  )}
                </div>

                {/* Message Bubble */}
                <div className="max-w-[85%] sm:max-w-[78%] space-y-2">
                  <div
                    className={`rounded-2xl px-4 py-3 text-xs sm:text-sm leading-relaxed shadow-2xs ${
                      isUser
                        ? 'bg-slate-900 text-white rounded-tr-xs'
                        : 'bg-[#F9FAF9] text-slate-800 border border-slate-200/80 rounded-tl-xs'
                    }`}
                  >
                    {isUser ? (
                      <p className="whitespace-pre-wrap">{msg.text}</p>
                    ) : (
                      <FormattedText text={msg.text} />
                    )}
                    <div
                      className={`mt-1.5 text-[10px] text-right font-mono ${
                        isUser ? 'text-slate-400' : 'text-slate-400'
                      }`}
                    >
                      {msg.timestamp}
                    </div>
                  </div>

                  {/* Contextual Quick Actions (Offered with User Confirmation Requirement) */}
                  {!isUser && msg.quickActions && msg.quickActions.length > 0 && (
                    <div className="flex flex-wrap items-center gap-1.5 pt-1">
                      {msg.quickActions.map((action, idx) => {
                        const isConfirming =
                          pendingActionConfirmation?.msgId === msg.id &&
                          pendingActionConfirmation.action.label === action.label;

                        if (isConfirming) {
                          return (
                            <div
                              key={idx}
                              className="inline-flex items-center gap-1.5 p-1 bg-emerald-50 border border-emerald-300 rounded-lg text-xs"
                            >
                              <span className="text-[11px] font-medium text-emerald-950 px-1">
                                Proceed with {action.label}?
                              </span>
                              <button
                                onClick={() => handleExecuteQuickAction(action)}
                                className="px-2 py-0.5 text-[11px] font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded transition-colors cursor-pointer"
                              >
                                Confirm
                              </button>
                              <button
                                onClick={() => setPendingActionConfirmation(null)}
                                className="px-1.5 py-0.5 text-[11px] text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
                              >
                                Cancel
                              </button>
                            </div>
                          );
                        }

                        return (
                          <button
                            key={idx}
                            onClick={() =>
                              setPendingActionConfirmation({
                                action,
                                msgId: msg.id,
                              })
                            }
                            className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold text-emerald-900 bg-emerald-50/90 hover:bg-emerald-100/90 border border-emerald-200/90 rounded-lg transition-colors cursor-pointer shadow-2xs"
                          >
                            {action.action === 'open_analyzer' && (
                              <ShoppingBag className="w-3.5 h-3.5 text-emerald-700" />
                            )}
                            {action.action === 'open_expenses' && (
                              <Receipt className="w-3.5 h-3.5 text-emerald-700" />
                            )}
                            {action.action === 'open_savings' && (
                              <PiggyBank className="w-3.5 h-3.5 text-emerald-700" />
                            )}
                            {action.action === 'open_budget' && (
                              <SlidersHorizontal className="w-3.5 h-3.5 text-emerald-700" />
                            )}
                            <span>{action.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {/* Typing Indicator */}
          {loading && (
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-700 to-teal-800 text-white flex items-center justify-center shrink-0 shadow-2xs ring-1 ring-emerald-900/10">
                <PennyWiseLogo variant="symbol" size={18} />
              </div>
              <div className="bg-[#F9FAF9] border border-slate-200/80 rounded-2xl rounded-tl-xs px-4 py-3 text-xs text-slate-600 flex items-center gap-2.5 shadow-2xs">
                <div className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-600 animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-2 h-2 rounded-full bg-emerald-600 animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-2 h-2 rounded-full bg-emerald-600 animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
                <span>PennyWise is analyzing your financial records...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Suggested Questions Bar (Dynamically updated from latest AI conversation) */}
        <div className="px-4 py-2 bg-slate-50/80 border-t border-slate-200/80 flex items-center gap-2 overflow-x-auto scrollbar-none">
          <div className="flex items-center gap-1 text-[11px] font-semibold text-slate-500 shrink-0">
            <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
            <span>Suggested:</span>
          </div>
          {currentSuggestions.map((q, idx) => (
            <button
              key={idx}
              onClick={() => handleSendMessage(q)}
              disabled={loading}
              className="text-[11px] font-medium text-slate-700 hover:text-emerald-950 bg-white hover:bg-emerald-50/80 border border-slate-200 hover:border-emerald-200 px-3 py-1 rounded-full transition-colors whitespace-nowrap shrink-0 shadow-2xs cursor-pointer"
            >
              {q}
            </button>
          ))}
        </div>

        {/* Input Bar with Enter-To-Send */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
          className="p-3 bg-white border-t border-slate-200 flex items-center gap-2"
        >
          <input
            ref={inputRef}
            type="text"
            placeholder="Ask PennyWise about buying something, cheaper alternatives, daily allowance..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage();
              }
            }}
            disabled={loading}
            className="flex-1 px-4 py-2.5 text-xs sm:text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition-all placeholder:text-slate-400"
          />
          <button
            type="submit"
            disabled={!input.trim() || loading}
            className="p-2.5 text-white bg-slate-900 hover:bg-slate-800 disabled:opacity-30 rounded-xl transition-colors shadow-xs cursor-pointer shrink-0"
            title="Send Message (Enter)"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>

      {/* Safety & Educational Disclaimer */}
      <div className="text-center text-[11px] text-slate-400 flex items-center justify-center gap-1.5">
        <HelpCircle className="w-3.5 h-3.5 text-slate-400 shrink-0" />
        <span>
          PennyWise AI provides educational budgeting advice grounded in your backend numbers. The user always makes the final purchasing decision.
        </span>
      </div>
    </div>
  );
};
