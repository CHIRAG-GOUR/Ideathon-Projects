import React from 'react';
import { Flame, Award, Star, Trophy, Sparkles } from 'lucide-react';
import { useSavingsStore } from '../../store/useSavingsStore';
import { formatRupee } from '../../lib/utils';

export const SavingsStreakWidget: React.FC = () => {
  const { streakDays, totalSavings, completedGoalsCount } = useSavingsStore();

  const badges = [
    { title: 'First Penny Saved', unlocked: totalSavings >= 10, icon: '🪙', desc: 'Saved your first coin' },
    { title: 'Halfway Hero', unlocked: totalSavings >= 500, icon: '🥈', desc: 'Saved over ₹500' },
    { title: '₹1,000 Milestone Club', unlocked: totalSavings >= 1000, icon: '🥇', desc: 'Reach 4-figure savings' },
    { title: 'Goal Champion', unlocked: completedGoalsCount >= 1, icon: '🏆', desc: 'Completed 1 full goal' },
  ];

  return (
    <div className="card-white p-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-coin-soft border border-coin-border flex items-center justify-center text-lg">
            🔥
          </div>
          <div>
            <h3 className="text-sm font-black text-ink">Saving Streak & Badges</h3>
            <p className="text-[11px] font-semibold text-ink-muted">Stay consistent every day!</p>
          </div>
        </div>
        <span className="chip-tag bg-coin-soft text-coin-dark border border-coin-border font-extrabold text-[11px]">
          {streakDays} Days!
        </span>
      </div>

      {/* Streak Day Circles */}
      <div className="flex items-center justify-between gap-1 p-2.5 rounded-2xl bg-cloud-100 border border-cloud-300 my-3">
        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, idx) => {
          const isDone = idx < streakDays;
          return (
            <div key={day} className="flex flex-col items-center gap-1">
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black transition-all ${
                  isDone
                    ? 'bg-brand text-white shadow-xs'
                    : 'bg-white text-ink-muted border border-cloud-300'
                }`}
              >
                {isDone ? '✓' : ''}
              </div>
              <span className="text-[9px] font-bold text-ink-muted">{day}</span>
            </div>
          );
        })}
      </div>

      {/* Badges List */}
      <div className="space-y-2 mt-3 pt-2 border-t border-cloud-200">
        <h4 className="text-[11px] font-black uppercase tracking-wider text-ink-muted mb-2">
          Saver Achievements
        </h4>
        <div className="grid grid-cols-2 gap-2">
          {badges.map((b) => (
            <div
              key={b.title}
              className={`p-2.5 rounded-xl border flex items-center gap-2 transition-all ${
                b.unlocked
                  ? 'bg-brand-soft/50 border-brand-border text-brand-dark'
                  : 'bg-cloud-100/60 border-cloud-300/70 opacity-60'
              }`}
            >
              <span className="text-lg">{b.icon}</span>
              <div className="min-w-0">
                <p className="text-[11px] font-black truncate leading-tight">{b.title}</p>
                <p className="text-[9px] font-semibold text-ink-muted truncate">{b.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
