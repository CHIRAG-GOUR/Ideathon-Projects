import React from 'react';
import { Target, CheckCircle2, Award } from 'lucide-react';
import { useSavingsStore } from '../../store/useSavingsStore';

export const SavingsStats: React.FC = () => {
  const { activeGoalsCount, completedGoalsCount } = useSavingsStore();

  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4 my-5 sm:my-6">
      {/* Active Goals Card */}
      <div className="card-white flex items-center gap-3 sm:gap-4 p-4 sm:p-5">
        <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-ambercoin-soft border border-ambercoin/20 flex items-center justify-center text-xl flex-shrink-0 shadow-xs">
          🎯
        </div>
        <div className="min-w-0">
          <p className="text-2xl sm:text-3xl font-black text-ink leading-tight">
            {activeGoalsCount}
          </p>
          <p className="text-xs sm:text-sm font-bold text-ink-muted">
            Active Goals
          </p>
        </div>
      </div>

      {/* Goals Completed Card */}
      <div className="card-white flex items-center gap-3 sm:gap-4 p-4 sm:p-5">
        <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-mint-soft border border-mint/20 flex items-center justify-center text-xl flex-shrink-0 shadow-xs">
          🎉
        </div>
        <div className="min-w-0">
          <p className="text-2xl sm:text-3xl font-black text-mint-dark leading-tight">
            {completedGoalsCount}
          </p>
          <p className="text-xs sm:text-sm font-bold text-ink-muted">
            Goals Completed
          </p>
        </div>
      </div>
    </div>
  );
};
