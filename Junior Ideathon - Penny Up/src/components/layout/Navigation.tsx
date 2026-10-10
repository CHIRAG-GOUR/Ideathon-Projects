import React from 'react';
import { LayoutDashboard, Target, CheckSquare, Calculator } from 'lucide-react';
import { useSavingsStore } from '../../store/useSavingsStore';
import { ActiveTab } from '../../types';

export const Navigation: React.FC = () => {
  const { activeTab, setActiveTab, activeGoalsCount } = useSavingsStore();

  const navItems: { id: ActiveTab; label: string; icon: any; badge?: number }[] = [
    { id: 'home', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'goals', label: 'Goals', icon: Target, badge: activeGoalsCount },
    { id: 'chores', label: 'Earn Chores', icon: CheckSquare },
    { id: 'calculator', label: 'Calculator', icon: Calculator }
  ];

  return (
    <>
      {/* Mobile Bottom Fixed Nav Bar (visible only below md) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-lg border-t border-cloud-300 py-2 px-4 shadow-float">
        <div className="flex items-center justify-around max-w-md mx-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`flex flex-col items-center justify-center py-1 px-3 rounded-2xl transition-all cursor-pointer ${
                  isActive ? 'text-brand font-black' : 'text-ink-faint hover:text-ink font-semibold'
                }`}
              >
                <div className={`relative p-1.5 rounded-xl transition-all ${isActive ? 'bg-brand-soft' : ''}`}>
                  <Icon className="w-5 h-5" />
                  {typeof item.badge === 'number' && item.badge > 0 && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-brand text-white text-[9px] font-black flex items-center justify-center">
                      {item.badge}
                    </span>
                  )}
                </div>
                <span className="text-[10px] mt-0.5">{item.label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </>
  );
};
