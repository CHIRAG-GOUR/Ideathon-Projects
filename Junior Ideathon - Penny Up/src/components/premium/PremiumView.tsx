import React from 'react';
import { Crown, Check, Sparkles, Shield, HeartHandshake, AlertCircle } from 'lucide-react';
import { useSavingsStore } from '../../store/useSavingsStore';

export const PremiumView: React.FC = () => {
  const { showToast } = useSavingsStore();

  const handleUpgradeClick = () => {
    showToast(
      'Parent Permission Required 🛡️',
      'Please ask a parent or guardian to configure family premium features.',
      'info'
    );
  };

  return (
    <div className="space-y-6 max-w-3xl mx-auto animate-in fade-in duration-300">
      {/* Header Banner */}
      <div className="text-center py-4 sm:py-6">
        <div className="inline-flex p-3 rounded-3xl bg-ambercoin-soft border border-ambercoin/20 text-3xl mb-3 shadow-xs">
          👑
        </div>
        <h1 className="text-2xl sm:text-3xl font-black text-ink tracking-tight">
          PennyPup Plans
        </h1>
        <p className="text-xs sm:text-sm font-semibold text-ink-muted max-w-md mx-auto mt-1.5">
          Pick the perfect savings journey for your family.
        </p>
      </div>

      {/* Plan Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 items-stretch">
        {/* Starter Plan (Current) */}
        <div className="card-white flex flex-col justify-between border-slate-200">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-2xl">🐷</span>
              <span className="chip-tag bg-slate-100 text-ink-muted border border-slate-200">
                Current Plan
              </span>
            </div>
            <h3 className="text-xl font-black text-ink">Starter Saver</h3>
            <p className="text-xs text-ink-muted mt-0.5">Perfect for starting your savings journey</p>
            <div className="my-4">
              <span className="text-4xl font-black text-ink">₹0</span>
              <span className="text-xs text-ink-muted font-bold ml-1">/ forever free</span>
            </div>

            <ul className="space-y-2.5 text-xs sm:text-sm text-ink-soft">
              <li className="flex items-center gap-2 font-medium">
                <Check className="w-4 h-4 text-mint flex-shrink-0" />
                <span>Up to 3 active savings goals</span>
              </li>
              <li className="flex items-center gap-2 font-medium">
                <Check className="w-4 h-4 text-mint flex-shrink-0" />
                <span>Add and withdraw money anytime</span>
              </li>
              <li className="flex items-center gap-2 font-medium">
                <Check className="w-4 h-4 text-mint flex-shrink-0" />
                <span>Real-time transaction history</span>
              </li>
              <li className="flex items-center gap-2 font-medium">
                <Check className="w-4 h-4 text-mint flex-shrink-0" />
                <span>Fun goal completion confetti</span>
              </li>
            </ul>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-100">
            <button
              disabled
              className="w-full py-3 rounded-2xl font-bold text-sm text-ink-muted bg-slate-100 cursor-default"
            >
              Current Active Plan
            </button>
          </div>
        </div>

        {/* Premium Champion Plan */}
        <div className="card-white relative overflow-hidden flex flex-col justify-between border-pup/30 shadow-float bg-gradient-to-br from-white via-pup-soft/20 to-ambercoin-soft/30">
          <div className="absolute top-0 right-0 bg-gradient-to-l from-ambercoin to-pup text-white text-[10px] font-black uppercase px-4 py-1 rounded-bl-xl shadow-xs">
            Most Popular
          </div>

          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-2xl">🏆</span>
              <span className="chip-tag bg-ambercoin-soft text-ambercoin-dark border border-ambercoin/20 font-black">
                Family Champion
              </span>
            </div>
            <h3 className="text-xl font-black text-pup">PennyPup Pro</h3>
            <p className="text-xs text-ink-muted mt-0.5">For super savers & family chore rewards</p>
            <div className="my-4">
              <span className="text-4xl font-black text-pup">₹49</span>
              <span className="text-xs text-ink-muted font-bold ml-1">/ month</span>
            </div>

            <ul className="space-y-2.5 text-xs sm:text-sm text-ink-soft">
              <li className="flex items-center gap-2 font-bold text-ink">
                <Check className="w-4 h-4 text-pup flex-shrink-0 stroke-[3]" />
                <span>Unlimited savings goals</span>
              </li>
              <li className="flex items-center gap-2 font-bold text-ink">
                <Check className="w-4 h-4 text-pup flex-shrink-0 stroke-[3]" />
                <span>Parent match bonus simulator</span>
              </li>
              <li className="flex items-center gap-2 font-bold text-ink">
                <Check className="w-4 h-4 text-pup flex-shrink-0 stroke-[3]" />
                <span>Interactive chore & allowance tracker</span>
              </li>
              <li className="flex items-center gap-2 font-bold text-ink">
                <Check className="w-4 h-4 text-pup flex-shrink-0 stroke-[3]" />
                <span>Custom puppy badges & sounds</span>
              </li>
              <li className="flex items-center gap-2 font-bold text-ink">
                <Check className="w-4 h-4 text-pup flex-shrink-0 stroke-[3]" />
                <span>Printable savings certificates</span>
              </li>
            </ul>
          </div>

          <div className="mt-6 pt-4 border-t border-pup/20">
            <button
              onClick={handleUpgradeClick}
              className="w-full btn-primary py-3.5 shadow-md shadow-pup/30"
            >
              <Crown className="w-4 h-4 text-ambercoin-light" />
              <span>Upgrade to Pro</span>
            </button>
            <p className="text-[11px] text-center text-ink-muted mt-2 font-medium">
              Requires parent or guardian approval
            </p>
          </div>
        </div>
      </div>

      {/* Transparent Limitation / Kid Safety Note per spec */}
      <div className="card-white p-4 sm:p-5 flex items-start gap-3 bg-slate-50/80 border-slate-200/80">
        <Shield className="w-5 h-5 text-pup flex-shrink-0 mt-0.5" />
        <div className="text-xs text-ink-muted leading-relaxed">
          <p className="font-bold text-ink">Parental Safety Guarantee:</p>
          <p className="mt-0.5">
            PennyPup is a safe educational sandbox for financial literacy. Real payment gateway connections are held until verified by an adult. All goals and pocket money transactions are tracked securely in your cloud database.
          </p>
        </div>
      </div>
    </div>
  );
};
