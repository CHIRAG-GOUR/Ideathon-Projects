import React from 'react';
import { useFashionStore } from '../../store/useFashionStore';
import { MOODS } from '../../data/moods';
import { MoodType } from '../../types/fashion';
import { StudioCanvas } from '../studio/StudioCanvas';
import { Sparkles, ArrowRight, HeartHandshake, Zap, Shield, Sun } from 'lucide-react';

export function MoodStudioView() {
  const { currentMood, setMood, setActiveTab } = useFashionStore();

  const moodKeys: MoodType[] = ['happy', 'calm', 'confident', 'tired', 'chill'];

  return (
    <div className="max-w-[1440px] mx-auto px-4 lg:px-8 py-6 space-y-8">
      {/* Editorial Hero Intro */}
      <div className="text-center max-w-2xl mx-auto space-y-2">
        <span className="px-3 py-1 rounded-full bg-lavender text-plum font-bold text-xs uppercase tracking-wider">
          The WearWise Philosophy
        </span>
        <h2 className="font-editorial font-extrabold text-3xl sm:text-4xl text-plum tracking-tight">
          Your day. Your mood. Your outfit.
        </h2>
        <p className="text-sm text-plum-muted leading-relaxed">
          Fashion is an externalization of your inner emotional frequency. When what you wear aligns with how you feel, cognitive friction vanishes.
        </p>
      </div>

      {/* Main Interactive Stage */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* 3D Model Display */}
        <div className="lg:col-span-5 flex flex-col items-center">
          <div className="w-full mb-2 flex items-center justify-between">
            <span className="text-xs font-bold text-plum uppercase tracking-wider">
              Live Mood Posing Simulation
            </span>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-coral/10 text-coral font-bold">
              {MOODS[currentMood].emoji} {MOODS[currentMood].name}
            </span>
          </div>
          <StudioCanvas />
        </div>

        {/* Deep Dive Mood Cards */}
        <div className="lg:col-span-7 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {moodKeys.map((key) => {
              const config = MOODS[key];
              const isSelected = currentMood === key;

              return (
                <div
                  key={key}
                  onClick={() => setMood(key, true)}
                  className={`p-5 rounded-3xl border transition-all duration-200 cursor-pointer ${
                    isSelected
                      ? 'bg-white border-coral ring-2 ring-coral/20 shadow-float scale-[1.01]'
                      : 'bg-white/80 border-border-light hover:bg-white hover:border-plum/20 hover:shadow-card'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">{config.emoji}</span>
                      <h3 className="font-bold text-base text-plum">{config.name}</h3>
                    </div>
                    {isSelected && (
                      <span className="px-2 py-0.5 rounded-md bg-coral text-white text-[10px] font-bold uppercase tracking-wider">
                        Active
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-plum font-semibold mb-2">
                    {config.tagline}
                  </p>

                  <p className="text-xs text-plum-muted leading-relaxed mb-3">
                    {config.description}
                  </p>

                  {/* Recommended Color Palette Swatches */}
                  <div className="pt-3 border-t border-border-light/60 flex items-center justify-between">
                    <span className="text-[10px] uppercase font-bold text-plum-muted">
                      Tone Palette:
                    </span>
                    <div className="flex items-center gap-1.5">
                      {config.recommendedColors.map((color, idx) => (
                        <span
                          key={idx}
                          className="w-4 h-4 rounded-full border border-plum/10 shadow-2xs"
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Direct CTA back to Fitting Room */}
          <div className="p-5 rounded-3xl bg-gradient-to-r from-mint-light via-ivory to-lavender-light border border-border-light flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h4 className="font-bold text-sm text-plum">
                Love this {MOODS[currentMood].name} combination?
              </h4>
              <p className="text-xs text-plum-muted">
                Inspect and tweak individual layers in the interactive Fitting Room.
              </p>
            </div>
            <button
              onClick={() => setActiveTab('fitting-room')}
              className="btn-primary py-2 px-5 text-xs whitespace-nowrap"
            >
              <span>Go to Fitting Room</span>
              <ArrowRight className="w-3.5 h-3.5 ml-1" />
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}
