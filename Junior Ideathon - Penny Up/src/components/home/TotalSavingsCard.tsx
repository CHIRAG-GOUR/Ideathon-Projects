import React from 'react';
import { Plus, ArrowRight, Sparkles, TrendingUp, Coins, Target, CheckCircle2 } from 'lucide-react';
import { useSavingsStore } from '../../store/useSavingsStore';
import { formatRupee } from '../../lib/utils';

interface TotalSavingsCardProps {
  onOpenAddMoney: () => void;
  onQuickDeposit?: (amount: number) => void;
}

export const TotalSavingsCard: React.FC<TotalSavingsCardProps> = ({ onOpenAddMoney, onQuickDeposit }) => {
  const { totalSavings, setActiveTab, goals, activeGoalsCount, completedGoalsCount } = useSavingsStore();

  const totalTarget = goals.reduce((sum, g) => sum + (Number(g.target_amount) || 0), 0);
  const overallPercentage = totalTarget > 0 ? Math.min(100, Math.round((totalSavings / totalTarget) * 100)) : 0;

  const quickPills = [10, 20, 50, 100, 500];

  return (
    <div className="relative overflow-hidden rounded-3xl sm:rounded-4xl p-6 sm:p-8 bg-gradient-to-br from-brand via-brand-dark to-emerald-800 text-white shadow-xl shadow-brand/15 border border-brand-light/30">
      {/* Background Decorative Graphic Spheres */}
      <div className="absolute -top-16 -right-16 w-56 h-56 rounded-full bg-white/10 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-16 -left-16 w-56 h-56 rounded-full bg-coin/20 blur-2xl pointer-events-none" />
      <div className="absolute top-6 right-8 text-5xl opacity-20 select-none animate-pulse">
        🪙
      </div>

      <div className="relative z-10">
        {/* Top Header Row */}
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 backdrop-blur-md text-xs font-black text-white">
            <Sparkles className="w-3.5 h-3.5 text-coin-bright" />
            <span>Total Savings Balance</span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-extrabold text-white/90 bg-white/15 backdrop-blur-xs px-2.5 py-1 rounded-xl">
              {goals.length} Active Dreams
            </span>
            {completedGoalsCount > 0 && (
              <span className="text-xs font-extrabold text-coin-bright bg-coin-dark/60 border border-coin-border/40 px-2.5 py-1 rounded-xl flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>{completedGoalsCount} Reached!</span>
              </span>
            )}
          </div>
        </div>

        {/* Large Balance Display */}
        <div className="my-4 sm:my-5">
          <div className="flex flex-col sm:flex-row sm:items-baseline gap-2 sm:gap-4">
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-black tracking-tight text-white drop-shadow-xs">
              {formatRupee(totalSavings)}
            </h1>
            <span className="text-xs sm:text-sm text-emerald-100 font-semibold flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4 text-coin-bright" />
              <span>of {formatRupee(totalTarget)} total goal targets ({overallPercentage}%)</span>
            </span>
          </div>
        </div>

        {/* Quick Deposit One-Click Row */}
        <div className="my-4 pt-3 border-t border-white/15">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-extrabold text-emerald-100 flex items-center gap-1.5">
              <Coins className="w-3.5 h-3.5 text-coin-bright" />
              <span>Quick Save Pocket Money:</span>
            </span>
            <span className="text-[11px] text-white/70">Click to deposit directly</span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {quickPills.map((amt) => (
              <button
                key={amt}
                onClick={() => onQuickDeposit ? onQuickDeposit(amt) : onOpenAddMoney()}
                className="px-3.5 py-1.5 rounded-xl bg-white/15 hover:bg-white text-white hover:text-brand font-black text-xs transition-all active:scale-95 border border-white/20 cursor-pointer shadow-xs"
              >
                +₹{amt}
              </button>
            ))}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-3 border-t border-white/15">
          <button
            onClick={onOpenAddMoney}
            className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl font-black text-sm text-brand bg-white hover:bg-cloud-100 active:scale-95 shadow-md shadow-black/10 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>+ Add Custom Money</span>
          </button>

          <button
            onClick={() => setActiveTab('goals')}
            className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl font-black text-sm text-white bg-white/15 hover:bg-white/25 active:scale-95 backdrop-blur-md border border-white/25 transition-all cursor-pointer"
          >
            <Target className="w-4 h-4 text-coin-bright" />
            <span>View All Goals ({goals.length})</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
