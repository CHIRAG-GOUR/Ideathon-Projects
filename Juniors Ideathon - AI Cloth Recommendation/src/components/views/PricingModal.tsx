import React from 'react';
import { useFashionStore } from '../../store/useFashionStore';
import { Check, Sparkles, X, ShieldCheck } from 'lucide-react';

export function PricingModal() {
  const { setActiveTab } = useFashionStore();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-plum/40 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-4xl p-6 sm:p-8 max-w-2xl w-full border border-border-light shadow-float relative max-h-[90vh] overflow-y-auto">
        <button
          onClick={() => setActiveTab('fitting-room')}
          className="absolute top-5 right-5 w-8 h-8 rounded-full bg-ivory flex items-center justify-center text-plum-muted hover:text-plum transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="text-center max-w-md mx-auto mb-8 space-y-1.5">
          <span className="px-3 py-1 rounded-full bg-coral-light text-coral-dark text-xs font-bold uppercase tracking-wider">
            Membership Concept
          </span>
          <h2 className="font-editorial font-extrabold text-2xl sm:text-3xl text-plum">
            Elevate Your Everyday Style
          </h2>
          <p className="text-xs text-plum-muted">
            Unlock complete 3D wardrobe fitting, smart mood adaptation, and infinite styling suggestions.
          </p>
        </div>

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-6">
          {/* Free Tier */}
          <div className="p-6 rounded-3xl bg-ivory border border-border-light flex flex-col justify-between">
            <div>
              <span className="font-bold text-sm text-plum block mb-1">Explorer Free</span>
              <div className="flex items-baseline gap-1 mb-4">
                <span className="font-editorial font-black text-3xl text-plum">₹0</span>
                <span className="text-xs text-plum-muted">/ forever</span>
              </div>
              <ul className="text-xs text-plum-muted space-y-2.5 mb-6">
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-teal" />
                  <span>1 AI outfit suggestion per day</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-teal" />
                  <span>Core 18 curated wardrobe items</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-teal" />
                  <span>Interactive 360° 3D virtual avatar</span>
                </li>
              </ul>
            </div>
            <button
              onClick={() => setActiveTab('fitting-room')}
              className="w-full btn-secondary text-xs py-2.5"
            >
              Current Active Plan
            </button>
          </div>

          {/* Plus Tier */}
          <div className="p-6 rounded-3xl bg-white border-2 border-coral shadow-card flex flex-col justify-between relative">
            <span className="absolute -top-3 right-6 px-3 py-0.5 rounded-full bg-coral text-white text-[10px] font-black uppercase tracking-wider shadow-xs">
              Recommended
            </span>
            <div>
              <span className="font-bold text-sm text-plum block mb-1">Style Plus</span>
              <div className="flex items-baseline gap-1 mb-4">
                <span className="font-editorial font-black text-3xl text-plum">₹79</span>
                <span className="text-xs text-plum-muted">/ month</span>
              </div>
              <ul className="text-xs text-plum space-y-2.5 mb-6">
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-coral" />
                  <span>Unlimited daily AI suggestions</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-coral" />
                  <span>Unlimited wardrobe uploads & caps</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-coral" />
                  <span>Full 7-day No-Repeat Week planner</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-coral" />
                  <span>Exclusive designer garment capsules</span>
                </li>
              </ul>
            </div>
            <button
              onClick={() => setActiveTab('fitting-room')}
              className="w-full btn-primary text-xs py-2.5"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Simulate Upgrade</span>
            </button>
          </div>
        </div>

        <p className="text-[11px] text-plum-muted/80 text-center">
          Note: This is an informational product concept preview. No actual credit card billing is active.
        </p>
      </div>
    </div>
  );
}
