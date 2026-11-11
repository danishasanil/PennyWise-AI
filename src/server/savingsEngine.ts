/**
 * PennyWise AI - Deterministic Savings Goals Engine
 * 
 * Strict deterministic, decimal-safe savings calculation and timeline estimation.
 * All official savings calculations, progress rates, remaining amounts, and target-date
 * feasibility assessments are calculated here in the backend using pure mathematical logic.
 * 
 * CRITICAL RULE:
 * Savings goals represent tracked internal planning milestones, NOT verified bank account
 * balances or completed depository transfers.
 */

export interface RawSavingsGoalInput {
  id?: string;
  title?: string;
  name?: string;
  targetAmount: number;
  currentAmount?: number;
  currentSaved?: number;
  currency?: string;
  targetDate?: string;
  category?: string;
}

export interface SavingsGoalAnalyticsItem {
  id: string;
  title: string;
  targetAmount: number;
  currentAmount: number;
  currency: string;
  targetDate?: string;
  category: string;
  remainingAmount: number;
  progressPercentage: number;
  isAchieved: boolean;
  daysRemainingToTargetDate: number | null;
  monthsRemainingToTargetDate: number | null;
  requiredMonthlySavingsRate: number | null;
  achievableByTargetDate: boolean;
  feasibilityVerdict:
    | 'achieved'
    | 'on_track'
    | 'moderate_pace_needed'
    | 'high_pace_needed'
    | 'overdue'
    | 'no_target_date';
  feasibilityExplanation: string;
}

export interface SavingsAnalyticsResult {
  totalSaved: number;
  totalTarget: number;
  totalRemaining: number;
  overallPercentage: number;
  goalsCount: number;
  achievedCount: number;
  goals: SavingsGoalAnalyticsItem[];
  disclaimer: string;
}

export interface SavingsCalculationParams {
  goals: RawSavingsGoalInput[];
  monthlySavingsCapacity?: number;
  currency?: string;
  referenceDate?: string | Date;
}

export const SAVINGS_DISCLAIMER =
  'Tracked savings are educational milestones and do not represent verified bank account balances.';

/**
 * Validates and sanitizes a financial number, guaranteeing non-negative finite value
 */
function sanitizeAmount(val: unknown): number {
  const num = Number(val);
  if (isNaN(num) || !isFinite(num) || num < 0) {
    return 0;
  }
  return Math.round(num * 100) / 100;
}

/**
 * Computes deterministic savings analytics and target-date feasibility
 */
export function calculateSavingsAnalytics(params: SavingsCalculationParams): SavingsAnalyticsResult {
  const {
    goals = [],
    monthlySavingsCapacity = 0,
    currency = 'USD',
    referenceDate = new Date(),
  } = params;

  const now = typeof referenceDate === 'string' ? new Date(referenceDate) : referenceDate;
  const safeCapacity = sanitizeAmount(monthlySavingsCapacity);

  let totalSaved = 0;
  let totalTarget = 0;

  const calculatedGoals: SavingsGoalAnalyticsItem[] = goals.map((g, idx) => {
    const target = sanitizeAmount(g.targetAmount);
    const current = sanitizeAmount(g.currentAmount ?? g.currentSaved ?? 0);
    const goalTitle = (g.title || g.name || `Savings Goal ${idx + 1}`).trim();
    const goalCurrency = (g.currency || currency).toUpperCase().trim();
    const goalCategory = g.category?.trim() || 'General';
    const goalId = g.id || `goal-${idx + 1}`;

    const remaining = Math.max(0, Math.round((target - current) * 100) / 100);
    const pct = target > 0 ? Math.min(100, Math.round((current / target) * 100)) : 0;
    const isAchieved = target > 0 && current >= target;

    totalSaved += current;
    totalTarget += target;

    let daysRemaining: number | null = null;
    let monthsRemaining: number | null = null;
    let requiredMonthlyRate: number | null = null;
    let achievable = false;
    let verdict: SavingsGoalAnalyticsItem['feasibilityVerdict'] = 'no_target_date';
    let explanation = 'No target date set. You can contribute toward this goal flexibly.';

    if (isAchieved) {
      achievable = true;
      verdict = 'achieved';
      explanation = 'Goal achieved! You have reached 100% of your target.';
    } else if (g.targetDate) {
      const targetDateObj = new Date(g.targetDate);
      if (!isNaN(targetDateObj.getTime())) {
        const diffMs = targetDateObj.getTime() - now.getTime();
        // Calculate whole days remaining
        daysRemaining = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

        if (daysRemaining <= 0) {
          verdict = 'overdue';
          explanation = 'Target date has passed. Update your target date to re-estimate pace.';
        } else {
          // Average month length = 30.4375 days
          monthsRemaining = Math.round((daysRemaining / 30.4375) * 10) / 10;
          const safeMonths = Math.max(0.5, monthsRemaining);
          requiredMonthlyRate = Math.round((remaining / safeMonths) * 100) / 100;

          if (safeCapacity <= 0) {
            achievable = false;
            verdict = 'moderate_pace_needed';
            explanation = `Requires saving approximately ${goalCurrency} ${requiredMonthlyRate.toLocaleString()}/month across the remaining ${monthsRemaining} months.`;
          } else if (requiredMonthlyRate <= safeCapacity) {
            achievable = true;
            verdict = 'on_track';
            explanation = `Achievable at your current monthly savings budget (${goalCurrency} ${requiredMonthlyRate.toLocaleString()}/mo needed vs ${goalCurrency} ${safeCapacity.toLocaleString()}/mo budgeted).`;
          } else if (requiredMonthlyRate <= safeCapacity * 1.5) {
            achievable = false;
            verdict = 'moderate_pace_needed';
            explanation = `Requires saving ${goalCurrency} ${requiredMonthlyRate.toLocaleString()}/month, which is slightly above your monthly savings budget (${goalCurrency} ${safeCapacity.toLocaleString()}/mo).`;
          } else {
            achievable = false;
            verdict = 'high_pace_needed';
            explanation = `Requires saving ${goalCurrency} ${requiredMonthlyRate.toLocaleString()}/month to meet your target date. Consider extending target date.`;
          }
        }
      }
    }

    return {
      id: goalId,
      title: goalTitle,
      targetAmount: target,
      currentAmount: current,
      currency: goalCurrency,
      targetDate: g.targetDate,
      category: goalCategory,
      remainingAmount: remaining,
      progressPercentage: pct,
      isAchieved,
      daysRemainingToTargetDate: daysRemaining,
      monthsRemainingToTargetDate: monthsRemaining,
      requiredMonthlySavingsRate: requiredMonthlyRate,
      achievableByTargetDate: achievable,
      feasibilityVerdict: verdict,
      feasibilityExplanation: explanation,
    };
  });

  const overallPercentage =
    totalTarget > 0 ? Math.min(100, Math.round((totalSaved / totalTarget) * 100)) : 0;
  const totalRemaining = Math.max(0, Math.round((totalTarget - totalSaved) * 100) / 100);

  return {
    totalSaved: Math.round(totalSaved * 100) / 100,
    totalTarget: Math.round(totalTarget * 100) / 100,
    totalRemaining,
    overallPercentage,
    goalsCount: calculatedGoals.length,
    achievedCount: calculatedGoals.filter((g) => g.isAchieved).length,
    goals: calculatedGoals,
    disclaimer: SAVINGS_DISCLAIMER,
  };
}
