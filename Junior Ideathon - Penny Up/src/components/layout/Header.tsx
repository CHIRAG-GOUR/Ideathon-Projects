import React from 'react';
import { Sparkles, ShieldCheck, RefreshCw } from 'lucide-react';
import { useSavingsStore } from '../../store/useSavingsStore';

export const Header: React.FC = () => {
  const { isLoading, refreshData, totalSavings } = useSavingsStore();

  return (
    <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-slate-100 px-4 sm:px-6 py-3.5 transition-all">
      <div className="max-w-4xl mx-auto flex items-center justify-between">
        {/* Brand Logo & Puppy Mascot */}
        <div className="flex items-center gap-3">
          <div className="relative w-11 h-11 rounded-2xl bg-gradient-to-tr from-pup to-pup-light flex items-center justify-center shadow-md shadow-pup/20 text-white font-black text-xl">
            🐶
            <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-ambercoin border-2 border-white flex items-center justify-center text-[10px] font-black text-ink shadow-xs">
              ₹
            </span>
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-lg sm:text-xl font-black text-ink tracking-tight">PennyPup</span>
              <span className="chip-tag bg-pup-soft text-pup text-[10px]">Kids Saver</span>
            </div>
            <p className="text-[11px] font-semibold text-ink-muted hidden sm:block">
              Learn, save & watch your dream goals grow!
            </p>
          </div>
        </div>

        {/* Right Action: Sync Status & Kid Avatar */}
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            onClick={() => refreshData()}
            title="Sync with Base44 cloud database"
            disabled={isLoading}
            className="p-2 sm:px-3 sm:py-1.5 rounded-xl text-xs font-semibold text-ink-muted hover:text-pup hover:bg-pup-soft transition-colors flex items-center gap-1.5 border border-slate-200/60"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-pup' : ''}`} />
            <span className="hidden sm:inline">{isLoading ? 'Syncing...' : 'Synced'}</span>
          </button>

          <div className="flex items-center gap-2 pl-2 border-l border-slate-200/80">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-ambercoin-soft to-pup-soft border-2 border-pup/30 flex items-center justify-center text-sm font-bold shadow-xs">
              ⭐
            </div>
            <div className="hidden md:block text-left">
              <p className="text-xs font-extrabold text-ink leading-none">Little Saver</p>
              <p className="text-[10px] text-mint-dark font-bold mt-0.5">● Kid Safe Mode</p>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
