import React from 'react';
import { useFashionStore } from '../../store/useFashionStore';
import { OCCASIONS } from '../../data/occasions';
import { MOODS } from '../../data/moods';
import { Sparkles, Sun, CloudRain, Wind, Thermometer, Wand2, ShieldCheck } from 'lucide-react';
import { OccasionType } from '../../types/fashion';

export function OutfitAnalysisCard() {
  const { 
    currentMood, 
    currentOccasion, 
    setOccasion, 
    weather, 
    setWeather,
    recommendation, 
    setMood, 
    weeklyHistory 
  } = useFashionStore();

  const moodConfig = MOODS[currentMood];

  // Calculate repeat safety
  const wornThisWeek = weeklyHistory.filter(h => h.isWorn).length;

  const handleOccasionChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setOccasion(e.target.value as OccasionType);
  };

  const handleRegenerate = () => {
    setMood(currentMood, true);
  };

  const cycleWeather = () => {
    const states = [
      { temp: 21, condition: 'partly-cloudy' as const, conditionLabel: 'Partly Sunny', comfortIndex: 98, advice: 'Ideal for breathable French terry layers.' },
      { temp: 28, condition: 'sunny' as const, conditionLabel: 'Warm Sunshine', comfortIndex: 94, advice: 'High UV: lightweight linens and breathable tees recommended.' },
      { temp: 14, condition: 'cold' as const, conditionLabel: 'Crisp Breeze', comfortIndex: 92, advice: 'Chilly drop: heavier rib-knits, denim and hoodies provide thermo-balance.' }
    ];
    const nextIdx = (states.findIndex(s => s.temp === weather.temp) + 1) % states.length;
    setWeather(states[nextIdx]);
  };

  return (
    <div className="bg-white rounded-3xl border border-border-light p-4 shadow-card space-y-3.5">
      {/* Header */}
      <div className="flex items-center justify-between pb-2 border-b border-border-light">
        <div className="flex items-center gap-1.5">
          <Sparkles className="w-4 h-4 text-coral" />
          <h3 className="font-bold text-sm text-plum">AI Styling Rationale</h3>
        </div>
        <button
          onClick={handleRegenerate}
          title="Regenerate optimal outfit for mood"
          className="text-[11px] font-semibold text-coral hover:text-coral-hover flex items-center gap-1"
        >
          <Wand2 className="w-3 h-3" />
          <span>Restyle</span>
        </button>
      </div>

      {/* Occasion & Weather Controls Row */}
      <div className="grid grid-cols-2 gap-2 text-xs">
        {/* Occasion Selector */}
        <div>
          <label className="text-[10px] uppercase font-bold text-plum-muted block mb-1">
            Day Occasion
          </label>
          <select
            value={currentOccasion}
            onChange={handleOccasionChange}
            className="w-full py-1.5 px-2 bg-ivory text-plum font-semibold rounded-xl border border-border-light focus:outline-none focus:border-coral/50 cursor-pointer"
          >
            {OCCASIONS.map(occ => (
              <option key={occ.id} value={occ.id}>
                {occ.label}
              </option>
            ))}
          </select>
        </div>

        {/* Weather Indicator with Interactive Toggle */}
        <div>
          <label className="text-[10px] uppercase font-bold text-plum-muted block mb-1">
            Weather Context
          </label>
          <button
            onClick={cycleWeather}
            title="Click to cycle weather forecast simulation"
            className="w-full flex items-center justify-between py-1.5 px-2.5 bg-yellow-highlight/40 border border-yellow-warm rounded-xl text-plum font-semibold hover:bg-yellow-highlight/70 transition-colors"
          >
            <span className="flex items-center gap-1">
              <Sun className="w-3.5 h-3.5 text-amber-500" />
              <span>{weather.temp}°C</span>
            </span>
            <span className="text-[10px] text-plum-muted font-medium truncate max-w-[65px]">
              {weather.conditionLabel}
            </span>
          </button>
        </div>
      </div>

      {/* AI Explanation Box */}
      <div className="p-3 rounded-2xl bg-ivory/70 border border-border-light text-xs space-y-1.5">
        <div className="flex items-center justify-between">
          <span className="font-bold text-plum">
            {recommendation.name}
          </span>
          <span className="px-2 py-0.5 rounded-full bg-mint text-teal font-bold text-[10px]">
            {weather.comfortIndex}% Comfort
          </span>
        </div>
        <p className="text-plum-muted leading-relaxed">
          {recommendation.explanation}
        </p>

        {/* Psychological styling note */}
        <p className="text-[11px] text-plum-soft italic pt-1 border-t border-border-light/60">
          💡 {moodConfig.psychologyNote}
        </p>
      </div>

      {/* No-Repeat Week Badge */}
      <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-mint-light border border-mint-dark/40 text-[11px] text-teal-dark font-medium">
        <span className="flex items-center gap-1.5 font-semibold">
          <ShieldCheck className="w-3.5 h-3.5 text-teal" />
          <span>No-Repeat Week Guard</span>
        </span>
        <span className="font-bold">
          {7 - wornThisWeek} unique slots left
        </span>
      </div>
    </div>
  );
}
