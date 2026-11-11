import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import {
  User,
  onAuthStateChanged,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  sendPasswordResetEmail,
} from 'firebase/auth';
import {
  doc,
  getDoc,
  setDoc,
  collection,
  onSnapshot,
  addDoc,
  deleteDoc,
  updateDoc,
} from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType } from '../firebase/config';
import {
  BudgetSummary,
  CurrencyCode,
  Expense,
  ExpenseCategory,
  NavTab,
  PaymentRecord,
  PayPalOrder,
  PurchaseAnalysis,
  SavingsGoal,
  UserProfile,
} from '../types/finance';
import { DEMO_EXPENSES, DEMO_PROFILE, DEMO_SAVINGS_GOALS } from '../data/demoData';
import { api } from '../services/api';
import { formatCurrencyWithIntl } from '../data/internationalData';

interface FinanceContextType {
  user: User | null;
  profile: UserProfile | null;
  expenses: Expense[];
  savingsGoals: SavingsGoal[];
  plannedPurchases: PurchaseAnalysis[];
  paypalOrders: PayPalOrder[];
  payments: PaymentRecord[];
  budget: BudgetSummary;
  isDemo: boolean;
  isLoading: boolean;
  syncStatus: 'idle' | 'saving' | 'synced' | 'error';
  successMessage: string | null;
  error: string | null;
  clearError: () => void;
  clearSuccess: () => void;
  activeTab: NavTab;
  setActiveTab: (tab: NavTab) => void;
  formatMoney: (amount: number, overrideCurrency?: CurrencyCode) => string;
  startDemoMode: () => void;
  exitDemoMode: () => void;
  saveUserProfile: (profileData: Partial<UserProfile>) => Promise<void>;
  addExpense: (expense: Omit<Expense, 'id' | 'createdAt'>) => Promise<void>;
  updateExpense: (expense: Expense) => Promise<void>;
  deleteExpense: (id: string) => Promise<void>;
  addSavingsGoal: (goal: Omit<SavingsGoal, 'id' | 'createdAt'>) => Promise<void>;
  updateSavingsGoal: (goal: SavingsGoal) => Promise<void>;
  depositToSavingsGoal: (goalId: string, amount: number) => Promise<void>;
  deleteSavingsGoal: (id: string) => Promise<void>;
  savePlannedPurchase: (purchase: Omit<PurchaseAnalysis, 'id' | 'createdAt'>) => Promise<void>;
  recordPayPalOrder: (order: Omit<PayPalOrder, 'id' | 'createdAt'>) => Promise<void>;
  recordVerifiedPayment: (payment: Omit<PaymentRecord, 'id' | 'createdAt'>) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (fullName: string, email: string, password: string) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  signOutUser: () => Promise<void>;
  refreshBudget: () => Promise<void>;
  pendingCheckoutItem: PendingCheckoutItem | null;
  setPendingCheckoutItem: (item: PendingCheckoutItem | null) => void;
  proceedToCheckoutWithItem: (item: PendingCheckoutItem) => void;
  pendingAnalyzerItem: { itemName: string; price?: number } | null;
  setPendingAnalyzerItem: (item: { itemName: string; price?: number } | null) => void;
  navigateToAnalyzer: (item: { itemName: string; price?: number }) => void;
}

export interface PendingCheckoutItem {
  productId?: string;
  itemName: string;
  price: number;
  currency: string;
  category: ExpenseCategory;
  priority?: 'need' | 'want' | 'luxury';
  description?: string;
  source: 'demo_store' | 'purchase_analyzer';
}

const defaultBudget: BudgetSummary = {
  monthlyIncome: 0,
  essentialExpenses: 0,
  savingsTarget: 0,
  emergencyAllocation: 0,
  flexibleBudget: 0,
  discretionaryExpensesSpent: 0,
  essentialLoggedExpenses: 0,
  totalLoggedExpenses: 0,
  totalExpenses: 0,
  remainingFlexibleBudget: 0,
  initialDailyAllowance: 0,
  adaptiveDailyAllowance: 0,
  dailyBurnRate: 0,
  daysInPeriod: 30,
  daysRemaining: 23,
  daysElapsed: 7,
  currentDateISO: new Date().toISOString(),
  savingsTargetRate: 0,
  percentIncomeSpent: 0,
  percentFlexibleBudgetSpent: 0,
  percentPeriodElapsed: 0,
  projectedDiscretionaryTotal: 0,
  projectedTotalSpending: 0,
  projectedNetSurplus: 0,
  alerts: {
    isOverbudget: false,
    overbudgetAmount: 0,
    spendingStatus: 'on_track',
    isPacingAhead: false,
    pacingDifferentialPerDay: 0,
    atRiskOfMissingSavingsGoal: false,
    projectedSavingsShortfall: 0,
    projectedSavingsSaved: 0,
    projectedSavingsAchievementRate: 100,
  },
  currency: 'USD',
  isZeroDecimal: false,
  decimalPlaces: 2,
};

const FinanceContext = createContext<FinanceContextType | undefined>(undefined);

export const FinanceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [savingsGoals, setSavingsGoals] = useState<SavingsGoal[]>([]);
  const [plannedPurchases, setPlannedPurchases] = useState<PurchaseAnalysis[]>([]);
  const [paypalOrders, setPaypalOrders] = useState<PayPalOrder[]>([]);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [budget, setBudget] = useState<BudgetSummary>(defaultBudget);
  const [isDemo, setIsDemo] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'saving' | 'synced' | 'error'>('idle');
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<NavTab>('dashboard');
  const [pendingCheckoutItem, setPendingCheckoutItem] = useState<PendingCheckoutItem | null>(null);
  const [pendingAnalyzerItem, setPendingAnalyzerItem] = useState<{ itemName: string; price?: number } | null>(null);

  const clearError = () => setError(null);
  const clearSuccess = () => setSuccessMessage(null);

  const proceedToCheckoutWithItem = (item: PendingCheckoutItem) => {
    setPendingCheckoutItem(item);
    setActiveTab('paypal');
  };

  const navigateToAnalyzer = (item: { itemName: string; price?: number }) => {
    setPendingAnalyzerItem(item);
    setActiveTab('analyzer');
  };

  const formatMoney = (amount: number, overrideCurrency?: CurrencyCode): string => {
    const curr = overrideCurrency || profile?.preferredCurrency || 'USD';
    return formatCurrencyWithIntl(amount, curr);
  };

  // Official backend budget sync using deterministic engine
  const refreshBudget = async () => {
    if (!profile) return;
    try {
      const calculated = await api.calculateBudget({
        monthlyIncome: profile.monthlyIncome,
        monthlyEssentialExpenses: profile.monthlyEssentialExpenses,
        monthlySavingsGoal: profile.monthlySavingsGoal,
        emergencyAllocation: profile.emergencyAllocation,
        loggedExpenses: expenses.map((e) => ({
          amount: e.amount,
          isEssential: e.isEssential,
          category: e.category,
          date: e.date,
        })),
        currency: profile.preferredCurrency || 'USD',
        currentDate: new Date().toISOString(),
      });
      setBudget(calculated);

      // Persist calculated budget snapshot to Firestore for authenticated users
      if (user && !isDemo) {
        try {
          const budgetDocRef = doc(db, 'users', user.uid, 'budgets', 'current');
          await setDoc(
            budgetDocRef,
            {
              userId: user.uid,
              currency: profile.preferredCurrency || 'USD',
              monthlyIncome: calculated.monthlyIncome,
              essentialExpenses: calculated.essentialExpenses,
              savingsTarget: calculated.savingsTarget,
              emergencyAllocation: calculated.emergencyAllocation,
              flexibleBudget: calculated.flexibleBudget,
              remainingFlexibleBudget: calculated.remainingFlexibleBudget,
              initialDailyAllowance: calculated.initialDailyAllowance,
              adaptiveDailyAllowance: calculated.adaptiveDailyAllowance,
              totalExpenses: calculated.totalExpenses,
              updatedAt: new Date().toISOString(),
            },
            { merge: true }
          );
        } catch (err: any) {
          handleFirestoreError(err, OperationType.WRITE, `users/${user.uid}/budgets/current`);
        }
      }
    } catch (err: any) {
      console.error('Error refreshing budget from backend:', err);
    }
  };

  // Recalculate whenever profile or expenses change
  useEffect(() => {
    if (profile) {
      refreshBudget();
    }
  }, [profile, expenses]);

  // Handle Firebase Auth state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        setIsDemo(false);
        setIsLoading(true);
        try {
          const userDocRef = doc(db, 'users', currentUser.uid);
          const snap = await getDoc(userDocRef);
          if (snap.exists()) {
            const data = snap.data() as UserProfile;
            setProfile({ ...data, id: currentUser.uid, isDemo: false });
          } else {
            // First time login - set partial initial profile
            setProfile({
              id: currentUser.uid,
              displayName: currentUser.displayName || 'Valued User',
              country: 'United States',
              preferredCurrency: 'USD',
              monthlyIncome: 0,
              monthlyEssentialExpenses: 0,
              monthlySavingsGoal: 0,
              emergencyAllocation: 0,
              monthlyBudgetPeriod: '1st to End of Month',
              onboardingCompleted: false,
              isDemo: false,
            });
          }
        } catch (err: any) {
          handleFirestoreError(err, OperationType.GET, `users/${currentUser.uid}`);
        } finally {
          setIsLoading(false);
        }
      } else {
        // Not logged in: check local storage for demo or local state
        const storedDemo = localStorage.getItem('pennywise_is_demo');
        const storedProfile = localStorage.getItem('pennywise_profile');

        if (storedDemo === 'true') {
          setIsDemo(true);
          setProfile(DEMO_PROFILE);
          setExpenses(DEMO_EXPENSES);
          setSavingsGoals(DEMO_SAVINGS_GOALS);
        } else if (storedProfile) {
          try {
            setProfile(JSON.parse(storedProfile));
            const storedExp = localStorage.getItem('pennywise_expenses');
            if (storedExp) setExpenses(JSON.parse(storedExp));
            const storedGoals = localStorage.getItem('pennywise_goals');
            if (storedGoals) setSavingsGoals(JSON.parse(storedGoals));
          } catch {
            setProfile(null);
          }
        } else {
          setProfile(null);
        }
        setIsLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  // Listen to Firestore real-time collections for authenticated users
  useEffect(() => {
    if (!user || isDemo) return;

    // Listen to Expenses
    const expensesRef = collection(db, 'users', user.uid, 'expenses');
    const unsubExpenses = onSnapshot(
      expensesRef,
      (snapshot) => {
        const loadedExpenses: Expense[] = snapshot.docs.map((docSnap) => ({
          ...(docSnap.data() as Omit<Expense, 'id'>),
          id: docSnap.id,
        }));
        setExpenses(loadedExpenses);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, `users/${user.uid}/expenses`);
      }
    );

    // Listen to Savings Goals
    const goalsRef = collection(db, 'users', user.uid, 'savingsGoals');
    const unsubGoals = onSnapshot(
      goalsRef,
      (snapshot) => {
        const loadedGoals: SavingsGoal[] = snapshot.docs.map((docSnap) => ({
          ...(docSnap.data() as Omit<SavingsGoal, 'id'>),
          id: docSnap.id,
        }));
        setSavingsGoals(loadedGoals);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, `users/${user.uid}/savingsGoals`);
      }
    );

    // Listen to Planned Purchases
    const plansRef = collection(db, 'users', user.uid, 'plannedPurchases');
    const unsubPlans = onSnapshot(
      plansRef,
      (snapshot) => {
        const loadedPlans: PurchaseAnalysis[] = snapshot.docs.map((docSnap) => ({
          ...(docSnap.data() as Omit<PurchaseAnalysis, 'id'>),
          id: docSnap.id,
        }));
        setPlannedPurchases(loadedPlans);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, `users/${user.uid}/plannedPurchases`);
      }
    );

    // Listen to PayPal Orders
    const ordersRef = collection(db, 'users', user.uid, 'paypalOrders');
    const unsubOrders = onSnapshot(
      ordersRef,
      (snapshot) => {
        const loadedOrders: PayPalOrder[] = snapshot.docs.map((docSnap) => ({
          ...(docSnap.data() as Omit<PayPalOrder, 'id'>),
          id: docSnap.id,
        }));
        setPaypalOrders(loadedOrders);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, `users/${user.uid}/paypalOrders`);
      }
    );

    // Listen to Verified Payments
    const paymentsRef = collection(db, 'users', user.uid, 'payments');
    const unsubPayments = onSnapshot(
      paymentsRef,
      (snapshot) => {
        const loadedPayments: PaymentRecord[] = snapshot.docs.map((docSnap) => ({
          ...(docSnap.data() as Omit<PaymentRecord, 'id'>),
          id: docSnap.id,
        }));
        setPayments(loadedPayments);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, `users/${user.uid}/payments`);
      }
    );

    return () => {
      unsubExpenses();
      unsubGoals();
      unsubPlans();
      unsubOrders();
      unsubPayments();
    };
  }, [user, isDemo]);

  // Demo Mode management
  const startDemoMode = () => {
    setIsDemo(true);
    setProfile(DEMO_PROFILE);
    setExpenses(DEMO_EXPENSES);
    setSavingsGoals(DEMO_SAVINGS_GOALS);
    localStorage.setItem('pennywise_is_demo', 'true');
    setActiveTab('dashboard');
  };

  const exitDemoMode = () => {
    setIsDemo(false);
    localStorage.removeItem('pennywise_is_demo');
    if (!user) {
      setProfile(null);
      setExpenses([]);
      setSavingsGoals([]);
    }
  };

  // Save / Update User Profile
  const saveUserProfile = async (profileData: Partial<UserProfile>) => {
    const updated: UserProfile = {
      ...(profile || DEMO_PROFILE),
      ...profileData,
      onboardingCompleted: true,
      updatedAt: new Date().toISOString(),
    };

    setProfile(updated);

    if (user && !isDemo) {
      try {
        const userDocRef = doc(db, 'users', user.uid);
        await setDoc(userDocRef, updated, { merge: true });
      } catch (err: any) {
        handleFirestoreError(err, OperationType.WRITE, `users/${user.uid}`);
      }
    } else {
      localStorage.setItem('pennywise_profile', JSON.stringify(updated));
    }
  };

  // Add Expense with duplicate prevention and backend validation
  const addExpense = async (expenseData: Omit<Expense, 'id' | 'createdAt'>) => {
    const expenseCurrency = expenseData.currency || profile?.preferredCurrency || 'USD';
    const expenseStatus = expenseData.status || 'completed';
    const expenseSource = expenseData.source || 'manual';
    const expenseDescription = expenseData.description || expenseData.title;

    // Duplicate detection: check if an identical expense (same title, amount, and date) already exists
    const isDuplicate = expenses.some(
      (e) =>
        e.title.trim().toLowerCase() === expenseData.title.trim().toLowerCase() &&
        Math.abs(Number(e.amount) - Number(expenseData.amount)) < 0.001 &&
        e.date === expenseData.date
    );

    if (isDuplicate) {
      throw new Error(
        `Duplicate expense detected: "${expenseData.title}" for ${expenseCurrency} ${expenseData.amount} on ${expenseData.date} already exists.`
      );
    }

    // Backend validation call
    const validation = await api.validateExpense({
      title: expenseData.title,
      description: expenseDescription,
      amount: expenseData.amount,
      currency: expenseCurrency,
      category: expenseData.category,
      date: expenseData.date,
      status: expenseStatus,
      source: expenseSource,
    });

    if (!validation.valid) {
      throw new Error(validation.errors?.join(' ') || 'Transaction failed backend validation.');
    }

    const uniqueTxId = `tx-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const newExpense: Expense = {
      ...expenseData,
      id: uniqueTxId,
      description: expenseDescription,
      currency: expenseCurrency,
      status: expenseStatus,
      source: expenseSource,
      userId: user?.uid || (isDemo ? 'demo-user-123' : 'local-user'),
      createdAt: new Date().toISOString(),
    };

    if (user && !isDemo) {
      try {
        const expensesCol = collection(db, 'users', user.uid, 'expenses');
        await addDoc(expensesCol, {
          userId: user.uid,
          title: expenseData.title,
          description: expenseDescription,
          amount: Number(expenseData.amount),
          category: expenseData.category,
          date: expenseData.date,
          paymentMethod: expenseData.paymentMethod || 'Credit Card',
          status: expenseStatus,
          source: expenseSource,
          notes: expenseData.notes || '',
          isEssential: Boolean(expenseData.isEssential),
          currency: expenseCurrency,
          createdAt: new Date().toISOString(),
        });
      } catch (err: any) {
        handleFirestoreError(err, OperationType.CREATE, `users/${user.uid}/expenses`);
      }
    } else {
      const updated = [newExpense, ...expenses];
      setExpenses(updated);
      localStorage.setItem('pennywise_expenses', JSON.stringify(updated));
    }

    // Trigger immediate deterministic budget refresh
    await refreshBudget();
  };

  // Update Expense with backend validation
  const updateExpense = async (expense: Expense) => {
    const expenseCurrency = expense.currency || profile?.preferredCurrency || 'USD';
    const expenseStatus = expense.status || 'completed';
    const expenseSource = expense.source || 'manual';
    const expenseDescription = expense.description || expense.title;

    // Check duplicate against other items (excluding the current expense being edited)
    const isDuplicate = expenses.some(
      (e) =>
        e.id !== expense.id &&
        e.title.trim().toLowerCase() === expense.title.trim().toLowerCase() &&
        Math.abs(Number(e.amount) - Number(expense.amount)) < 0.001 &&
        e.date === expense.date
    );

    if (isDuplicate) {
      throw new Error(
        `Another expense with description "${expense.title}" for ${expenseCurrency} ${expense.amount} on ${expense.date} already exists.`
      );
    }

    // Requirement 7: Prevent users from modifying verified PayPal payment statuses directly from frontend
    const existingExpense = expenses.find((e) => e.id === expense.id);
    if (existingExpense?.source === 'PayPal' && expense.status !== existingExpense.status) {
      throw new Error('Security policy: Verified PayPal payment statuses cannot be modified directly from the frontend.');
    }

    // Backend validation call
    const validation = await api.validateExpense({
      title: expense.title,
      description: expenseDescription,
      amount: expense.amount,
      currency: expenseCurrency,
      category: expense.category,
      date: expense.date,
      status: expenseStatus,
      source: expenseSource,
    });

    if (!validation.valid) {
      throw new Error(validation.errors?.join(' ') || 'Transaction failed backend validation.');
    }

    const updatedExpense: Expense = {
      ...expense,
      description: expenseDescription,
      currency: expenseCurrency,
      status: expenseStatus,
      source: expenseSource,
    };

    if (user && !isDemo) {
      try {
        const expenseDocRef = doc(db, 'users', user.uid, 'expenses', expense.id);
        await updateDoc(expenseDocRef, {
          title: updatedExpense.title,
          description: expenseDescription,
          amount: Number(updatedExpense.amount),
          category: updatedExpense.category,
          date: updatedExpense.date,
          paymentMethod: updatedExpense.paymentMethod || 'Credit Card',
          status: expenseStatus,
          source: expenseSource,
          notes: updatedExpense.notes || '',
          isEssential: Boolean(updatedExpense.isEssential),
          currency: expenseCurrency,
        });
      } catch (err: any) {
        handleFirestoreError(err, OperationType.UPDATE, `users/${user.uid}/expenses/${expense.id}`);
      }
    } else {
      const updated = expenses.map((e) => (e.id === expense.id ? updatedExpense : e));
      setExpenses(updated);
      localStorage.setItem('pennywise_expenses', JSON.stringify(updated));
    }

    // Trigger immediate deterministic budget refresh
    await refreshBudget();
  };

  // Delete Expense and update budget
  const deleteExpense = async (id: string) => {
    if (user && !isDemo) {
      try {
        const expenseDocRef = doc(db, 'users', user.uid, 'expenses', id);
        await deleteDoc(expenseDocRef);
      } catch (err: any) {
        handleFirestoreError(err, OperationType.DELETE, `users/${user.uid}/expenses/${id}`);
      }
    } else {
      const updated = expenses.filter((e) => e.id !== id);
      setExpenses(updated);
      localStorage.setItem('pennywise_expenses', JSON.stringify(updated));
    }

    // Trigger immediate deterministic budget refresh
    await refreshBudget();
  };

  // Add Savings Goal
  const addSavingsGoal = async (goalData: Omit<SavingsGoal, 'id' | 'createdAt'>) => {
    const goalCurrency = goalData.currency || profile?.preferredCurrency || 'USD';
    const newGoal: SavingsGoal = {
      ...goalData,
      currency: goalCurrency,
      id: `goal-${Date.now()}`,
      userId: user?.uid || (isDemo ? 'demo-user-123' : 'local-user'),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    if (user && !isDemo) {
      try {
        const goalsCol = collection(db, 'users', user.uid, 'savingsGoals');
        await addDoc(goalsCol, {
          userId: user.uid,
          title: goalData.title,
          targetAmount: Number(goalData.targetAmount),
          currentAmount: Number(goalData.currentAmount),
          targetDate: goalData.targetDate || '',
          category: goalData.category || 'General',
          notes: goalData.notes || '',
          currency: goalCurrency,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      } catch (err: any) {
        handleFirestoreError(err, OperationType.CREATE, `users/${user.uid}/savingsGoals`);
      }
    } else {
      const updated = [...savingsGoals, newGoal];
      setSavingsGoals(updated);
      localStorage.setItem('pennywise_goals', JSON.stringify(updated));
    }
  };

  // Update Savings Goal
  const updateSavingsGoal = async (goal: SavingsGoal) => {
    const goalCurrency = goal.currency || profile?.preferredCurrency || 'USD';
    const updatedGoal: SavingsGoal = {
      ...goal,
      currency: goalCurrency,
      updatedAt: new Date().toISOString(),
    };

    if (user && !isDemo) {
      try {
        const goalDocRef = doc(db, 'users', user.uid, 'savingsGoals', goal.id);
        await updateDoc(goalDocRef, {
          title: updatedGoal.title,
          targetAmount: Number(updatedGoal.targetAmount),
          currentAmount: Number(updatedGoal.currentAmount),
          targetDate: updatedGoal.targetDate || '',
          category: updatedGoal.category || 'General',
          notes: updatedGoal.notes || '',
          currency: goalCurrency,
          updatedAt: new Date().toISOString(),
        });
      } catch (err: any) {
        handleFirestoreError(err, OperationType.UPDATE, `users/${user.uid}/savingsGoals/${goal.id}`);
      }
    } else {
      const updated = savingsGoals.map((g) => (g.id === goal.id ? updatedGoal : g));
      setSavingsGoals(updated);
      localStorage.setItem('pennywise_goals', JSON.stringify(updated));
    }
  };

  // Deposit funds to savings goal
  const depositToSavingsGoal = async (goalId: string, amount: number) => {
    const targetGoal = savingsGoals.find((g) => g.id === goalId);
    if (!targetGoal) return;

    const newAmount = Number(targetGoal.currentAmount) + Number(amount);

    if (user && !isDemo) {
      try {
        const goalDocRef = doc(db, 'users', user.uid, 'savingsGoals', goalId);
        await updateDoc(goalDocRef, {
          currentAmount: newAmount,
          updatedAt: new Date().toISOString(),
        });
      } catch (err: any) {
        handleFirestoreError(
          err,
          OperationType.UPDATE,
          `users/${user.uid}/savingsGoals/${goalId}`
        );
      }
    } else {
      const updated = savingsGoals.map((g) =>
        g.id === goalId ? { ...g, currentAmount: newAmount, updatedAt: new Date().toISOString() } : g
      );
      setSavingsGoals(updated);
      localStorage.setItem('pennywise_goals', JSON.stringify(updated));
    }
  };

  // Delete Savings Goal
  const deleteSavingsGoal = async (id: string) => {
    if (user && !isDemo) {
      try {
        const goalDocRef = doc(db, 'users', user.uid, 'savingsGoals', id);
        await deleteDoc(goalDocRef);
      } catch (err: any) {
        handleFirestoreError(err, OperationType.DELETE, `users/${user.uid}/savingsGoals/${id}`);
      }
    } else {
      const updated = savingsGoals.filter((e) => e.id !== id);
      setSavingsGoals(updated);
      localStorage.setItem('pennywise_goals', JSON.stringify(updated));
    }
  };

  // Save Planned Purchase (Purchase Analyzer)
  const savePlannedPurchase = async (purchaseData: Omit<PurchaseAnalysis, 'id' | 'createdAt'>) => {
    setSyncStatus('saving');
    setError(null);
    try {
      const planCurrency = purchaseData.currency || profile?.preferredCurrency || 'USD';
      const uniquePlanId = `plan-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      const newPlan: PurchaseAnalysis = {
        ...purchaseData,
        currency: planCurrency,
        id: uniquePlanId,
        userId: user?.uid || (isDemo ? 'demo-user-123' : 'local-user'),
        createdAt: new Date().toISOString(),
      };

      if (user && !isDemo) {
        const colRef = collection(db, 'users', user.uid, 'plannedPurchases');
        await addDoc(colRef, {
          userId: user.uid,
          itemName: purchaseData.itemName,
          price: Number(purchaseData.price),
          currency: planCurrency,
          category: purchaseData.category || 'Shopping',
          priority: purchaseData.priority || 'want',
          affordabilityVerdict: purchaseData.affordabilityVerdict,
          impactRemainingBudget: Number(purchaseData.impactRemainingBudget || 0),
          impactDailyAllowance: Number(purchaseData.impactDailyAllowance || 0),
          aiExplanation: (purchaseData.aiExplanation || '').slice(0, 2000),
          status: purchaseData.status || 'planned',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      } else {
        const updated = [newPlan, ...plannedPurchases];
        setPlannedPurchases(updated);
        localStorage.setItem('pennywise_planned_purchases', JSON.stringify(updated));
      }
      setSyncStatus('synced');
      setSuccessMessage(`Planned purchase "${purchaseData.itemName}" saved successfully.`);
    } catch (err: any) {
      setSyncStatus('error');
      setError(err.message || 'Failed to save planned purchase');
      if (user && !isDemo) {
        handleFirestoreError(err, OperationType.CREATE, `users/${user.uid}/plannedPurchases`);
      }
    }
  };

  // Record PayPal Sandbox Order
  const recordPayPalOrder = async (orderData: Omit<PayPalOrder, 'id' | 'createdAt'>) => {
    setSyncStatus('saving');
    try {
      const newOrder: PayPalOrder = {
        ...orderData,
        id: orderData.orderId,
        userId: user?.uid || (isDemo ? 'demo-user-123' : 'local-user'),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      if (user && !isDemo) {
        const docRef = doc(db, 'users', user.uid, 'paypalOrders', orderData.orderId);
        await setDoc(
          docRef,
          {
            userId: user.uid,
            orderId: orderData.orderId,
            productId: orderData.productId || '',
            itemName: orderData.itemName,
            amount: Number(orderData.amount),
            currency: orderData.currency,
            category: orderData.category,
            status: orderData.status,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
          { merge: true }
        );
      } else {
        const updated = [newOrder, ...paypalOrders.filter((o) => o.orderId !== orderData.orderId)];
        setPaypalOrders(updated);
        localStorage.setItem('pennywise_paypal_orders', JSON.stringify(updated));
      }
      setSyncStatus('synced');
    } catch (err: any) {
      setSyncStatus('error');
      if (user && !isDemo) {
        handleFirestoreError(err, OperationType.WRITE, `users/${user.uid}/paypalOrders/${orderData.orderId}`);
      }
    }
  };

  // Record Verified Payment
  const recordVerifiedPayment = async (paymentData: Omit<PaymentRecord, 'id' | 'createdAt'>) => {
    setSyncStatus('saving');
    try {
      const paymentId = paymentData.captureId || `pay-${Date.now()}`;
      const newPayment: PaymentRecord = {
        ...paymentData,
        id: paymentId,
        userId: user?.uid || (isDemo ? 'demo-user-123' : 'local-user'),
        createdAt: new Date().toISOString(),
      };

      if (user && !isDemo) {
        const docRef = doc(db, 'users', user.uid, 'payments', paymentId);
        await setDoc(
          docRef,
          {
            userId: user.uid,
            orderId: paymentData.orderId,
            captureId: paymentData.captureId || paymentId,
            amount: Number(paymentData.amount),
            currency: paymentData.currency,
            description: paymentData.description,
            status: paymentData.status,
            source: paymentData.source || 'PayPal',
            verified: Boolean(paymentData.verified),
            createdAt: new Date().toISOString(),
          },
          { merge: true }
        );
      } else {
        const updated = [newPayment, ...payments.filter((p) => p.id !== paymentId)];
        setPayments(updated);
        localStorage.setItem('pennywise_payments', JSON.stringify(updated));
      }
      setSyncStatus('synced');
      setSuccessMessage('Verified payment securely recorded in your account.');
    } catch (err: any) {
      setSyncStatus('error');
      if (user && !isDemo) {
        handleFirestoreError(err, OperationType.WRITE, `users/${user.uid}/payments/${paymentData.orderId}`);
      }
    }
  };

  // Auth actions
  const signInWithGoogle = async () => {
    try {
      setError(null);
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (err: any) {
      // User closed the popup or cancelled: this is expected behavior, not an app failure
      if (
        err?.code === 'auth/popup-closed-by-user' ||
        err?.code === 'auth/cancelled-popup-request'
      ) {
        // Benign cancellation: do not emit console.error or show alarming crash banner
        return;
      }
      if (err?.code === 'auth/popup-blocked') {
        setError('Sign-in popup was blocked by your browser. Please allow popups for this site and try again.');
        return;
      }
      // For any other unexpected authentication errors, set a friendly user message without throwing to console.error
      setError(err?.message || 'Could not complete Google sign-in. Please try again.');
    }
  };

  const signInWithEmail = async (email: string, password: string) => {
    try {
      setError(null);
      await signInWithEmailAndPassword(auth, email.trim(), password);
    } catch (err: any) {
      let msg = 'Could not sign in with email. Please check your credentials.';
      if (
        err?.code === 'auth/user-not-found' ||
        err?.code === 'auth/wrong-password' ||
        err?.code === 'auth/invalid-credential'
      ) {
        msg = 'Invalid email or password. Please verify your credentials and try again.';
      } else if (err?.code === 'auth/invalid-email') {
        msg = 'Please enter a valid email address.';
      } else if (err?.code === 'auth/too-many-requests') {
        msg = 'Access temporarily disabled due to many failed attempts. Please try again later or reset your password.';
      } else if (err?.message) {
        msg = err.message;
      }
      setError(msg);
      throw new Error(msg);
    }
  };

  const signUpWithEmail = async (fullName: string, email: string, password: string) => {
    try {
      setError(null);
      const userCred = await createUserWithEmailAndPassword(auth, email.trim(), password);
      if (fullName.trim()) {
        await updateProfile(userCred.user, { displayName: fullName.trim() });
      }
      // Create initial Firestore user document
      try {
        const userDocRef = doc(db, 'users', userCred.user.uid);
        await setDoc(
          userDocRef,
          {
            id: userCred.user.uid,
            displayName: fullName.trim() || 'Valued User',
            email: email.trim(),
            country: 'United States',
            preferredCurrency: 'USD',
            monthlyIncome: 0,
            monthlyEssentialExpenses: 0,
            monthlySavingsGoal: 0,
            emergencyAllocation: 0,
            monthlyBudgetPeriod: '1st to End of Month',
            onboardingCompleted: false,
            isDemo: false,
            createdAt: new Date().toISOString(),
          },
          { merge: true }
        );
      } catch (dbErr: any) {
        console.warn('Could not initialize user document in Firestore:', dbErr);
      }
    } catch (err: any) {
      let msg = 'Could not create account. Please try again.';
      if (err?.code === 'auth/email-already-in-use') {
        msg = 'An account with this email already exists. Please sign in instead.';
      } else if (err?.code === 'auth/weak-password') {
        msg = 'Password should be at least 6 characters.';
      } else if (err?.code === 'auth/invalid-email') {
        msg = 'Please enter a valid email address.';
      } else if (err?.message) {
        msg = err.message;
      }
      setError(msg);
      throw new Error(msg);
    }
  };

  const resetPassword = async (email: string) => {
    try {
      setError(null);
      await sendPasswordResetEmail(auth, email.trim());
      setSuccessMessage('Password reset link sent to your email address.');
    } catch (err: any) {
      let msg = 'Could not send password reset email.';
      if (err?.code === 'auth/user-not-found') {
        msg = 'No account found with this email address.';
      } else if (err?.code === 'auth/invalid-email') {
        msg = 'Please enter a valid email address.';
      } else if (err?.message) {
        msg = err.message;
      }
      setError(msg);
      throw new Error(msg);
    }
  };

  const signOutUser = async () => {
    try {
      await signOut(auth);
      setProfile(null);
      setExpenses([]);
      setSavingsGoals([]);
      setPlannedPurchases([]);
      setPaypalOrders([]);
      setPayments([]);
      setIsDemo(false);
      localStorage.removeItem('pennywise_is_demo');
      localStorage.removeItem('pennywise_profile');
      localStorage.removeItem('pennywise_expenses');
      localStorage.removeItem('pennywise_goals');
      localStorage.removeItem('pennywise_planned_purchases');
      localStorage.removeItem('pennywise_paypal_orders');
      localStorage.removeItem('pennywise_payments');
    } catch (err: any) {
      console.error('Sign-out error:', err);
    }
  };

  return (
    <FinanceContext.Provider
      value={{
        user,
        profile,
        expenses,
        savingsGoals,
        plannedPurchases,
        paypalOrders,
        payments,
        budget,
        isDemo,
        isLoading,
        syncStatus,
        successMessage,
        error,
        clearError,
        clearSuccess,
        activeTab,
        setActiveTab,
        formatMoney,
        startDemoMode,
        exitDemoMode,
        saveUserProfile,
        addExpense,
        updateExpense,
        deleteExpense,
        addSavingsGoal,
        updateSavingsGoal,
        depositToSavingsGoal,
        deleteSavingsGoal,
        savePlannedPurchase,
        recordPayPalOrder,
        recordVerifiedPayment,
        signInWithGoogle,
        signInWithEmail,
        signUpWithEmail,
        resetPassword,
        signOutUser,
        refreshBudget,
        pendingCheckoutItem,
        setPendingCheckoutItem,
        proceedToCheckoutWithItem,
        pendingAnalyzerItem,
        setPendingAnalyzerItem,
        navigateToAnalyzer,
      }}
    >
      {children}
    </FinanceContext.Provider>
  );
};

export const useFinance = () => {
  const context = useContext(FinanceContext);
  if (!context) {
    throw new Error('useFinance must be used within a FinanceProvider');
  }
  return context;
};
