import React, { useState } from 'react';
import { Plus, Target, CheckCircle2, Search, Filter } from 'lucide-react';
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
  const [searchQuery, setSearchQuery] = useState('');

  const filteredGoals = goals.filter((g) => {
    const saved = Number(g.saved_amount) || 0;
    const target = Number(g.target_amount) || 1;
    const matchesSearch = g.title.toLowerCase().includes(searchQuery.toLowerCase());
    if (!matchesSearch) return false;

    if (filter === 'active') return saved < target;
    if (filter === 'completed') return saved >= target;
    return true;
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* View Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 sm:p-8 rounded-3xl border border-cloud-300 shadow-card">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-black text-ink tracking-tight">
              All Dream Goals 🎯
            </h1>
            <span className="chip-tag bg-brand-soft text-brand-dark border border-brand-border font-black">
              {goals.length} Goals
            </span>
          </div>
          <p className="text-xs sm:text-sm font-semibold text-ink-muted mt-1">
            Choose what you want to achieve, save regularly, and win the savings certificate!
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

      {/* Search and Filters Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Search Input */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-muted" />
          <input
            type="text"
            placeholder="Search goals (e.g. toy, books, cycle)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-white border border-cloud-300 text-xs sm:text-sm font-semibold text-ink placeholder:text-ink-muted/70 focus:outline-none focus:ring-2 focus:ring-brand shadow-xs"
          />
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
              filter === 'all'
                ? 'bg-brand text-white shadow-xs'
                : 'bg-white text-ink-muted hover:text-ink border border-cloud-300'
            }`}
          >
            All ({goals.length})
          </button>
          <button
            onClick={() => setFilter('active')}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
              filter === 'active'
                ? 'bg-brand text-white shadow-xs'
                : 'bg-white text-ink-muted hover:text-ink border border-cloud-300'
            }`}
          >
            In Progress ({activeGoalsCount})
          </button>
          <button
            onClick={() => setFilter('completed')}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
              filter === 'completed'
                ? 'bg-brand text-white shadow-xs'
                : 'bg-white text-ink-muted hover:text-ink border border-cloud-300'
            }`}
          >
            Completed 🏆 ({completedGoalsCount})
          </button>
        </div>
      </div>

      {/* Goals Grid */}
      {filteredGoals.length === 0 ? (
        <div className="card-white text-center py-12 px-6">
          <div className="text-4xl mb-2">🔍</div>
          <h3 className="text-lg font-bold text-ink">No goals match your search</h3>
          <p className="text-xs text-ink-muted mt-1 mb-4">
            Try a different search word or clear the filter.
          </p>
          <button onClick={() => { setFilter('all'); setSearchQuery(''); }} className="btn-secondary text-xs">
            Show All Goals
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
