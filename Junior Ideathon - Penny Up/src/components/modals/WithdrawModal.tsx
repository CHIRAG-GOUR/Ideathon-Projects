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
  const [amountStr, setAmountStr] = useState<string>('20');
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
      setErrorMessage(`You cannot withdraw more than the saved amount (${formatRupee(saved)})`);
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
      <div className="w-full max-w-md bg-white rounded-3xl sm:rounded-4xl p-6 sm:p-7 shadow-2xl border border-slate-100 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-coralberry-soft text-coralberry-dark flex items-center justify-center text-xl shadow-xs">
              💸
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-black text-ink">Take Out Money</h2>
              <p className="text-xs text-ink-muted font-medium">Withdraw from {goal.title}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-ink-faint hover:text-ink hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Current Available Info Box */}
        <div className="mt-4 p-3.5 rounded-2xl bg-cloud-100 border border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl">{goal.emoji}</span>
            <span className="text-xs font-bold text-ink">{goal.title}</span>
          </div>
          <div className="text-right">
            <span className="text-[11px] font-semibold text-ink-muted block">Available:</span>
            <span className="text-sm font-black text-pup">{formatRupee(saved)}</span>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4 pt-3">
          {errorMessage && (
            <div className="p-3 rounded-2xl bg-coralberry-soft border border-coralberry/30 text-xs font-bold text-coralberry-dark flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Amount Input */}
          <div>
            <label className="block text-xs font-bold text-ink mb-1.5">
              Amount to Withdraw (₹):
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg font-black text-ink-muted">
                ₹
              </span>
              <input
                type="number"
                min="1"
                max={saved}
                step="1"
                required
                value={amountStr}
                onChange={(e) => setAmountStr(e.target.value)}
                placeholder="20"
                className="w-full pl-9 pr-4 py-3 rounded-2xl bg-cloud-100 border border-slate-200 text-lg font-black text-ink focus:outline-none focus:border-coralberry focus:bg-white transition-all"
              />
            </div>
          </div>

          {/* Reason / Note */}
          <div>
            <label className="block text-xs font-bold text-ink mb-1.5">
              Reason (Optional):
            </label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. Bought school notebook, ice cream treat"
              className="w-full px-4 py-2.5 rounded-2xl bg-cloud-100 border border-slate-200 text-xs font-medium text-ink focus:outline-none focus:border-coralberry focus:bg-white transition-all"
            />
          </div>

          {/* Buttons */}
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
              disabled={isSubmitting || saved <= 0}
              className="flex-1 btn-coral text-xs sm:text-sm py-3"
            >
              {isSubmitting ? 'Processing...' : 'Withdraw Money'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
