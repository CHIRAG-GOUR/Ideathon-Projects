import React, { useState } from 'react';
import { X, Minus, AlertCircle } from 'lucide-react';
import { useSavingsStore } from '../../store/useSavingsStore';
import { SavingsGoal } from '../../types';
import { formatRupee } from '../../lib/utils';

interface WithdrawModalProps {
  goal: SavingsGoal;
  onClose: () => void;
}

export const WithdrawModal: React.FC<WithdrawModalProps> = ({ goal, onClose }) => {
  const { withdrawMoney } = useSavingsStore();
  const [amountStr, setAmountStr] = useState<string>('50');
  const [note, setNote] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');

  const saved = Number(goal.saved_amount) || 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    const parsed = parseFloat(amountStr);
    if (isNaN(parsed) || parsed <= 0) {
      setErrorMessage('Please enter an amount greater than ₹0');
      return;
    }

    if (parsed > saved) {
      setErrorMessage(`You only have ${formatRupee(saved)} saved in this goal`);
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await withdrawMoney(parsed, goal.id, note);
      if (res.success) {
        onClose();
      } else if (res.error) {
        setErrorMessage(res.error);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to withdraw money');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-white rounded-3xl p-6 sm:p-7 shadow-2xl border border-cloud-300">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-cloud-200">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-cloud-200 border border-cloud-300 flex items-center justify-center text-ink text-xl">
              💸
            </div>
            <div>
              <h3 className="text-lg font-black text-ink">Take Out Money</h3>
              <p className="text-xs text-ink-muted font-medium">From "{goal.title}"</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-ink-muted hover:text-ink hover:bg-cloud-200 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Current Available Balance */}
        <div className="my-4 p-3.5 rounded-2xl bg-cloud-100 border border-cloud-300 flex items-center justify-between">
          <span className="text-xs font-bold text-ink-muted">Currently Saved in Goal:</span>
          <span className="text-sm font-black text-brand-dark">{formatRupee(saved)}</span>
        </div>

        {errorMessage && (
          <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-bold flex items-center gap-1.5">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-ink mb-1.5">
              How much are you taking out? (₹)
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xl font-black text-ink-muted">
                ₹
              </span>
              <input
                type="number"
                min="1"
                max={saved}
                step="1"
                value={amountStr}
                onChange={(e) => setAmountStr(e.target.value)}
                placeholder="0"
                required
                className="w-full pl-9 pr-4 py-3 rounded-2xl bg-cloud-100 border border-cloud-300 font-black text-2xl text-ink focus:outline-none focus:ring-2 focus:ring-brand focus:bg-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-ink mb-1.5">
              What is this for? (e.g. Bought the toy, Bought ice cream)
            </label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Reason for withdrawing"
              className="w-full px-3.5 py-2.5 rounded-xl bg-cloud-100 border border-cloud-300 text-xs font-medium text-ink focus:outline-none focus:ring-2 focus:ring-brand"
            />
          </div>

          <div className="pt-2 flex items-center gap-3">
            <button
              type="submit"
              disabled={isSubmitting || saved <= 0}
              className="flex-1 btn-danger-soft py-3 text-xs"
            >
              <Minus className="w-4 h-4" />
              <span>{isSubmitting ? 'Processing...' : 'Confirm Withdrawal'}</span>
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
