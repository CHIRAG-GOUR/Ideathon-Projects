import React from 'react';
import { Home, Target, Crown } from 'lucide-react';
import { useSavingsStore } from '../../store/useSavingsStore';
import { ActiveTab } from '../../types';

export const Navigation: React.FC = () => {
  const { activeTab, setActiveTab, activeGoalsCount } = useSavingsStore();

  const navItems: { id: ActiveTab; label: string; icon: typeof Home; badge?: number }[] = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'goals', label: 'Goals', icon: Target, badge: activeGoalsCount },
    { id: 'premium', label: 'Premium', icon: Crown }
  ];

  return (
    <>
      {/* Desktop / Tablet Top Tabs Bar (inside main container) */}
      <div className="hidden sm:flex items-center justify-center gap-2 mb-6">
        <div className="inline-flex p-1.5 rounded-2xl bg-white border border-slate-200/80 shadow-card">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`relative flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-sm transition-all cursor-pointer ${
                  isActive
                    ? 'bg-pup text-white shadow-md shadow-pup/25'
                    : 'text-ink-muted hover:text-ink hover:bg-slate-50'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{item.label}</span>
                {typeof item.badge === 'number' && item.badge > 0 && (
                  <span
                    className={`ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                      isActive ? 'bg-white text-pup' : 'bg-pup-soft text-pup'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Mobile Bottom Fixed Nav Bar */}
      <nav className="sm:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-lg border-t border-slate-200/90 py-2 px-6 shadow-float">
        <div className="flex items-center justify-around max-w-md mx-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`flex flex-col items-center justify-center py-1 px-3 rounded-2xl transition-all cursor-pointer ${
                  isActive ? 'text-pup' : 'text-ink-faint hover:text-ink-muted'
                }`}
              >
                <div className={`relative p-1.5 rounded-xl transition-all ${isActive ? 'bg-pup-soft' : ''}`}>
                  <Icon className="w-5 h-5" />
                  {typeof item.badge === 'number' && item.badge > 0 && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-pup text-white text-[9px] font-black flex items-center justify-center">
                      {item.badge}
                    </span>
                  )}
                </div>
                <span className="text-[11px] font-bold mt-0.5">{item.label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </>
  );
};
