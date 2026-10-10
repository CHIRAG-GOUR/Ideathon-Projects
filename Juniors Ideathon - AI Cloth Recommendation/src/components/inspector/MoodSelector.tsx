import React from 'react';
import { MOODS } from '../../data/moods';
import { MoodType } from '../../types/fashion';
import { useFashionStore } from '../../store/useFashionStore';

export function MoodSelector() {
  const { currentMood, setMood } = useFashionStore();

  const moodKeys: MoodType[] = ['happy', 'calm', 'confident', 'tired', 'chill'];

  return (
    <div className="bg-white rounded-3xl border border-border-light p-4 shadow-card">
      <div className="flex items-center justify-between mb-2.5">
        <div>
          <span className="text-[10px] uppercase tracking-wider font-bold text-plum-muted">
            Emotional Styling State
          </span>
          <h3 className="font-bold text-sm text-plum">How do you feel today?</h3>
        </div>
        <span className="text-xs px-2.5 py-1 rounded-full bg-lavender/60 text-plum font-semibold">
          {MOODS[currentMood]?.name}
        </span>
      </div>

      {/* Mood Pills Grid */}
      <div className="grid grid-cols-5 gap-1.5">
        {moodKeys.map((key) => {
          const config = MOODS[key];
          const isActive = currentMood === key;
          return (
            <button
              key={key}
              onClick={() => setMood(key, false)}
              className={`flex flex-col items-center justify-center py-2.5 px-1 rounded-2xl border text-center transition-all duration-200 cursor-pointer ${
                isActive
                  ? 'border-plum bg-plum text-white shadow-sm scale-[1.02]'
                  : 'border-border-light bg-ivory/60 text-plum hover:bg-white hover:border-plum/20'
              }`}
            >
              <span className="text-base mb-0.5">{config.emoji}</span>
              <span className="text-[11px] font-bold tracking-tight line-clamp-1">
                {config.name}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
