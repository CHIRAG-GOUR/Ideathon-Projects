import React from 'react';
import { SavingsCalculatorWidget } from '../home/SavingsCalculatorWidget';
import { SavingsStreakWidget } from '../home/SavingsStreakWidget';
import { useSavingsStore } from '../../store/useSavingsStore';
import { formatRupee } from '../../lib/utils';
import { Target, TrendingUp, Sparkles, CheckCircle2 } from 'lucide-react';

export const CalculatorView: React.FC = () => {
  const { goals, totalSavings } = useSavingsStore();

  const totalTarget = goals.reduce((sum, g) => sum + (Number(g.target_amount) || 0), 0);
  const totalRemaining = Math.max(0, totalTarget - totalSavings);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-cloud-300 shadow-card flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-black text-ink tracking-tight">
              Savings Goal Calculator 🧮
            </h1>
            <span className="chip-tag bg-brand-soft text-brand-dark border border-brand-border">
              Pace Planner
            </span>
          </div>
          <p className="text-xs sm:text-sm font-semibold text-ink-muted mt-1">
            See how small weekly savings turn into big achieved dreams! Learn the magic of consistency.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="p-3 px-4 rounded-2xl bg-coin-soft border border-coin-border text-coin-dark">
            <p className="text-[10px] font-bold uppercase tracking-wider">Remaining to Dream</p>
            <p className="text-xl font-black">{formatRupee(totalRemaining)}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-7">
          <SavingsCalculatorWidget />
        </div>

        <div className="lg:col-span-5 space-y-4">
          <SavingsStreakWidget />

          {/* Quick Educational Tips for Kids */}
          <div className="card-white p-5 bg-gradient-to-br from-white to-cloud-100 border border-cloud-300">
            <div className="flex items-center gap-2 mb-2 text-brand-dark font-black text-sm">
              <Sparkles className="w-4 h-4 text-coin" />
              <span>Smart Saver Rule of Thumb</span>
            </div>
            <ul className="text-xs text-ink-muted space-y-2 font-medium">
              <li className="flex items-start gap-2">
                <span className="text-brand font-black">✓</span>
                <span><strong>Save first, spend later:</strong> Put aside ₹20 the moment you receive pocket money.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-brand font-black">✓</span>
                <span><strong>Do chores consistently:</strong> Earning ₹40 every weekend gets you a ₹200 toy in just 5 weeks!</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-brand font-black">✓</span>
                <span><strong>Celebrate wins:</strong> When you finish a goal, print your PennyPup Certificate of Champion!</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};
