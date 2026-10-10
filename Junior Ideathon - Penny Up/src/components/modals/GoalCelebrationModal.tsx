import React from 'react';
import { Sparkles, Trophy, Award, CheckCircle2, ArrowRight } from 'lucide-react';
import { useSavingsStore } from '../../store/useSavingsStore';
import { formatRupee } from '../../lib/utils';

export const GoalCelebrationModal: React.FC = () => {
  const { celebrationGoal, setCelebrationGoal, setCertificateGoal } = useSavingsStore();

  if (!celebrationGoal) return null;

  const handleOpenCertificate = () => {
    const goal = celebrationGoal;
    setCelebrationGoal(null);
    setCertificateGoal(goal);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in zoom-in-95 duration-200">
      <div className="relative w-full max-w-sm bg-white rounded-4xl p-6 sm:p-8 text-center shadow-2xl border-4 border-coin-bright">
        {/* Animated Trophy Header */}
        <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-coin to-coin-bright text-white mx-auto flex items-center justify-center text-4xl shadow-lg shadow-coin/30 mb-4 animate-bounce">
          🏆
        </div>

        <span className="chip-tag bg-coin-soft text-coin-dark border border-coin-border text-xs uppercase tracking-widest font-black mb-2">
          Goal Reached 100%!
        </span>

        <h3 className="text-2xl font-black text-ink tracking-tight mt-1 mb-1">
          You Did It! 🎉
        </h3>

        <p className="text-xs sm:text-sm text-ink-muted font-semibold mt-1 mb-4">
          Congratulations! You saved enough coins to achieve your dream:
        </p>

        {/* Goal Card Preview */}
        <div className="p-4 rounded-2xl bg-brand-soft border border-brand-border my-4 flex items-center justify-center gap-3">
          <span className="text-3xl">{celebrationGoal.emoji}</span>
          <div className="text-left">
            <h4 className="text-base font-black text-brand-dark leading-tight">
              {celebrationGoal.title}
            </h4>
            <p className="text-xs font-bold text-ink-muted mt-0.5">
              Saved {formatRupee(celebrationGoal.saved_amount)}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-2 pt-2">
          <button
            onClick={handleOpenCertificate}
            className="w-full btn-primary py-3 text-sm flex items-center justify-center gap-2"
          >
            <Award className="w-4 h-4" />
            <span>View Champion Certificate</span>
          </button>

          <button
            onClick={() => setCelebrationGoal(null)}
            className="w-full btn-secondary py-2.5 text-xs font-bold"
          >
            Keep Saving More!
          </button>
        </div>
      </div>
    </div>
  );
};
