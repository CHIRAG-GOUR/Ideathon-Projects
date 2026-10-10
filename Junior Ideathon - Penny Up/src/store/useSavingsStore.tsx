import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import confetti from 'canvas-confetti';
import { SavingsGoal, Transaction, ActiveTab, ChoreItem, ToastMessage } from '../types';
import { PennyPupApi } from '../lib/api';

const CHORES_STORAGE_KEY = 'pennypup_chores_v2';
const STREAK_STORAGE_KEY = 'pennypup_streak_v2';

const DEFAULT_CHORES: ChoreItem[] = [
  { id: 'c1', title: 'Clean my bedroom & make bed', reward: 50, emoji: '🧹', category: 'room', completed: false },
  { id: 'c2', title: 'Complete school & math homework', reward: 40, emoji: '📚', category: 'study', completed: false },
  { id: 'c3', title: 'Feed & brush family puppy', reward: 30, emoji: '🐕', category: 'pet', completed: false },
  { id: 'c4', title: 'Help clean up dinner dishes', reward: 35, emoji: '🍽️', category: 'help', completed: false },
  { id: 'c5', title: 'Read a storybook for 20 minutes', reward: 25, emoji: '📖', category: 'reading', completed: false },
  { id: 'c6', title: 'Water home plants & balcony herbs', reward: 20, emoji: '🌱', category: 'help', completed: false },
];

interface SavingsContextType {
  goals: SavingsGoal[];
  transactions: Transaction[];
  chores: ChoreItem[];
  streakDays: number;
  isLoading: boolean;
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  totalSavings: number;
  activeGoalsCount: number;
  completedGoalsCount: number;
  addMoney: (amount: number, goalId?: string | null, note?: string) => Promise<{ success: boolean; error?: string }>;
  withdrawMoney: (amount: number, goalId: string, note?: string) => Promise<{ success: boolean; error?: string }>;
  createGoal: (title: string, target_amount: number, emoji: string, color?: string) => Promise<SavingsGoal>;
  updateGoal: (id: string, updates: Partial<SavingsGoal>) => Promise<void>;
  deleteGoal: (id: string) => Promise<void>;
  completeChore: (choreId: string, goalId: string) => Promise<void>;
  resetChores: () => void;
  addCustomChore: (title: string, reward: number, emoji: string, category: ChoreItem['category']) => void;
  celebrationGoal: SavingsGoal | null;
  setCelebrationGoal: (goal: SavingsGoal | null) => void;
  certificateGoal: SavingsGoal | null;
  setCertificateGoal: (goal: SavingsGoal | null) => void;
  toast: ToastMessage | null;
  showToast: (title: string, message: string, type?: ToastMessage['type']) => void;
  dismissToast: () => void;
  refreshData: () => Promise<void>;
}

const SavingsContext = createContext<SavingsContextType | undefined>(undefined);

export const SavingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [goals, setGoals] = useState<SavingsGoal[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [chores, setChores] = useState<ChoreItem[]>(() => {
    try {
      const stored = localStorage.getItem(CHORES_STORAGE_KEY);
      if (stored) return JSON.parse(stored);
    } catch {}
    return DEFAULT_CHORES;
  });
  const [streakDays, setStreakDays] = useState<number>(() => {
    try {
      const stored = localStorage.getItem(STREAK_STORAGE_KEY);
      if (stored) return parseInt(stored, 10) || 5;
    } catch {}
    return 5;
  });

  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<ActiveTab>('home');
  const [celebrationGoal, setCelebrationGoal] = useState<SavingsGoal | null>(null);
  const [certificateGoal, setCertificateGoal] = useState<SavingsGoal | null>(null);
  const [toast, setToast] = useState<ToastMessage | null>(null);

  // Persist chores to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(CHORES_STORAGE_KEY, JSON.stringify(chores));
    } catch {}
  }, [chores]);

  // Persist streak
  useEffect(() => {
    try {
      localStorage.setItem(STREAK_STORAGE_KEY, streakDays.toString());
    } catch {}
  }, [streakDays]);

  const showToast = useCallback((title: string, message: string, type: ToastMessage['type'] = 'success') => {
    setToast({
      id: Date.now().toString(),
      title,
      message,
      type
    });
  }, []);

  const dismissToast = useCallback(() => {
    setToast(null);
  }, []);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  // Load backend data
  const refreshData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [g, t] = await Promise.all([
        PennyPupApi.fetchGoals(),
        PennyPupApi.fetchTransactions()
      ]);
      setGoals(g);
      setTransactions(t);
    } catch (e) {
      console.error('[PennyPup] Error loading initial data:', e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshData();
  }, [refreshData]);

  // Calculations
  const totalSavings = useMemo(() => {
    return goals.reduce((sum, g) => sum + (Number(g.saved_amount) || 0), 0);
  }, [goals]);

  const activeGoalsCount = useMemo(() => {
    return goals.filter(g => (Number(g.saved_amount) || 0) < Number(g.target_amount)).length;
  }, [goals]);

  const completedGoalsCount = useMemo(() => {
    return goals.filter(g => (Number(g.saved_amount) || 0) >= Number(g.target_amount)).length;
  }, [goals]);

  // Kid-friendly Confetti animation
  const triggerConfetti = useCallback(() => {
    try {
      confetti({
        particleCount: 70,
        spread: 60,
        origin: { y: 0.6 },
        colors: ['#059669', '#10B981', '#F59E0B', '#D97706', '#0284C7']
      });
    } catch {}
  }, []);

  // Add Money action
  const addMoney = useCallback(async (
    amount: number,
    goalId?: string | null,
    note?: string
  ): Promise<{ success: boolean; error?: string }> => {
    if (amount <= 0) {
      return { success: false, error: 'Please enter an amount greater than ₹0' };
    }

    try {
      let targetGoal = goalId ? goals.find(g => g.id === goalId) : goals[0];
      const goalTitle = targetGoal ? targetGoal.title : 'General Savings';

      if (targetGoal) {
        const previousSaved = Number(targetGoal.saved_amount) || 0;
        const newSaved = previousSaved + amount;
        const targetAmount = Number(targetGoal.target_amount) || 1;

        // Check if this deposit completes the goal
        const justCompleted = previousSaved < targetAmount && newSaved >= targetAmount;

        // Update local goal state
        setGoals(prev => prev.map(g => g.id === targetGoal!.id ? { ...g, saved_amount: newSaved } : g));

        // Sync with API
        await PennyPupApi.updateGoal(targetGoal.id, { saved_amount: newSaved });

        // Record transaction
        const newTx = await PennyPupApi.createTransaction({
          type: 'deposit',
          amount,
          note: note || `Added money to ${goalTitle}`,
          goal_id: targetGoal.id
        });
        setTransactions(prev => [newTx, ...prev]);

        triggerConfetti();

        if (justCompleted) {
          setTimeout(() => {
            setCelebrationGoal({ ...targetGoal!, saved_amount: newSaved });
          }, 400);
        } else {
          showToast('Added Money! 🪙', `₹${amount.toLocaleString('en-IN')} saved toward "${goalTitle}"!`);
        }

        return { success: true };
      } else {
        // No goal specified, record general deposit
        const newTx = await PennyPupApi.createTransaction({
          type: 'deposit',
          amount,
          note: note || 'Pocket money deposit',
          goal_id: null
        });
        setTransactions(prev => [newTx, ...prev]);
        triggerConfetti();
        showToast('Money Saved! 🪙', `₹${amount.toLocaleString('en-IN')} added to total balance!`);
        return { success: true };
      }
    } catch (err: any) {
      console.error('[PennyPup] addMoney error:', err);
      showToast('Error', err.message || 'Failed to add money', 'error');
      return { success: false, error: err.message };
    }
  }, [goals, triggerConfetti, showToast]);

  // Withdraw Money action
  const withdrawMoney = useCallback(async (
    amount: number,
    goalId: string,
    note?: string
  ): Promise<{ success: boolean; error?: string }> => {
    const targetGoal = goals.find(g => g.id === goalId);
    if (!targetGoal) return { success: false, error: 'Goal not found' };

    const currentSaved = Number(targetGoal.saved_amount) || 0;
    if (amount <= 0) return { success: false, error: 'Please enter a valid amount' };
    if (amount > currentSaved) return { success: false, error: `You only have ₹${currentSaved} saved in this goal` };

    try {
      const newSaved = Math.max(0, currentSaved - amount);

      setGoals(prev => prev.map(g => g.id === goalId ? { ...g, saved_amount: newSaved } : g));
      await PennyPupApi.updateGoal(goalId, { saved_amount: newSaved });

      const newTx = await PennyPupApi.createTransaction({
        type: 'withdraw',
        amount,
        note: note || `Withdrew from ${targetGoal.title}`,
        goal_id: goalId
      });
      setTransactions(prev => [newTx, ...prev]);

      showToast('Withdrew Money', `₹${amount.toLocaleString('en-IN')} taken from "${targetGoal.title}"`, 'info');
      return { success: true };
    } catch (err: any) {
      console.error('[PennyPup] withdraw error:', err);
      showToast('Error', err.message || 'Failed to withdraw money', 'error');
      return { success: false, error: err.message };
    }
  }, [goals, showToast]);

  // Create Goal
  const createGoal = useCallback(async (
    title: string,
    target_amount: number,
    emoji: string,
    color?: string
  ): Promise<SavingsGoal> => {
    const newGoal = await PennyPupApi.createGoal({
      title,
      target_amount,
      emoji: emoji || '🎯',
      color: color || 'brand'
    });

    setGoals(prev => [newGoal, ...prev]);
    triggerConfetti();
    showToast('New Goal Created! 🎯', `Started saving for "${title}"!`);
    return newGoal;
  }, [triggerConfetti, showToast]);

  // Update Goal
  const updateGoal = useCallback(async (id: string, updates: Partial<SavingsGoal>) => {
    await PennyPupApi.updateGoal(id, updates);
    setGoals(prev => prev.map(g => g.id === id ? { ...g, ...updates } : g));
    showToast('Goal Updated', 'Changes saved successfully!');
  }, [showToast]);

  // Delete Goal
  const deleteGoal = useCallback(async (id: string) => {
    await PennyPupApi.deleteGoal(id);
    setGoals(prev => prev.filter(g => g.id !== id));
    showToast('Goal Deleted', 'The goal was removed.');
  }, [showToast]);

  // Complete a chore and earn pocket money into a goal
  const completeChore = useCallback(async (choreId: string, goalId: string) => {
    const chore = chores.find(c => c.id === choreId);
    if (!chore) return;
    if (chore.completed) return;

    const targetGoal = goals.find(g => g.id === goalId) || goals[0];
    const goalTitle = targetGoal ? targetGoal.title : 'Savings';

    // 1. Mark chore completed
    setChores(prev => prev.map(c => c.id === choreId ? { ...c, completed: true, completed_at: new Date().toISOString() } : c));

    // 2. Deposit earned reward
    await addMoney(chore.reward, targetGoal?.id, `Earned from chore: ${chore.title}`);

    // 3. Show celebratory toast
    showToast(
      `🎉 Earned ₹${chore.reward}!`,
      `Great job! Allowance for "${chore.title}" saved to "${goalTitle}"!`,
      'celebrate'
    );
  }, [chores, goals, addMoney, showToast]);

  // Reset chores for next day
  const resetChores = useCallback(() => {
    setChores(prev => prev.map(c => ({ ...c, completed: false, completed_at: undefined })));
    showToast('Chores Reset! 🌟', 'All tasks are ready to earn more savings today!');
  }, [showToast]);

  // Add custom chore
  const addCustomChore = useCallback((title: string, reward: number, emoji: string, category: ChoreItem['category']) => {
    const newChore: ChoreItem = {
      id: 'custom_' + Date.now().toString(36),
      title,
      reward,
      emoji: emoji || '⭐',
      category: category || 'help',
      completed: false
    };
    setChores(prev => [newChore, ...prev]);
    showToast('Chore Added!', `"${title}" added for ₹${reward}!`);
  }, [showToast]);

  const value = {
    goals,
    transactions,
    chores,
    streakDays,
    isLoading,
    activeTab,
    setActiveTab,
    totalSavings,
    activeGoalsCount,
    completedGoalsCount,
    addMoney,
    withdrawMoney,
    createGoal,
    updateGoal,
    deleteGoal,
    completeChore,
    resetChores,
    addCustomChore,
    celebrationGoal,
    setCelebrationGoal,
    certificateGoal,
    setCertificateGoal,
    toast,
    showToast,
    dismissToast,
    refreshData
  };

  return <SavingsContext.Provider value={value}>{children}</SavingsContext.Provider>;
};

export const useSavingsStore = () => {
  const context = useContext(SavingsContext);
  if (!context) {
    throw new Error('useSavingsStore must be used within a SavingsProvider');
  }
  return context;
};
