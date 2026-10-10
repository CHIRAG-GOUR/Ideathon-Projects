import React from 'react';
import { Plus, Minus, CheckCircle, Award, MoreVertical, Sparkles } from 'lucide-react';
import { SavingsGoal } from '../../types';
import { formatRupee, calculateProgressPercentage, isGoalCompleted } from '../../lib/utils';
import { useSavingsStore } from '../../store/useSavingsStore';

interface GoalCardProps {
  goal: SavingsGoal;
  onAddMoney: (goal: SavingsGoal) => void;
  onWithdraw: (goal: SavingsGoal) => void;
  onEdit?: (goal: SavingsGoal) => void;
}

export const GoalCard: React.FC<GoalCardProps> = ({ goal, onAddMoney, onWithdraw, onEdit }) => {
  const { addMoney, setCertificateGoal } = useSavingsStore();
  const saved = Number(goal.saved_amount) || 0;
  const target = Number(goal.target_amount) || 1;
  const percentage = calculateProgressPercentage(saved, target);
  const completed = isGoalCompleted(saved, target);
  const isOverSaved = saved > target;

  const handleQuickAdd = async (e: React.MouseEvent, amount: number) => {
    e.stopPropagation();
    await addMoney(amount, goal.id, `Quick Save +₹${amount} to ${goal.title}`);
  };

  return (
    <div className={`card-white relative overflow-hidden transition-all group flex flex-col justify-between ${
      completed ? 'border-brand/40 bg-gradient-to-br from-white via-white to-brand-soft/40 shadow-soft' : ''
    }`}>
      {/* Top Header Row */}
      <div>
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-12 h-12 rounded-2xl bg-cloud-100 border border-cloud-300 flex items-center justify-center text-2xl flex-shrink-0 shadow-xs group-hover:scale-105 transition-transform">
              {goal.emoji || '🎯'}
            </div>
            <div className="min-w-0">
              <h3 className="text-base sm:text-lg font-black text-ink truncate leading-tight">
                {goal.title}
              </h3>
              <p className="text-xs text-ink-muted font-semibold mt-0.5">
                Target: <span className="font-extrabold text-ink-soft">{formatRupee(target)}</span>
              </p>
            </div>
          </div>

          {/* Completion Badge or Edit Button */}
          <div className="flex-shrink-0 flex items-center gap-1.5">
            {completed ? (
              <span className="chip-tag bg-brand-soft text-brand-dark border border-brand-border">
                <CheckCircle className="w-3.5 h-3.5" />
                <span>Completed!</span>
              </span>
            ) : (
              <span className="chip-tag bg-coin-soft text-coin-dark border border-coin-border">
                <span>{percentage}%</span>
              </span>
            )}

            {onEdit && (
              <button
                onClick={() => onEdit(goal)}
                className="p-1 rounded-lg text-ink-faint hover:text-ink hover:bg-cloud-200 transition-colors cursor-pointer"
                title="Edit goal"
              >
                <MoreVertical className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Visual Progress Bar (capped at 100%) */}
        <div className="space-y-1.5 my-3">
          <div className="w-full h-3 rounded-full bg-cloud-200 overflow-hidden p-0.5 border border-cloud-300/80">
            <div
              className={`h-full rounded-full transition-all duration-700 ease-out ${
                completed
                  ? 'bg-gradient-to-r from-brand to-brand-light'
                  : 'bg-gradient-to-r from-coin to-brand'
              }`}
              style={{ width: `${percentage}%` }}
            />
          </div>

          {/* Numbers Row */}
          <div className="flex items-center justify-between text-xs font-bold text-ink">
            <span className="text-brand-dark font-black">
              {formatRupee(saved)} saved
            </span>
            <span className="text-ink-muted">
              {isOverSaved ? (
                <span className="text-brand-dark font-extrabold">
                  +₹{(saved - target).toLocaleString('en-IN')} extra! 🌟
                </span>
              ) : (
                <span>₹{(target - saved).toLocaleString('en-IN')} to go</span>
              )}
            </span>
          </div>
        </div>

        {/* Direct 1-Click Quick Add Row */}
        {!completed && (
          <div className="flex items-center gap-1.5 py-1 mb-2">
            <span className="text-[11px] font-bold text-ink-muted">Instant Save:</span>
            <button
              onClick={(e) => handleQuickAdd(e, 20)}
              className="px-2 py-0.5 rounded-lg bg-brand-soft hover:bg-brand/20 text-brand-dark font-black text-xs border border-brand-border active:scale-95 transition-all cursor-pointer"
            >
              +₹20
            </button>
            <button
              onClick={(e) => handleQuickAdd(e, 50)}
              className="px-2 py-0.5 rounded-lg bg-brand-soft hover:bg-brand/20 text-brand-dark font-black text-xs border border-brand-border active:scale-95 transition-all cursor-pointer"
            >
              +₹50
            </button>
            <button
              onClick={(e) => handleQuickAdd(e, 100)}
              className="px-2 py-0.5 rounded-lg bg-brand-soft hover:bg-brand/20 text-brand-dark font-black text-xs border border-brand-border active:scale-95 transition-all cursor-pointer"
            >
              +₹100
            </button>
          </div>
        )}

        {/* Certificate Button for Completed Goals */}
        {completed && (
          <div className="my-2">
            <button
              onClick={() => setCertificateGoal(goal)}
              className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-coin-soft hover:bg-coin/20 text-coin-dark border border-coin-border font-black text-xs transition-all active:scale-95 cursor-pointer"
            >
              <Award className="w-4 h-4 text-coin fill-coin/30" />
              <span>🏆 View & Print Champion Certificate</span>
            </button>
          </div>
        )}
      </div>

      {/* Bottom Action Buttons */}
      <div className="flex items-center gap-2 pt-3 border-t border-cloud-200 mt-2">
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
          className={`btn-secondary text-xs py-2 px-3.5 ${
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
