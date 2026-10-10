import React from 'react';
import { Plus, RefreshCw, Flame, CheckCircle, Sparkles, LayoutDashboard, Target, CheckSquare, Calculator } from 'lucide-react';
import { useSavingsStore } from '../../store/useSavingsStore';
import { formatRupee } from '../../lib/utils';
import { ActiveTab } from '../../types';

interface HeaderProps {
  onOpenAddMoney: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onOpenAddMoney }) => {
  const { isLoading, refreshData, totalSavings, streakDays, activeTab, setActiveTab, activeGoalsCount } = useSavingsStore();

  const navLinks: { id: ActiveTab; label: string; icon: any; badge?: number }[] = [
    { id: 'home', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'goals', label: 'My Goals', icon: Target, badge: activeGoalsCount },
    { id: 'chores', label: 'Earn & Chores', icon: CheckSquare },
    { id: 'calculator', label: 'Calculator', icon: Calculator },
  ];

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-cloud-300/80 px-4 sm:px-8 py-3.5 transition-all">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        {/* Brand Logo & Puppy Mascot */}
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setActiveTab('home')}
            className="flex items-center gap-3 cursor-pointer group text-left"
          >
            {/* Cute Puppy Mascot Vector Badge */}
            <div className="relative w-11 h-11 rounded-2xl bg-gradient-to-tr from-brand to-brand-light flex items-center justify-center shadow-md shadow-brand/20 text-white font-black text-2xl group-hover:scale-105 transition-transform">
              <span role="img" aria-label="PennyPup mascot">🐶</span>
              <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-coin border-2 border-white flex items-center justify-center text-[10px] font-black text-white shadow-xs">
                🪙
              </span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xl sm:text-2xl font-black text-ink tracking-tight">PennyPup</span>
                <span className="hidden sm:inline-flex chip-tag bg-brand-soft text-brand-dark border border-brand-border text-[11px]">
                  Kids Saver
                </span>
              </div>
              <p className="text-[11px] font-semibold text-ink-muted hidden md:block">
                Smart habit & savings builder for junior champions
              </p>
            </div>
          </button>
        </div>

        {/* Center: Desktop Navigation Bar */}
        <nav className="hidden md:flex items-center gap-1 bg-cloud-200/80 p-1.5 rounded-2xl border border-cloud-300/80">
          {navLinks.map((link) => {
            const Icon = link.icon;
            const isActive = activeTab === link.id;
            return (
              <button
                key={link.id}
                onClick={() => setActiveTab(link.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
                  isActive
                    ? 'bg-white text-brand shadow-xs border border-cloud-300/60'
                    : 'text-ink-muted hover:text-ink hover:bg-white/60'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-brand' : 'text-ink-muted'}`} />
                <span>{link.label}</span>
                {typeof link.badge === 'number' && link.badge > 0 && (
                  <span
                    className={`ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                      isActive ? 'bg-brand-soft text-brand-dark' : 'bg-cloud-300 text-ink-muted'
                    }`}
                  >
                    {link.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Right Action Stack */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Daily Streak Pill */}
          <div className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-coin-soft border border-coin-border text-coin-dark font-extrabold text-xs">
            <Flame className="w-4 h-4 text-coin fill-coin" />
            <span>{streakDays} Day Streak!</span>
          </div>

          {/* Balance Preview Badge */}
          <div className="hidden sm:flex flex-col text-right pr-1">
            <span className="text-[10px] font-bold text-ink-muted uppercase tracking-wider">Total Saved</span>
            <span className="text-sm font-black text-brand-dark leading-none">{formatRupee(totalSavings)}</span>
          </div>

          {/* Sync Button */}
          <button
            onClick={() => refreshData()}
            title="Sync with cloud database"
            disabled={isLoading}
            className="p-2 sm:px-3 sm:py-2 rounded-xl text-xs font-bold text-ink-muted hover:text-brand hover:bg-brand-soft transition-colors flex items-center gap-1.5 border border-cloud-300 bg-white"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-brand' : 'text-brand'}`} />
            <span className="hidden xl:inline">{isLoading ? 'Syncing...' : 'Synced'}</span>
          </button>

          {/* Quick Add Money Action Button */}
          <button
            onClick={onOpenAddMoney}
            className="btn-primary text-xs sm:text-sm py-2 sm:py-2.5 px-3 sm:px-4"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span className="hidden sm:inline">+ Add Money</span>
            <span className="sm:hidden">+ Add</span>
          </button>
        </div>
      </div>
    </header>
  );
};
