import React from 'react';
import { useFashionStore } from '../../store/useFashionStore';
import { MOODS } from '../../data/moods';
import { Calendar, CheckCircle2, Circle, AlertCircle, Shirt, RefreshCw } from 'lucide-react';

export function NoRepeatWeekView() {
  const { 
    weeklyHistory, 
    markDayWorn, 
    applySavedLook, 
    setActiveTab 
  } = useFashionStore();

  const wornCount = weeklyHistory.filter(h => h.isWorn).length;
  const uniqueCount = weeklyHistory.length;

  return (
    <div className="max-w-[1280px] mx-auto px-4 lg:px-8 py-8 space-y-6">
      {/* Header & Stats Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border-light">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full bg-mint text-teal font-bold text-[10px] uppercase tracking-wider">
              Smart Wardrobe Intelligence
            </span>
            <span className="text-xs text-plum-muted font-semibold">
              Current Week (Oct 6 - Oct 12)
            </span>
          </div>
          <h2 className="font-editorial font-extrabold text-2xl text-plum">
            No-Repeat Week Planner
          </h2>
          <p className="text-xs text-plum-muted">
            Track daily worn looks and ensure zero repetitive outfit fatigue with intelligent rotating combinations.
          </p>
        </div>

        {/* Counter Pill */}
        <div className="flex items-center gap-3 p-3 rounded-2xl bg-white border border-border-light shadow-card self-start sm:self-auto">
          <div className="text-right">
            <span className="text-[10px] uppercase font-bold text-plum-muted block">
              Logged Worn Days
            </span>
            <span className="font-editorial font-black text-lg text-plum">
              {wornCount} of 7 Days
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-mint flex items-center justify-center text-teal font-extrabold text-sm">
            {Math.round((wornCount / 7) * 100)}%
          </div>
        </div>
      </div>

      {/* 7-Day Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3.5">
        {weeklyHistory.map((item) => {
          const moodConfig = MOODS[item.mood] || MOODS.chill;

          return (
            <div
              key={item.day}
              className={`p-4 rounded-3xl border flex flex-col justify-between transition-all ${
                item.isWorn
                  ? 'bg-white border-mint-dark/50 shadow-card'
                  : 'bg-ivory/50 border-border-light hover:bg-white'
              }`}
            >
              <div>
                {/* Day Header */}
                <div className="flex items-center justify-between mb-2">
                  <span className="font-black text-sm text-plum">{item.day}</span>
                  <span className="text-[10px] text-plum-muted font-medium">{item.dateStr}</span>
                </div>

                {/* Mood Tag */}
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-lavender text-plum text-[10px] font-bold mb-3">
                  <span>{moodConfig.emoji}</span>
                  <span>{moodConfig.name}</span>
                </span>

                {/* Garments Preview Thumbnails */}
                <div className="aspect-square w-full rounded-2xl bg-ivory border border-border-light/80 p-2 flex flex-col items-center justify-center gap-1 mb-2.5">
                  {item.outfit.tops && (
                    <img
                      src={item.outfit.tops.thumbnailUrl}
                      alt="Top"
                      className="w-12 h-12 object-contain"
                    />
                  )}
                  {item.outfit.bottoms && (
                    <span className="text-[10px] font-semibold text-plum truncate max-w-full text-center">
                      {item.outfit.bottoms.name.split(' ')[0]}
                    </span>
                  )}
                </div>

                <p className="text-[11px] font-semibold text-plum truncate mb-1">
                  {item.outfit.tops?.name || 'Casual Look'}
                </p>
                <span className="text-[10px] text-plum-muted block capitalize mb-3">
                  {item.occasion} occasion
                </span>
              </div>

              {/* Bottom Actions */}
              <div className="space-y-1.5 pt-2 border-t border-border-light/60">
                <button
                  onClick={() => markDayWorn(item.day)}
                  className={`w-full flex items-center justify-center gap-1.5 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
                    item.isWorn
                      ? 'bg-mint text-teal-dark hover:bg-mint-dark/40'
                      : 'bg-white text-plum-muted border border-border-light hover:text-plum'
                  }`}
                >
                  {item.isWorn ? (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5 text-teal" />
                      <span>Worn</span>
                    </>
                  ) : (
                    <>
                      <Circle className="w-3.5 h-3.5" />
                      <span>Mark Worn</span>
                    </>
                  )}
                </button>

                <button
                  onClick={() => {
                    applySavedLook({
                      id: `temp-${item.day}`,
                      name: `${item.day} Look`,
                      timestamp: Date.now(),
                      mood: item.mood,
                      occasion: item.occasion,
                      equipped: item.outfit
                    });
                    setActiveTab('fitting-room');
                  }}
                  className="w-full text-[11px] text-coral hover:text-coral-hover font-semibold py-1 text-center"
                >
                  Try on Avatar
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Intelligence Advice Box */}
      <div className="p-4 rounded-2xl bg-white border border-border-light shadow-card flex items-start gap-3 text-xs text-plum-muted">
        <AlertCircle className="w-4 h-4 text-teal shrink-0 mt-0.5" />
        <div>
          <strong className="text-plum block font-semibold mb-0.5">
            Algorithmic Anti-Fatigue Guarantee
          </strong>
          <span>
            WearWise compares garment fingerprint hashes across your 7-day look history. If you wear your <em>Light Wash Baggy Jeans</em> on Monday and Wednesday, the engine prioritizes <em>Charcoal Pleated Trousers</em> for Friday to maintain fresh aesthetic variety.
          </span>
        </div>
      </div>
    </div>
  );
}
