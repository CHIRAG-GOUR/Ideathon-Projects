import React, { useState } from 'react';
import { X, Trash2, Edit3, AlertCircle } from 'lucide-react';
import { useSavingsStore } from '../../store/useSavingsStore';
import { SavingsGoal } from '../../types';
import { formatRupee } from '../../lib/utils';

interface EditGoalModalProps {
  goal: SavingsGoal;
  onClose: () => void;
}

const EMOJI_OPTIONS = [
  '📚', '🧸', '🎨', '🚲', '🎮', '🎸', '⚽', '👟',
  '🎒', '🐶', '🍕', '🚀', '🎁', '🍦', '🛹', '🎧'
];

export const EditGoalModal: React.FC<EditGoalModalProps> = ({ goal, onClose }) => {
  const { updateGoal, deleteGoal } = useSavingsStore();
  const [title, setTitle] = useState(goal.title);
  const [targetStr, setTargetStr] = useState(goal.target_amount.toString());
  const [emoji, setEmoji] = useState(goal.emoji || '🎯');
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleSave = async (e: React.FormEvent) => {
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
      await updateGoal(goal.id, {
        title: title.trim(),
        target_amount: Math.round(parsedTarget),
        emoji
      });
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to update goal');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm(`Are you sure you want to delete "${goal.title}"? Your saved money (${formatRupee(goal.saved_amount)}) will be removed with this goal.`)) {
      return;
    }
    setIsDeleting(true);
    try {
      await deleteGoal(goal.id);
      onClose();
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-white rounded-3xl sm:rounded-4xl p-6 sm:p-7 shadow-2xl border border-slate-100 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-cloud-200 flex items-center justify-center text-xl shadow-xs">
              ✏️
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-black text-ink">Edit Goal</h2>
              <p className="text-xs text-ink-muted font-medium">Update goal details or remove</p>
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
        <form onSubmit={handleSave} className="space-y-4 pt-4">
          {errorMessage && (
            <div className="p-3 rounded-2xl bg-coralberry-soft border border-coralberry/30 text-xs font-bold text-coralberry-dark">
              {errorMessage}
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-ink mb-1.5">
              Goal Name:
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-4 py-3 rounded-2xl bg-cloud-100 border border-slate-200 text-sm font-bold text-ink focus:outline-none focus:border-pup focus:bg-white transition-all"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-ink mb-1.5">
              Target Amount (₹):
            </label>
            <input
              type="number"
              min="1"
              step="1"
              required
              value={targetStr}
              onChange={(e) => setTargetStr(e.target.value)}
              className="w-full px-4 py-3 rounded-2xl bg-cloud-100 border border-slate-200 text-sm font-bold text-ink focus:outline-none focus:border-pup focus:bg-white transition-all"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-ink mb-1.5">
              Change Icon:
            </label>
            <div className="grid grid-cols-4 gap-2 p-2 bg-cloud-100 rounded-2xl border border-slate-200">
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
              onClick={handleDelete}
              disabled={isDeleting}
              className="p-3 rounded-2xl border border-coralberry/30 text-coralberry hover:bg-coralberry-soft transition-colors"
              title="Delete this goal"
            >
              <Trash2 className="w-5 h-5" />
            </button>
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
              {isSubmitting ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
