import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

export const PENNYWISE_SYSTEM_INSTRUCTION = `You are PennyWise AI, a friendly, intelligent, empathetic and responsible personal finance companion.
Your purpose is to help users understand their spending, evaluate purchasing decisions, manage their budget, track savings milestones and build financial confidence.

CONVERSATIONAL PERSONALITY & TONE:
- Be warm, supportive, approachable, conversational and non-judgmental. You are a trusted financial friend, not an automated report generator or robotic accountant.
- Talk directly and naturally. Use short, crisp paragraphs and simple, practical language. Avoid financial jargon.
- Never shame users for spending money, wanting nice things, or making discretionary choices.
- Maintain seamless conversational context across multiple turns and follow-up questions without asking the user to repeat already known details.
- Avoid robotic sign-offs like "Would you like more insights?" or "Let me know if you need further financial analysis." End naturally or ask an intelligent, relevant follow-up question when useful.

A. PERSONALIZED PURCHASE DECISION RULES:
When the user asks whether they can afford or should buy something (e.g. "Can I buy this?", "Is this trip too expensive?", "Should I buy this phone?"):
1. Always start with a clear, direct, conversational verdict in the very first sentence.
   - If affordable: "Yes, you can afford this within your current flexible budget. After this purchase, you will have {currency} {remaining} left, and your monthly savings target remains protected."
   - If affordable but tight: "You can afford this, but it will leave you with only {currency} {remaining} for the rest of the month ({daysRemaining} days left). I'd recommend considering whether it is a priority right now."
   - If unaffordable / exceeds flexible budget: "I wouldn't recommend buying this right now because it exceeds your available flexible budget by {currency} {deficit}. However, you could save {currency} {monthlySave} every month for {months} months to afford it comfortably."
2. Ground every figure in the official backend calculations provided in the prompt context.
3. Explain the exact impact on:
   - Remaining flexible spending.
   - Adaptive daily allowance (e.g. adjusts from {currency} X/day to {currency} Y/day).
   - Monthly savings goal and emergency buffer (state clearly if savings remain protected or if the purchase would cut into them).
4. Never simply recite numbers—explain what it actually means for the user's daily life and goals.

B. ALTERNATIVES & SMART SUGGESTIONS:
When a prospective purchase is expensive or exceeds the flexible budget:
- Suggest a reasonable, safer spending range based on their daily allowance and flexible cushion.
- Suggest lower-cost alternatives or mindful approaches (e.g., refurbished options, mid-range tier, waiting for seasonal sales, or dining during lunch instead of peak dinner).
- Frame alternatives as general helpful suggestions rather than verified live products. Never invent false product links, fake store discounts, or fictitious prices.
- Calculate concrete savings timelines (e.g., saving {currency} X/month takes ~Y months to reach target).
- Suggest reducing discretionary non-essential categories (e.g., shopping, dining out) if they wish to prioritize this specific item.

C. STRICT FINANCIAL INVARIANTS:
1. Always use the financial data provided by the application backend in the context block.
2. Never invent income, expenses, transactions, balances, exchange rates or savings figures.
3. Never calculate the user's official budget independently when the backend has already provided calculated values.
4. Never guarantee that a user can or cannot afford a purchase; you provide educational budgeting advice, while the user always makes the final payment decision.
5. Never initiate, approve, or capture payments.
6. Use the user's selected currency and never mix currencies without a verified exchange rate.
7. If financial information is missing (e.g. user asks "Can I afford dinner?" without giving a price), ask a simple, friendly question like "How much are you planning to spend on dinner?".`;

const apiKey = process.env.GEMINI_API_KEY;

export const geminiClient: GoogleGenAI | null = apiKey
  ? new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    })
  : null;

export const GEMINI_MODEL = 'gemini-3.8-flash';

// Circuit breaker for credit depletion or quota exhaustion
let isQuotaExhausted = false;
let quotaCooldownUntil = 0;

function markQuotaExhausted() {
  isQuotaExhausted = true;
  // Cool down for 30 minutes before testing live API again
  quotaCooldownUntil = Date.now() + 30 * 60 * 1000;
}

function shouldSkipLiveCall(): boolean {
  if (!geminiClient) return true;
  if (isQuotaExhausted && Date.now() < quotaCooldownUntil) {
    return true;
  }
  return false;
}

export interface FinancialContextPayload {
  currency?: string;
  displayName?: string;
  monthlyIncome?: number;
  monthlyBudget?: number;
  essentialExpenses?: number;
  savingsTarget?: number;
  savingsProgress?: {
    currentTotalSaved?: number;
    targetTotal?: number;
    achievementRate?: number;
    activeGoals?: Array<{ title: string; current: number; target: number; percent: number }>;
  };
  emergencyAllocation?: number;
  flexibleBudget?: number;
  totalExpenses?: number;
  discretionaryExpensesSpent?: number;
  remainingFlexibleBudget?: number;
  dailySpendingAllowance?: number;
  initialDailyAllowance?: number;
  dailyBurnRate?: number;
  daysRemaining?: number;
  daysElapsed?: number;
  daysInPeriod?: number;
  recentTransactions?: Array<{
    id: string;
    title: string;
    amount: number;
    category: string;
    date: string;
    isEssential?: boolean;
    source?: string;
  }>;
  categorySpending?: Array<{
    category: string;
    amount: number;
    percentage: number;
    count: number;
    isHigh?: boolean;
  }>;
  alerts?: {
    isOverbudget?: boolean;
    spendingStatus?: string;
    atRiskOfMissingSavingsGoal?: boolean;
    overbudgetAmount?: number;
  };
}

export interface PurchaseAnalysisParams {
  itemName: string;
  numPrice: number;
  currency: string;
  category: string;
  priority: string;
  currentRemainingFlexible: number;
  newRemainingFlexible: number;
  currentDailyAllowance: number;
  newDailyAllowance: number;
  dailyAllowanceDrop: number;
  daysRemaining: number;
  cutsIntoSavings: boolean;
  savingsDeficit: number;
  monthlySavingsGoal: number;
  affordabilityVerdict: 'Comfortable' | 'Caution' | 'High Impact';
}

/**
 * Checks if an error is due to exhausted prepayment credits, quota limits, or auth
 */
function isQuotaOrBillingError(err: any): boolean {
  if (!err) return false;
  const msg = String(err?.message || err || '');
  const status = String(err?.status || '');
  const code = err?.code || err?.status;
  return (
    code === 402 ||
    code === 429 ||
    status === 'RESOURCE_EXHAUSTED' ||
    msg.includes('prepayment credits') ||
    msg.includes('RESOURCE_EXHAUSTED') ||
    msg.includes('quota') ||
    msg.includes('billing')
  );
}

/**
 * Deterministic category classifier matching vendor names or descriptions
 */
function deterministicCategoryClassifier(text: string, validCategories: string[]): { category: string; reasoning: string } {
  const lower = text.toLowerCase();

  if (lower.includes('supermarket') || lower.includes('grocery') || lower.includes('produce') || lower.includes('walmart') || lower.includes('trader') || lower.includes('whole foods') || lower.includes('costco') || lower.includes('kroger') || lower.includes('aldi')) {
    return { category: 'Groceries', reasoning: 'Matched grocery store or supermarket vendor' };
  }
  if (lower.includes('restaurant') || lower.includes('cafe') || lower.includes('coffee') || lower.includes('burger') || lower.includes('pizza') || lower.includes('dinner') || lower.includes('lunch') || lower.includes('bakery') || lower.includes('starbucks') || lower.includes('mcdonald') || lower.includes('taco') || lower.includes('chipotle') || lower.includes('food') || lower.includes('bar & grill') || lower.includes('diner')) {
    return { category: 'Food', reasoning: 'Matched dining, restaurant, or beverage vendor' };
  }
  if (lower.includes('uber') || lower.includes('lyft') || lower.includes('gas') || lower.includes('fuel') || lower.includes('metro') || lower.includes('subway') || lower.includes('bus') || lower.includes('transit') || lower.includes('train') || lower.includes('parking') || lower.includes('shell') || lower.includes('chevron') || lower.includes('bp')) {
    return { category: 'Transportation', reasoning: 'Matched transit, ride-share, or vehicle fuel vendor' };
  }
  if (lower.includes('electric') || lower.includes('water') || lower.includes('internet') || lower.includes('wifi') || lower.includes('phone') || lower.includes('utility') || lower.includes('bill') || lower.includes('mobile') || lower.includes('verizon') || lower.includes('att') || lower.includes('t-mobile') || lower.includes('comcast')) {
    return { category: 'Bills', reasoning: 'Matched recurring utility, phone, or internet provider' };
  }
  if (lower.includes('rent') || lower.includes('mortgage') || lower.includes('apartment') || lower.includes('lease') || lower.includes('maintenance') || lower.includes('hoa') || lower.includes('landlord')) {
    return { category: 'Housing', reasoning: 'Matched housing or residential leasing vendor' };
  }
  if (lower.includes('movie') || lower.includes('game') || lower.includes('concert') || lower.includes('netflix') || lower.includes('spotify') || lower.includes('cinema') || lower.includes('steam') || lower.includes('playstation') || lower.includes('xbox') || lower.includes('disney') || lower.includes('entertainment')) {
    return { category: 'Entertainment', reasoning: 'Matched media, streaming, or entertainment vendor' };
  }
  if (lower.includes('book') || lower.includes('course') || lower.includes('tuition') || lower.includes('udemy') || lower.includes('school') || lower.includes('class') || lower.includes('college') || lower.includes('university') || lower.includes('coursera') || lower.includes('education')) {
    return { category: 'Education', reasoning: 'Matched academic or skill development vendor' };
  }
  if (lower.includes('pharmacy') || lower.includes('doctor') || lower.includes('dental') || lower.includes('dentist') || lower.includes('medicine') || lower.includes('hospital') || lower.includes('clinic') || lower.includes('cvs') || lower.includes('walgreens') || lower.includes('healthcare')) {
    return { category: 'Healthcare', reasoning: 'Matched health, dental, or medical pharmacy vendor' };
  }
  if (lower.includes('flight') || lower.includes('hotel') || lower.includes('airbnb') || lower.includes('airline') || lower.includes('tour') || lower.includes('resort') || lower.includes('delta') || lower.includes('united') || lower.includes('travel') || lower.includes('booking.com') || lower.includes('expedia')) {
    return { category: 'Travel', reasoning: 'Matched airline, hotel, or travel booking vendor' };
  }
  if (lower.includes('clothes') || lower.includes('shoes') || lower.includes('amazon') || lower.includes('mall') || lower.includes('store') || lower.includes('apparel') || lower.includes('zara') || lower.includes('nike') || lower.includes('h&m') || lower.includes('target') || lower.includes('shopping')) {
    return { category: 'Shopping', reasoning: 'Matched retail store or merchandise vendor' };
  }

  const fallback = validCategories.includes('Other') ? 'Other' : validCategories[0] || 'Other';
  return { category: fallback, reasoning: 'Default classification based on general description' };
}

/**
 * Dedicated PennyWise Gemini Service
 */
export interface CompanionQuickAction {
  label: string;
  action: 'open_analyzer' | 'open_expenses' | 'open_savings' | 'open_budget' | 'send_prompt';
  params?: Record<string, any>;
}

export interface CompanionChatResult {
  reply: string;
  suggestedFollowUps: string[];
  quickActions: CompanionQuickAction[];
}

/**
 * Helper to inspect history for previously discussed items or prices
 */
function extractHistoryContext(history: Array<{ sender: 'user' | 'ai'; text: string }>) {
  let recentItem: string | null = null;
  let recentPrice: number | null = null;

  for (let i = history.length - 1; i >= 0; i--) {
    const text = history[i].text;
    if (!recentItem) {
      if (/phone|iphone|android|samsung/i.test(text)) recentItem = 'phone';
      else if (/headphone|earbud|airpod|audio/i.test(text)) recentItem = 'headphones';
      else if (/watch|smartwatch/i.test(text)) recentItem = 'watch';
      else if (/dress|clothes|shoes|jacket/i.test(text)) recentItem = 'apparel';
      else if (/trip|flight|hotel|vacation/i.test(text)) recentItem = 'trip';
      else if (/laptop|computer|macbook/i.test(text)) recentItem = 'laptop';
      else if (/dinner|restaurant|food/i.test(text)) recentItem = 'dining';
    }
    if (!recentPrice) {
      const match = text.match(/(?:(?:₹|\$|€|£|inr|usd|aed|gbp|jpy)?\s*([0-9]{1,3}(?:,[0-9]{3})*(?:\.[0-9]+)?|[0-9]+(?:\.[0-9]+)?)\s*(?:₹|\$|€|£|inr|usd|aed|gbp|jpy)?)/i);
      if (match && match[1]) {
        const val = parseFloat(match[1].replace(/,/g, ''));
        if (!isNaN(val) && val > 0 && val !== 2024 && val !== 2025 && val !== 2026) {
          recentPrice = val;
        }
      }
    }
    if (recentItem && recentPrice) break;
  }

  return { recentItem, recentPrice };
}

/**
 * Dedicated PennyWise Gemini Service
 */
export const geminiService = {
  /**
   * Conversational Assistant Chat grounded with full backend context, multi-turn memory,
   * follow-up question suggestions, and interactive quick action prompts.
   */
  async chatWithCompanion(
    message: string,
    history: Array<{ sender: 'user' | 'ai'; text: string }> = [],
    context: FinancialContextPayload = {}
  ): Promise<CompanionChatResult> {
    const currency = context.currency || 'USD';
    const remainingFlex = Number(context.remainingFlexibleBudget ?? 0);
    const dailyAllowance = Number(context.dailySpendingAllowance ?? 0);
    const daysRemaining = Math.max(1, Number(context.daysRemaining ?? 1));
    const savingsTarget = Number(context.savingsTarget ?? 0);
    const userName = context.displayName || 'Friend';
    const monthlyIncome = Number(context.monthlyIncome ?? 0);

    const { recentItem, recentPrice } = extractHistoryContext(history);

    const buildDeterministicResponse = (): CompanionChatResult => {
      const lower = message.toLowerCase();

      // Extract all potential monetary amounts from current message
      const priceRegex = /(?:(?:₹|\$|€|£|inr|usd|aed|gbp|jpy)?\s*([0-9]{1,3}(?:,[0-9]{3})*(?:\.[0-9]+)?|[0-9]+(?:\.[0-9]+)?)\s*(?:₹|\$|€|£|inr|usd|aed|gbp|jpy)?)/gi;
      const parsedAmounts: number[] = [];
      let match: RegExpExecArray | null;
      while ((match = priceRegex.exec(message)) !== null) {
        if (match[1]) {
          const val = parseFloat(match[1].replace(/,/g, ''));
          if (!isNaN(val) && val > 0 && val !== daysRemaining && val !== 2024 && val !== 2025 && val !== 2026) {
            parsedAmounts.push(val);
          }
        }
      }

      // Check current item
      let currentItem = recentItem || 'planned purchase';
      if (/phone|iphone|android|samsung/i.test(message)) currentItem = 'phone';
      else if (/headphone|earbud|airpod|audio/i.test(message)) currentItem = 'headphones';
      else if (/watch|smartwatch/i.test(message)) currentItem = 'watch';
      else if (/dress|clothes|shoes|jacket/i.test(message)) currentItem = 'apparel';
      else if (/trip|flight|hotel|vacation/i.test(message)) currentItem = 'trip';
      else if (/laptop|computer|macbook/i.test(message)) currentItem = 'laptop';
      else if (/dinner|restaurant|food/i.test(message)) currentItem = 'dining';

      const primaryAmount = parsedAmounts.length > 0 ? parsedAmounts[0] : (recentPrice || 0);

      // -------------------------------------------------------------
      // SCENARIO 9: Compare two purchase options
      // (e.g. "Can you compare two purchase options?", "Compare ₹2,000 vs ₹5,000")
      // -------------------------------------------------------------
      if (lower.includes('compare') && (parsedAmounts.length >= 2 || lower.includes('option'))) {
        if (parsedAmounts.length >= 2) {
          const optA = Math.min(parsedAmounts[0], parsedAmounts[1]);
          const optB = Math.max(parsedAmounts[0], parsedAmounts[1]);

          const remA = remainingFlex - optA;
          const remB = remainingFlex - optB;
          const dailyA = remA > 0 ? Number((remA / daysRemaining).toFixed(2)) : 0;
          const dailyB = remB > 0 ? Number((remB / daysRemaining).toFixed(2)) : 0;

          const reply = `Here is a side-by-side comparison of both purchase options based on your remaining flexible budget of **${currency} ${remainingFlex.toLocaleString()}**:\n\n• **Option A (${currency} ${optA.toLocaleString()})**:\n  - Remaining Flexible Budget afterward: **${currency} ${remA.toLocaleString()}**\n  - New Daily Allowance: **${currency} ${dailyA.toLocaleString()}/day** (${daysRemaining} days left)\n  - Savings Goal Impact: ${remA >= 0 ? `Protected (Target of ${currency} ${savingsTarget.toLocaleString()} untouched)` : `⚠️ Cuts into savings by ${currency} ${Math.abs(remA).toLocaleString()}`}\n\n• **Option B (${currency} ${optB.toLocaleString()})**:\n  - Remaining Flexible Budget afterward: **${currency} ${remB.toLocaleString()}**\n  - New Daily Allowance: **${currency} ${dailyB.toLocaleString()}/day**\n  - Savings Goal Impact: ${remB >= 0 ? `Protected` : `⚠️ Cuts into savings by ${currency} ${Math.abs(remB).toLocaleString()}`}\n\n**Recommendation:** Option A (${currency} ${optA.toLocaleString()}) provides significantly more peace of mind, leaving you with **${currency} ${(remA - remB).toLocaleString()}** more spending room for the rest of the cycle.`;

          return {
            reply,
            suggestedFollowUps: [
              `Can I afford ${currency} ${optA.toLocaleString()}?`,
              `What if I wait until next month for Option B?`,
              `Open Purchase Analyzer`,
            ],
            quickActions: [
              { label: `Evaluate ${currency} ${optA.toLocaleString()}`, action: 'open_analyzer', params: { itemName: `Option A (${currentItem})`, price: optA } },
              { label: `Evaluate ${currency} ${optB.toLocaleString()}`, action: 'open_analyzer', params: { itemName: `Option B (${currentItem})`, price: optB } },
            ],
          };
        }

        return {
          reply: `I'd be happy to compare two purchase options for you! What are the two prices or products you are considering (e.g. "${currency} 2,000 vs ${currency} 5,000")? I will calculate the exact impact of each on your remaining flexible budget, daily spending allowance, and monthly savings goal.`,
          suggestedFollowUps: [
            `Compare ${currency} 2,000 vs ${currency} 5,000`,
            `Compare a ${currency} 1,500 option vs ${currency} 3,500`,
            `What is my remaining flexible budget?`,
          ],
          quickActions: [
            { label: 'Open Purchase Analyzer', action: 'open_analyzer' },
          ],
        };
      }

      // -------------------------------------------------------------
      // SCENARIO 7: Impact on daily spending allowance if spending X
      // (e.g. "What happens to my daily allowance if I spend ₹2,000?")
      // -------------------------------------------------------------
      if (
        (lower.includes('daily allowance') || lower.includes('allowance')) &&
        (lower.includes('if i spend') || lower.includes('what happens') || lower.includes('spend')) &&
        parsedAmounts.length > 0
      ) {
        const spendAmt = parsedAmounts[0];
        const remainingAfter = remainingFlex - spendAmt;
        const newDaily = daysRemaining > 0 && remainingAfter > 0 ? Number((remainingAfter / daysRemaining).toFixed(2)) : 0;
        const drop = Math.max(0, Number((dailyAllowance - newDaily).toFixed(2)));

        const reply = `If you spend **${currency} ${spendAmt.toLocaleString()}**, here is the exact impact on your daily numbers:\n\n• **Remaining Flexible Budget**: Reduces from **${currency} ${remainingFlex.toLocaleString()}** to **${currency} ${Math.max(0, remainingAfter).toLocaleString()}**.\n• **Adaptive Daily Allowance**: Adjusts from **${currency} ${dailyAllowance.toLocaleString()}/day** down to **${currency} ${newDaily.toLocaleString()}/day** (a reduction of **${currency} ${drop.toLocaleString()}/day**) for your remaining **${daysRemaining} days**.\n• **Savings Goal**: ${
          remainingAfter >= 0
            ? `Your monthly savings target of **${currency} ${savingsTarget.toLocaleString()}** remains completely safe.`
            : `⚠️ This purchase exceeds your available flexible pool and would cut into your savings goal by **${currency} ${Math.abs(remainingAfter).toLocaleString()}**.`
        }`;

        return {
          reply,
          suggestedFollowUps: [
            `What if I spend ${currency} ${Math.round(spendAmt * 0.5).toLocaleString()} instead?`,
            `Should I buy this now or wait?`,
            `Can you suggest a cheaper alternative?`,
          ],
          quickActions: [
            { label: 'Evaluate in Purchase Analyzer', action: 'open_analyzer', params: { itemName: currentItem, price: spendAmt } },
          ],
        };
      }

      // -------------------------------------------------------------
      // SCENARIO 8: Changed mind / suggest something cheaper
      // (e.g. "I changed my mind. Suggest something cheaper", "I changed my mind")
      // -------------------------------------------------------------
      if (lower.includes('changed my mind') || (lower.includes('cheaper') && (lower.includes('instead') || lower.includes('mind') || lower.includes('something')))) {
        const basePrice = primaryAmount || 5000;
        const lowerTarget = Math.round(basePrice * 0.45);
        const upperTarget = Math.round(basePrice * 0.65);

        const reply = `Smart move! Reconsidering before making a purchase is one of the best financial habits. Looking for a more budget-friendly alternative keeps your flexible buffer comfortable and protects your daily allowance.\n\nFor **${currentItem}**, let's target an alternative in the **${currency} ${lowerTarget.toLocaleString()} – ${currency} ${upperTarget.toLocaleString()}** range (around 40–50% less).\n\n**Key value strategies:**\n• **Look for high-value mid-range tiers**: Often provides 85–90% of premium features at half the price.\n• **Check certified refurbished or open-box**: Tested by manufacturers and backed by standard warranties.\n• **Timing**: Waiting for upcoming promotional cycles or seasonal discounts.\n\nWould you like me to evaluate an option around **${currency} ${lowerTarget.toLocaleString()}** for you?`;

        return {
          reply,
          suggestedFollowUps: [
            `Can I afford ${currency} ${lowerTarget.toLocaleString()}?`,
            `Compare ${currency} ${lowerTarget.toLocaleString()} vs ${currency} ${basePrice.toLocaleString()}`,
            `Should I wait until next month?`,
          ],
          quickActions: [
            { label: `Evaluate ${currency} ${lowerTarget.toLocaleString()}`, action: 'open_analyzer', params: { itemName: `Budget-friendly ${currentItem}`, price: lowerTarget } },
          ],
        };
      }

      // -------------------------------------------------------------
      // SCENARIO 2: Suggest an alternative to buying a product
      // (e.g. "Suggest an alternative to buying a ₹5,000 phone", "Can you suggest an alternative to buying a ₹3,000 pair of headphones?")
      // -------------------------------------------------------------
      if (
        lower.includes('alternative') ||
        (lower.includes('suggest') && (lower.includes('cheaper') || lower.includes('phone') || lower.includes('headphones') || lower.includes('watch') || lower.includes('dress')))
      ) {
        if (/headphone|earbud|airpod/i.test(lower)) {
          const refPrice = primaryAmount || 3000;
          const budgetTier = Math.round(refPrice * 0.55);
          return {
            reply: `Of course! We can look for something much more budget-friendly. Would you prefer wireless headphones, wired headphones or compact earbuds?\n\n**Practical buying criteria to get great sound without overspending:**\n• **Mid-tier wireless earbuds/headphones**: Reputable value audio brands often provide active noise cancellation (ANC) and punchy bass in the **${currency} ${budgetTier.toLocaleString()}** range.\n• **High-fidelity wired earphones**: Provide studio-quality acoustic clarity with zero battery degradation at a fraction of the cost.\n• **Certified refurbished or previous-generation**: Major audio manufacturers offer verified open-box units with full 1-year warranties at 30–40% discounts.\n\nPrioritizing options under **${currency} ${budgetTier.toLocaleString()}** would keep your flexible buffer healthy!`,
            suggestedFollowUps: [
              `Suggest options under ${currency} ${budgetTier.toLocaleString()}`,
              `Can I afford ${currency} ${budgetTier.toLocaleString()} right now?`,
              `What is my remaining flexible budget?`,
            ],
            quickActions: [
              { label: `Evaluate ${currency} ${budgetTier.toLocaleString()} in Analyzer`, action: 'open_analyzer', params: { itemName: 'Budget-friendly Headphones', price: budgetTier } },
            ],
          };
        }

        if (/phone|smartphone|android|iphone/i.test(lower)) {
          const refPrice = primaryAmount || 5000;
          const budgetTier = Math.round(refPrice * 0.6);
          return {
            reply: `Of course! When looking for an alternative to a **${currency} ${refPrice.toLocaleString()} phone**, here is how to get great performance without straining your budget:\n\n**Smart alternatives to consider:**\n• **Previous-generation flagship models**: Often priced 30–40% lower while providing nearly identical camera and battery life.\n• **Value-focused mid-range series**: Modern mid-range processors deliver smooth daily performance for browsing, photography, and gaming in the **${currency} ${budgetTier.toLocaleString()}** tier.\n• **Certified refurbished with warranty**: Inspected and guaranteed with manufacturer or retailer returns protection.\n• **Seasonal promotional sales**: If your current device is still working, waiting for upcoming e-commerce sales often brings 15–25% instant discounts and trade-in bonuses.`,
            suggestedFollowUps: [
              `Can I afford ${currency} ${budgetTier.toLocaleString()}?`,
              `Should I wait until next month?`,
              `How much should I save each month for it?`,
            ],
            quickActions: [
              { label: `Evaluate ${currency} ${budgetTier.toLocaleString()} Phone`, action: 'open_analyzer', params: { itemName: 'Value Phone Model', price: budgetTier } },
            ],
          };
        }

        const altTarget = primaryAmount > 0 ? Math.round(primaryAmount * 0.5) : Math.round(remainingFlex * 0.3);
        return {
          reply: `Absolutely! What are you planning to buy, and what is your preferred maximum budget?\n\n**General guidelines to find a budget-friendly option:**\n• **Target 40–50% below premium pricing**: Keeping discretionary purchases below **${currency} ${altTarget.toLocaleString()}** keeps your daily allowance stable.\n• **Check certified open-box / renewed inventory**: Brand new performance with significant markdowns.\n• **Distinguish needs from wants**: Focus on core essentials rather than luxury cosmetic add-ons.`,
          suggestedFollowUps: [
            `Suggest an option under ${currency} ${altTarget.toLocaleString()}`,
            `What is my daily spending allowance today?`,
            `Open Purchase Analyzer`,
          ],
          quickActions: [
            { label: 'Open Purchase Analyzer', action: 'open_analyzer', params: { itemName: currentItem, price: altTarget } },
          ],
        };
      }

      // -------------------------------------------------------------
      // SCENARIO 3: Savings plan advice
      // (e.g. "I want to save ₹10,000 by the end of next month. Can you help?", "I want to save ₹10,000. Help me plan.")
      // -------------------------------------------------------------
      if (
        (lower.includes('save') || lower.includes('saving')) &&
        (lower.includes('plan') || lower.includes('help me') || lower.includes('end of next month') || lower.includes('goal')) &&
        parsedAmounts.length > 0
      ) {
        const targetAmount = parsedAmounts[0];
        const isTwoMonths = lower.includes('next month') || lower.includes('2 months') || lower.includes('60 days');
        const planDays = isTwoMonths ? 60 : 30;
        const dailySave = Number((targetAmount / planDays).toFixed(2));
        const weeklySave = Number(((targetAmount / planDays) * 7).toFixed(2));
        const monthlySave = isTwoMonths ? Number((targetAmount / 2).toFixed(2)) : targetAmount;

        const reply = `Of course! Let's create a practical, achievable plan to save **${currency} ${targetAmount.toLocaleString()}** ${isTwoMonths ? 'by the end of next month' : 'over the next month'}.\n\n**Here is your savings roadmap:**\n• **Daily savings target**: Set aside approximately **${currency} ${dailySave.toLocaleString()}/day** (or **${currency} ${weeklySave.toLocaleString()}/week**).\n• **Monthly allocation**: **${currency} ${monthlySave.toLocaleString()}/month**.\n• **Daily allowance comparison**: Your current flexible allowance is **${currency} ${dailyAllowance.toLocaleString()}/day**. Committing **${currency} ${dailySave.toLocaleString()}/day** leaves you with an adjusted daily spending pace of **${currency} ${Math.max(0, dailyAllowance - dailySave).toLocaleString()}/day** for discretionary expenses.\n• **Next step**: Create a dedicated goal in **Savings Goals** so every transfer automatically tracks your progress and safeguards your target.`;

        return {
          reply,
          suggestedFollowUps: [
            `Can I reach this with my current allowance?`,
            `Where can I cut spending to save faster?`,
            `What is my highest spending category?`,
          ],
          quickActions: [
            { label: 'Create in Savings Goals', action: 'open_savings', params: { title: `Goal (${currency} ${targetAmount.toLocaleString()})`, targetAmount } },
          ],
        };
      }

      // -------------------------------------------------------------
      // SCENARIO 5: Waiting before buying
      // (e.g. "Should I buy this now or wait?", "Should I buy a new phone now?")
      // -------------------------------------------------------------
      if (lower.includes('wait') || (lower.includes('should i buy') && (lower.includes('now') || lower.includes('wait')))) {
        const reply = `Let's compare the purchase with your current budget and savings target first!\n\n**Why waiting can be advantageous:**\n1. **Protects your current budget cycle**: Waiting until your next budget period allows your flexible pool to reset, meaning you won't compress your current daily allowance of **${currency} ${dailyAllowance.toLocaleString()}/day** across your remaining **${daysRemaining} days**.\n2. **The 30-Day cooling-off principle**: If it's a discretionary want, taking 48 hours to a couple of weeks eliminates impulse pressure and confirms whether you truly value the item.\n3. **Seasonal pricing**: Discretionary electronics, apparel, and home items frequently see promotional discounts near month-ends or festival seasons.\n\nIf buying now puts pressure on your comfortable buffer, waiting or considering a less expensive model might be the smartest path!`;

        return {
          reply,
          suggestedFollowUps: [
            `Can you suggest a cheaper option?`,
            `What if I save for it over 2 months?`,
            `What is my remaining flexible budget?`,
          ],
          quickActions: [
            { label: 'Evaluate in Purchase Analyzer', action: 'open_analyzer' },
          ],
        };
      }

      // -------------------------------------------------------------
      // SCENARIO 6: Suggest a purchase within remaining budget
      // (e.g. "Suggest a purchase within my remaining budget", "Can you suggest something within my daily allowance?")
      // -------------------------------------------------------------
      if (lower.includes('within my remaining budget') || lower.includes('within my daily allowance') || (lower.includes('suggest a purchase') && lower.includes('budget'))) {
        const safeLimit = Math.min(remainingFlex * 0.3, dailyAllowance * 2);

        const reply = `Based on your remaining flexible budget of **${currency} ${remainingFlex.toLocaleString()}** and daily allowance of **${currency} ${dailyAllowance.toLocaleString()}/day**:\n\n• **Safe Spending Benchmark**: Keep individual discretionary purchases under **${currency} ${Math.round(safeLimit).toLocaleString()}** (roughly 1–2 days of allowance) so your flexible buffer remains healthy.\n• **Mindful Choices**: Prioritize high-utility purchases such as educational resources, durable work essentials, or health and wellness items.\n• **Preserve Savings**: Avoid any discretionary purchase that would push remaining flexible funds close to zero or risk your monthly savings goal of **${currency} ${savingsTarget.toLocaleString()}**.`;

        return {
          reply,
          suggestedFollowUps: [
            `Can I buy something under ${currency} ${Math.round(dailyAllowance).toLocaleString()}?`,
            `What is my daily spending allowance today?`,
            `How do I log an expense?`,
          ],
          quickActions: [
            { label: 'Log an Expense', action: 'open_expenses' },
          ],
        };
      }

      // -------------------------------------------------------------
      // SCENARIO 4 & 10: Spending analysis & reducing monthly expenses
      // (e.g. "Where am I spending the most?", "Where am I spending too much?", "I want to reduce my monthly expenses. What should I do?")
      // -------------------------------------------------------------
      if (
        lower.includes('where am i spending') ||
        lower.includes('spending too much') ||
        lower.includes('spending the most') ||
        lower.includes('reduce my monthly expenses') ||
        lower.includes('reduce expenses') ||
        lower.includes('cut spending') ||
        lower.includes('save more money') ||
        lower.includes('unnecessary')
      ) {
        const topCat = (context.categorySpending || [])[0] || { category: 'Shopping', amount: 0, percentage: 0 };
        const savingsPotential = Math.round(topCat.amount * 0.15);

        const reply = `Looking at your recorded expenses, your highest spending category is **${topCat.category}** (**${currency} ${topCat.amount.toLocaleString()}**, representing **${topCat.percentage.toFixed(0)}%** of your total spending).\n\n**Practical steps to reduce monthly expenses:**\n1. **Trim your top category**: Reducing non-essential spending in **${topCat.category}** by just 15% would save you **${currency} ${savingsPotential.toLocaleString()}** each month.\n2. **Stay anchored to your daily allowance**: Keeping daily discretionary spending near your **${currency} ${dailyAllowance.toLocaleString()}/day** benchmark automatically protects your savings target of **${currency} ${savingsTarget.toLocaleString()}**.\n3. **Audit recurring commitments**: Review recurring subscriptions and fixed utility bills in your budget to cancel unused services or negotiate better rates.\n\nWould you like to review all your expense records or adjust your budget targets?`;

        return {
          reply,
          suggestedFollowUps: [
            `How can I reduce expenses in ${topCat.category}?`,
            `What is my daily spending allowance today?`,
            `Create a savings plan`,
          ],
          quickActions: [
            { label: 'Review All Expenses', action: 'open_expenses' },
            { label: 'Adjust Budget', action: 'open_budget' },
          ],
        };
      }

      // -------------------------------------------------------------
      // SCENARIO 1: Purchase afford query with a price
      // (e.g. "Can I afford a ₹3,000 purchase?", "Can I buy shoes worth 2000", "Can I afford ₹5,000?")
      // -------------------------------------------------------------
      const isPurchaseQuery =
        lower.includes('buy') ||
        lower.includes('afford') ||
        lower.includes('purchase') ||
        lower.includes('trip') ||
        lower.includes('phone') ||
        lower.includes('shoes') ||
        lower.includes('restaurant') ||
        lower.includes('worth') ||
        lower.includes('cost');

      if (isPurchaseQuery && parsedAmounts.length > 0) {
        const purchasePrice = parsedAmounts[0];
        const remainingAfter = remainingFlex - purchasePrice;
        const newDaily = daysRemaining > 0 && remainingAfter > 0 ? Number((remainingAfter / daysRemaining).toFixed(2)) : 0;
        const drop = Math.max(0, Number((dailyAllowance - newDaily).toFixed(2)));

        if (remainingAfter >= remainingFlex * 0.4 && purchasePrice <= dailyAllowance * 2) {
          return {
            reply: `Yes, you can afford this within your current flexible budget! After this purchase of **${currency} ${purchasePrice.toLocaleString()}**, you will have **${currency} ${remainingAfter.toLocaleString()}** remaining in flexible funds (an adaptive daily allowance of **${currency} ${newDaily.toLocaleString()}/day** across your remaining **${daysRemaining}** days). Your monthly savings goal of **${currency} ${savingsTarget.toLocaleString()}** remains completely protected.`,
            suggestedFollowUps: [
              `What happens to my daily allowance?`,
              `Can you suggest a cheaper alternative?`,
              `Should I buy this now or wait?`,
            ],
            quickActions: [
              { label: `Open in Purchase Analyzer`, action: 'open_analyzer', params: { itemName: currentItem, price: purchasePrice } },
            ],
          };
        }

        if (remainingAfter >= 0) {
          return {
            reply: `You can afford this purchase of **${currency} ${purchasePrice.toLocaleString()}**, but it will leave you with a tighter cushion (**${currency} ${remainingAfter.toLocaleString()}** remaining) for the remaining **${daysRemaining}** days of your cycle. Your daily allowance will decrease from **${currency} ${dailyAllowance.toLocaleString()}/day** down to **${currency} ${newDaily.toLocaleString()}/day** (a reduction of **${currency} ${drop.toLocaleString()}/day**). I'd recommend considering whether this is an immediate priority or if you could find a lower-cost alternative to keep your buffer comfortable!`,
            suggestedFollowUps: [
              `Suggest a cheaper alternative to buying this`,
              `Should I buy this now or wait?`,
              `What is my highest spending category?`,
            ],
            quickActions: [
              { label: `Evaluate in Purchase Analyzer`, action: 'open_analyzer', params: { itemName: currentItem, price: purchasePrice } },
            ],
          };
        }

        const deficit = Math.abs(remainingAfter);
        const monthlySave = Math.max(500, Math.round(purchasePrice / 5));
        const monthsNeeded = Math.max(2, Math.ceil(purchasePrice / monthlySave));

        return {
          reply: `I wouldn't recommend buying this right now because it exceeds your available flexible budget by **${currency} ${deficit.toLocaleString()}** and would cut into your savings or emergency reserves.\n\nHere are some practical alternatives:\n• **Save for it steadily**: If you set aside **${currency} ${monthlySave.toLocaleString()}/month**, you can afford this in approximately **${monthsNeeded} months** without straining your living expenses.\n• **Explore lower-cost alternatives**: Look into certified refurbished models, mid-tier alternatives, or wait for seasonal promotional sales.\n• **Trim discretionary categories**: Temporarily pacing dining out or entertainment this month could help bridge the gap!`,
          suggestedFollowUps: [
            `Suggest a cheaper alternative`,
            `How much should I save each month for it?`,
            `Where am I spending the most?`,
          ],
          quickActions: [
            { label: 'Create a Savings Goal', action: 'open_savings', params: { title: `Save for ${currentItem}`, targetAmount: purchasePrice } },
            { label: 'Evaluate in Purchase Analyzer', action: 'open_analyzer', params: { itemName: currentItem, price: purchasePrice } },
          ],
        };
      }

      // Default baseline response
      return {
        reply: `Hello ${userName}! Based on your verified financial records:\n• Remaining Flexible Budget: **${currency} ${remainingFlex.toLocaleString()}**\n• Adaptive Daily Spending Allowance: **${currency} ${dailyAllowance.toLocaleString()}/day** (${daysRemaining} days left in cycle)\n• Monthly Savings Target: **${currency} ${savingsTarget.toLocaleString()}** (${context.alerts?.atRiskOfMissingSavingsGoal ? 'Action recommended to protect target' : 'Protected and on track'})\n\nFeel free to ask me if you can afford a purchase, how to save for a goal, or how to pace your spending!`,
        suggestedFollowUps: [
          `Can I afford a ${currency} 3,000 purchase?`,
          `What is my daily spending allowance today?`,
          `Where am I spending the most?`,
          `How can I save more money?`,
        ],
        quickActions: [
          { label: 'Open Purchase Analyzer', action: 'open_analyzer' },
          { label: 'View All Expenses', action: 'open_expenses' },
        ],
      };
    };

    if (shouldSkipLiveCall()) {
      return buildDeterministicResponse();
    }

    try {
      const categoryLines = (context.categorySpending || [])
        .map(
          (c) =>
            `  - ${c.category}: ${currency} ${c.amount} (${c.percentage.toFixed(1)}% of spending, ${c.count} tx)${
              c.isHigh ? ' [UNUSUALLY HIGH]' : ''
            }`
        )
        .join('\n') || '  (No category breakdown yet)';

      const transactionLines = (context.recentTransactions || [])
        .slice(0, 8)
        .map(
          (t) =>
            `  - ${t.date}: ${t.title} - ${currency} ${t.amount} [${t.category}] (${
              t.isEssential ? 'Essential' : 'Flexible'
            }, source: ${t.source || 'manual'})`
        )
        .join('\n') || '  (No transactions logged yet)';

      const savingsGoalsLines = (context.savingsProgress?.activeGoals || [])
        .map((g) => `  - ${g.title}: ${currency} ${g.current} / ${currency} ${g.target} (${g.percent.toFixed(0)}%)`)
        .join('\n') || '  (No active savings goals set)';

      const contextBlock = `
========================================
OFFICIAL BACKEND-CALCULATED FINANCIAL CONTEXT:
========================================
- Selected Currency: ${currency}
- User Name: ${userName}
- Monthly Income: ${currency} ${monthlyIncome}
- Official Flexible Budget: ${currency} ${context.flexibleBudget ?? 0}
- Monthly Essential Fixed Expenses: ${currency} ${context.essentialExpenses ?? 0}
- Monthly Savings Target: ${currency} ${savingsTarget}
- Emergency Buffer: ${currency} ${context.emergencyAllocation ?? 0}
- Total Expenses Logged: ${currency} ${context.totalExpenses ?? 0}
- Remaining Flexible Budget: ${currency} ${remainingFlex}
- Adaptive Daily Spending Allowance: ${currency} ${dailyAllowance}/day (Days remaining: ${daysRemaining})
- Initial Baseline Daily Allowance: ${currency} ${context.initialDailyAllowance ?? 0}/day
- Current Daily Burn Rate: ${currency} ${context.dailyBurnRate ?? 0}/day
- Spending Pacing Status: ${context.alerts?.spendingStatus || 'on_track'}
- Overbudget Status: ${context.alerts?.isOverbudget ? 'YES by ' + currency + ' ' + context.alerts.overbudgetAmount : 'NO (On Track)'}
- Savings Target Risk: ${context.alerts?.atRiskOfMissingSavingsGoal ? 'AT RISK of shortfall' : 'PROTECTED'}

SAVINGS PROGRESS:
- Total Saved so far: ${currency} ${context.savingsProgress?.currentTotalSaved ?? 0}
- Active Goals:
${savingsGoalsLines}

CATEGORY-WISE SPENDING:
${categoryLines}

RECENT TRANSACTIONS:
${transactionLines}
========================================
CONVERSATIONAL INSTRUCTIONS FOR THIS TURN:
- Provide response as valid JSON matching this schema:
{
  "reply": "string (conversational response in markdown, starting with a direct verdict when asking about a purchase)",
  "suggestedFollowUps": ["string (2 to 3 natural follow-up questions)"],
  "quickActions": [
    {
      "label": "string (button text, e.g. 'Open in Purchase Analyzer')",
      "action": "open_analyzer | open_expenses | open_savings | open_budget",
      "params": { ... }
    }
  ]
}
- If the user asks whether they can buy or afford an item, answer directly in your first sentence ("Yes, you can afford...", "You can afford this, but...", or "I wouldn't recommend buying this right now...").
- Calculate the effect using the verified numbers above (remaining flexible funds: ${currency} ${remainingFlex}, daily allowance: ${currency} ${dailyAllowance}/day).
- If tight or unaffordable, suggest cheaper alternatives, a reasonable spending range, or a monthly savings pace.
- Maintain context if this is a follow-up question.
- Keep your tone friendly, supportive, and natural.
========================================
USER MESSAGE:
${message}
`;

      const contents: Array<{ role: string; parts: Array<{ text: string }> }> = [];

      for (const turn of history.slice(-6)) {
        if (turn.sender === 'user') {
          contents.push({ role: 'user', parts: [{ text: turn.text }] });
        } else if (turn.sender === 'ai') {
          contents.push({ role: 'model', parts: [{ text: turn.text }] });
        }
      }

      contents.push({ role: 'user', parts: [{ text: contextBlock }] });

      const response = await geminiClient!.models.generateContent({
        model: GEMINI_MODEL,
        contents: contents as any,
        config: {
          systemInstruction: PENNYWISE_SYSTEM_INSTRUCTION,
          responseMimeType: 'application/json',
        },
      });

      const responseText = response.text || '';
      try {
        const parsed = JSON.parse(responseText);
        if (parsed.reply) {
          return {
            reply: parsed.reply,
            suggestedFollowUps: Array.isArray(parsed.suggestedFollowUps) && parsed.suggestedFollowUps.length > 0
              ? parsed.suggestedFollowUps
              : ['What is my daily spending allowance?', 'Can you suggest a cheaper option?'],
            quickActions: Array.isArray(parsed.quickActions) ? parsed.quickActions : [],
          };
        }
      } catch (_jsonErr) {
        // If Gemini didn't return pure JSON, wrap text gracefully
        if (responseText) {
          const fallback = buildDeterministicResponse();
          return {
            reply: responseText,
            suggestedFollowUps: fallback.suggestedFollowUps,
            quickActions: fallback.quickActions,
          };
        }
      }

      return buildDeterministicResponse();
    } catch (err: any) {
      if (isQuotaOrBillingError(err)) {
        markQuotaExhausted();
      }
      return buildDeterministicResponse();
    }
  },

  /**
   * Purchase Impact Narrative Grounding
   */
  async explainPurchaseImpact(params: PurchaseAnalysisParams): Promise<string> {
    const fallbackText = `Purchasing **${params.itemName}** for **${params.currency} ${params.numPrice.toLocaleString()}** will reduce your remaining flexible budget from **${params.currency} ${params.currentRemainingFlexible.toLocaleString()}** to **${params.currency} ${Math.max(0, params.newRemainingFlexible).toLocaleString()}**.

Your adaptive daily allowance will adjust from **${params.currency} ${params.currentDailyAllowance.toLocaleString()}/day** to **${params.currency} ${params.newDailyAllowance.toLocaleString()}/day** across the remaining **${params.daysRemaining}** days of your budget cycle.

${
  params.cutsIntoSavings
    ? `⚠️ **Savings Goal Impact**: This purchase exceeds your available flexible funds and would cut into your monthly savings target by **${params.currency} ${params.savingsDeficit.toLocaleString()}**.`
    : `✅ **Savings Protected**: Your monthly savings goal of **${params.currency} ${params.monthlySavingsGoal.toLocaleString()}** remains protected.`
}

This purchase is classified under **${params.category}** with **${params.priority}** priority (Verdict: **${params.affordabilityVerdict}**). Take a moment to consider whether this fits your immediate priorities. You always have the final decision.`;

    if (shouldSkipLiveCall()) {
      return fallbackText;
    }

    try {
      const prompt = `
A user is considering a purchase. Analyze this strictly using the backend financial calculations below.
Do NOT guarantee that they can or cannot afford it.
Never initiate or approve the purchase—the user always makes the final decision.
Explain the impact neutrally, supportively, and concisely.

Product Name: "${params.itemName}"
Purchase Amount: ${params.currency} ${params.numPrice}
Category: ${params.category}
Priority type: ${params.priority}

BACKEND CALCULATIONS:
- Current Remaining Flexible Budget: ${params.currency} ${params.currentRemainingFlexible}
- Remaining Flexible Budget Afterward: ${params.currency} ${params.newRemainingFlexible}
- Current Daily Spending Allowance: ${params.currency} ${params.currentDailyAllowance}/day
- New Daily Spending Allowance Afterward: ${params.currency} ${params.newDailyAllowance}/day (${params.daysRemaining} days remaining)
- Daily Allowance Reduction: ${params.currency} ${params.dailyAllowanceDrop.toFixed(2)}/day
- Effect on Savings Goal: ${
        params.cutsIntoSavings
          ? `Cuts into monthly savings by ${params.currency} ${params.savingsDeficit}`
          : 'Savings goal remains protected'
      }
- Affordability Verdict: ${params.affordabilityVerdict}

SPECIFICALLY ADDRESS:
1. Whether the purchase fits the available budget based on these numbers.
2. How much flexible money remains afterward.
3. Whether it affects the monthly savings goal (${params.currency} ${params.monthlySavingsGoal}).
4. What practical pacing or trade-offs the user should consider before purchasing.

Keep explanation in 2-3 friendly, practical paragraphs. Highlight key figures.
`;

      const aiResponse = await geminiClient!.models.generateContent({
        model: GEMINI_MODEL,
        contents: prompt,
        config: {
          systemInstruction: PENNYWISE_SYSTEM_INSTRUCTION,
        },
      });

      return aiResponse.text || fallbackText;
    } catch (err: any) {
      if (isQuotaOrBillingError(err)) {
        markQuotaExhausted();
      }
      return fallbackText;
    }
  },

  /**
   * Suggest Category with Gemini or Deterministic Fallback
   */
  async suggestCategory(textToClassify: string, validCategories: string[]): Promise<{ category: string; reasoning: string }> {
    const deterministicFallback = deterministicCategoryClassifier(textToClassify, validCategories);

    if (shouldSkipLiveCall()) {
      return deterministicFallback;
    }

    try {
      const prompt = `
Given this expense description or vendor title: "${textToClassify}"
Select the single best matching category from this list:
${validCategories.join(', ')}

Return ONLY valid JSON matching this schema:
{
  "category": "one of the categories listed above",
  "reasoning": "brief 1-sentence reason"
}
`;

      const response = await geminiClient!.models.generateContent({
        model: GEMINI_MODEL,
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
        },
      });

      const parsed = JSON.parse(response.text || '{}');
      const suggestedCategory = validCategories.includes(parsed.category) ? parsed.category : deterministicFallback.category;

      return {
        category: suggestedCategory,
        reasoning: parsed.reasoning || deterministicFallback.reasoning,
      };
    } catch (err: any) {
      if (isQuotaOrBillingError(err)) {
        markQuotaExhausted();
      }
      return deterministicFallback;
    }
  },

  /**
   * Spending Insights Generator (Dashboard)
   */
  async generateSpendingInsights(budget: any, expenses: any[] = [], currency = 'USD'): Promise<{ summary: string; tips: string[] }> {
    const remainingFlex = Number(budget?.remainingFlexibleBudget ?? 0);
    const dailyAllowance = Number(budget?.adaptiveDailyAllowance ?? budget?.dailySpendingAllowance ?? 0);
    const savingsGoal = Number(budget?.savingsTarget ?? budget?.monthlySavingsGoal ?? 0);
    const daysRemaining = Number(budget?.daysRemaining ?? 15);
    const burnRate = Number(budget?.dailyBurnRate ?? 0);
    const isOver = Boolean(budget?.alerts?.isOverbudget || remainingFlex < 0);

    let fallbackSummary = `You have ${currency} ${remainingFlex.toLocaleString()} remaining in your flexible budget with an adaptive daily allowance of ${currency} ${dailyAllowance.toLocaleString()}/day.`;
    const fallbackTips: string[] = [];

    if (isOver) {
      const overAmount = Math.abs(remainingFlex);
      fallbackSummary = `You are currently ${currency} ${overAmount.toLocaleString()} over your flexible spending budget for this cycle.`;
      fallbackTips.push('Pause non-essential discretionary purchases to prevent cutting deeper into savings.');
      fallbackTips.push(`Your adaptive allowance is set to ${currency} 0/day to help you recover your financial cushion.`);
      fallbackTips.push(`Protect your ${currency} ${savingsGoal.toLocaleString()} monthly savings milestone.`);
    } else if (burnRate > dailyAllowance * 1.25 && dailyAllowance > 0) {
      fallbackSummary = `Your daily spending burn rate (${currency} ${burnRate.toLocaleString()}/day) is pacing slightly above your adaptive allowance (${currency} ${dailyAllowance.toLocaleString()}/day).`;
      fallbackTips.push(`Aim to keep discretionary purchases under ${currency} ${dailyAllowance.toLocaleString()} today.`);
      fallbackTips.push(`You have ${daysRemaining} days remaining in this budget period.`);
      fallbackTips.push(`Your ${currency} ${savingsGoal.toLocaleString()} savings target is on track if you maintain this ceiling.`);
    } else {
      fallbackSummary = `Great pacing! You have ${currency} ${remainingFlex.toLocaleString()} in flexible funds with ${daysRemaining} days left in your budget cycle.`;
      fallbackTips.push(`Pacing discretionary spending to your ${currency} ${dailyAllowance.toLocaleString()}/day allowance keeps savings fully protected.`);
      fallbackTips.push(`Logged ${expenses.length} transaction${expenses.length === 1 ? '' : 's'} so far this period.`);
      fallbackTips.push(`Your ${currency} ${savingsGoal.toLocaleString()} savings goal remains on schedule.`);
    }

    if (shouldSkipLiveCall()) {
      return { summary: fallbackSummary, tips: fallbackTips };
    }

    try {
      const prompt = `
Analyze the user's spending data and provide 3 brief, encouraging, practical financial insights and 1 short summary.
Financial Data:
- Currency: ${currency}
- Total Income: ${currency} ${budget?.monthlyIncome ?? 0}
- Essential Expenses: ${currency} ${budget?.monthlyEssentialExpenses ?? budget?.essentialExpenses ?? 0}
- Savings Goal: ${currency} ${savingsGoal}
- Flexible Budget: ${currency} ${budget?.flexibleBudget ?? 0}
- Remaining Flexible: ${currency} ${remainingFlex}
- Daily Allowance: ${currency} ${dailyAllowance}
- Logged Expenses Count: ${expenses.length}

Provide response strictly in JSON format matching this schema:
{
  "summary": "1-2 sentence supportive summary of budget status",
  "tips": ["Tip 1", "Tip 2", "Tip 3"]
}
`;

      const response = await geminiClient!.models.generateContent({
        model: GEMINI_MODEL,
        contents: prompt,
        config: {
          systemInstruction: PENNYWISE_SYSTEM_INSTRUCTION,
          responseMimeType: 'application/json',
        },
      });

      const parsed = JSON.parse(response.text || '{}');
      return {
        summary: parsed.summary || fallbackSummary,
        tips: Array.isArray(parsed.tips) && parsed.tips.length > 0 ? parsed.tips : fallbackTips,
      };
    } catch (err: any) {
      if (isQuotaOrBillingError(err)) {
        markQuotaExhausted();
      }
      return { summary: fallbackSummary, tips: fallbackTips };
    }
  },
};
