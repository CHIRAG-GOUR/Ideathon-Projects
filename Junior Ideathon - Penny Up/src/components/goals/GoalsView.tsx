import React, { useState } from 'react';
import { Plus, Target, CheckCircle2, Clock, Trash2, Edit3, ArrowRight } from 'lucide-react';
import { useSavingsStore } from '../../store/useSavingsStore';
import { GoalCard } from '../home/GoalCard';
import { SavingsGoal } from '../../types';

interface GoalsViewProps {
  onOpenNewGoal: () => void;
  onOpenAddMoneyForGoal: (goal: SavingsGoal) => void;
  onOpenWithdrawForGoal: (goal: SavingsGoal) => void;
  onOpenEditGoal: (goal: SavingsGoal) => void;
}

export const GoalsView: React.FC<GoalsViewProps> = ({
  onOpenNewGoal,
  onOpenAddMoneyForGoal,
  onOpenWithdrawForGoal,
  onOpenEditGoal
}) => {
  const { goals, activeGoalsCount, completedGoalsCount } = useSavingsStore();
  const [filter, setFilter] = useState<'all' | 'active' | 'completed'>('all');

  const filteredGoals = goals.filter((g) => {
    const saved = Number(g.saved_amount) || 0;
    const target = Number(g.target_amount) || 1;
    if (filter === 'active') return saved < target;
    if (filter === 'completed') return saved >= target;
    return true;
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* View Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-5 sm:p-6 rounded-3xl border border-slate-100 shadow-card">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-black text-ink tracking-tight">
              Savings Goals 🎯
            </h1>
            <span className="chip-tag bg-pup-soft text-pup">
              {goals.length} Total
            </span>
          </div>
          <p className="text-xs sm:text-sm font-semibold text-ink-muted mt-1">
            Track your progress, add money, or set a new dream to save for!
          </p>
        </div>

        <button
          onClick={onOpenNewGoal}
          className="btn-primary self-start sm:self-auto"
        >
          <Plus className="w-5 h-5 stroke-[2.5]" />
          <span>+ Create New Goal</span>
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
        <button
          onClick={() => setFilter('all')}
          className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
            filter === 'all'
              ? 'bg-pup text-white shadow-sm'
              : 'bg-white text-ink-muted hover:text-ink border border-slate-200/70'
          }`}
        >
          All Goals ({goals.length})
        </button>
        <button
          onClick={() => setFilter('active')}
          className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
            filter === 'active'
              ? 'bg-pup text-white shadow-sm'
              : 'bg-white text-ink-muted hover:text-ink border border-slate-200/70'
          }`}
        >
          In Progress ({activeGoalsCount})
        </button>
        <button
          onClick={() => setFilter('completed')}
          className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
            filter === 'completed'
              ? 'bg-pup text-white shadow-sm'
              : 'bg-white text-ink-muted hover:text-ink border border-slate-200/70'
          }`}
        >
          Completed 🎉 ({completedGoalsCount})
        </button>
      </div>

      {/* Goals Grid */}
      {filteredGoals.length === 0 ? (
        <div className="card-white text-center py-12 px-6">
          <div className="text-4xl mb-2">🎈</div>
          <h3 className="text-lg font-bold text-ink">No goals in this view</h3>
          <p className="text-xs text-ink-muted mt-1 mb-4">
            {filter === 'completed'
              ? "You haven't completed any goals yet. Keep saving!"
              : "No active goals found. Start a new one today!"}
          </p>
          <button onClick={onOpenNewGoal} className="btn-primary">
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Create a Goal</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredGoals.map((goal) => (
            <GoalCard
              key={goal.id}
              goal={goal}
              onAddMoney={onOpenAddMoneyForGoal}
              onWithdraw={onOpenWithdrawForGoal}
              onEdit={onOpenEditGoal}
            />
          ))}
        </div>
      )}
    </div>
  );
};
