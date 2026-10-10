import React, { useState, useEffect } from 'react';
import { X, Plus, Sparkles, Check, Coins } from 'lucide-react';
import { useSavingsStore } from '../../store/useSavingsStore';
import { SavingsGoal } from '../../types';
import { formatRupee } from '../../lib/utils';

interface AddMoneyModalProps {
  initialGoal?: SavingsGoal | null;
  initialAmount?: number;
  onClose: () => void;
}

export const AddMoneyModal: React.FC<AddMoneyModalProps> = ({ initialGoal, initialAmount, onClose }) => {
  const { goals, addMoney } = useSavingsStore();
  const [selectedGoalId, setSelectedGoalId] = useState<string>(initialGoal?.id || (goals[0]?.id || ''));
  const [amountStr, setAmountStr] = useState<string>(initialAmount ? initialAmount.toString() : '50');
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

  useEffect(() => {
    if (initialAmount) {
      setAmountStr(initialAmount.toString());
    }
  }, [initialAmount]);

  const quickAmounts = [10, 20, 50, 100, 200, 500];

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
      <div className="w-full max-w-md bg-white rounded-3xl sm:rounded-4xl p-6 sm:p-7 shadow-2xl border border-cloud-300 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-cloud-200">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-brand-soft border border-brand-border flex items-center justify-center text-brand-dark text-xl">
              🪙
            </div>
            <div>
              <h3 className="text-lg sm:text-xl font-black text-ink">Add Money</h3>
              <p className="text-xs text-ink-muted font-medium">Drop coins into your savings goal</p>
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
          {/* Goal Selector */}
          {goals.length > 0 && (
            <div>
              <label className="block text-xs font-bold text-ink mb-1.5">
                Which Goal is this for?
              </label>
              <div className="grid grid-cols-1 gap-2 max-h-36 overflow-y-auto p-1">
                {goals.map((goal) => {
                  const isSelected = goal.id === selectedGoalId;
                  return (
                    <button
                      type="button"
                      key={goal.id}
                      onClick={() => setSelectedGoalId(goal.id)}
                      className={`flex items-center justify-between p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-brand-soft border-brand text-brand-dark ring-2 ring-brand/20 font-bold'
                          : 'bg-cloud-100 hover:bg-cloud-200/80 border-cloud-300 text-ink'
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate">
                        <span className="text-lg">{goal.emoji}</span>
                        <span className="text-xs font-black truncate">{goal.title}</span>
                      </div>
                      <span className="text-[11px] font-bold text-ink-muted">
                        {formatRupee(goal.saved_amount)} / {formatRupee(goal.target_amount)}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Amount Input */}
          <div>
            <label className="block text-xs font-bold text-ink mb-1.5">
              How much money are you adding? (₹)
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xl font-black text-brand-dark">
                ₹
              </span>
              <input
                type="number"
                min="1"
                step="1"
                value={amountStr}
                onChange={(e) => setAmountStr(e.target.value)}
                placeholder="0"
                required
                className="w-full pl-9 pr-4 py-3 rounded-2xl bg-cloud-100 border border-cloud-300 font-black text-2xl text-ink focus:outline-none focus:ring-2 focus:ring-brand focus:bg-white"
              />
            </div>
          </div>

          {/* Quick Amounts */}
          <div>
            <span className="text-[11px] font-bold text-ink-muted block mb-1.5">
              Quick Select Amounts:
            </span>
            <div className="grid grid-cols-3 gap-2">
              {quickAmounts.map((amt) => (
                <button
                  type="button"
                  key={amt}
                  onClick={() => setAmountStr(amt.toString())}
                  className={`py-2 rounded-xl text-xs font-black border transition-all cursor-pointer ${
                    amountStr === amt.toString()
                      ? 'bg-brand text-white border-brand shadow-xs'
                      : 'bg-cloud-100 hover:bg-cloud-200 border-cloud-300 text-ink'
                  }`}
                >
                  +₹{amt}
                </button>
              ))}
            </div>
          </div>

          {/* Optional Note */}
          <div>
            <label className="block text-xs font-bold text-ink mb-1.5">
              Where did this money come from? (Optional)
            </label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. Birthday gift, Chores, Pocket money"
              className="w-full px-3.5 py-2.5 rounded-xl bg-cloud-100 border border-cloud-300 text-xs font-medium text-ink focus:outline-none focus:ring-2 focus:ring-brand"
            />
          </div>

          {/* Submit Actions */}
          <div className="pt-2 flex items-center gap-3">
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 btn-primary py-3"
            >
              <Coins className="w-4 h-4" />
              <span>{isSubmitting ? 'Saving...' : 'Add to Savings!'}</span>
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
