import React from 'react';
import { Plus, ArrowRight, Sparkles, TrendingUp } from 'lucide-react';
import { useSavingsStore } from '../../store/useSavingsStore';
import { formatRupee } from '../../lib/utils';

interface TotalSavingsCardProps {
  onOpenAddMoney: () => void;
}

export const TotalSavingsCard: React.FC<TotalSavingsCardProps> = ({ onOpenAddMoney }) => {
  const { totalSavings, setActiveTab, goals } = useSavingsStore();

  return (
    <div className="relative overflow-hidden rounded-3xl sm:rounded-4xl p-6 sm:p-8 bg-gradient-to-br from-pup via-pup to-pup-deep text-white shadow-xl shadow-pup/20 border border-white/10">
      {/* Playful background decorative shapes */}
      <div className="absolute -top-12 -right-12 w-48 h-48 rounded-full bg-white/10 blur-2xl pointer-events-none" />
      <div className="absolute -bottom-10 -left-10 w-40 h-40 rounded-full bg-ambercoin/20 blur-xl pointer-events-none" />
      <div className="absolute top-4 right-6 text-4xl opacity-30 select-none animate-pulse">
        🐶
      </div>

      <div className="relative z-10">
        {/* Header Badge */}
        <div className="flex items-center justify-between mb-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 backdrop-blur-md text-xs font-bold text-white/90">
            <Sparkles className="w-3.5 h-3.5 text-ambercoin-light" />
            <span>Total Savings Balance</span>
          </div>
          <span className="text-xs font-bold text-white/80 bg-white/10 px-2.5 py-1 rounded-lg">
            {goals.length} Goal{goals.length !== 1 ? 's' : ''}
          </span>
        </div>

        {/* Real Balance Amount */}
        <div className="my-3 sm:my-4">
          <div className="flex items-baseline gap-2">
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-black tracking-tight text-white drop-shadow-sm">
              {formatRupee(totalSavings)}
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-pup-soft/90 font-medium flex items-center gap-1.5 mt-1.5">
            <TrendingUp className="w-4 h-4 text-mint-light" />
            <span>Every single penny counts toward your big dreams!</span>
          </p>
        </div>

        {/* Two Working Action Buttons */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-3 border-t border-white/15">
          <button
            onClick={onOpenAddMoney}
            className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-3.5 rounded-2xl font-black text-sm sm:text-base text-pup bg-white hover:bg-cloud-50 active:scale-95 shadow-md shadow-black/10 transition-all cursor-pointer"
          >
            <Plus className="w-5 h-5 stroke-[2.5]" />
            <span>+ Add Money</span>
          </button>

          <button
            onClick={() => setActiveTab('goals')}
            className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-3.5 rounded-2xl font-bold text-sm sm:text-base text-white bg-white/15 hover:bg-white/25 active:scale-95 backdrop-blur-md border border-white/20 transition-all cursor-pointer"
          >
            <span>View Goals</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
