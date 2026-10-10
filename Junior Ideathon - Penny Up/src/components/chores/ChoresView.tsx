import React from 'react';
import { ChoreAllowanceSection } from '../home/ChoreAllowanceSection';
import { SavingsStreakWidget } from '../home/SavingsStreakWidget';
import { useSavingsStore } from '../../store/useSavingsStore';

export const ChoresView: React.FC = () => {
  const { streakDays } = useSavingsStore();

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Page Header */}
      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-cloud-300 shadow-card flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-black text-ink tracking-tight">
              Earn & Save — Daily Chores Hub 🧹
            </h1>
            <span className="chip-tag bg-coin-soft text-coin-dark border border-coin-border">
              Pocket Money
            </span>
          </div>
          <p className="text-xs sm:text-sm font-semibold text-ink-muted mt-1">
            Build great lifelong habits! Do your daily tasks, earn allowances, and fund your dream goals directly.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="p-3 px-4 rounded-2xl bg-brand-soft border border-brand-border text-brand-dark">
            <p className="text-[10px] font-bold uppercase tracking-wider">Habit Streak</p>
            <p className="text-xl font-black">{streakDays} Days 🔥</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-8">
          <ChoreAllowanceSection />
        </div>
        <div className="lg:col-span-4">
          <SavingsStreakWidget />
        </div>
      </div>
    </div>
  );
};
