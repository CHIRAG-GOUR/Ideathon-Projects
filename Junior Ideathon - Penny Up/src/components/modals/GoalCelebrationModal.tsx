import React from 'react';
import { X, Sparkles, CheckCircle2, Award } from 'lucide-react';
import { useSavingsStore } from '../../store/useSavingsStore';
import { formatRupee } from '../../lib/utils';

export const GoalCelebrationModal: React.FC = () => {
  const { celebrationGoal, setCelebrationGoal } = useSavingsStore();

  if (!celebrationGoal) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-300">
      <div className="w-full max-w-sm bg-white rounded-4xl p-6 sm:p-8 text-center shadow-2xl border border-pup/30 relative overflow-hidden animate-in zoom-in-95 duration-300">
        <div className="absolute -top-10 -right-10 w-32 h-32 rounded-full bg-ambercoin-soft blur-xl pointer-events-none" />
        <div className="absolute -bottom-10 -left-10 w-32 h-32 rounded-full bg-mint-soft blur-xl pointer-events-none" />

        {/* Big Icon Burst */}
        <div className="relative mx-auto w-24 h-24 rounded-3xl bg-gradient-to-tr from-pup to-ambercoin flex items-center justify-center text-5xl shadow-xl shadow-pup/25 mb-4 animate-bounce">
          {celebrationGoal.emoji || '🎯'}
          <span className="absolute -top-2 -right-2 text-2xl">🌟</span>
        </div>

        <h2 className="text-2xl font-black text-ink tracking-tight">
          Goal Completed! 🎉
        </h2>
        <p className="text-sm font-bold text-pup mt-1">
          You saved {formatRupee(celebrationGoal.saved_amount)} for {celebrationGoal.title}!
        </p>

        <p className="text-xs text-ink-muted my-4 leading-relaxed font-medium">
          You worked hard, added your pocket money, and reached your dream! PennyPup is super proud of you! 🐶❤️
        </p>

        <button
          onClick={() => setCelebrationGoal(null)}
          className="w-full btn-primary py-3.5 text-base shadow-lg shadow-pup/30"
        >
          Woohoo! Awesome! 🌟
        </button>
      </div>
    </div>
  );
};
