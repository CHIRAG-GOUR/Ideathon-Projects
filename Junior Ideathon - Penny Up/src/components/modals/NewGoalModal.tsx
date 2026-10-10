import React, { useState } from 'react';
import { X, Target, Plus, Sparkles } from 'lucide-react';
import { useSavingsStore } from '../../store/useSavingsStore';

interface NewGoalModalProps {
  onClose: () => void;
}

export const NewGoalModal: React.FC<NewGoalModalProps> = ({ onClose }) => {
  const { createGoal } = useSavingsStore();
  const [title, setTitle] = useState('');
  const [targetAmountStr, setTargetAmountStr] = useState('500');
  const [emoji, setEmoji] = useState('🧸');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const emojiList = ['🧸', '📚', '🎨', '🚲', '🎮', '⚽', '🎒', '🚀', '🎸', '👟', '🧁', '⭐'];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!title.trim()) {
      setErrorMessage('Please give your goal a name!');
      return;
    }

    const targetAmount = parseFloat(targetAmountStr);
    if (isNaN(targetAmount) || targetAmount <= 0) {
      setErrorMessage('Target amount must be greater than ₹0');
      return;
    }

    setIsSubmitting(true);
    try {
      await createGoal(title.trim(), targetAmount, emoji);
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to create goal');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-white rounded-3xl p-6 sm:p-7 shadow-2xl border border-cloud-300 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-cloud-200">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-brand-soft border border-brand-border flex items-center justify-center text-xl">
              🎯
            </div>
            <div>
              <h3 className="text-lg sm:text-xl font-black text-ink">New Dream Goal</h3>
              <p className="text-xs text-ink-muted font-medium">What do you want to save up for?</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-ink-muted hover:text-ink hover:bg-cloud-200 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {errorMessage && (
          <div className="mt-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-bold">
            {errorMessage}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {/* Pick Emoji */}
          <div>
            <label className="block text-xs font-bold text-ink mb-1.5">Pick an Icon:</label>
            <div className="grid grid-cols-6 gap-2">
              {emojiList.map((em) => (
                <button
                  type="button"
                  key={em}
                  onClick={() => setEmoji(em)}
                  className={`h-11 rounded-xl text-xl flex items-center justify-center border transition-all cursor-pointer ${
                    emoji === em
                      ? 'bg-brand-soft border-brand text-brand-dark ring-2 ring-brand/20 scale-105'
                      : 'bg-cloud-100 hover:bg-cloud-200 border-cloud-300'
                  }`}
                >
                  {em}
                </button>
              ))}
            </div>
          </div>

          {/* Title */}
          <div>
            <label className="block text-xs font-bold text-ink mb-1.5">Goal Name:</label>
            <input
              type="text"
              placeholder="e.g. New Bicycle, Harry Potter Book, Lego Set"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              className="w-full px-3.5 py-3 rounded-2xl bg-cloud-100 border border-cloud-300 font-bold text-sm text-ink focus:outline-none focus:ring-2 focus:ring-brand focus:bg-white"
            />
          </div>

          {/* Target Amount */}
          <div>
            <label className="block text-xs font-bold text-ink mb-1.5">
              How much does it cost in total? (₹)
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xl font-black text-brand-dark">
                ₹
              </span>
              <input
                type="number"
                min="10"
                step="10"
                value={targetAmountStr}
                onChange={(e) => setTargetAmountStr(e.target.value)}
                required
                className="w-full pl-9 pr-4 py-3 rounded-2xl bg-cloud-100 border border-cloud-300 font-black text-2xl text-ink focus:outline-none focus:ring-2 focus:ring-brand focus:bg-white"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="pt-2 flex items-center gap-3">
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 btn-primary py-3"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>{isSubmitting ? 'Creating...' : 'Start Saving!'}</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary py-3 px-5 text-xs font-bold"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
