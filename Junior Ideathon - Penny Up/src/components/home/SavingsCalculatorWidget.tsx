import React, { useState } from 'react';
import { Calculator, Calendar, ArrowRight, Sparkles, TrendingUp } from 'lucide-react';
import { useSavingsStore } from '../../store/useSavingsStore';
import { formatRupee, calculatePace } from '../../lib/utils';

export const SavingsCalculatorWidget: React.FC = () => {
  const { goals } = useSavingsStore();
  const [selectedGoalId, setSelectedGoalId] = useState<string>(goals[0]?.id || '');
  const [weeklySavings, setWeeklySavings] = useState<number>(50);

  React.useEffect(() => {
    if (goals.length > 0 && !selectedGoalId) {
      setSelectedGoalId(goals[0].id);
    }
  }, [goals, selectedGoalId]);

  const targetGoal = goals.find(g => g.id === selectedGoalId) || goals[0];
  const saved = Number(targetGoal?.saved_amount) || 0;
  const target = Number(targetGoal?.target_amount) || 500;
  const remaining = Math.max(0, target - saved);

  const { weeks, targetDate } = calculatePace(remaining, weeklySavings);

  return (
    <div className="card-white p-5">
      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <div className="w-8 h-8 rounded-xl bg-brand-soft border border-brand-border flex items-center justify-center text-brand-dark">
          <Calculator className="w-4 h-4" />
        </div>
        <div>
          <h3 className="text-sm font-black text-ink">Smart Goal Calculator</h3>
          <p className="text-[11px] font-semibold text-ink-muted">See when you will reach your dream!</p>
        </div>
      </div>

      {/* Goal Selector */}
      {goals.length > 0 ? (
        <div className="space-y-3">
          <div>
            <label className="text-[11px] font-bold text-ink-muted block mb-1">Select Dream Goal:</label>
            <select
              value={selectedGoalId}
              onChange={(e) => setSelectedGoalId(e.target.value)}
              className="w-full bg-cloud-100 text-xs font-bold text-ink px-3 py-2 rounded-xl border border-cloud-300 focus:outline-none focus:ring-2 focus:ring-brand cursor-pointer"
            >
              {goals.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.emoji} {g.title} ({formatRupee(Number(g.saved_amount) || 0)} / {formatRupee(Number(g.target_amount) || 0)})
                </option>
              ))}
            </select>
          </div>

          {/* Weekly Savings Slider */}
          <div>
            <div className="flex items-center justify-between text-xs font-bold text-ink mb-1">
              <span className="text-ink-muted">If I save each week:</span>
              <span className="text-brand-dark font-black">{formatRupee(weeklySavings)} / week</span>
            </div>
            <input
              type="range"
              min="10"
              max="200"
              step="10"
              value={weeklySavings}
              onChange={(e) => setWeeklySavings(parseInt(e.target.value, 10))}
              className="w-full accent-brand h-2 bg-cloud-200 rounded-lg cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-ink-muted font-bold mt-1">
              <span>₹10</span>
              <span>₹50</span>
              <span>₹100</span>
              <span>₹200</span>
            </div>
          </div>

          {/* Calculated Output Card */}
          <div className="p-3 rounded-2xl bg-gradient-to-br from-brand-soft/70 to-coin-soft/60 border border-brand-border/60">
            {remaining <= 0 ? (
              <div className="text-center py-1">
                <span className="text-lg">🎉</span>
                <p className="text-xs font-black text-brand-dark">Already fully saved!</p>
                <p className="text-[10px] text-ink-muted">Claim your champion certificate!</p>
              </div>
            ) : (
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-ink-muted">Estimated Time:</span>
                  <span className="text-sm font-black text-brand-dark">{weeks} week{weeks > 1 ? 's' : ''}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-ink-muted">Target Completion:</span>
                  <span className="text-xs font-black text-coin-dark flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    <span>{targetDate}</span>
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        <p className="text-xs text-ink-muted">Create a goal first to use the planner!</p>
      )}
    </div>
  );
};
