import React from 'react';
import { Plus, Minus, CheckCircle, Sparkles, MoreVertical } from 'lucide-react';
import { SavingsGoal } from '../../types';
import { formatRupee, calculateProgressPercentage, isGoalCompleted } from '../../lib/utils';

interface GoalCardProps {
  goal: SavingsGoal;
  onAddMoney: (goal: SavingsGoal) => void;
  onWithdraw: (goal: SavingsGoal) => void;
  onEdit?: (goal: SavingsGoal) => void;
}

export const GoalCard: React.FC<GoalCardProps> = ({ goal, onAddMoney, onWithdraw, onEdit }) => {
  const saved = Number(goal.saved_amount) || 0;
  const target = Number(goal.target_amount) || 1;
  const percentage = calculateProgressPercentage(saved, target);
  const completed = isGoalCompleted(saved, target);
  const isOverSaved = saved > target;

  return (
    <div className={`card-white relative overflow-hidden transition-all group ${
      completed ? 'border-mint/30 bg-gradient-to-br from-white to-mint-soft/30' : ''
    }`}>
      {/* Top Row: Emoji Icon + Title + Status */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-12 h-12 rounded-2xl bg-cloud-100 border border-slate-200/60 flex items-center justify-center text-2xl flex-shrink-0 shadow-xs group-hover:scale-105 transition-transform">
            {goal.emoji || '🎯'}
          </div>
          <div className="min-w-0">
            <h3 className="text-base sm:text-lg font-black text-ink truncate leading-tight">
              {goal.title}
            </h3>
            <p className="text-xs text-ink-muted font-medium mt-0.5">
              Target: <span className="font-bold text-ink-soft">{formatRupee(target)}</span>
            </p>
          </div>
        </div>

        {/* Completion Pill */}
        <div className="flex-shrink-0 flex items-center gap-1.5">
          {completed ? (
            <span className="chip-tag bg-mint-soft text-mint-dark border border-mint-border">
              <CheckCircle className="w-3.5 h-3.5" />
              <span>Completed!</span>
            </span>
          ) : (
            <span className="chip-tag bg-ambercoin-soft text-ambercoin-dark border border-ambercoin/20">
              <span>{percentage}%</span>
            </span>
          )}

          {onEdit && (
            <button
              onClick={() => onEdit(goal)}
              className="p-1 rounded-lg text-ink-faint hover:text-ink hover:bg-slate-100 transition-colors"
              title="Edit goal"
            >
              <MoreVertical className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Progress Bar (capped visually at 100% per spec) */}
      <div className="space-y-1.5 my-3">
        <div className="w-full h-3 rounded-full bg-slate-100 overflow-hidden p-0.5 border border-slate-200/40">
          <div
            className={`h-full rounded-full transition-all duration-700 ease-out ${
              completed
                ? 'bg-gradient-to-r from-mint to-mint-light'
                : 'bg-gradient-to-r from-pup to-ambercoin'
            }`}
            style={{ width: `${percentage}%` }}
          />
        </div>

        {/* Exact Amount Saved vs Target */}
        <div className="flex items-center justify-between text-xs font-bold text-ink">
          <span className="text-pup">
            {formatRupee(saved)} saved
          </span>
          <span className="text-ink-muted">
            {isOverSaved ? (
              <span className="text-mint-dark font-extrabold">
                +₹{(saved - target).toLocaleString('en-IN')} extra saved! 🌟
              </span>
            ) : (
              <span>₹{(target - saved).toLocaleString('en-IN')} to go</span>
            )}
          </span>
        </div>
      </div>

      {/* Bottom Action Buttons */}
      <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
        <button
          onClick={() => onAddMoney(goal)}
          className="flex-1 btn-mint text-xs py-2"
        >
          <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
          <span>Add Money</span>
        </button>

        <button
          onClick={() => onWithdraw(goal)}
          disabled={saved <= 0}
          className={`btn-coral text-xs py-2 px-3.5 ${
            saved <= 0 ? 'opacity-40 cursor-not-allowed' : ''
          }`}
          title={saved <= 0 ? 'No money saved in this goal yet' : 'Take out money'}
        >
          <Minus className="w-3.5 h-3.5 stroke-[2.5]" />
          <span>Withdraw</span>
        </button>
      </div>
    </div>
  );
};
