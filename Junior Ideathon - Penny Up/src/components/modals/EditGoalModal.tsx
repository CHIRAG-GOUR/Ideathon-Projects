import React, { useState } from 'react';
import { X, Trash2, Save, AlertCircle } from 'lucide-react';
import { useSavingsStore } from '../../store/useSavingsStore';
import { SavingsGoal } from '../../types';

interface EditGoalModalProps {
  goal: SavingsGoal;
  onClose: () => void;
}

export const EditGoalModal: React.FC<EditGoalModalProps> = ({ goal, onClose }) => {
  const { updateGoal, deleteGoal } = useSavingsStore();
  const [title, setTitle] = useState(goal.title);
  const [targetAmountStr, setTargetAmountStr] = useState(goal.target_amount.toString());
  const [emoji, setEmoji] = useState(goal.emoji || '🎯');
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const emojiList = ['🧸', '📚', '🎨', '🚲', '🎮', '⚽', '🎒', '🚀', '🎸', '👟', '🧁', '⭐'];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!title.trim()) {
      setErrorMessage('Goal title cannot be empty');
      return;
    }

    const target = parseFloat(targetAmountStr);
    if (isNaN(target) || target <= 0) {
      setErrorMessage('Target amount must be greater than ₹0');
      return;
    }

    setIsSubmitting(true);
    try {
      await updateGoal(goal.id, {
        title: title.trim(),
        target_amount: target,
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
    if (!window.confirm(`Are you sure you want to delete "${goal.title}"?`)) return;
    setIsDeleting(true);
    try {
      await deleteGoal(goal.id);
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to delete goal');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-white rounded-3xl p-6 sm:p-7 shadow-2xl border border-cloud-300 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-3 border-b border-cloud-200">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-cloud-100 border border-cloud-300 flex items-center justify-center text-xl">
              ✏️
            </div>
            <div>
              <h3 className="text-lg font-black text-ink">Edit Goal</h3>
              <p className="text-xs text-ink-muted font-medium">Update details or delete goal</p>
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
          <div>
            <label className="block text-xs font-bold text-ink mb-1.5">Pick Icon:</label>
            <div className="grid grid-cols-6 gap-2">
              {emojiList.map((em) => (
                <button
                  type="button"
                  key={em}
                  onClick={() => setEmoji(em)}
                  className={`h-10 rounded-xl text-lg flex items-center justify-center border transition-all cursor-pointer ${
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

          <div>
            <label className="block text-xs font-bold text-ink mb-1.5">Goal Title:</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              className="w-full px-3.5 py-2.5 rounded-xl bg-cloud-100 border border-cloud-300 text-sm font-bold text-ink focus:outline-none focus:ring-2 focus:ring-brand focus:bg-white"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-ink mb-1.5">Target Amount (₹):</label>
            <input
              type="number"
              min="1"
              value={targetAmountStr}
              onChange={(e) => setTargetAmountStr(e.target.value)}
              required
              className="w-full px-3.5 py-2.5 rounded-xl bg-cloud-100 border border-cloud-300 text-sm font-bold text-ink focus:outline-none focus:ring-2 focus:ring-brand focus:bg-white"
            />
          </div>

          <div className="pt-2 flex items-center gap-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 btn-primary py-2.5 text-xs font-bold"
            >
              <Save className="w-4 h-4" />
              <span>Save Changes</span>
            </button>

            <button
              type="button"
              onClick={handleDelete}
              disabled={isDeleting}
              className="btn-danger-soft py-2.5 px-3 text-xs font-bold"
              title="Delete this goal"
            >
              <Trash2 className="w-4 h-4" />
              <span>Delete</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="btn-secondary py-2.5 px-3 text-xs font-bold"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
