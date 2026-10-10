import React from 'react';
import { Target, CheckCircle2, Award, Flame } from 'lucide-react';
import { useSavingsStore } from '../../store/useSavingsStore';

export const SavingsStats: React.FC = () => {
  const { activeGoalsCount, completedGoalsCount, streakDays } = useSavingsStore();

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 my-4 sm:my-5">
      {/* Active Goals Card */}
      <div className="card-white flex items-center gap-3 p-4 sm:p-5">
        <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-coin-soft border border-coin-border flex items-center justify-center text-xl flex-shrink-0 shadow-xs">
          🎯
        </div>
        <div className="min-w-0">
          <p className="text-2xl sm:text-3xl font-black text-ink leading-tight">
            {activeGoalsCount}
          </p>
          <p className="text-xs font-bold text-ink-muted">
            In Progress
          </p>
        </div>
      </div>

      {/* Goals Completed Card */}
      <div className="card-white flex items-center gap-3 p-4 sm:p-5">
        <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-brand-soft border border-brand-border flex items-center justify-center text-xl flex-shrink-0 shadow-xs">
          🏆
        </div>
        <div className="min-w-0">
          <p className="text-2xl sm:text-3xl font-black text-brand-dark leading-tight">
            {completedGoalsCount}
          </p>
          <p className="text-xs font-bold text-ink-muted">
            Goals Reached
          </p>
        </div>
      </div>

      {/* Daily Streak Card */}
      <div className="card-white col-span-2 sm:col-span-1 flex items-center gap-3 p-4 sm:p-5">
        <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-amber-50 border border-coin-border flex items-center justify-center text-xl flex-shrink-0 shadow-xs">
          🔥
        </div>
        <div className="min-w-0">
          <p className="text-2xl sm:text-3xl font-black text-coin-dark leading-tight">
            {streakDays} Days
          </p>
          <p className="text-xs font-bold text-ink-muted">
            Savings Habit
          </p>
        </div>
      </div>
    </div>
  );
};
