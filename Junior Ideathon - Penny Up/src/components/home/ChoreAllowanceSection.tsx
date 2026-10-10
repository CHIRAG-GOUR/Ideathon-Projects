import React, { useState } from 'react';
import { CheckSquare, Plus, Sparkles, RotateCcw, CheckCircle2, Coins } from 'lucide-react';
import { useSavingsStore } from '../../store/useSavingsStore';
import { formatRupee } from '../../lib/utils';
import { ChoreItem } from '../../types';

export const ChoreAllowanceSection: React.FC = () => {
  const { chores, goals, completeChore, resetChores, addCustomChore } = useSavingsStore();
  const [selectedGoalId, setSelectedGoalId] = useState<string>(goals[0]?.id || '');
  const [isAddingCustom, setIsAddingCustom] = useState(false);
  const [customTitle, setCustomTitle] = useState('');
  const [customReward, setCustomReward] = useState('30');
  const [customEmoji, setCustomEmoji] = useState('⭐');

  // Keep selected goal valid
  React.useEffect(() => {
    if (goals.length > 0 && !selectedGoalId) {
      setSelectedGoalId(goals[0].id);
    }
  }, [goals, selectedGoalId]);

  const completedCount = chores.filter(c => c.completed).length;
  const totalEarnable = chores.reduce((sum, c) => sum + (c.completed ? 0 : c.reward), 0);

  const handleClaim = (choreId: string) => {
    completeChore(choreId, selectedGoalId || goals[0]?.id);
  };

  const handleAddCustom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customTitle.trim()) return;
    const reward = parseInt(customReward, 10) || 20;
    addCustomChore(customTitle.trim(), reward, customEmoji || '⭐', 'help');
    setCustomTitle('');
    setIsAddingCustom(false);
  };

  return (
    <section className="card-white my-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-2xl">🧹</span>
            <h2 className="text-xl sm:text-2xl font-black text-ink tracking-tight">
              Earn & Save — Daily Chores
            </h2>
            <span className="chip-tag bg-brand-soft text-brand-dark border border-brand-border">
              {completedCount}/{chores.length} Done
            </span>
          </div>
          <p className="text-xs sm:text-sm font-semibold text-ink-muted mt-0.5">
            Complete real chores & deposit pocket money directly into your dreams!
          </p>
        </div>

        {/* Target Goal Selector */}
        {goals.length > 0 && (
          <div className="flex items-center gap-2 bg-cloud-100 p-1.5 px-3 rounded-2xl border border-cloud-300">
            <span className="text-xs font-bold text-ink-muted whitespace-nowrap">Deposit to:</span>
            <select
              value={selectedGoalId}
              onChange={(e) => setSelectedGoalId(e.target.value)}
              className="bg-white text-xs font-black text-brand-dark px-2.5 py-1 rounded-xl border border-cloud-300 focus:outline-none focus:ring-2 focus:ring-brand cursor-pointer"
            >
              {goals.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.emoji} {g.title}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Chores Checklist Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 my-4">
        {chores.map((chore) => {
          const isDone = chore.completed;
          return (
            <div
              key={chore.id}
              className={`p-3.5 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                isDone
                  ? 'bg-brand-soft/40 border-brand-border/60 opacity-80'
                  : 'bg-white border-cloud-300 hover:border-brand/40 hover:shadow-xs'
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <span className="text-2xl flex-shrink-0">{chore.emoji}</span>
                <div className="min-w-0">
                  <p className={`text-xs sm:text-sm font-bold truncate ${isDone ? 'line-through text-ink-muted' : 'text-ink'}`}>
                    {chore.title}
                  </p>
                  <p className="text-[11px] font-extrabold text-coin-dark">
                    Reward: +₹{chore.reward}
                  </p>
                </div>
              </div>

              {isDone ? (
                <span className="chip-tag bg-brand text-white text-[11px] flex-shrink-0">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Earned</span>
                </span>
              ) : (
                <button
                  onClick={() => handleClaim(chore.id)}
                  className="px-3 py-1.5 rounded-xl bg-brand hover:bg-brand-dark active:scale-95 text-white font-black text-xs transition-all shadow-xs flex-shrink-0 cursor-pointer flex items-center gap-1"
                >
                  <Coins className="w-3 h-3 text-coin-bright" />
                  <span>Claim +₹{chore.reward}</span>
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Custom Chore Modal / Form */}
      {isAddingCustom && (
        <form onSubmit={handleAddCustom} className="p-4 rounded-2xl bg-cloud-100 border border-cloud-300 my-3 animate-in fade-in">
          <h4 className="text-xs font-black text-ink mb-2">Add a Custom Chore or Good Habit</h4>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <input
              type="text"
              placeholder="e.g. Wash dad's car, Practice piano"
              value={customTitle}
              onChange={(e) => setCustomTitle(e.target.value)}
              required
              className="sm:col-span-2 px-3 py-2 rounded-xl bg-white border border-cloud-300 text-xs font-semibold text-ink focus:outline-none focus:ring-2 focus:ring-brand"
            />
            <div className="flex items-center gap-2">
              <input
                type="number"
                placeholder="₹ Amount"
                value={customReward}
                onChange={(e) => setCustomReward(e.target.value)}
                min="5"
                max="500"
                className="w-24 px-3 py-2 rounded-xl bg-white border border-cloud-300 text-xs font-semibold text-ink focus:outline-none focus:ring-2 focus:ring-brand"
              />
              <button type="submit" className="btn-primary text-xs py-2 px-3">
                Save
              </button>
              <button type="button" onClick={() => setIsAddingCustom(false)} className="btn-secondary text-xs py-2 px-2">
                Cancel
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Bottom Footer Actions */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-cloud-200">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsAddingCustom(!isAddingCustom)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-ink hover:text-brand hover:bg-cloud-100 border border-cloud-300 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>+ Add Custom Chore</span>
          </button>

          <button
            onClick={resetChores}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-ink-muted hover:text-ink hover:bg-cloud-100 border border-cloud-300 cursor-pointer"
            title="Reset chores to uncompleted for today"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Reset For Today</span>
          </button>
        </div>

        {totalEarnable > 0 && (
          <span className="text-xs font-extrabold text-coin-dark">
            ₹{totalEarnable} left to earn today! 🪙
          </span>
        )}
      </div>
    </section>
  );
};
