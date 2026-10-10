import React from 'react';
import { useFashionStore } from './store/useFashionStore';
import { Header } from './components/layout/Header';
import { FittingRoomView } from './components/views/FittingRoomView';
import { AvatarCustomisationView } from './components/views/AvatarCustomisationView';
import { MoodStudioView } from './components/views/MoodStudioView';
import { SavedLooksView } from './components/views/SavedLooksView';
import { NoRepeatWeekView } from './components/views/NoRepeatWeekView';
import { PricingModal } from './components/views/PricingModal';
import { Sparkles, Heart } from 'lucide-react';

export function App() {
  const { activeTab, setActiveTab } = useFashionStore();

  return (
    <div className="min-h-screen flex flex-col bg-ivory text-plum">
      {/* Top Navigation */}
      <Header />

      {/* Main Studio Content Body */}
      <main className="flex-1">
        {activeTab === 'fitting-room' && <FittingRoomView />}
        {activeTab === 'avatar' && <AvatarCustomisationView />}
        {activeTab === 'mood-studio' && <MoodStudioView />}
        {activeTab === 'saved' && <SavedLooksView />}
        {activeTab === 'history' && <NoRepeatWeekView />}
        {activeTab === 'pricing' && (
          <>
            <FittingRoomView />
            <PricingModal />
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-border-light bg-white/80 py-8 px-4 text-xs text-plum-muted">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-editorial font-extrabold text-sm text-plum">
              WearWise
            </span>
            <span className="text-border-light">|</span>
            <span>Your day. Your mood. Your outfit.</span>
          </div>

          <div className="flex items-center gap-6 text-[11px] font-semibold text-plum">
            <button 
              onClick={() => setActiveTab('fitting-room')} 
              className="hover:text-coral transition-colors"
            >
              Fitting Room
            </button>
            <button 
              onClick={() => setActiveTab('avatar')} 
              className="hover:text-coral transition-colors"
            >
              Avatar Customisation
            </button>
            <button 
              onClick={() => setActiveTab('mood-studio')} 
              className="hover:text-coral transition-colors"
            >
              Mood Studio
            </button>
            <button 
              onClick={() => setActiveTab('history')} 
              className="hover:text-coral transition-colors"
            >
              No-Repeat Week
            </button>
          </div>

          <div className="flex items-center gap-1 text-[11px]">
            <span>Crafted with</span>
            <Heart className="w-3 h-3 text-coral fill-coral" />
            <span>for personal style intelligence</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
