import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateSavingsAnalytics,
  SAVINGS_DISCLAIMER,
} from '../src/server/savingsEngine.js';

test('1. Core Savings Calculations - Progress, Remaining & Percentage', () => {
  const result = calculateSavingsAnalytics({
    goals: [
      {
        id: 'goal-1',
        title: 'Emergency Fund',
        targetAmount: 3000,
        currentAmount: 1500,
        currency: 'USD',
      },
      {
        id: 'goal-2',
        title: 'Vacation Trip',
        targetAmount: 2000,
        currentAmount: 500,
        currency: 'USD',
      },
    ],
    monthlySavingsCapacity: 400,
    currency: 'USD',
  });

  assert.equal(result.goalsCount, 2);
  assert.equal(result.totalTarget, 5000);
  assert.equal(result.totalSaved, 2000);
  assert.equal(result.totalRemaining, 3000);
  assert.equal(result.overallPercentage, 40); // 2000 / 5000 = 40%

  const goal1 = result.goals.find((g) => g.id === 'goal-1')!;
  assert.equal(goal1.targetAmount, 3000);
  assert.equal(goal1.currentAmount, 1500);
  assert.equal(goal1.remainingAmount, 1500);
  assert.equal(goal1.progressPercentage, 50);
  assert.equal(goal1.isAchieved, false);

  const goal2 = result.goals.find((g) => g.id === 'goal-2')!;
  assert.equal(goal2.remainingAmount, 1500);
  assert.equal(goal2.progressPercentage, 25);
  assert.equal(goal2.isAchieved, false);
});

test('2. Achieved and Overachieved Goals', () => {
  const result = calculateSavingsAnalytics({
    goals: [
      {
        id: 'exact-goal',
        title: 'New Laptop',
        targetAmount: 1200,
        currentAmount: 1200,
        currency: 'EUR',
      },
      {
        id: 'over-goal',
        title: 'Surplus Buffer',
        targetAmount: 500,
        currentAmount: 650,
        currency: 'EUR',
      },
    ],
    monthlySavingsCapacity: 300,
    currency: 'EUR',
  });

  assert.equal(result.achievedCount, 2);

  const exact = result.goals.find((g) => g.id === 'exact-goal')!;
  assert.equal(exact.isAchieved, true);
  assert.equal(exact.remainingAmount, 0);
  assert.equal(exact.progressPercentage, 100);
  assert.equal(exact.feasibilityVerdict, 'achieved');
  assert.equal(exact.achievableByTargetDate, true);

  const over = result.goals.find((g) => g.id === 'over-goal')!;
  assert.equal(over.isAchieved, true);
  assert.equal(over.remainingAmount, 0);
  assert.equal(over.progressPercentage, 100);
  assert.equal(over.feasibilityVerdict, 'achieved');
});

test('3. Timeline Feasibility Estimation - On Track, Moderate & High Pace Needed', () => {
  // Reference date: March 1, 2026. Target date: September 1, 2026 (~6 months away / 184 days)
  const referenceDate = new Date('2026-03-01T00:00:00Z');
  const targetDate = '2026-09-01T00:00:00Z';

  // Goal: Target 1000, Current 400. Remaining: 600.
  // 184 days / 30.4375 ≈ 6.0 months.
  // Required monthly rate = 600 / 6.0 = 100/mo.

  // Scenario A: Monthly capacity = 150 (Capacity >= Required rate 100) -> on_track
  const resOnTrack = calculateSavingsAnalytics({
    goals: [
      {
        id: 'car-downpayment',
        title: 'Car Downpayment',
        targetAmount: 1000,
        currentAmount: 400,
        targetDate,
        currency: 'USD',
      },
    ],
    monthlySavingsCapacity: 150,
    currency: 'USD',
    referenceDate,
  });

  const goalA = resOnTrack.goals[0];
  assert.equal(goalA.feasibilityVerdict, 'on_track');
  assert.equal(goalA.achievableByTargetDate, true);
  assert.ok(goalA.requiredMonthlySavingsRate! <= 150);

  // Scenario B: Monthly capacity = 80 (Required rate 100 is between 80 and 80*1.5=120) -> moderate_pace_needed
  const resModerate = calculateSavingsAnalytics({
    goals: [
      {
        id: 'car-downpayment',
        title: 'Car Downpayment',
        targetAmount: 1000,
        currentAmount: 400,
        targetDate,
        currency: 'USD',
      },
    ],
    monthlySavingsCapacity: 80,
    currency: 'USD',
    referenceDate,
  });

  const goalB = resModerate.goals[0];
  assert.equal(goalB.feasibilityVerdict, 'moderate_pace_needed');
  assert.equal(goalB.achievableByTargetDate, false);

  // Scenario C: Monthly capacity = 40 (Required rate 100 is > 40*1.5=60) -> high_pace_needed
  const resHighPace = calculateSavingsAnalytics({
    goals: [
      {
        id: 'car-downpayment',
        title: 'Car Downpayment',
        targetAmount: 1000,
        currentAmount: 400,
        targetDate,
        currency: 'USD',
      },
    ],
    monthlySavingsCapacity: 40,
    currency: 'USD',
    referenceDate,
  });

  const goalC = resHighPace.goals[0];
  assert.equal(goalC.feasibilityVerdict, 'high_pace_needed');
  assert.equal(goalC.achievableByTargetDate, false);
});

test('4. Overdue Target Date Detection', () => {
  const referenceDate = new Date('2026-05-15T00:00:00Z');
  const pastTargetDate = '2026-04-01T00:00:00Z'; // 45 days in the past

  const result = calculateSavingsAnalytics({
    goals: [
      {
        id: 'expired-goal',
        title: 'Past Goal',
        targetAmount: 500,
        currentAmount: 200,
        targetDate: pastTargetDate,
        currency: 'USD',
      },
    ],
    monthlySavingsCapacity: 100,
    currency: 'USD',
    referenceDate,
  });

  const goal = result.goals[0];
  assert.equal(goal.feasibilityVerdict, 'overdue');
  assert.equal(goal.achievableByTargetDate, false);
  assert.ok(goal.daysRemainingToTargetDate! <= 0);
  assert.match(goal.feasibilityExplanation, /passed/i);
});

test('5. Flexible Goal with No Target Date', () => {
  const result = calculateSavingsAnalytics({
    goals: [
      {
        id: 'flexible-goal',
        title: 'General Wealth Fund',
        targetAmount: 10000,
        currentAmount: 1200,
      },
    ],
    monthlySavingsCapacity: 500,
    currency: 'USD',
  });

  const goal = result.goals[0];
  assert.equal(goal.feasibilityVerdict, 'no_target_date');
  assert.equal(goal.daysRemainingToTargetDate, null);
  assert.equal(goal.monthsRemainingToTargetDate, null);
  assert.equal(goal.requiredMonthlySavingsRate, null);
});

test('6. Input Sanitization & Resilience', () => {
  const result = calculateSavingsAnalytics({
    goals: [
      {
        id: 'messy-input',
        title: '   Renovation Fund   ',
        targetAmount: ('2500.50' as unknown) as number,
        currentAmount: ('500.25' as unknown) as number,
        category: '  Home  ',
      },
      {
        id: 'negative-values',
        title: 'Negative Handled',
        targetAmount: -500,
        currentAmount: -100,
      },
    ],
    monthlySavingsCapacity: -50,
  });

  const goal1 = result.goals[0];
  assert.equal(goal1.title, 'Renovation Fund');
  assert.equal(goal1.targetAmount, 2500.5);
  assert.equal(goal1.currentAmount, 500.25);
  assert.equal(goal1.remainingAmount, 2000.25);
  assert.equal(goal1.category, 'Home');

  const goal2 = result.goals[1];
  assert.equal(goal2.targetAmount, 0);
  assert.equal(goal2.currentAmount, 0);
  assert.equal(goal2.remainingAmount, 0);
});

test('7. Mandatory Educational Disclaimer Preserved', () => {
  const result = calculateSavingsAnalytics({
    goals: [],
  });

  assert.equal(result.disclaimer, SAVINGS_DISCLAIMER);
  assert.match(result.disclaimer, /educational milestones/i);
  assert.match(result.disclaimer, /verified bank account balances/i);
});
