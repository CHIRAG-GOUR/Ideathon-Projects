import React, { useState, useEffect } from 'react';
import { X, Plus, Sparkles, Check } from 'lucide-react';
import { useSavingsStore } from '../../store/useSavingsStore';
import { SavingsGoal } from '../../types';
import { formatRupee } from '../../lib/utils';

interface AddMoneyModalProps {
  initialGoal?: SavingsGoal | null;
  onClose: () => void;
}

export const AddMoneyModal: React.FC<AddMoneyModalProps> = ({ initialGoal, onClose }) => {
  const { goals, addMoney } = useSavingsStore();
  const [selectedGoalId, setSelectedGoalId] = useState<string>(initialGoal?.id || (goals[0]?.id || ''));
  const [amountStr, setAmountStr] = useState<string>('50');
  const [note, setNote] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');

  useEffect(() => {
    if (initialGoal) {
      setSelectedGoalId(initialGoal.id);
    } else if (goals.length > 0 && !selectedGoalId) {
      setSelectedGoalId(goals[0].id);
    }
  }, [initialGoal, goals, selectedGoalId]);

  const quickAmounts = [10, 20, 50, 100, 500];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    const parsed = parseFloat(amountStr);
    if (isNaN(parsed) || parsed <= 0) {
      setErrorMessage('Please enter an amount greater than ₹0');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await addMoney(parsed, selectedGoalId, note);
      if (res.success) {
        onClose();
      } else if (res.error) {
        setErrorMessage(res.error);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to add money');
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedGoal = goals.find((g) => g.id === selectedGoalId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-white rounded-3xl sm:rounded-4xl p-6 sm:p-7 shadow-2xl border border-slate-100 max-h-[90vh] overflow-y-auto">
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-mint-soft text-mint-dark flex items-center justify-center text-xl shadow-xs">
              💰
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-black text-ink">Add Money</h2>
              <p className="text-xs text-ink-muted font-medium">Put pocket money into your savings</p>
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

          {/* Goal Selector */}
          <div>
            <label className="block text-xs font-bold text-ink mb-1.5">
              Choose Savings Goal:
            </label>
            {goals.length === 0 ? (
              <p className="text-xs text-coralberry font-bold">
                Please create a goal first!
              </p>
            ) : (
              <select
                value={selectedGoalId}
                onChange={(e) => setSelectedGoalId(e.target.value)}
                className="w-full px-4 py-3 rounded-2xl bg-cloud-100 border border-slate-200 text-sm font-bold text-ink focus:outline-none focus:border-pup focus:bg-white transition-all cursor-pointer"
              >
                {goals.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.emoji} {g.title} ({formatRupee(g.saved_amount)} / {formatRupee(g.target_amount)})
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Quick Amount Chips */}
          <div>
            <label className="block text-xs font-bold text-ink mb-1.5">
              Quick Pick Amount:
            </label>
            <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
              {quickAmounts.map((amt) => (
                <button
                  type="button"
                  key={amt}
                  onClick={() => setAmountStr(amt.toString())}
                  className={`px-3.5 py-2 rounded-xl font-black text-xs transition-all cursor-pointer ${
                    amountStr === amt.toString()
                      ? 'bg-pup text-white shadow-xs scale-105'
                      : 'bg-cloud-100 text-ink-soft hover:bg-cloud-200'
                  }`}
                >
                  +{formatRupee(amt)}
                </button>
              ))}
            </div>
          </div>

          {/* Amount Input */}
          <div>
            <label className="block text-xs font-bold text-ink mb-1.5">
              Enter Amount (₹):
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
                value={amountStr}
                onChange={(e) => setAmountStr(e.target.value)}
                placeholder="50"
                className="w-full pl-9 pr-4 py-3 rounded-2xl bg-cloud-100 border border-slate-200 text-lg font-black text-ink focus:outline-none focus:border-pup focus:bg-white transition-all"
              />
            </div>
          </div>

          {/* Note Input */}
          <div>
            <label className="block text-xs font-bold text-ink mb-1.5">
              Note (Optional):
            </label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. Pocket money from Grandma, chore reward"
              className="w-full px-4 py-2.5 rounded-2xl bg-cloud-100 border border-slate-200 text-xs font-medium text-ink focus:outline-none focus:border-pup focus:bg-white transition-all"
            />
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
              disabled={isSubmitting || goals.length === 0}
              className="flex-1 btn-primary text-xs sm:text-sm py-3"
            >
              {isSubmitting ? 'Saving...' : 'Add Money 🎉'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
