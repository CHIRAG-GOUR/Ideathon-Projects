import React, { useState } from 'react';
import { X, Target, Sparkles } from 'lucide-react';
import { useSavingsStore } from '../../store/useSavingsStore';

interface NewGoalModalProps {
  onClose: () => void;
}

const EMOJI_OPTIONS = [
  '📚', '🧸', '🎨', '🚲', '🎮', '🎸', '⚽', '👟',
  '🎒', '🐶', '🍕', '🚀', '🎁', '🍦', '🛹', '🎧',
  '🧩', '🏓', '🏊', '⛺'
];

export const NewGoalModal: React.FC<NewGoalModalProps> = ({ onClose }) => {
  const { createGoal } = useSavingsStore();
  const [title, setTitle] = useState('');
  const [targetStr, setTargetStr] = useState('500');
  const [emoji, setEmoji] = useState('🎯');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!title.trim()) {
      setErrorMessage('Please give your goal a name!');
      return;
    }

    const parsedTarget = parseFloat(targetStr);
    if (isNaN(parsedTarget) || parsedTarget <= 0) {
      setErrorMessage('Please enter a target amount greater than ₹0');
      return;
    }

    setIsSubmitting(true);
    try {
      await createGoal(title.trim(), parsedTarget, emoji);
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to create goal');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-white rounded-3xl sm:rounded-4xl p-6 sm:p-7 shadow-2xl border border-slate-100 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-pup-soft text-pup flex items-center justify-center text-xl shadow-xs">
              🎯
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-black text-ink">New Savings Goal</h2>
              <p className="text-xs text-ink-muted font-medium">What dream are you saving for?</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-ink-faint hover:text-ink hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
          {errorMessage && (
            <div className="p-3 rounded-2xl bg-coralberry-soft border border-coralberry/30 text-xs font-bold text-coralberry-dark">
              {errorMessage}
            </div>
          )}

          {/* Goal Name */}
          <div>
            <label className="block text-xs font-bold text-ink mb-1.5">
              Goal Name:
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. New Bicycle, Drawing Kit, Toy"
              className="w-full px-4 py-3 rounded-2xl bg-cloud-100 border border-slate-200 text-sm font-bold text-ink focus:outline-none focus:border-pup focus:bg-white transition-all"
            />
          </div>

          {/* Target Amount */}
          <div>
            <label className="block text-xs font-bold text-ink mb-1.5">
              Target Amount (₹):
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg font-black text-ink-muted">
                ₹
              </span>
              <input
                type="number"
                min="1"
                step="1"
                required
                value={targetStr}
                onChange={(e) => setTargetStr(e.target.value)}
                placeholder="500"
                className="w-full pl-9 pr-4 py-3 rounded-2xl bg-cloud-100 border border-slate-200 text-lg font-black text-ink focus:outline-none focus:border-pup focus:bg-white transition-all"
              />
            </div>
          </div>

          {/* Pick Icon / Emoji */}
          <div>
            <label className="block text-xs font-bold text-ink mb-1.5">
              Pick an Icon:
            </label>
            <div className="grid grid-cols-5 gap-2 p-2 bg-cloud-100 rounded-2xl border border-slate-200">
              {EMOJI_OPTIONS.map((e) => (
                <button
                  type="button"
                  key={e}
                  onClick={() => setEmoji(e)}
                  className={`h-10 rounded-xl text-xl flex items-center justify-center transition-all cursor-pointer ${
                    emoji === e ? 'bg-white shadow-md scale-110 border border-pup/30' : 'hover:bg-white/60'
                  }`}
                >
                  {e}
                </button>
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-3 pt-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 btn-secondary text-xs sm:text-sm py-3"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 btn-primary text-xs sm:text-sm py-3"
            >
              {isSubmitting ? 'Creating...' : 'Create Goal 🎯'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
