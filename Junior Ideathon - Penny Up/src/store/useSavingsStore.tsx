import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import confetti from 'canvas-confetti';
import { SavingsGoal, Transaction, ActiveTab, ToastMessage } from '../types';
import { PennyPupApi } from '../lib/api';

interface SavingsContextType {
  goals: SavingsGoal[];
  transactions: Transaction[];
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
  celebrationGoal: SavingsGoal | null;
  setCelebrationGoal: (goal: SavingsGoal | null) => void;
  toast: ToastMessage | null;
  showToast: (title: string, message: string, type?: ToastMessage['type']) => void;
  dismissToast: () => void;
  refreshData: () => Promise<void>;
}

const SavingsContext = createContext<SavingsContextType | undefined>(undefined);

export const SavingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [goals, setGoals] = useState<SavingsGoal[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<ActiveTab>('home');
  const [celebrationGoal, setCelebrationGoal] = useState<SavingsGoal | null>(null);
  const [toast, setToast] = useState<ToastMessage | null>(null);

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

  // Auto-dismiss toast after 4s
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  // Initial data loading
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

  // Calculated values from real data
  const totalSavings = useMemo(() => {
    return goals.reduce((sum, g) => sum + (Number(g.saved_amount) || 0), 0);
  }, [goals]);

  const activeGoalsCount = useMemo(() => {
    return goals.filter(g => (Number(g.saved_amount) || 0) < Number(g.target_amount)).length;
  }, [goals]);

  const completedGoalsCount = useMemo(() => {
    return goals.filter(g => (Number(g.saved_amount) || 0) >= Number(g.target_amount)).length;
  }, [goals]);

  // Trigger kid-friendly confetti
  const triggerConfetti = useCallback(() => {
    try {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#7C3AED', '#F59E0B', '#10B981', '#F43F5E', '#38BDF8'],
        disableForReducedMotion: true
      });
    } catch {}
  }, []);

  // Add Money
  const addMoney = useCallback(async (amount: number, goalId?: string | null, note?: string) => {
    if (!amount || amount <= 0) {
      showToast('Oops!', 'Please enter an amount greater than ₹0.', 'error');
      return { success: false, error: 'Invalid amount' };
    }

    let targetGoal = goalId ? goals.find(g => g.id === goalId) : (goals.length > 0 ? goals[0] : null);
    if (!targetGoal && goals.length > 0) targetGoal = goals[0];

    if (!targetGoal) {
      showToast('Need a Goal!', 'Please create a goal first to add money.', 'info');
      return { success: false, error: 'No goal found' };
    }

    const prevSaved = Number(targetGoal.saved_amount) || 0;
    const newSaved = prevSaved + amount;
    const isNowCompleted = prevSaved < targetGoal.target_amount && newSaved >= targetGoal.target_amount;

    // Update goal
    await PennyPupApi.updateGoal(targetGoal.id, { saved_amount: newSaved });

    // Record transaction
    const txNote = note?.trim() || `Added money to ${targetGoal.title}`;
    await PennyPupApi.createTransaction({
      type: 'deposit',
      amount,
      note: txNote,
      goal_id: targetGoal.id
    });

    // Refresh state
    await refreshData();

    if (isNowCompleted) {
      triggerConfetti();
      setCelebrationGoal({ ...targetGoal, saved_amount: newSaved });
      showToast('Goal Completed! 🎉', `You reached your ${targetGoal.title} goal!`, 'celebrate');
    } else {
      showToast('Money Added! 💰', `Saved ₹${amount.toLocaleString('en-IN')} toward ${targetGoal.title}!`, 'success');
    }

    return { success: true };
  }, [goals, refreshData, showToast, triggerConfetti]);

  // Withdraw Money
  const withdrawMoney = useCallback(async (amount: number, goalId: string, note?: string) => {
    if (!amount || amount <= 0) {
      showToast('Invalid Amount', 'Please enter an amount greater than ₹0.', 'error');
      return { success: false, error: 'Invalid amount' };
    }

    const targetGoal = goals.find(g => g.id === goalId);
    if (!targetGoal) {
      showToast('Goal Not Found', 'Could not locate the selected goal.', 'error');
      return { success: false, error: 'Goal not found' };
    }

    const currentSaved = Number(targetGoal.saved_amount) || 0;
    if (amount > currentSaved) {
      showToast('Balance Too Low', `You only have ₹${currentSaved.toLocaleString('en-IN')} saved in ${targetGoal.title}.`, 'error');
      return { success: false, error: 'Amount exceeds balance' };
    }

    const newSaved = Math.max(0, currentSaved - amount);
    await PennyPupApi.updateGoal(targetGoal.id, { saved_amount: newSaved });

    const txNote = note?.trim() || `Withdrew money from ${targetGoal.title}`;
    await PennyPupApi.createTransaction({
      type: 'withdraw',
      amount,
      note: txNote,
      goal_id: targetGoal.id
    });

    await refreshData();
    showToast('Money Withdrawn', `Took out ₹${amount.toLocaleString('en-IN')} from ${targetGoal.title}.`, 'info');
    return { success: true };
  }, [goals, refreshData, showToast]);

  // Create Goal
  const createGoal = useCallback(async (title: string, target_amount: number, emoji: string, color = 'pup') => {
    if (!title.trim()) {
      showToast('Name Required', 'Please give your savings goal a name!', 'error');
      throw new Error('Title required');
    }
    if (!target_amount || target_amount <= 0) {
      showToast('Target Required', 'Please enter a target amount greater than ₹0.', 'error');
      throw new Error('Target amount must be positive');
    }

    const newGoal = await PennyPupApi.createGoal({
      title: title.trim(),
      target_amount: Math.round(target_amount),
      emoji: emoji || '🎯',
      color
    });

    await refreshData();
    showToast('New Goal Created! 🎯', `Started saving for ${newGoal.title}!`, 'success');
    return newGoal;
  }, [refreshData, showToast]);

  // Update Goal
  const updateGoal = useCallback(async (id: string, updates: Partial<SavingsGoal>) => {
    await PennyPupApi.updateGoal(id, updates);
    await refreshData();
    showToast('Goal Updated', 'Changes saved successfully.', 'success');
  }, [refreshData, showToast]);

  // Delete Goal
  const deleteGoal = useCallback(async (id: string) => {
    const goalToDelete = goals.find(g => g.id === id);
    await PennyPupApi.deleteGoal(id);
    await refreshData();
    showToast('Goal Removed', goalToDelete ? `Removed ${goalToDelete.title}.` : 'Goal removed.', 'info');
  }, [goals, refreshData, showToast]);

  const value = {
    goals,
    transactions,
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
    celebrationGoal,
    setCelebrationGoal,
    toast,
    showToast,
    dismissToast,
    refreshData
  };

  return (
    <SavingsContext.Provider value={value}>
      {children}
    </SavingsContext.Provider>
  );
};

export function useSavingsStore(): SavingsContextType {
  const context = useContext(SavingsContext);
  if (!context) {
    throw new Error('useSavingsStore must be used within a SavingsProvider');
  }
  return context;
}
