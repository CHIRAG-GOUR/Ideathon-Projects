import React from 'react';
import { Plus, Target, ArrowRight } from 'lucide-react';
import { useSavingsStore } from '../../store/useSavingsStore';
import { GoalCard } from './GoalCard';
import { SavingsGoal } from '../../types';

interface MyGoalsSectionProps {
  onOpenNewGoal: () => void;
  onOpenAddMoneyForGoal: (goal: SavingsGoal) => void;
  onOpenWithdrawForGoal: (goal: SavingsGoal) => void;
  onOpenEditGoal: (goal: SavingsGoal) => void;
}

export const MyGoalsSection: React.FC<MyGoalsSectionProps> = ({
  onOpenNewGoal,
  onOpenAddMoneyForGoal,
  onOpenWithdrawForGoal,
  onOpenEditGoal
}) => {
  const { goals, setActiveTab } = useSavingsStore();

  return (
    <section className="my-6">
      {/* Section Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-ink tracking-tight flex items-center gap-2">
            <span>My Dream Goals</span>
            <span className="text-xl">🎯</span>
          </h2>
          <p className="text-xs sm:text-sm font-semibold text-ink-muted">
            Track, save, and celebrate every milestone!
          </p>
        </div>

        <button
          onClick={onOpenNewGoal}
          className="btn-primary text-xs sm:text-sm py-2 px-3 sm:px-4"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span>+ New Goal</span>
        </button>
      </div>

      {/* Goals Grid */}
      {goals.length === 0 ? (
        <div className="card-white text-center py-10 px-6 border-dashed border-2 border-cloud-300">
          <div className="w-16 h-16 rounded-3xl bg-brand-soft text-brand-dark flex items-center justify-center text-3xl mx-auto mb-3 shadow-xs">
            🎯
          </div>
          <h3 className="text-lg font-black text-ink">No goals yet!</h3>
          <p className="text-xs text-ink-muted max-w-sm mx-auto mt-1 mb-5">
            What are you dreaming of? A new toy, bicycle, or art kit? Create your very first goal now!
          </p>
          <button onClick={onOpenNewGoal} className="btn-primary">
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Create My First Goal</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {goals.map((goal) => (
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
    </section>
  );
};
