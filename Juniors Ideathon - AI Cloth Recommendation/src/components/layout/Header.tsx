import React from 'react';
import { useFashionStore } from '../../store/useFashionStore';
import { 
  Shirt, 
  User, 
  Sparkles, 
  ShoppingBag, 
  Calendar, 
  Bookmark, 
  CreditCard,
  RotateCcw
} from 'lucide-react';

export function Header() {
  const { 
    activeTab, 
    setActiveTab, 
    cartItemIds, 
    resetOutfit,
    setMood
  } = useFashionStore();

  const navItems = [
    { id: 'fitting-room' as const, label: 'Fitting room', icon: Shirt },
    { id: 'avatar' as const, label: 'Avatar customisation', icon: User },
    { id: 'mood-studio' as const, label: 'Mood studio', icon: Sparkles },
    { id: 'saved' as const, label: 'Saved outfits', icon: Bookmark },
    { id: 'history' as const, label: 'No-Repeat week', icon: Calendar },
  ];

  return (
    <header className="sticky top-0 z-40 w-full bg-white/95 backdrop-blur-md border-b border-border-light px-4 lg:px-8 py-3">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        {/* Brand Logo & Wordmark matching screenshot */}
        <div className="flex items-center gap-6">
          <div 
            onClick={() => setActiveTab('fitting-room')}
            className="flex items-center gap-2.5 cursor-pointer group"
          >
            <div className="w-9 h-9 rounded-2xl bg-coral flex items-center justify-center text-white shadow-soft group-hover:scale-105 transition-transform">
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                <path d="M20.38 3.46L16 2a4 4 0 01-8 0L3.62 3.46a2 2 0 00-1.34 2.23l.58 3.47a1 1 0 00.99.84H6v10c0 1.1.9 2 2 2h8a2 2 0 002-2V10h2.15a1 1 0 00.99-.84l.58-3.47a2 2 0 00-1.34-2.23z"/>
              </svg>
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-editorial font-extrabold text-lg text-plum tracking-tight">
                  WearWise
                </span>
                <span className="px-1.5 py-0.2 rounded-md bg-coral/10 text-coral text-[9px] font-black uppercase tracking-wider">
                  Alpha
                </span>
              </div>
              <span className="text-[10px] text-plum-muted block leading-none font-medium">
                Your day. Your mood. Your outfit.
              </span>
            </div>
          </div>

          {/* Navigation Tabs */}
          <nav className="hidden md:flex items-center gap-1.5 p-1 bg-ivory/80 rounded-2xl border border-border-light">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all duration-150 cursor-pointer ${
                    isActive
                      ? 'bg-white text-coral shadow-xs'
                      : 'text-plum-muted hover:text-plum hover:bg-white/50'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Right Status / Tokens / Profile Row matching screenshot */}
        <div className="flex items-center gap-2.5">
          {/* Credits / Wardrobe count badge matching screenshot */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-2xl bg-ivory border border-border-light text-xs font-bold text-plum shadow-2xs">
            <span className="text-coral">18</span>
            <Shirt className="w-3.5 h-3.5 text-plum-muted" />
            <button
              onClick={() => setActiveTab('pricing')}
              className="text-[11px] font-semibold text-plum-muted hover:text-coral transition-colors ml-1 hidden sm:inline"
            >
              Get credits
            </button>
          </div>

          {/* Cart Icon matching screenshot */}
          <button
            onClick={() => setActiveTab('fitting-room')}
            title="Try-on cart"
            className="relative p-2 rounded-2xl bg-white border border-border-light text-plum-muted hover:text-plum hover:border-plum/20 transition-all shadow-card"
          >
            <ShoppingBag className="w-4 h-4" />
            {cartItemIds.length > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-coral text-white text-[10px] font-bold flex items-center justify-center shadow-xs">
                {cartItemIds.length}
              </span>
            )}
          </button>

          {/* User Profile matching screenshot */}
          <div className="flex items-center gap-2 pl-1">
            <div className="hidden sm:flex flex-col text-right">
              <span className="text-xs font-bold text-plum leading-tight">
                @Adriano League
              </span>
              <span className="text-[10px] text-teal font-medium leading-tight">
                Style Plus
              </span>
            </div>
            <div className="w-8 h-8 rounded-full ring-2 ring-border-light overflow-hidden bg-ivory flex items-center justify-center">
              <img
                src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&q=80"
                alt="Adriano"
                className="w-full h-full object-cover"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Subnav Row */}
      <div className="flex md:hidden items-center gap-1 mt-2.5 overflow-x-auto no-scrollbar py-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${
                isActive ? 'bg-coral text-white' : 'bg-ivory text-plum-muted'
              }`}
            >
              <Icon className="w-3 h-3" />
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>
    </header>
  );
}
